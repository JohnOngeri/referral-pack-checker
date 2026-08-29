import type { ModelProvider } from "../provider";
import { priceFor } from "../provider";
import type { ReferralType } from "../domain/types";
import { loadManifest, loadPackText, loadRequirementSet } from "../lib/fixtures";
import { BASELINE_SYSTEM } from "../agents/prompts";

/**
 * The baseline: ONE model call that does the entire job end to end from the raw
 * pack text and the requirement set. No extraction schema, no deterministic
 * checker, no consistency verifier, no retry loop, no memory. Its output is
 * free-form text that the scorer parses; parsing unreliability is a real finding
 * about the baseline, not something to engineer away.
 */
export interface BaselineRun {
  caseId: string;
  referralType: ReferralType;
  mode: "fresh" | "replay";
  model: string;
  text: string;
  parsedFindings: BaselineFinding[];
  parseNote: string;
  unparseable: boolean;
  costUsd: number;
}

export interface BaselineFinding {
  /** Best-effort field key the scorer can match. */
  field: string | null;
  line: string;
}

export interface BaselineParseOutcome {
  findings: BaselineFinding[];
  note: string;
  /** True when the response could not be parsed into findings (truncated, or no findings section). */
  unparseable: boolean;
}

export async function runBaseline(provider: ModelProvider, caseId: string): Promise<BaselineRun> {
  const entry = loadManifest().find((c) => c.id === caseId);
  if (!entry) throw new Error(`Unknown case ${caseId}`);
  const packText = loadPackText(caseId);
  const reqs = loadRequirementSet(entry.referralType);

  const reqText = reqs.fields
    .map(
      (f) =>
        `- ${f.label} (${f.field}): ${f.requirement}${
          f.maxAgeDays ? `, must be from the last ${f.maxAgeDays} days` : ""
        }${f.condition ? ` — only if: ${f.condition.description}` : ""}`,
    )
    .join("\n");

  const user = `RECEIVING FACILITY REQUIREMENTS — ${reqs.label}
${reqText}

REFERRAL PACK
${packText}`;

  const res = await provider.completeText(
    { phase: "baseline", caseId, label: "baseline", attempt: 1 },
    { system: BASELINE_SYSTEM, user, maxTokens: 16000 },
  );

  const parsed = parseBaseline(res.text, res.stopReason);
  const { findings, note } = parsed;
  const p = priceFor(provider.model);
  const cost =
    provider.mode === "fresh"
      ? (res.usage.inputTokens * p.in + res.usage.outputTokens * p.out) / 1_000_000
      : 0;

  return {
    caseId,
    referralType: entry.referralType,
    mode: provider.mode,
    model: provider.model,
    text: res.text,
    parsedFindings: findings,
    parseNote: note,
    unparseable: parsed.unparseable,
    costUsd: Number(cost.toFixed(4)),
  };
}

/**
 * A finding line that is really a passed checklist item. The baseline tends to
 * enumerate every field including the ones that are fine; those are not findings.
 */
function isPassThrough(l: string): boolean {
  const low = l.toLowerCase();
  if (/\b(present|recorded|valid|compliant|ok|fine|met|satisfied|acceptable)\.?\s*$/.test(low)) return true;
  if (/within the .{0,20}\b(limit|range|window)/.test(low) && !/however|but the date/.test(low)) return true;
  if (/\bn\/a\b/.test(low) && low.length < 40) return true;
  if (/not required/.test(low) && !/but /.test(low)) return true;
  if (/\bthis is (valid|compliant|fine|ok|acceptable|within)/.test(low)) return true;
  if (/no (concern|issue|problem|action needed)/.test(low)) return true;
  if (/\(note: (this is )?(compliant|valid|ok|fine|no issue)/.test(low)) return true;
  return false;
}

const FIELD_HINTS: Array<[RegExp, string]> = [
  [/blood group|abo|group and (screen|hold)/i, "bloodGroup"],
  [/rhesus|rh[ -]?(d )?(neg|pos)|anti-?d/i, "antiD"],
  [/h(a)?emoglobin|\bhb\b/i, "haemoglobin"],
  [/gestational age|\bga\b|weeks.*lmp|lmp.*weeks/i, "gestationalAge"],
  [/estimated delivery|edd|due date/i, "edd"],
  [/last menstrual|lmp/i, "lmp"],
  [/parity|\bpara\b|\bp\d\b|obstetric history/i, "parity"],
  [/blood pressure|\bbp\b/i, "bloodPressure"],
  [/urine protein|proteinuria|dipstick/i, "urineProtein"],
  [/hiv/i, "hivScreen"],
  [/syphilis|rpr|vdrl/i, "syphilisScreen"],
  [/future date|dated after|date in the future/i, "haemoglobin"],
  [/medication|methyldopa|drug/i, "medications"],
  [/referring clinician|clinician name|signature/i, "referringClinician"],
];

/**
 * Heuristic parser for the baseline's free-form output. Deliberately simple.
 *
 * The baseline is a single end-to-end prompt with no structured-output contract.
 * When the response is truncated, or has no locatable FINDINGS section, that is a
 * real property of the baseline and is reported as `unparseable` — not turned
 * into findings by scraping the model's working notes.
 */
export function parseBaseline(text: string, stopReason: string | null): BaselineParseOutcome {
  if (stopReason && /max_tokens/i.test(stopReason)) {
    return {
      findings: [],
      note: "Response truncated (hit the output limit before finishing). Unparseable.",
      unparseable: true,
    };
  }

  const lines = text.split("\n");
  const startIdx = lines.findIndex((l) => /^[\s*#>_-]*findings\b/i.test(l.trim()));
  if (startIdx === -1) {
    return {
      findings: [],
      note: "No FINDINGS section in the response. Unparseable.",
      unparseable: true,
    };
  }

  const endIdx = lines.findIndex(
    (l, i) => i > startIdx && /^[\s*#>_-]*(summary|before you send|corrected)\b/i.test(l.trim()),
  );
  const region = lines.slice(startIdx + 1, endIdx === -1 ? undefined : endIdx);

  const findings: BaselineFinding[] = [];
  for (const raw of region) {
    const l = raw.trim().replace(/^[-*\d.)\s]+/, "").replace(/\*\*/g, "").trim();
    if (l.length < 8) continue;
    if (/^(none|no (issues|gaps|findings|contradictions|missing|stale)|all (fields|requirements|present)|nothing)/i.test(l)) continue;
    // Lines the baseline lists that are not problems it is raising — its checklist
    // items that passed. Not counted as findings, and not "engineering away" a
    // weakness: the model did not flag these as issues.
    if (isPassThrough(l)) continue;
    const field = FIELD_HINTS.find(([re]) => re.test(l))?.[1] ?? null;
    findings.push({ field, line: l.slice(0, 240) });
  }
  return {
    findings,
    note: `Parsed ${findings.length} finding line(s) from the FINDINGS section.`,
    unparseable: false,
  };
}
