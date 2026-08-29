import { describe, it, expect } from "vitest";
import { parseBaseline } from "../src/baseline";

describe("baseline output parser", () => {
  it("marks a truncated response unparseable", () => {
    const out = parseBaseline("March: 30 days\nApril: 30\nTotal: 159 days", "MAX_TOKENS");
    expect(out.unparseable).toBe(true);
    expect(out.findings).toHaveLength(0);
  });

  it("marks a response with no findings section unparseable", () => {
    const out = parseBaseline("Here is my analysis of the pack. It looks mostly fine.", "STOP");
    expect(out.unparseable).toBe(true);
  });

  it("parses a well-formed findings section", () => {
    const text = [
      "FINDINGS",
      "- Blood group is not recorded anywhere in the pack.",
      "- Haemoglobin was taken 22 weeks ago; the limit is 8 weeks.",
      "",
      "SUMMARY",
      "Elective caesarean booking. Two items outstanding.",
    ].join("\n");
    const out = parseBaseline(text, "STOP");
    expect(out.unparseable).toBe(false);
    expect(out.findings).toHaveLength(2);
    expect(out.findings[0].field).toBe("bloodGroup");
    expect(out.findings[1].field).toBe("haemoglobin");
  });

  it("does not count a 'no issues' line as a finding", () => {
    const text = "**FINDINGS**\nNo missing or stale fields. All requirements met.\n\nSUMMARY\nComplete.";
    const out = parseBaseline(text, "STOP");
    expect(out.findings).toHaveLength(0);
    expect(out.unparseable).toBe(false);
  });
});
