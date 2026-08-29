import { z } from "zod";
import type { ModelProvider } from "../provider";
import type { ExtractionOutput } from "../agents/extract-schema";
import type { Finding, RequirementSet } from "../domain/types";

/**
 * Iteration 1 checker: the requirement comparison done as a MODEL judgment over
 * the structured extraction. Iteration 2 replaces this with deterministic code.
 * Kept so the changelog can measure run-to-run variance on the same pack.
 *
 * Uses the generic structured path via the "extract" tool slot is not possible;
 * this calls completeText and parses a JSON block, deliberately loose — the
 * point of iteration 2 is that this drifts.
 */
const ModelCheckSchema = z.object({
  findings: z.array(
    z.object({
      field: z.string(),
      kind: z.enum(["missing", "stale", "conditional"]),
      plain: z.string(),
    }),
  ),
});

export async function modelRequirementCheck(
  provider: ModelProvider,
  caseId: string,
  attemptLabel: string,
  raw: ExtractionOutput,
  reqs: RequirementSet,
): Promise<Finding[]> {
  const fieldDump = Object.entries(raw)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join("\n");
  const reqText = reqs.fields
    .map(
      (f) =>
        `- ${f.field}: ${f.requirement}${f.maxAgeDays ? `, max age ${f.maxAgeDays} days from the referral date` : ""}${
          f.condition ? `, only required if ${f.condition.description}` : ""
        }`,
    )
    .join("\n");

  const system = `You compare an already-extracted antenatal referral pack against a facility requirement set. For each mandatory field that is absent, each dated field older than its recency limit, and each conditional field whose condition is met but which is absent, output one finding. Do not assess anything clinically. Reply with a JSON object: {"findings":[{"field","kind","plain"}]} and nothing else. kind is one of missing, stale, conditional.`;

  const user = `REQUIREMENTS (${reqs.label}):\n${reqText}\n\nEXTRACTED FIELDS:\n${fieldDump}`;

  const res = await provider.completeText(
    { phase: "extract", caseId, label: `model-check-${attemptLabel}`, attempt: 1 },
    { system, user, maxTokens: 1500 },
  );

  const jsonStart = res.text.indexOf("{");
  const jsonEnd = res.text.lastIndexOf("}");
  if (jsonStart < 0 || jsonEnd < 0) return [];
  try {
    const parsed = ModelCheckSchema.safeParse(JSON.parse(res.text.slice(jsonStart, jsonEnd + 1)));
    if (!parsed.success) return [];
    return parsed.data.findings.map((f) => ({
      kind: f.kind,
      field: f.field,
      plain: f.plain,
      rule: `model_judgment.${reqs.type}.${f.field}`,
      provenance: null,
      raw: JSON.stringify(f),
      evidenceFile: "",
    }));
  } catch {
    return [];
  }
}
