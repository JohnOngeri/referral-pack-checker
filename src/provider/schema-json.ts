/**
 * Hand-written JSON Schemas for the model's structured outputs. Used as forced
 * tool inputs so the model must return a shape we can validate. Kept separate
 * from the Zod validators so the wire contract is explicit.
 */

const provenance = {
  type: "object",
  additionalProperties: false,
  properties: {
    quote: { type: "string", description: "Verbatim substring of the pack text." },
    line: { type: ["integer", "null"], description: "1-indexed line number, or null." },
  },
  required: ["quote", "line"],
};

const nullableProvenance = { anyOf: [provenance, { type: "null" }] };

function field(valueType: unknown, desc: string) {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      value: { anyOf: [valueType as object, { type: "null" }], description: desc },
      absent: { type: "boolean" },
      provenance: nullableProvenance,
      absentReason: {
        anyOf: [{ type: "string", enum: ["not_found", "placeholder", "no_value"] }, { type: "null" }],
      },
    },
    required: ["value", "absent", "provenance"],
  };
}

export const EXTRACTION_TOOL = {
  name: "record_referral_pack",
  description:
    "Record every field of the referral pack exactly as documented. Quote the source text for every value. Mark a field absent when you cannot locate it; never guess a value.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      patientId: field({ type: "string" }, "Patient identifier / file number as written."),
      ageYears: field({ type: "number" }, "Age in years."),
      lmp: field({ type: "string" }, "Last menstrual period as ISO date YYYY-MM-DD. Card dates are day/month/year."),
      edd: field({ type: "string" }, "Estimated delivery date as ISO date YYYY-MM-DD."),
      gestationalAge: {
        type: "object",
        additionalProperties: false,
        properties: {
          value: {
            anyOf: [
              {
                type: "object",
                additionalProperties: false,
                properties: {
                  weeks: { type: "integer" },
                  days: { type: "integer" },
                  assessedOn: { type: ["string", "null"], description: "ISO date the GA was recorded at, or null." },
                  provenance: nullableProvenance,
                },
                required: ["weeks", "days", "assessedOn", "provenance"],
              },
              { type: "null" },
            ],
          },
          absent: { type: "boolean" },
          provenance: nullableProvenance,
        },
        required: ["value", "absent", "provenance"],
      },
      gravidity: field({ type: "integer" }, "Gravidity (G number)."),
      parity: field({ type: "integer" }, "Parity (P number)."),
      bloodGroup: field({ type: "string" }, "ABO blood group only, e.g. 'O', 'A', 'B', 'AB'. Check margin notes."),
      rhesus: field({ type: "string" }, "Rhesus status: 'positive' or 'negative' as documented."),
      haemoglobin: {
        type: "object",
        additionalProperties: false,
        properties: {
          value: { anyOf: [{ type: "number" }, { type: "null" }], description: "Haemoglobin in g/dL." },
          date: { anyOf: [{ type: "string" }, { type: "null" }], description: "ISO date sample was taken." },
          absent: { type: "boolean" },
          provenance: nullableProvenance,
          absentReason: {
            anyOf: [{ type: "string", enum: ["not_found", "placeholder", "no_value"] }, { type: "null" }],
          },
        },
        required: ["value", "date", "absent", "provenance"],
      },
      hivScreen: screening("HIV screening"),
      syphilisScreen: screening("Syphilis / RPR / VDRL screening"),
      bloodPressure: {
        type: "object",
        additionalProperties: false,
        properties: {
          readings: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                systolic: { type: "integer" },
                diastolic: { type: "integer" },
                date: { type: ["string", "null"], description: "ISO date." },
                provenance: nullableProvenance,
              },
              required: ["systolic", "diastolic", "date", "provenance"],
            },
          },
          absent: { type: "boolean" },
          provenance: nullableProvenance,
        },
        required: ["readings", "absent", "provenance"],
      },
      urineProtein: field({ type: "string" }, "Urine protein result as documented, e.g. '1+', 'nil', 'trace'."),
      previousObstetricHistory: {
        type: "object",
        additionalProperties: false,
        properties: {
          entries: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                summary: { type: "string", description: "Verbatim entry." },
                outcome: {
                  type: "string",
                  enum: [
                    "term_birth",
                    "preterm_birth",
                    "stillbirth",
                    "miscarriage",
                    "termination",
                    "ectopic",
                    "other",
                  ],
                },
                gestationWeeks: { type: ["integer", "null"] },
                year: { type: ["integer", "null"] },
                provenance: nullableProvenance,
              },
              required: ["summary", "outcome", "gestationWeeks", "year", "provenance"],
            },
          },
          absent: { type: "boolean" },
          provenance: nullableProvenance,
        },
        required: ["entries", "absent", "provenance"],
      },
      medications: field({ type: "array", items: { type: "string" } }, "Current medications as a list."),
      allergies: field({ type: "string" }, "Allergies as documented. 'none known' is a real answer."),
      reasonForReferral: field({ type: "string" }, "Stated reason for referral, verbatim where possible."),
      referringFacility: field({ type: "string" }, "Referring facility name."),
      referringClinician: field({ type: "string" }, "Referring clinician name."),
      referralDate: field({ type: "string" }, "Date the referral was written, ISO YYYY-MM-DD."),
      receivingFacility: field({ type: "string" }, "Receiving facility name."),
      receivingDepartment: field({ type: "string" }, "Receiving department or unit."),
      antiD: field({ type: "string" }, "Anti-D immunoglobulin record (given + date), when documented."),
    },
    required: [
      "patientId",
      "ageYears",
      "lmp",
      "edd",
      "gestationalAge",
      "gravidity",
      "parity",
      "bloodGroup",
      "rhesus",
      "haemoglobin",
      "hivScreen",
      "syphilisScreen",
      "bloodPressure",
      "urineProtein",
      "previousObstetricHistory",
      "medications",
      "allergies",
      "reasonForReferral",
      "referringFacility",
      "referringClinician",
      "referralDate",
      "receivingFacility",
      "receivingDepartment",
      "antiD",
    ],
  },
} as const;

