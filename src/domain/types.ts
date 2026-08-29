/**
 * Typed schema for an antenatal referral pack.
 *
 * Every field carries an explicit `absent` marker and a `provenance` span pointing
 * at the exact source text it was read from. A field without provenance is absent
 * by construction — see `isPresent()`.
 *
 * This module defines documentation structure only. Nothing here interprets a
 * value clinically.
 */

/** The exact source text a field was read from, plus where it sat in the pack. */
export interface Provenance {
  /** Verbatim substring of the pack text. Must occur in the source. */
  quote: string;
  /** 1-indexed line number in the pack text, when known. */
  line: number | null;
}

/** A single extracted field. */
export interface Field<T> {
  /** Parsed value, or null when absent / unparseable. */
  value: T | null;
  /** True when the field could not be located, or holds only a placeholder. */
  absent: boolean;
  /** Source span. Null means the extractor found nothing to point at. */
  provenance: Provenance | null;
  /** Set when `absent` is true and the field label was present but empty. */
  absentReason?: "not_found" | "placeholder" | "no_value";
}

export type BloodPressureReading = {
  systolic: number;
  diastolic: number;
  /** ISO date (YYYY-MM-DD) or null. */
  date: string | null;
  provenance: Provenance | null;
};

export type ObstetricOutcome =
  | "term_birth"
  | "preterm_birth"
  | "stillbirth"
  | "miscarriage"
  | "termination"
  | "ectopic"
  | "other";

export type ObstetricHistoryEntry = {
  /** Verbatim summary as written on the card. */
  summary: string;
  outcome: ObstetricOutcome;
  /** Gestation in completed weeks when stated, else null. */
  gestationWeeks: number | null;
  year: number | null;
  provenance: Provenance | null;
};

export type ScreeningResult = {
  /** As documented: "negative", "positive", "not done", or the raw string. */
  status: string | null;
  date: string | null;
  provenance: Provenance | null;
};

export type GestationalAge = {
  weeks: number;
  days: number;
  /** The date this GA was recorded at, if the card states one. ISO date. */
  assessedOn: string | null;
  provenance: Provenance | null;
};

/**
 * The full pack. Composite fields (haemoglobin, screening, BP, history) use their
 * own shapes above; simple fields use `Field<T>`.
 */
export interface ReferralPack {
  patientId: Field<string>;
  ageYears: Field<number>;

  lmp: Field<string>; // ISO date
  edd: Field<string>; // ISO date
  gestationalAge: Field<GestationalAge>;

  gravidity: Field<number>;
  parity: Field<number>;

  bloodGroup: Field<string>; // e.g. "O"
  rhesus: Field<string>; // "positive" | "negative" | raw

  haemoglobin: {
    value: number | null; // g/dL
    date: string | null; // ISO
    absent: boolean;
    provenance: Provenance | null;
    absentReason?: Field<unknown>["absentReason"];
  };

  hivScreen: ScreeningResult;
  syphilisScreen: ScreeningResult;

  bloodPressure: {
    readings: BloodPressureReading[];
    absent: boolean;
    provenance: Provenance | null;
  };

  urineProtein: Field<string>;

  previousObstetricHistory: {
    entries: ObstetricHistoryEntry[];
    /** True when the card has no history section at all. */
    absent: boolean;
    provenance: Provenance | null;
  };

  medications: Field<string[]>;
  allergies: Field<string>;

  reasonForReferral: Field<string>;

  referringFacility: Field<string>;
  referringClinician: Field<string>;
  referralDate: Field<string>; // ISO date

  receivingFacility: Field<string>;
  receivingDepartment: Field<string>;

  antiD: Field<string>; // anti-D immunoglobulin given + date, when documented
}

/** A field is present only when it holds a real value AND has a source span. */
export function fieldPresent<T>(f: Field<T>): boolean {
  return !f.absent && f.value !== null && f.provenance !== null;
}

export type ReferralType =
  | "elective_caesarean"
  | "hypertension_review"
  | "anaemia_review"
  | "routine_ultrasound";

export const REFERRAL_TYPE_LABEL: Record<ReferralType, string> = {
  elective_caesarean: "Elective caesarean booking",
  hypertension_review: "Hypertension in pregnancy review",
  anaemia_review: "Anaemia review",
  routine_ultrasound: "Routine ultrasound referral",
};

/** Requirement set, loaded from fixtures/requirements/<type>.json. */
export interface RequirementSet {
  type: ReferralType;
  label: string;
  /** Human note shown in the interface / README. */
  note: string;
  fields: RequirementField[];
}

export interface RequirementField {
  /** Dotted path into ReferralPack, e.g. "bloodGroup" or "haemoglobin". */
  field: string;
  label: string;
  requirement: "mandatory" | "conditional";
  /** For conditional fields: the condition in plain words + a machine key. */
  condition?: {
    description: string;
    /** Machine-checkable predicate key resolved in checks/requirements.ts. */
    key: string;
  };
  /** Max age in days for a dated value to count as current. Omit if not dated. */
  maxAgeDays?: number;
}

/** Per-field verdict from the deterministic requirements checker. */
export type RequirementVerdict =
  | "present_current"
  | "present_stale"
  | "absent"
  | "conditionally_required_absent"
  | "not_required";

export interface RequirementFinding {
  field: string;
  label: string;
  verdict: RequirementVerdict;
  rule: string;
  /** The requirement rule expressed as it appears in the config. */
  detail: string;
  provenance: Provenance | null;
  /** For stale values: age in days and the limit. */
  ageDays?: number;
  maxAgeDays?: number;
}

/** A contradiction found by the deterministic consistency verifier. */
export interface ConsistencyFinding {
  rule: string;
  field: string;
  /** Plain-English statement of the contradiction. No resolution. */
  statement: string;
  /** The two (or more) conflicting values, each with its own provenance. */
  values: Array<{
    label: string;
    value: string;
    provenance: Provenance | null;
    derived: boolean;
  }>;
  /** Machine detail for the evidence drawer. Never contains a resolution. */
  detail: Record<string, unknown>;
}

export type FindingKind = "missing" | "placeholder" | "stale" | "conditional" | "contradiction";

/** Unified finding shown in the dashboard. */
export interface Finding {
  kind: FindingKind;
  /** Dotted field path. */
  field: string;
  /** One plain-English sentence, layperson-readable. Leads every card. */
  plain: string;
  /** The requirement or consistency rule identifier that fired. */
  rule: string;
  /** Source span(s). */
  provenance: Provenance | null;
  /** Extra spans for contradictions (both sides). */
  extraProvenance?: Provenance[];
  /** Raw model output excerpt or deterministic detail for the drawer. */
  raw: string;
  /** Path to the committed evidence file. */
  evidenceFile: string;
  /** Facility-history note from memory, when relevant. Never a value. */
  memoryNote?: string;
  /** For contradictions: a fixed reminder that the tool resolves nothing. */
  note?: string;
}
