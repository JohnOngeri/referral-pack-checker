/**
 * Deterministic consistency rules.
 *
 * These are arithmetic and calendar checks over an extracted pack. They are NOT
 * model judgments. When a rule fires it reports every conflicting value with its
 * provenance and never decides which value is correct — that is the clinician's
 * call.
 *
 * Six rules:
 *   1. ga_matches_lmp
 *   2. edd_matches_lmp
 *   3. no_future_dates
 *   4. no_date_before_lmp
 *   5. parity_matches_obstetric_history
 *   6. present_field_holds_real_value
 */

import type { ConsistencyFinding, ReferralPack, Provenance } from "./types";
import {
  addDays,
  daysBetween,
  eddFromLmp,
  formatHuman,
  formatWeeksDays,
  fromWeeksDays,
  gaDaysFromLmp,
  isIsoDate,
  toWeeksDays,
} from "./dates";
import { isPlaceholder } from "./placeholder";

export const GA_LMP_TOLERANCE_DAYS = 7;
export const EDD_LMP_TOLERANCE_DAYS = 3;

type DatedValue = { label: string; iso: string; provenance: Provenance | null };

/** Collect every clinical date in the pack, for the calendar-bound checks. */
function clinicalDates(pack: ReferralPack): DatedValue[] {
  const out: DatedValue[] = [];
  const push = (label: string, iso: string | null, p: Provenance | null) => {
    if (iso && isIsoDate(iso)) out.push({ label, iso, provenance: p });
  };
  push("Haemoglobin sample", pack.haemoglobin.date, pack.haemoglobin.provenance);
  push("HIV screen", pack.hivScreen.date, pack.hivScreen.provenance);
  push("Syphilis screen", pack.syphilisScreen.date, pack.syphilisScreen.provenance);
  push("Estimated delivery date", pack.edd.value, pack.edd.provenance);
  push("Anti-D", pack.antiD.value && extractDate(pack.antiD.value), pack.antiD.provenance);
  pack.bloodPressure.readings.forEach((r, i) => {
    push(`Blood pressure reading ${i + 1}`, r.date, r.provenance ?? pack.bloodPressure.provenance);
  });
  if (pack.gestationalAge.value?.assessedOn) {
    push(
      "Gestational age assessment",
      pack.gestationalAge.value.assessedOn,
      pack.gestationalAge.provenance,
    );
  }
  return out;
}