function screening(desc: string) {
  return {
    type: "object",
    additionalProperties: false,
    description: desc,
    properties: {
      status: { type: ["string", "null"], description: "e.g. 'negative', 'positive', 'not done'." },
      date: { type: ["string", "null"], description: "ISO date." },
      provenance: { anyOf: [provenance, { type: "null" }] },
    },
    required: ["status", "date", "provenance"],
  };
}

export const SUMMARY_TOOL = {
  name: "record_referral_summary",
  description:
    "Produce a plain-English referral summary from verified fields only, plus a gap list of everything outstanding. Do not fill a gap. Do not characterise any value as normal, abnormal, concerning or reassuring.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      headline: {
        type: "string",
        description:
          "One or two sentences a clinician could hand to a colleague. States what the referral is for and whether the pack is complete. No clinical assessment.",
      },
      summaryRows: {
        type: "array",
        description: "One row per field group, verified values only.",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            label: { type: "string" },
            value: { type: "string", description: "The verified value, or 'Not found in pack' / 'Outstanding'." },
            state: { type: "string", enum: ["verified", "outstanding"] },
          },
          required: ["label", "value", "state"],
        },
      },
      gapList: {
        type: "array",
        description: "Every outstanding item as one plain-English sentence. Empty if nothing is outstanding.",
        items: { type: "string" },
      },
      beforeYouSend: {
        type: "array",
        description: "Specific actions for the referring clinician, most important first.",
        items: { type: "string" },
      },
    },
    required: ["headline", "summaryRows", "gapList", "beforeYouSend"],
  },
} as const;

export const BASELINE_TOOL = null; // baseline is free-form text, no tool
