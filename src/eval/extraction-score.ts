import type { ExtractionOutput } from "../agents/extract-schema";
import type { GroundTruth } from "../lib/fixtures";
import { semanticIssues } from "../agents/extract-schema";

export interface ExtractionScore {
  caseId: string;
  fieldsExtracted: number;
  /** value != null AND provenance quote is not a substring of the pack — a guess. */
  inventedValues: number;
  inventedFields: string[];
  /** GT said this field should be absent, extractor gave a value. */
  wronglyPresent: string[];
  /** GT said present, extractor marked absent. */
  wronglyAbsent: string[];
  provenanceOk: number;
  provenanceTotal: number;
}

function get(out: ExtractionOutput, field: string): { value: unknown; absent: boolean } | null {
  const f = (out as unknown as Record<string, { value: unknown; absent: boolean }>)[field];
  if (!f) return null;
  if (field === "gestationalAge" || field === "haemoglobin" || field === "bloodPressure") {
    const v = (out as Record<string, any>)[field];
    if (field === "bloodPressure") return { value: v.readings.length ? v.readings : null, absent: v.absent };
    return { value: v.value, absent: v.absent };
  }
  return { value: f.value, absent: f.absent };
}

export function scoreExtraction(
  gt: GroundTruth,
  out: ExtractionOutput,
  packText: string,
): ExtractionScore {
  const issues = semanticIssues(out, packText);
  const inventedFields = Array.from(
    new Set(
      issues
        .filter((i) => /provenance quote/.test(i.message))
        .map((i) => i.path.split(".")[0]),
    ),
  );

  let fieldsExtracted = 0;
  let provOk = 0;
  let provTotal = 0;
  for (const [k, v] of Object.entries(out) as Array<[string, any]>) {
    const present =
      v && typeof v === "object" && (("value" in v && v.value !== null) || v.readings?.length || v.entries?.length);
    if (present) fieldsExtracted += 1;
    const quote = v?.provenance?.quote ?? v?.value?.provenance?.quote;
    if (quote) {
      provTotal += 1;
      if (norm(packText).includes(norm(quote))) provOk += 1;
    }
  }

  const wronglyPresent: string[] = [];
  const wronglyAbsent: string[] = [];
  for (const exp of gt.extractionExpectations) {
    const f = get(out, exp.field);
    if (!f) continue;
    const hasValue = f.value !== null && f.value !== undefined && !f.absent;
    if (exp.expect === "absent" && hasValue) wronglyPresent.push(exp.field);
    if (exp.expect === "present" && !hasValue) wronglyAbsent.push(exp.field);
  }

  return {
    caseId: gt.id,
    fieldsExtracted,
    inventedValues: inventedFields.length + wronglyPresent.length,
    inventedFields: Array.from(new Set([...inventedFields, ...wronglyPresent])),
    wronglyPresent,
    wronglyAbsent,
    provenanceOk: provOk,
    provenanceTotal: provTotal,
  };
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
