import { describe, it, expect } from "vitest";
import {
  addDays,
  daysBetween,
  eddFromLmp,
  fromWeeksDays,
  gaDaysFromLmp,
  toWeeksDays,
  isIsoDate,
} from "../src/domain/dates";

describe("date arithmetic", () => {
  it("daysBetween is signed and whole", () => {
    expect(daysBetween("2026-01-01", "2026-01-31")).toBe(30);
    expect(daysBetween("2026-01-31", "2026-01-01")).toBe(-30);
    expect(daysBetween("2025-12-14", "2026-08-24")).toBe(253);
  });

  it("addDays rolls over months and years", () => {
    expect(addDays("2026-01-05", 280)).toBe("2026-10-12");
    expect(addDays("2025-12-14", 280)).toBe("2026-09-20");
  });

  it("eddFromLmp is LMP + 280 days", () => {
    expect(eddFromLmp("2025-11-20")).toBe("2026-08-27");
  });

  it("GA from LMP round-trips through weeks/days", () => {
    const days = gaDaysFromLmp("2025-12-14", "2026-08-24");
    expect(days).toBe(253);
    const wd = toWeeksDays(days);
    expect(wd).toEqual({ weeks: 36, days: 1 });
    expect(fromWeeksDays(wd.weeks, wd.days)).toBe(253);
  });

  it("isIsoDate rejects non-ISO", () => {
    expect(isIsoDate("2026-08-24")).toBe(true);
    expect(isIsoDate("24/08/2026")).toBe(false);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate(null)).toBe(false);
  });
});
