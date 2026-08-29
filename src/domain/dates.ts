/**
 * Calendar arithmetic for the deterministic consistency checks.
 *
 * All functions operate on ISO date strings (YYYY-MM-DD) in UTC. No timezone or
 * locale behaviour is involved. Nothing here is a clinical calculation — these
 * are plain date differences used to check a document against itself.
 */

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(s: unknown): s is string {
  return typeof s === "string" && ISO_RE.test(s) && !Number.isNaN(Date.parse(s + "T00:00:00Z"));
}

/** Milliseconds per day. */
const DAY = 86_400_000;

function toUtc(iso: string): number {
  return Date.parse(iso + "T00:00:00Z");
}

/** Whole days from `a` to `b` (b - a). Negative when b precedes a. */
export function daysBetween(a: string, b: string): number {
  return Math.round((toUtc(b) - toUtc(a)) / DAY);
}

/** Add `n` days to an ISO date, returning an ISO date. */
export function addDays(iso: string, n: number): string {
  const d = new Date(toUtc(iso) + n * DAY);
  return d.toISOString().slice(0, 10);
}

/** Naegele estimated delivery date: LMP + 280 days. Documentation arithmetic. */
export function eddFromLmp(lmpIso: string): string {
  return addDays(lmpIso, 280);
}

/** Gestational age in days on `onIso`, derived from LMP. */
export function gaDaysFromLmp(lmpIso: string, onIso: string): number {
  return daysBetween(lmpIso, onIso);
}

/** Convert a days count to { weeks, days } with days in 0..6. */
export function toWeeksDays(totalDays: number): { weeks: number; days: number } {
  const weeks = Math.floor(totalDays / 7);
  const days = totalDays - weeks * 7;
  return { weeks, days };
}

/** Convert { weeks, days } to a total day count. */
export function fromWeeksDays(weeks: number, days: number): number {
  return weeks * 7 + days;
}

/** Format { weeks, days } as "36+3". */
export function formatWeeksDays(weeks: number, days: number): string {
  return `${weeks}+${days}`;
}

/** Human date: "24 Aug 2026". */
export function formatHuman(iso: string): string {
  if (!isIsoDate(iso)) return iso;
  const [y, m, d] = iso.split("-").map(Number);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${d} ${months[m - 1]} ${y}`;
}