function extractDate(s: string): string | null {
  const m = s.match(/\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : null;
}

// ── Rule 1: GA derived from LMP must agree with recorded GA ──────────────────
function gaMatchesLmp(pack: ReferralPack): ConsistencyFinding | null {
  const lmp = pack.lmp.value;
  const ga = pack.gestationalAge.value;
  if (!lmp || !isIsoDate(lmp) || !ga) return null;

  const on = ga.assessedOn && isIsoDate(ga.assessedOn) ? ga.assessedOn : pack.referralDate.value;
  if (!on || !isIsoDate(on)) return null;

  const derivedDays = gaDaysFromLmp(lmp, on);
  const recordedDays = fromWeeksDays(ga.weeks, ga.days);
  const delta = Math.abs(derivedDays - recordedDays);
  if (delta <= GA_LMP_TOLERANCE_DAYS) return null;

  const dWd = toWeeksDays(derivedDays);
  const rWd = toWeeksDays(recordedDays);
  return {
    rule: "consistency.ga_matches_lmp",
    field: "gestationalAge",
    statement:
      `Gestational age is recorded as ${formatWeeksDays(rWd.weeks, rWd.days)} weeks. ` +
      `The recorded last menstrual period of ${formatHuman(lmp)} gives ` +
      `${formatWeeksDays(dWd.weeks, dWd.days)} weeks on ${formatHuman(on)}.`,
    values: [
      {
        label: "Recorded gestational age",
        value: `${formatWeeksDays(rWd.weeks, rWd.days)} weeks`,
        provenance: pack.gestationalAge.provenance,
        derived: false,
      },
      {
        label: "Gestational age derived from LMP",
        value: `${formatWeeksDays(dWd.weeks, dWd.days)} weeks on ${formatHuman(on)}`,
        provenance: pack.lmp.provenance,
        derived: true,
      },
    ],
    detail: {
      lmp,
      assessed_on: on,
      derived_ga_days: derivedDays,
      recorded_ga_days: recordedDays,
      delta_days: derivedDays - recordedDays,
      tolerance_days: GA_LMP_TOLERANCE_DAYS,
      resolution: null,
    },
  };
}

// ── Rule 2: EDD must be consistent with LMP ─────────────────────────────────
function eddMatchesLmp(pack: ReferralPack): ConsistencyFinding | null {
  const lmp = pack.lmp.value;
  const edd = pack.edd.value;
  if (!lmp || !isIsoDate(lmp) || !edd || !isIsoDate(edd)) return null;

  const derivedEdd = eddFromLmp(lmp);
  const delta = daysBetween(derivedEdd, edd);
  if (Math.abs(delta) <= EDD_LMP_TOLERANCE_DAYS) return null;

  return {
    rule: "consistency.edd_matches_lmp",
    field: "edd",
    statement:
      `The estimated delivery date is recorded as ${formatHuman(edd)}. ` +
      `The recorded last menstrual period of ${formatHuman(lmp)} gives ${formatHuman(derivedEdd)}.`,
    values: [
      {
        label: "Recorded estimated delivery date",
        value: formatHuman(edd),
        provenance: pack.edd.provenance,
        derived: false,
      },
      {
        label: "Estimated delivery date derived from LMP",
        value: `${formatHuman(derivedEdd)} (LMP + 280 days)`,
        provenance: pack.lmp.provenance,
        derived: true,
      },
    ],
    detail: {
      lmp,
      derived_edd: derivedEdd,
      recorded_edd: edd,
      delta_days: delta,
      tolerance_days: EDD_LMP_TOLERANCE_DAYS,
      resolution: null,
    },
  };
}

// ── Rule 3: no clinical date may fall after the referral date ───────────────
function noFutureDates(pack: ReferralPack): ConsistencyFinding[] {
  const ref = pack.referralDate.value;
  if (!ref || !isIsoDate(ref)) return [];
  const out: ConsistencyFinding[] = [];
  for (const d of clinicalDates(pack)) {
    // The estimated delivery date is meant to be in the future; a GA assessment
    // may legitimately fall on the referral date. Neither is a "future date" fault.
    if (d.label === "Estimated delivery date" || d.label === "Gestational age assessment") {
      continue;
    }
    if (daysBetween(ref, d.iso) > 0) {
      out.push({
        rule: "consistency.no_future_dates",
        field: fieldFor(d.label),
        statement:
          `${d.label} is dated ${formatHuman(d.iso)}, which is after the referral date of ` +
          `${formatHuman(ref)}.`,
        values: [
          { label: d.label, value: formatHuman(d.iso), provenance: d.provenance, derived: false },
          {
            label: "Referral date",
            value: formatHuman(ref),
            provenance: pack.referralDate.provenance,
            derived: false,
          },
        ],
        detail: {
          field_date: d.iso,
          referral_date: ref,
          days_after: daysBetween(ref, d.iso),
          resolution: null,
        },
      });
    }
  }
  return out;
}

// ── Rule 4: no date may precede the LMP ────────────────────────────────────
function noDateBeforeLmp(pack: ReferralPack): ConsistencyFinding[] {
  const lmp = pack.lmp.value;
  if (!lmp || !isIsoDate(lmp)) return [];
  const out: ConsistencyFinding[] = [];
  for (const d of clinicalDates(pack)) {
    if (d.label === "Estimated delivery date" || d.label === "Gestational age assessment") continue;
    if (daysBetween(lmp, d.iso) < 0) {
      out.push({
        rule: "consistency.no_date_before_lmp",
        field: fieldFor(d.label),
        statement:
          `${d.label} is dated ${formatHuman(d.iso)}, which is before the recorded last menstrual ` +
          `period of ${formatHuman(lmp)}.`,
        values: [
          { label: d.label, value: formatHuman(d.iso), provenance: d.provenance, derived: false },
          {
            label: "Last menstrual period",
            value: formatHuman(lmp),
            provenance: pack.lmp.provenance,
            derived: false,
          },
        ],
        detail: {
          field_date: d.iso,
          lmp,
          days_before: -daysBetween(lmp, d.iso),
          resolution: null,
        },
      });
    }
  }
  return out;
}

// ── Rule 5: recorded parity must match the obstetric history listed ─────────
const BIRTH_OUTCOMES = new Set(["term_birth", "preterm_birth", "stillbirth"]);

function parityMatchesHistory(pack: ReferralPack): ConsistencyFinding | null {
  const parity = pack.parity.value;
  const hist = pack.previousObstetricHistory;
  if (parity === null || hist.absent || hist.entries.length === 0) return null;

  const births = hist.entries.filter(
    (e) => BIRTH_OUTCOMES.has(e.outcome) && (e.gestationWeeks === null || e.gestationWeeks >= 24),
  );
  if (births.length === parity) return null;

  return {
    rule: "consistency.parity_matches_obstetric_history",
    field: "parity",
    statement:
      `Parity is recorded as ${parity}. The previous obstetric history lists ${births.length} ` +
      `birth${births.length === 1 ? "" : "s"} at or beyond 24 weeks ` +
      `(${hist.entries.length} previous ${hist.entries.length === 1 ? "pregnancy" : "pregnancies"} in total).`,
    values: [
      {
        label: "Recorded parity",
        value: String(parity),
        provenance: pack.parity.provenance,
        derived: false,
      },
      {
        label: "Births counted from obstetric history",
        value: String(births.length),
        provenance: hist.provenance,
        derived: true,
      },
    ],
    detail: {
      recorded_parity: parity,
      history_entries: hist.entries.length,
      history_births_24w_plus: births.length,
      history: hist.entries.map((e) => ({ summary: e.summary, outcome: e.outcome, weeks: e.gestationWeeks })),
      resolution: null,
    },
  };
}

// ── Rule 6: a field marked present must hold a real value ───────────────────
function presentFieldHoldsRealValue(pack: ReferralPack): ConsistencyFinding[] {
  const out: ConsistencyFinding[] = [];
  const check = (
    field: string,
    label: string,
    present: boolean,
    text: string | null,
    provenance: Provenance | null,
    allowNil = false,
  ) => {
    if (!present) return;
    if (isPlaceholder(text, allowNil)) {
      out.push({
        rule: "consistency.present_field_holds_real_value",
        field,
        statement: `${label} is marked as recorded, but the entry holds "${(text ?? "").trim() || "(blank)"}" rather than a value.`,
        values: [
          {
            label,
            value: (text ?? "").trim() || "(blank)",
            provenance,
            derived: false,
          },
        ],
        detail: { field, recorded_text: text, resolution: null },
      });
    }
  };

  check(
    "haemoglobin",
    "Haemoglobin",
    pack.haemoglobin.provenance !== null && !pack.haemoglobin.absent,
    pack.haemoglobin.provenance?.quote ?? null,
    pack.haemoglobin.provenance,
  );
  // Simple string fields where a label may be present with no value.
  const simple: Array<[string, string, { value: string | null; absent: boolean; provenance: Provenance | null }]> = [
    ["bloodGroup", "Blood group", pack.bloodGroup],
    ["reasonForReferral", "Reason for referral", pack.reasonForReferral],
    ["patientId", "Patient identifier", pack.patientId],
  ];
  for (const [f, l, fld] of simple) {
    check(f, l, fld.provenance !== null && !fld.absent, fld.value ?? fld.provenance?.quote ?? null, fld.provenance);
  }
  return out;
}

function fieldFor(label: string): string {
  if (label.startsWith("Haemoglobin")) return "haemoglobin";
  if (label.startsWith("HIV")) return "hivScreen";
  if (label.startsWith("Syphilis")) return "syphilisScreen";
  if (label.startsWith("Blood pressure")) return "bloodPressure";
  if (label.startsWith("Anti-D")) return "antiD";
  if (label.startsWith("Estimated delivery")) return "edd";
  if (label.startsWith("Gestational age")) return "gestationalAge";
  return "unknown";
}

/** Run every consistency rule. Order is stable. */
export function runConsistencyChecks(pack: ReferralPack): ConsistencyFinding[] {
  return [
    gaMatchesLmp(pack),
    eddMatchesLmp(pack),
    ...noFutureDates(pack),
    ...noDateBeforeLmp(pack),
    parityMatchesHistory(pack),
    ...presentFieldHoldsRealValue(pack),
  ].filter((f): f is ConsistencyFinding => f !== null);
}

export const CONSISTENCY_RULES = [
  "consistency.ga_matches_lmp",
  "consistency.edd_matches_lmp",
  "consistency.no_future_dates",
  "consistency.no_date_before_lmp",
  "consistency.parity_matches_obstetric_history",
  "consistency.present_field_holds_real_value",
] as const;
