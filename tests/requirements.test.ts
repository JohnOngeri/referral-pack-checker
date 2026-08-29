import { describe, it, expect } from "vitest";
import { checkRequirements } from "../src/checks/requirements";
import { loadRequirementSet } from "../src/lib/fixtures";
import { makePack, p } from "./helpers";

const caesarean = loadRequirementSet("elective_caesarean");
const hypertension = loadRequirementSet("hypertension_review");

describe("requirements checker", () => {
  it("passes a complete pack for its referral type", () => {
    const pack = makePack({ antiD: { value: null, absent: true, provenance: null } });
    const { findings } = checkRequirements(pack, caesarean);
    expect(findings).toHaveLength(0);
  });

  it("flags a mandatory field that is absent", () => {
    const pack = makePack({ bloodGroup: { value: null, absent: true, provenance: null } });
    const { findings } = checkRequirements(pack, caesarean);
    expect(findings.map((f) => f.field)).toContain("bloodGroup");
    expect(findings.find((f) => f.field === "bloodGroup")!.verdict).toBe("absent");
  });

  it("flags a stale dated value", () => {
    const pack = makePack({
      haemoglobin: { value: 10.9, date: "2026-03-14", absent: false, provenance: p("Hb 10.9 14/03/26") },
      referralDate: { value: "2026-08-19", absent: false, provenance: p("19/08/2026") },
    });
    const { findings } = checkRequirements(pack, hypertension);
    const hb = findings.find((f) => f.field === "haemoglobin");
    expect(hb?.verdict).toBe("present_stale");
    expect(hb?.ageDays).toBeGreaterThan(56);
  });

  it("treats a present dated value within the limit as current", () => {
    const pack = makePack({
      haemoglobin: { value: 11.5, date: "2026-08-14", absent: false, provenance: p("Hb 11.5") },
      referralDate: { value: "2026-08-19", absent: false, provenance: p("19/08/2026") },
    });
    const { all } = checkRequirements(pack, hypertension);
    expect(all.find((f) => f.field === "haemoglobin")?.verdict).toBe("present_current");
  });

  it("requires anti-D only when rhesus is negative", () => {
    const rhPos = makePack({ rhesus: { value: "positive", absent: false, provenance: p("O pos") } });
    expect(checkRequirements(rhPos, caesarean).findings.map((f) => f.field)).not.toContain("antiD");

    const rhNeg = makePack({
      rhesus: { value: "negative", absent: false, provenance: p("A neg") },
      antiD: { value: null, absent: true, provenance: null },
    });
    const f = checkRequirements(rhNeg, caesarean).findings.find((x) => x.field === "antiD");
    expect(f?.verdict).toBe("conditionally_required_absent");
  });

  it("marks a value recorded without a date as not confirmable", () => {
    const pack = makePack({
      haemoglobin: { value: 11.0, date: null, absent: false, provenance: p("Hb 11.0") },
      referralDate: { value: "2026-08-19", absent: false, provenance: p("19/08/2026") },
    });
    const hb = checkRequirements(pack, hypertension).findings.find((f) => f.field === "haemoglobin");
    expect(hb?.verdict).toBe("present_stale");
  });
});
