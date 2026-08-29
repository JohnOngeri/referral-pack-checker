import { GoogleGenAI } from "@google/genai";
import type { z } from "zod";
import type {
  CallOptions,
  ModelProvider,
  RecordKey,
  StructuredResult,
  TextResult,
  TokenUsage,
} from "./types";
import { writeRaw } from "./raw";
import { EXTRACTION_TOOL, SUMMARY_TOOL } from "./schema-json";
import { geminify } from "./gemini-schema";

const SCHEMA_FOR: Record<string, unknown> = {
  extract: geminify(EXTRACTION_TOOL.input_schema),
  summarise: geminify(SUMMARY_TOOL.input_schema),
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Fresh provider — every call hits the Gemini API and the exact request and raw
 * response are committed under results/raw/. Retries on 429/503 with backoff so a
 * free-tier key can complete a full evaluation.
 */
export class FreshProvider implements ModelProvider {
  readonly mode = "fresh" as const;
  readonly model: string;
  private ai: GoogleGenAI;

  constructor(model: string, apiKey: string) {
    this.model = model;
    this.ai = new GoogleGenAI({ apiKey });
  }

  private async call(config: Record<string, unknown>, contents: unknown): Promise<any> {
    let lastErr: unknown;
    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        return await this.ai.models.generateContent({
          model: this.model,
          contents: contents as never,
          config: config as never,
        });
      } catch (e) {
        lastErr = e;
        const msg = (e as Error).message ?? "";
        const status = (e as { status?: number }).status ?? (/\b(429|503|500|502|504)\b/.test(msg) ? 429 : 0);
        if (status === 429 || status === 503 || status === 500 || status === 502 || status === 504) {
          const wait = Math.min(60_000, 2_000 * 2 ** attempt) + Math.random() * 1_000;
          process.stderr.write(`    (rate limited, retrying in ${Math.round(wait / 1000)}s)\n`);
          await sleep(wait);
          continue;
        }
        throw e;
      }
    }
    throw lastErr;
  }

  async parseStructured<T>(
    key: RecordKey,
    opts: CallOptions,
    schema: z.ZodType<T>,
  ): Promise<StructuredResult<T>> {
    const responseSchema = SCHEMA_FOR[key.phase];
    if (!responseSchema) throw new Error(`No response schema for phase ${key.phase}`);

    const contents = this.buildContents(opts);
    const config = {
      systemInstruction: opts.system,
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0,
      maxOutputTokens: opts.maxTokens ?? 8000,
    };

    const response = await this.call(config, contents);
    const usage = readUsage(response);
    const text: string = response.text ?? "";
    const stopReason = response.candidates?.[0]?.finishReason ?? null;

    let parsed: T | null = null;
    let rawText = text;
    try {
      const obj = JSON.parse(text);
      const r = schema.safeParse(obj);
      parsed = r.success ? r.data : null;
      if (!r.success) rawText = `SCHEMA VALIDATION FAILED\n${JSON.stringify(r.error.format(), null, 2)}\n\n${text}`;
    } catch (e) {
      rawText = `JSON PARSE FAILED: ${(e as Error).message}\n\n${text}`;
    }

    writeRaw({
      mode: this.mode,
      model: this.model,
      phase: key.phase,
      caseId: key.caseId,
      label: key.label,
      attempt: key.attempt,
      timestamp: new Date().toISOString(),
      request: { model: this.model, config, contents },
      response: { text, finishReason: stopReason, usageMetadata: response.usageMetadata ?? null },
      usage,
      stopReason,
    });

    return { parsed, rawText, usage, stopReason, mode: this.mode };
  }

  async completeText(key: RecordKey, opts: CallOptions): Promise<TextResult> {
    const contents = this.buildContents(opts);
    const config = {
      systemInstruction: opts.system,
      temperature: 0,
      maxOutputTokens: opts.maxTokens ?? 4000,
    };
    const response = await this.call(config, contents);
    const usage = readUsage(response);
    const text: string = response.text ?? "";
    const stopReason = response.candidates?.[0]?.finishReason ?? null;

    writeRaw({
      mode: this.mode,
      model: this.model,
      phase: key.phase,
      caseId: key.caseId,
      label: key.label,
      attempt: key.attempt,
      timestamp: new Date().toISOString(),
      request: { model: this.model, config, contents },
      response: { text, finishReason: stopReason, usageMetadata: response.usageMetadata ?? null },
      usage,
      stopReason,
    });

    return { text, usage, stopReason, mode: this.mode };
  }

  private buildContents(opts: CallOptions) {
    const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [
      { role: "user", parts: [{ text: opts.user }] },
    ];
    for (const f of opts.followups ?? []) {
      contents.push({ role: f.role === "assistant" ? "model" : "user", parts: [{ text: f.content }] });
    }
    return contents;
  }
}

function readUsage(response: { usageMetadata?: Record<string, number> }): TokenUsage {
  const u = response.usageMetadata ?? {};
  return {
    inputTokens: u.promptTokenCount ?? 0,
    outputTokens: (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0),
    cacheReadTokens: u.cachedContentTokenCount ?? 0,
  };
}
