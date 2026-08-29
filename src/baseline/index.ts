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
  costUsd: number;
}

export interface BaselineFinding {
  /** Best-effort field key the scorer can match. */
  field: string | null;
  line: string;
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
    { system: BASELINE_SYSTEM, user, maxTokens: 3000 },
  );

  const { findings, note } = parseBaseline(res.text);
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
    costUsd: Number(cost.toFixed(4)),
  };
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
 * If a FINDINGS section cannot be located, that is reported.
 */
export function parseBaseline(text: string): { findings: BaselineFinding[]; note: string } {
  const lines = text.split("\n");
  const startIdx = lines.findIndex((l) => /^\s*#{0,3}\s*findings\b/i.test(l) || /^findings[:\s]/i.test(l));
  let region: string[];
  let note: string;
  if (startIdx === -1) {
    // No labelled section — fall back to scanning the whole text, and say so.
    region = lines;
    note = "No FINDINGS section found in the baseline output; scanned the full response instead.";
  } else {
    const endIdx = lines.findIndex(
      (l, i) => i > startIdx && /^\s*#{0,3}\s*(summary|before you send)\b/i.test(l),
    );
    region = lines.slice(startIdx + 1, endIdx === -1 ? undefined : endIdx);
    note = "Parsed the FINDINGS section.";
  }

  const findings: BaselineFinding[] = [];
  for (const raw of region) {
    const l = raw.trim().replace(/^[-*\d.)\s]+/, "").trim();
    if (l.length < 8) continue;
    if (/^(none|no (issues|gaps|findings|contradictions)|all (fields|requirements))/i.test(l)) continue;
    if (/^(summary|before you send)/i.test(l)) break;
    const field = FIELD_HINTS.find(([re]) => re.test(l))?.[1] ?? null;
    findings.push({ field, line: l.slice(0, 240) });
  }
  return { findings, note };
}
