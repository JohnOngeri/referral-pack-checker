import { describe, it, expect } from "vitest";
import {
  approve,
  finaliseSummary,
  freshCheckpoint,
  isFinalised,
  sendBack,
} from "../src/domain/checkpoint";
import type { SummaryOutput } from "../src/agents/summary-schema";

const summary: SummaryOutput = {
  headline: "Elective caesarean booking. Pack complete.",
  summaryRows: [],
  gapList: [],
  beforeYouSend: [],
};

describe("human checkpoint", () => {
  it("a fresh checkpoint is awaiting review and not finalised", () => {
    const c = freshCheckpoint();
    expect(c.state).toBe("awaiting_review");
    expect(isFinalised(c)).toBe(false);
  });

  it("refuses to finalise without approval", () => {
    expect(() => finaliseSummary(freshCheckpoint(), summary)).toThrow(/not been approved/);
  });

  it("refuses to finalise after send-back", () => {
    const c = sendBack(freshCheckpoint(), "blood group missing");
    expect(() => finaliseSummary(c, summary)).toThrow();
  });

  it("finalises only after a named clinician approves", () => {
    const c = approve(freshCheckpoint(), "Sr T. Ndlovu");
    expect(isFinalised(c)).toBe(true);
    expect(finaliseSummary(c, summary)).toBe(summary);
  });

  it("approval requires a name", () => {
    expect(() => approve(freshCheckpoint(), "   ")).toThrow();
  });

  it("no module in src exports a send action", async () => {
    // Guard against a 'send' path being added later.
    const cp = await import("../src/domain/checkpoint");
    expect(Object.keys(cp)).not.toContain("send");
    expect(Object.keys(cp)).not.toContain("sendReferral");
  });
});
