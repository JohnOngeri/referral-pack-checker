import type { ModelProvider } from "../provider";
import type { CheckResult } from "../checks";
import type { ExtractionOutput } from "./extract-schema";
import type { RequirementSet } from "../domain/types";
import { SUMMARISER_SYSTEM } from "./prompts";
import { SummarySchema, type SummaryOutput, clinicalLanguageIssues } from "./summary-schema";
import { fieldPresent } from "../domain/types";

export const MAX_SUMMARY_ATTEMPTS = 3;

export interface SummariserAttempt {
  attempt: number;
  ok: boolean;
  schemaValid: boolean;
  clinicalLanguageIssues: string[];
  rawText: string;
  usage: { inputTokens: number; outputTokens: number; cacheReadTokens: number };
}

export interface SummariserResult {
  summary: SummaryOutput;
  attempts: SummariserAttempt[];
  mode: "fresh" | "replay";
}

/** Verified fields only — the summariser may see nothing else. */
function verifiedFieldLines(raw: ExtractionOutput): string {
  const lines: string[] = [];
  const add = (label: string, present: boolean, value: string, prov: string | null | undefined) => {
    lines.push(
      present
        ? `- ${label}: ${value}  [source: ${prov ?? "?"}]`
        : `- ${label}: OUTSTANDING (not verified)`,
    );
  };
  add("Patient id", fieldPresent(raw.patientId as never), String(raw.patientId.value), raw.patientId.provenance?.quote);
  add("Age", fieldPresent(raw.ageYears as never), `${raw.ageYears.value}`, raw.ageYears.provenance?.quote);
  add("LMP", fieldPresent(raw.lmp as never), String(raw.lmp.value), raw.lmp.provenance?.quote);
  add("EDD", fieldPresent(raw.edd as never), String(raw.edd.value), raw.edd.provenance?.quote);
  add(
    "Gestational age",
    !raw.gestationalAge.absent && raw.gestationalAge.value !== null,
    raw.gestationalAge.value ? `${raw.gestationalAge.value.weeks}+${raw.gestationalAge.value.days}` : "",
    raw.gestationalAge.provenance?.quote,
  );
  add("Gravidity", fieldPresent(raw.gravidity as never), `${raw.gravidity.value}`, raw.gravidity.provenance?.quote);
  add("Parity", fieldPresent(raw.parity as never), `${raw.parity.value}`, raw.parity.provenance?.quote);
  add("Blood group", fieldPresent(raw.bloodGroup as never), String(raw.bloodGroup.value), raw.bloodGroup.provenance?.quote);
  add("Rhesus", fieldPresent(raw.rhesus as never), String(raw.rhesus.value), raw.rhesus.provenance?.quote);
  add(
    "Haemoglobin",
    !raw.haemoglobin.absent && raw.haemoglobin.value !== null,
    `${raw.haemoglobin.value} g/dL${raw.haemoglobin.date ? ` (${raw.haemoglobin.date})` : ""}`,
    raw.haemoglobin.provenance?.quote,
  );
  add(
    "HIV screen",
    !!raw.hivScreen.status,
    `${raw.hivScreen.status ?? ""}${raw.hivScreen.date ? ` (${raw.hivScreen.date})` : ""}`,
    raw.hivScreen.provenance?.quote,
  );
  add(
    "Syphilis screen",
    !!raw.syphilisScreen.status,
    `${raw.syphilisScreen.status ?? ""}${raw.syphilisScreen.date ? ` (${raw.syphilisScreen.date})` : ""}`,
    raw.syphilisScreen.provenance?.quote,
  );
  add(
    "Blood pressure",
    !raw.bloodPressure.absent && raw.bloodPressure.readings.length > 0,
    raw.bloodPressure.readings.map((r) => `${r.systolic}/${r.diastolic}${r.date ? ` (${r.date})` : ""}`).join(", "),
    raw.bloodPressure.provenance?.quote ?? raw.bloodPressure.readings[0]?.provenance?.quote,
  );
  add("Urine protein", fieldPresent(raw.urineProtein as never), String(raw.urineProtein.value), raw.urineProtein.provenance?.quote);
  add(
    "Previous obstetric history",
    !raw.previousObstetricHistory.absent && raw.previousObstetricHistory.entries.length > 0,
    raw.previousObstetricHistory.entries.map((e) => e.summary).join("; "),
    raw.previousObstetricHistory.provenance?.quote,
  );
  add("Medications", fieldPresent(raw.medications as never), (raw.medications.value ?? []).join(", "), raw.medications.provenance?.quote);
  add("Allergies", fieldPresent(raw.allergies as never), String(raw.allergies.value), raw.allergies.provenance?.quote);
  add("Reason for referral", fieldPresent(raw.reasonForReferral as never), String(raw.reasonForReferral.value), raw.reasonForReferral.provenance?.quote);
  add("Referring facility", fieldPresent(raw.referringFacility as never), String(raw.referringFacility.value), raw.referringFacility.provenance?.quote);
  add("Referring clinician", fieldPresent(raw.referringClinician as never), String(raw.referringClinician.value), raw.referringClinician.provenance?.quote);
  add("Referral date", fieldPresent(raw.referralDate as never), String(raw.referralDate.value), raw.referralDate.provenance?.quote);
  add("Receiving facility", fieldPresent(raw.receivingFacility as never), String(raw.receivingFacility.value), raw.receivingFacility.provenance?.quote);
  add("Anti-D record", fieldPresent(raw.antiD as never), String(raw.antiD.value), raw.antiD.provenance?.quote);
  return lines.join("\n");
}

