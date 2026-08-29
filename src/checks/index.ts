import type {
  ConsistencyFinding,
  Finding,
  ReferralPack,
  RequirementFinding,
  RequirementSet,
} from "../domain/types";
import { checkRequirements, type RequirementsResult } from "./requirements";
import { runConsistencyChecks } from "../domain/consistency";
import { formatHuman } from "../domain/dates";

export interface CheckResult {
  requirements: RequirementsResult;
  consistency: ConsistencyFinding[];
  findings: Finding[];
}

const CONTRADICTION_NOTE =
  "Both values are reported with their source. This tool does not decide which is correct.";

function plainForRequirement(f: RequirementFinding, reqs: RequirementSet): string {
  const facility = reqs.label.toLowerCase();
  switch (f.verdict) {
    case "absent":
      return `${f.label} is not recorded anywhere in this pack, and ${facility} requires it.`;
    case "conditionally_required_absent":
      return `${f.label} is not in this pack. ${f.detail}`;
    case "present_stale":
      if (f.ageDays !== undefined && f.maxAgeDays !== undefined) {
        return `${f.label} is ${f.ageDays} days old; ${facility} requires a result from the last ${f.maxAgeDays} days.`;
      }
      return `${f.label} is recorded without a date, so it cannot be confirmed as current.`;
    default:
      return `${f.label}: ${f.detail}`;
  }
}

function kindForRequirement(f: RequirementFinding): Finding["kind"] {
  if (f.verdict === "present_stale") return "stale";
  if (f.verdict === "conditionally_required_absent") return "conditional";
  return "missing";
}

export function runChecks(
  pack: ReferralPack,
  reqs: RequirementSet,
  opts: { rawByField?: Record<string, string>; memoryNotes?: Record<string, string> } = {},
): CheckResult {
  const requirements = checkRequirements(pack, reqs);
  const consistency = runConsistencyChecks(pack);
  const findings: Finding[] = [];

  for (const rf of requirements.findings) {
    findings.push({
      kind: kindForRequirement(rf),
      field: rf.field,
      plain: plainForRequirement(rf, reqs),
      rule: rf.rule,
      provenance: rf.provenance,
      raw: opts.rawByField?.[rf.field] ?? rf.detail,
      evidenceFile: "", // filled by the pipeline
      memoryNote: opts.memoryNotes?.[rf.field],
    });
  }

  for (const c of consistency) {
    findings.push({
      kind: c.rule.includes("present_field_holds_real_value") ? "placeholder" : "contradiction",
      field: c.field,
      plain: c.statement,
      rule: c.rule,
      provenance: c.values[0]?.provenance ?? null,
      extraProvenance: c.values.slice(1).map((v) => v.provenance).filter((p): p is NonNullable<typeof p> => !!p),
      raw: JSON.stringify(c.detail, null, 2),
      evidenceFile: "",
      note: c.rule.includes("present_field_holds_real_value") ? undefined : CONTRADICTION_NOTE,
      memoryNote: opts.memoryNotes?.[c.field],
    });
  }

  // Memory can surface a recurring omission earlier in the list.
  findings.sort((a, b) => rankKind(a.kind) - rankKind(b.kind) || (b.memoryNote ? 1 : 0) - (a.memoryNote ? 1 : 0));

  return { requirements, consistency, findings };
}

function rankKind(k: Finding["kind"]): number {
  return { contradiction: 0, missing: 1, conditional: 2, placeholder: 3, stale: 4 }[k];
}

export { formatHuman };
