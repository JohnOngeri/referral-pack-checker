/**
 * Deterministic requirements checker.
 *
 * Compares an extracted pack against a requirement set. Per field it returns one
 * of: present and current, present but stale, absent, or conditionally required
 * and absent. It is deliberately not a model call — a rule that must never drift
 * should not be re-decided on every run.
 */

import type {
  ReferralPack,
  RequirementFinding,
  RequirementSet,
  RequirementVerdict,
} from "../domain/types";
import { evalCondition, fieldStatus } from "../domain/access";
import { daysBetween, formatHuman, isIsoDate } from "../domain/dates";

export interface RequirementsResult {
  findings: RequirementFinding[];
  /** Every field verdict, including the ones that are fine — for the summary. */
  all: RequirementFinding[];
}

export function checkRequirements(
  pack: ReferralPack,
  reqs: RequirementSet,
): RequirementsResult {
  const all: RequirementFinding[] = [];
  const referralDate = pack.referralDate.value;

  for (const rf of reqs.fields) {
    const status = fieldStatus(pack, rf.field);

    const required =
      rf.requirement === "mandatory" ||
      (rf.requirement === "conditional" && !!rf.condition && evalCondition(rf.condition.key, pack));

    if (!required) {
      all.push({
        field: rf.field,
        label: rf.label,
        verdict: "not_required",
        rule: `requirements.${reqs.type}.${rf.field}`,
        detail:
          rf.requirement === "conditional"
            ? `Conditional (${rf.condition?.description}) — condition not met.`
            : "Not required for this referral type.",
        provenance: status.provenance,
      });
      continue;
    }

    if (!status.present) {
      const verdict: RequirementVerdict =
        rf.requirement === "conditional" ? "conditionally_required_absent" : "absent";
      all.push({
        field: rf.field,
        label: rf.label,
        verdict,
        rule: `requirements.${reqs.type}.${rf.field}`,
        detail:
          rf.requirement === "conditional"
            ? `Mandatory here because: ${rf.condition?.description}`
            : `${rf.label} is mandatory for ${reqs.label.toLowerCase()}.`,
        provenance: status.provenance,
      });
      continue;
    }

    // Present. Check recency when the field is dated.
    if (rf.maxAgeDays !== undefined) {
      if (!status.date || !isIsoDate(status.date)) {
        all.push({
          field: rf.field,
          label: rf.label,
          verdict: "present_stale",
          rule: `requirements.${reqs.type}.${rf.field}.max_age_days`,
          detail: `${rf.label} is recorded without a date, so it cannot be checked against the ${rf.maxAgeDays}-day recency limit.`,
          provenance: status.provenance,
          maxAgeDays: rf.maxAgeDays,
        });
        continue;
      }
      if (referralDate && isIsoDate(referralDate)) {
        const age = daysBetween(status.date, referralDate);
        if (age > rf.maxAgeDays) {
          all.push({
            field: rf.field,
            label: rf.label,
            verdict: "present_stale",
            rule: `requirements.${reqs.type}.${rf.field}.max_age_days`,
            detail: `Taken ${formatHuman(status.date)} (${age} days before the referral). This referral type requires a result from the last ${rf.maxAgeDays} days.`,
            provenance: status.provenance,
            ageDays: age,
            maxAgeDays: rf.maxAgeDays,
          });
          continue;
        }
      }
    }

    all.push({
      field: rf.field,
      label: rf.label,
      verdict: "present_current",
      rule: `requirements.${reqs.type}.${rf.field}`,
      detail: "Present and within the recency limit.",
      provenance: status.provenance,
    });
  }

  const findings = all.filter(
    (f) =>
      f.verdict === "absent" ||
      f.verdict === "conditionally_required_absent" ||
      f.verdict === "present_stale",
  );

  return { findings, all };
}

/** Count of distinct field-level rules across a requirement set (for reporting). */
export function ruleCount(reqs: RequirementSet): number {
  return reqs.fields.reduce((n, f) => n + (f.maxAgeDays !== undefined ? 2 : 1), 0);
}