export async function runSummariser(
  provider: ModelProvider,
  caseId: string,
  raw: ExtractionOutput,
  checks: CheckResult,
  reqs: RequirementSet,
): Promise<SummariserResult> {
  const checkLines =
    checks.findings.length === 0
      ? "No gaps, no contradictions."
      : checks.findings
          .map((f) => `- [${f.kind}] ${f.field}: ${f.plain} (rule ${f.rule})`)
          .join("\n");

  const user = `Requirement set: ${reqs.label}
${reqs.fields.map((f) => `  ${f.field} — ${f.requirement}${f.maxAgeDays ? ` (max age ${f.maxAgeDays}d)` : ""}`).join("\n")}

Verified fields (with source spans):
${verifiedFieldLines(raw)}

Deterministic check results:
${checkLines}

Write the summary. Verified fields only. Every outstanding item goes in the gap list. State both sides of any contradiction; resolve nothing.`;

  const attempts: SummariserAttempt[] = [];
  const followups: Array<{ role: "assistant" | "user"; content: string }> = [];

  for (let attempt = 1; attempt <= MAX_SUMMARY_ATTEMPTS; attempt++) {
    const res = await provider.parseStructured(
      { phase: "summarise", caseId, label: "summarise", attempt },
      { system: SUMMARISER_SYSTEM, user, followups, maxTokens: 4000 },
      SummarySchema,
    );
    const schemaValid = res.parsed !== null;
    const clin = schemaValid ? clinicalLanguageIssues(res.parsed as SummaryOutput) : [];
    const ok = schemaValid && clin.length === 0;
    attempts.push({ attempt, ok, schemaValid, clinicalLanguageIssues: clin, rawText: res.rawText, usage: res.usage });

    if (ok) return { summary: res.parsed as SummaryOutput, attempts, mode: res.mode };

    if (attempt < MAX_SUMMARY_ATTEMPTS) {
      const problem = !schemaValid
        ? `The tool input did not match the schema:\n${res.rawText}`
        : `The summary used language that reads as a clinical assessment:\n${clin.map((c) => `- ${c}`).join("\n")}`;
      followups.push({ role: "assistant", content: `(previous attempt ${attempt})` });
      followups.push({
        role: "user",
        content: `${problem}\n\nRewrite. Report only presence, currency and consistency. Call record_referral_summary again.`,
      });
    }
  }

  const last = attempts[attempts.length - 1];
  const reparsed = SummarySchema.safeParse(JSON.parse(last.rawText.slice(last.rawText.indexOf("{"))));
  if (reparsed.success) return { summary: reparsed.data, attempts, mode: provider.mode };
  throw new Error(`Summariser for ${caseId} failed after ${MAX_SUMMARY_ATTEMPTS} attempts.`);
}
