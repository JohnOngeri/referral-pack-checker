import { describe, it, expect } from "vitest";
import { runConsistencyChecks } from "../src/domain/consistency";
import { makePack, p } from "./helpers";

const rules = (pack: ReturnType<typeof makePack>) => runConsistencyChecks(pack).map((f) => f.rule);

describe("consistency rules", () => {
  it("a clean pack raises nothing", () => {
    expect(runConsistencyChecks(makePack())).toHaveLength(0);
  });

  it("ga_matches_lmp fires when recorded GA disagrees with LMP beyond tolerance", () => {
    const pack = makePack({
      gestationalAge: {
        value: { weeks: 30, days: 2, assessedOn: "2026-08-24", provenance: p("GA 30+2") },
        absent: false,
        provenance: p("GA 30+2"),
      },
      lmp: { value: "2025-12-14", absent: false, provenance: p("LMP 14/12/2025") },
      edd: { value: "2026-09-20", absent: false, provenance: p("EDD") },
      referralDate: { value: "2026-08-24", absent: false, provenance: p("24/08/26") },
    });
    const out = runConsistencyChecks(pack);
    const ga = out.find((f) => f.rule === "consistency.ga_matches_lmp");
    expect(ga).toBeTruthy();
    expect(ga!.values).toHaveLength(2);
    expect(ga!.detail.resolution).toBeNull();
  });

  it("ga_matches_lmp tolerates a small difference", () => {
    const pack = makePack({
      gestationalAge: {
        value: { weeks: 34, days: 0, assessedOn: "2026-08-14", provenance: p("GA 34+0") },
        absent: false,
        provenance: p("GA 34+0"),
      },
      lmp: { value: "2025-12-14", absent: false, provenance: p("LMP") },
    });
    // derived at 2026-08-14 ~ 34+6; recorded 34+0 -> 6 days, within tolerance 7
    expect(rules(pack)).not.toContain("consistency.ga_matches_lmp");
  });

  it("edd_matches_lmp fires when EDD is far from LMP + 280", () => {
    const pack = makePack({
      lmp: { value: "2025-11-20", absent: false, provenance: p("LMP 20/11/2025") },
      edd: { value: "2026-08-12", absent: false, provenance: p("EDD 12/08/2026") },
      gestationalAge: {
        value: { weeks: 38, days: 1, assessedOn: "2026-08-14", provenance: p("GA 38+1") },
        absent: false,
        provenance: p("GA 38+1"),
      },
      referralDate: { value: "2026-08-14", absent: false, provenance: p("14/08/2026") },
    });
    expect(rules(pack)).toContain("consistency.edd_matches_lmp");
  });

  it("no_future_dates fires for a sample dated after the referral, but not for the EDD", () => {
    const pack = makePack({
      haemoglobin: { value: 8.9, date: "2026-09-18", absent: false, provenance: p("sample date 18/09/2026") },
      referralDate: { value: "2026-08-18", absent: false, provenance: p("18/08/2026") },
      lmp: { value: "2026-02-05", absent: false, provenance: p("LMP") },
      edd: { value: "2026-11-12", absent: false, provenance: p("EDD") },
      gestationalAge: {
        value: { weeks: 27, days: 5, assessedOn: "2026-08-18", provenance: p("GA") },
        absent: false,
        provenance: p("GA"),
      },
    });
    const out = runConsistencyChecks(pack);
    expect(out.map((f) => f.rule)).toContain("consistency.no_future_dates");
    // exactly one future-date finding (the Hb), not one for the EDD
    expect(out.filter((f) => f.rule === "consistency.no_future_dates")).toHaveLength(1);
  });

  it("no_date_before_lmp fires for a screen dated before the LMP", () => {
    const pack = makePack({
      lmp: { value: "2026-01-08", absent: false, provenance: p("LMP 08/01/2026") },
      syphilisScreen: { status: "negative", date: "2025-12-20", provenance: p("RPR neg (20/12/25)") },
    });
    expect(rules(pack)).toContain("consistency.no_date_before_lmp");
  });

  it("parity_matches_obstetric_history fires when parity < births in history", () => {
    const pack = makePack({
      parity: { value: 2, absent: false, provenance: p("P2") },
      previousObstetricHistory: {
        entries: [
          { summary: "2017 SVD term", outcome: "term_birth", gestationWeeks: 39, year: 2017, provenance: p("2017 SVD term") },
          { summary: "2019 SVD term", outcome: "term_birth", gestationWeeks: 39, year: 2019, provenance: p("2019 SVD term") },
          { summary: "2023 SVD term", outcome: "term_birth", gestationWeeks: 39, year: 2023, provenance: p("2023 SVD term") },
        ],
        absent: false,
        provenance: p("Obstetric history"),
      },
    });
    const out = runConsistencyChecks(pack);
    const par = out.find((f) => f.rule === "consistency.parity_matches_obstetric_history");
    expect(par).toBeTruthy();
    expect(par!.detail.recorded_parity).toBe(2);
    expect(par!.detail.history_births_24w_plus).toBe(3);
  });

  it("parity check ignores a miscarriage below 24 weeks", () => {
    const pack = makePack({
      parity: { value: 2, absent: false, provenance: p("P2") },
      previousObstetricHistory: {
        entries: [
          { summary: "2019 SVD term", outcome: "term_birth", gestationWeeks: 39, year: 2019, provenance: p("a") },
          { summary: "2021 miscarriage 11/40", outcome: "miscarriage", gestationWeeks: 11, year: 2021, provenance: p("b") },
          { summary: "2023 SVD term", outcome: "term_birth", gestationWeeks: 40, year: 2023, provenance: p("c") },
        ],
        absent: false,
        provenance: p("hx"),
      },
    });
    expect(rules(pack)).not.toContain("consistency.parity_matches_obstetric_history");
  });

  it("present_field_holds_real_value fires for a dash in a present field", () => {
    const pack = makePack({
      bloodGroup: { value: "-", absent: false, provenance: p("Blood gp: -") },
    });
    expect(rules(pack)).toContain("consistency.present_field_holds_real_value");
  });

  it("never emits a resolution for any contradiction", () => {
    const pack = makePack({
      lmp: { value: "2025-11-20", absent: false, provenance: p("LMP") },
      edd: { value: "2026-08-12", absent: false, provenance: p("EDD") },
    });
    for (const f of runConsistencyChecks(pack)) {
      expect(JSON.stringify(f)).not.toMatch(/"resolution":\s*"[^"]/);
    }
  });
});
