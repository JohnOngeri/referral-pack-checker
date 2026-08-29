import { describe, it, expect } from "vitest";
import { isPlaceholder } from "../src/domain/placeholder";
import { clinicalLanguageIssues } from "../src/agents/summary-schema";

describe("placeholder detection", () => {
  it.each(["-", "—", "  ", "", "tbc", "pending", "___", "n/a", "?"])(
    "%s is a placeholder",
    (s) => expect(isPlaceholder(s)).toBe(true),
  );

  it("nil is a placeholder for a lab value but a real answer for allergies", () => {
    expect(isPlaceholder("nil")).toBe(true);
    expect(isPlaceholder("none known", true)).toBe(false);
    expect(isPlaceholder("NKDA", true)).toBe(false);
  });

  it("a real value is not a placeholder", () => {
    expect(isPlaceholder("O positive")).toBe(false);
    expect(isPlaceholder("11.4")).toBe(false);
  });
});

describe("clinical-language guard", () => {
  it("flags an assessment word in the summary", () => {
    const issues = clinicalLanguageIssues({
      headline: "Blood pressure readings are concerning.",
      summaryRows: [],
      gapList: [],
      beforeYouSend: [],
    });
    expect(issues.length).toBeGreaterThan(0);
  });

  it("passes a documentation-only summary", () => {
    const issues = clinicalLanguageIssues({
      headline: "Elective caesarean booking. Blood group is outstanding.",
      summaryRows: [{ label: "Haemoglobin", value: "11.4 g/dL, 1 Aug 2026", state: "verified" }],
      gapList: ["Blood group is not recorded anywhere in this pack."],
      beforeYouSend: ["Add the ABO blood group from the antenatal record."],
    });
    expect(issues).toHaveLength(0);
  });
});
