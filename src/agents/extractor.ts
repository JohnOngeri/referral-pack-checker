import type { ModelProvider } from "../provider";
import type { ReferralPack } from "../domain/types";
import { EXTRACTOR_SYSTEM } from "./prompts";
import {
  ExtractionSchema,
  type ExtractionOutput,
  semanticIssues,
  toReferralPack,
} from "./extract-schema";

export const MAX_EXTRACT_ATTEMPTS = 3;

export interface ExtractAttempt {
  attempt: number;
  ok: boolean;
  schemaValid: boolean;
  semanticIssues: string[];
  rawText: string;
  stopReason: string | null;
  usage: { inputTokens: number; outputTokens: number; cacheReadTokens: number };
}

export interface ExtractionResult {
  pack: ReferralPack;
  raw: ExtractionOutput;
  attempts: ExtractAttempt[];
  mode: "fresh" | "replay";
}

function numberLines(text: string): string {
  return text
    .split("\n")
    .map((l, i) => `${String(i + 1).padStart(2, " ")} | ${l}`)
    .join("\n");
}

/**
 * Extraction agent. Sends the pack to the model, validates the structured
 * response against the schema and the provenance-substring rule, and retries
 * with the validation errors attached, up to three attempts. Every attempt is
 * recorded under results/raw/.
 */
/**
 * In-process cache. Extraction is deterministic for a given pack + model, so a
 * single `npm run eval` process calls the model once per pack and every
 * configuration reuses that result. The committed raw file is written once.
 * Cleared between processes; set RPC_NO_EXTRACT_CACHE=1 to disable.
 */
const extractCache = new Map<string, ExtractionResult>();

export function clearExtractCache(): void {
  extractCache.clear();
}

export async function runExtractor(
  provider: ModelProvider,
  caseId: string,
  packText: string,
): Promise<ExtractionResult> {
  const cacheKey = `${provider.mode}:${provider.model}:${caseId}`;
  if (!process.env.RPC_NO_EXTRACT_CACHE && extractCache.has(cacheKey)) {
    return extractCache.get(cacheKey)!;
  }
  const result = await runExtractorUncached(provider, caseId, packText);
  if (!process.env.RPC_NO_EXTRACT_CACHE) extractCache.set(cacheKey, result);
  return result;
}

async function runExtractorUncached(
  provider: ModelProvider,
  caseId: string,
  packText: string,
): Promise<ExtractionResult> {
  const numbered = numberLines(packText);
  const user = `Referral pack (with line numbers):\n\n${numbered}`;
  const attempts: ExtractAttempt[] = [];
  const followups: Array<{ role: "assistant" | "user"; content: string }> = [];

  for (let attempt = 1; attempt <= MAX_EXTRACT_ATTEMPTS; attempt++) {
    const res = await provider.parseStructured(
      { phase: "extract", caseId, label: "extract", attempt },
      { system: EXTRACTOR_SYSTEM, user, followups, maxTokens: 16000 },
      ExtractionSchema,
    );

    const schemaValid = res.parsed !== null;
    const issues = schemaValid ? semanticIssues(res.parsed as ExtractionOutput, packText) : [];
    const ok = schemaValid && issues.length === 0;

    attempts.push({
      attempt,
      ok,
      schemaValid,
      semanticIssues: issues.map((i) => `${i.path}: ${i.message}`),
      rawText: res.rawText,
      stopReason: res.stopReason,
      usage: res.usage,
    });

    if (ok) {
      return {
        pack: toReferralPack(res.parsed as ExtractionOutput),
        raw: res.parsed as ExtractionOutput,
        attempts,
        mode: res.mode,
      };
    }

    if (attempt < MAX_EXTRACT_ATTEMPTS) {
      const problem = !schemaValid
        ? `The tool input did not match the schema:\n${res.rawText}`
        : `The structure was valid but these fields have problems:\n${issues
            .map((i) => `- ${i.path}: ${i.message}`)
            .join("\n")}`;
      followups.push({ role: "assistant", content: `(previous attempt ${attempt})` });
      followups.push({
        role: "user",
        content: `${problem}\n\nCorrect these and call record_referral_pack again. Remember: quote source text exactly, and mark a field absent rather than guess.`,
      });
    }
  }

  // Exhausted attempts. Return the last parseable structure if any, else a
  // fully-absent pack. Never fabricate values.
  const last = attempts[attempts.length - 1];
  if (last.schemaValid) {
    // Re-parse the last raw text we kept.
    const reparsed = ExtractionSchema.safeParse(JSON.parse(stripPrefix(last.rawText)));
    if (reparsed.success) {
      return { pack: toReferralPack(reparsed.data), raw: reparsed.data, attempts, mode: provider.mode };
    }
  }
  throw new Error(
    `Extraction for ${caseId} failed after ${MAX_EXTRACT_ATTEMPTS} attempts. Last issues:\n` +
      last.semanticIssues.join("\n"),
  );
}

function stripPrefix(rawText: string): string {
  const idx = rawText.indexOf("{");
  return idx >= 0 ? rawText.slice(idx) : rawText;
}
