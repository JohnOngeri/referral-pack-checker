/**
 * Field access helpers. Map a requirement-set field name onto the extracted
 * pack: is it present, what is its source span, and what date (if any) does it
 * carry for the recency check.
 *
 * Presence here means "a real value with provenance" — see `fieldPresent`.
 */

import type { Provenance, ReferralPack } from "./types";
import { fieldPresent } from "./types";
import { isPlaceholder } from "./placeholder";

export interface FieldStatus {
  known: boolean;
  present: boolean;
  provenance: Provenance | null;
  /** ISO date carried by the field, for recency checks. Null when undated. */
  date: string | null;
  /** Raw recorded text, when the label was present. */
  recordedText: string | null;
}

const ABSENT: FieldStatus = {
  known: true,
  present: false,
  provenance: null,
  date: null,
  recordedText: null,
};

export function fieldStatus(pack: ReferralPack, field: string): FieldStatus {
  switch (field) {
    case "patientId":
      return simple(pack.patientId);
    case "ageYears":
      return simple(pack.ageYears);
    case "lmp":
      return simple(pack.lmp);
    case "edd":
      return simple(pack.edd);
    case "gestationalAge": {
      const f = pack.gestationalAge;
      const present = fieldPresent(f);
      return {
        known: true,
        present,
        provenance: f.provenance,
        date: f.value?.assessedOn ?? null,
        recordedText: f.provenance?.quote ?? null,
      };
    }
    case "gravidity":
      return simple(pack.gravidity);
    case "parity":
      return simple(pack.parity);
    case "bloodGroup":
      return simple(pack.bloodGroup);
    case "rhesus":
      return simple(pack.rhesus);
    case "haemoglobin": {
      const f = pack.haemoglobin;
      const present = !f.absent && f.value !== null && f.provenance !== null;
      return {
        known: true,
        present,
        provenance: f.provenance,
        date: f.date,
        recordedText: f.provenance?.quote ?? null,
      };
    }
    case "hivScreen":
      return screening(pack.hivScreen);
    case "syphilisScreen":
      return screening(pack.syphilisScreen);
    case "bloodPressure": {
      const f = pack.bloodPressure;
      const present = !f.absent && f.readings.length > 0;
      const dates = f.readings.map((r) => r.date).filter((d): d is string => !!d).sort();
      return {
        known: true,
        present,
        provenance: f.provenance ?? f.readings[0]?.provenance ?? null,
        date: dates.length ? dates[dates.length - 1] : null,
        recordedText: f.provenance?.quote ?? null,
      };
    }
    case "urineProtein":
      return simple(pack.urineProtein);
    case "previousObstetricHistory": {
      const f = pack.previousObstetricHistory;
      return {
        known: true,
        present: !f.absent && f.entries.length > 0,
        provenance: f.provenance,
        date: null,
        recordedText: f.provenance?.quote ?? null,
      };
    }
    case "medications": {
      const f = pack.medications;
      const present = !f.absent && f.provenance !== null;
      return {
        known: true,
        present,
        provenance: f.provenance,
        date: null,
        recordedText: f.provenance?.quote ?? null,
      };
    }
    case "allergies":
      return simple(pack.allergies, true);
    case "reasonForReferral":
      return simple(pack.reasonForReferral);
    case "referringFacility":
      return simple(pack.referringFacility);
    case "referringClinician":
      return simple(pack.referringClinician);
    case "referralDate":
      return simple(pack.referralDate);
    case "receivingFacility":
      return simple(pack.receivingFacility);
    case "receivingDepartment":
      return simple(pack.receivingDepartment);
    case "antiD":
      return simple(pack.antiD);
    default:
      return { ...ABSENT, known: false };
  }
}

function simple(
  f: { value: unknown; absent: boolean; provenance: Provenance | null },
  allowNil = false,
): FieldStatus {
  const text = typeof f.value === "string" ? f.value : (f.provenance?.quote ?? null);
  const present =
    !f.absent && f.value !== null && f.provenance !== null && !isPlaceholder(text, allowNil);
  return {
    known: true,
    present,
    provenance: f.provenance,
    date: null,
    recordedText: text,
  };
}

function screening(s: {
  status: string | null;
  date: string | null;
  provenance: Provenance | null;
}): FieldStatus {
  return {
    known: true,
    present: s.status !== null && !isPlaceholder(s.status, true) && s.provenance !== null,
    provenance: s.provenance,
    date: s.date,
    recordedText: s.provenance?.quote ?? s.status,
  };
}

// ── Conditional predicates for requirement sets ─────────────────────────────

export function evalCondition(key: string, pack: ReferralPack): boolean {
  switch (key) {
    case "rhesus_negative": {
      const r = (pack.rhesus.value ?? "").toLowerCase();
      return r.includes("neg") || r === "-" || r.includes("rh-");
    }
    case "reason_mentions_bleeding_or_placenta": {
      const reason = (pack.reasonForReferral.value ?? "").toLowerCase();
      return /bleed|aph|haemorrhag|hemorrhag|placenta|praevia|previa|abrupt/.test(reason);
    }
    default:
      return false;
  }
}
