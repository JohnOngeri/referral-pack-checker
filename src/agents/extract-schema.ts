import { z } from "zod";
import type { ReferralPack } from "../domain/types";
import { isIsoDate } from "../domain/dates";

const prov = z
  .object({ quote: z.string(), line: z.number().int().nullable() })
  .nullable();

const fieldOf = <T extends z.ZodTypeAny>(v: T) =>
  z.object({
    value: v.nullable(),
    absent: z.boolean(),
    provenance: prov,
    absentReason: z.enum(["not_found", "placeholder", "no_value"]).nullable().optional(),
  });

export const ExtractionSchema = z.object({
  patientId: fieldOf(z.string()),
  ageYears: fieldOf(z.number()),
  lmp: fieldOf(z.string()),
  edd: fieldOf(z.string()),
  gestationalAge: z.object({
    value: z
      .object({
        weeks: z.number().int(),
        days: z.number().int(),
        assessedOn: z.string().nullable(),
        provenance: prov,
      })
      .nullable(),
    absent: z.boolean(),
    provenance: prov,
  }),
  gravidity: fieldOf(z.number().int()),
  parity: fieldOf(z.number().int()),
  bloodGroup: fieldOf(z.string()),
  rhesus: fieldOf(z.string()),
  haemoglobin: z.object({
    value: z.number().nullable(),
    date: z.string().nullable(),
    absent: z.boolean(),
    provenance: prov,
    absentReason: z.enum(["not_found", "placeholder", "no_value"]).nullable().optional(),
  }),
  hivScreen: z.object({ status: z.string().nullable(), date: z.string().nullable(), provenance: prov }),
  syphilisScreen: z.object({ status: z.string().nullable(), date: z.string().nullable(), provenance: prov }),
  bloodPressure: z.object({
    readings: z.array(
      z.object({
        systolic: z.number().int(),
        diastolic: z.number().int(),
        date: z.string().nullable(),
        provenance: prov,
      }),
    ),
    absent: z.boolean(),
    provenance: prov,
  }),
  urineProtein: fieldOf(z.string()),
  previousObstetricHistory: z.object({
    entries: z.array(
      z.object({
        summary: z.string(),
        outcome: z.enum([
          "term_birth",
          "preterm_birth",
          "stillbirth",
          "miscarriage",
          "termination",
          "ectopic",
          "other",
        ]),
        gestationWeeks: z.number().int().nullable(),
        year: z.number().int().nullable(),
        provenance: prov,
      }),
    ),
    absent: z.boolean(),
    provenance: prov,
  }),
  medications: fieldOf(z.array(z.string())),
  allergies: fieldOf(z.string()),
  reasonForReferral: fieldOf(z.string()),
  referringFacility: fieldOf(z.string()),
  referringClinician: fieldOf(z.string()),
  referralDate: fieldOf(z.string()),
  receivingFacility: fieldOf(z.string()),
  receivingDepartment: fieldOf(z.string()),
  antiD: fieldOf(z.string()),
});

export type ExtractionOutput = z.infer<typeof ExtractionSchema>;

export interface SemanticIssue {
  path: string;
  message: string;
}

/**
 * Semantic validation beyond shape: every provenance quote must appear in the
 * pack text, and every date-bearing field must be ISO. Returns issues to feed
 * back to the model on retry.
 */
export function semanticIssues(out: ExtractionOutput, packText: string): SemanticIssue[] {
  const issues: SemanticIssue[] = [];
  const haystack = normalise(packText);

  const checkQuote = (path: string, quote: string | undefined | null) => {
    if (!quote) return;
    if (!haystack.includes(normalise(quote))) {
      issues.push({
        path,
        message: `provenance quote ${JSON.stringify(quote)} does not appear in the pack text. Quote the exact source text or set provenance to null and absent to true.`,
      });
    }
  };
  const checkIso = (path: string, v: string | null | undefined) => {
    if (v && !isIsoDate(v)) {
      issues.push({ path, message: `date ${JSON.stringify(v)} is not an ISO date (YYYY-MM-DD).` });
    }
  };

  for (const [k, v] of Object.entries(out) as Array<[string, any]>) {
    if (v && typeof v === "object" && "provenance" in v) {
      checkQuote(`${k}.provenance`, v.provenance?.quote);
    }
    if (v?.value?.provenance) checkQuote(`${k}.value.provenance`, v.value.provenance.quote);
  }
  out.bloodPressure.readings.forEach((r, i) => {
    checkQuote(`bloodPressure.readings[${i}].provenance`, r.provenance?.quote);
    checkIso(`bloodPressure.readings[${i}].date`, r.date);
  });
  out.previousObstetricHistory.entries.forEach((e, i) => {
    checkQuote(`previousObstetricHistory.entries[${i}].provenance`, e.provenance?.quote);
  });

  checkIso("lmp.value", out.lmp.value);
  checkIso("edd.value", out.edd.value);
  checkIso("referralDate.value", out.referralDate.value);
  checkIso("haemoglobin.date", out.haemoglobin.date);
  checkIso("hivScreen.date", out.hivScreen.date);
  checkIso("syphilisScreen.date", out.syphilisScreen.date);
  checkIso("gestationalAge.value.assessedOn", out.gestationalAge.value?.assessedOn ?? null);

  return issues;
}

function normalise(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Convert a validated extraction into the domain ReferralPack shape. */
export function toReferralPack(out: ExtractionOutput): ReferralPack {
  return out as unknown as ReferralPack;
}
