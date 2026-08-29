import type { ReferralPack, Provenance } from "../src/domain/types";

export const p = (quote: string, line = 1): Provenance => ({ quote, line });

const f = <T>(value: T | null, provenance: Provenance | null = value === null ? null : p("x")) => ({
  value,
  absent: value === null,
  provenance,
});

/** A complete, internally consistent pack. Override fields per test. */
export function makePack(overrides: Partial<ReferralPack> = {}): ReferralPack {
  const base: ReferralPack = {
    patientId: f("1234"),
    ageYears: f(30),
    lmp: f("2026-01-05"),
    edd: f("2026-10-12"), // 2026-01-05 + 280
    gestationalAge: {
      value: { weeks: 31, days: 4, assessedOn: "2026-08-14", provenance: p("GA 31+4") },
      absent: false,
      provenance: p("GA 31+4"),
    },
    gravidity: f(3),
    parity: f(2),
    bloodGroup: f("O"),
    rhesus: f("positive"),
    haemoglobin: { value: 11.4, date: "2026-08-01", absent: false, provenance: p("Hb 11.4") },
    hivScreen: { status: "negative", date: "2026-02-01", provenance: p("HIV neg") },
    syphilisScreen: { status: "negative", date: "2026-02-01", provenance: p("RPR neg") },
    bloodPressure: {
      readings: [{ systolic: 118, diastolic: 76, date: "2026-08-10", provenance: p("BP 118/76") }],
      absent: false,
      provenance: p("BP 118/76"),
    },
    urineProtein: f("nil"),
    previousObstetricHistory: {
      entries: [
        { summary: "2019 SVD term", outcome: "term_birth", gestationWeeks: 39, year: 2019, provenance: p("2019 SVD term") },
        { summary: "2022 LSCS term", outcome: "term_birth", gestationWeeks: 39, year: 2022, provenance: p("2022 LSCS term") },
      ],
      absent: false,
      provenance: p("Obstetric hx"),
    },
    medications: f(["ferrous sulphate"]),
    allergies: f("none known"),
    reasonForReferral: f("elective LSCS booking"),
    referringFacility: f("Test Clinic"),
    referringClinician: f("Sr Test"),
    referralDate: f("2026-08-14"),
    receivingFacility: f("Test Hospital"),
    receivingDepartment: f("Obstetrics"),
    antiD: f(null),
  };
  return { ...base, ...overrides };
}
