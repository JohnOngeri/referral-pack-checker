/**
 * Placeholder detection. A field whose text is only a dash, blank, or a holding
 * token ("tbc", "pending", "___") is not a recorded value.
 *
 * This is a string check on documentation. It says nothing about what any value
 * would mean.
 */

const PLACEHOLDER_TOKENS = new Set([
  "-", "--", "—", "–", "―",
  "", ".", "..", "...",
  "n/a", "na", "n.a.",
  "tbc", "tbd", "pending", "await", "awaiting", "await result", "awaiting result",
  "_", "__", "___", "____",
  "?", "??", "???",
]);

/**
 * True when `raw` carries no recorded value.
 *
 * `allowNil` lets "none", "nil", "none known", "NKDA" through as real answers —
 * correct for allergies and medications, wrong for a lab result.
 */
export function isPlaceholder(raw: string | null | undefined, allowNil = false): boolean {
  if (raw === null || raw === undefined) return true;
  const t = raw.trim().toLowerCase().replace(/[:\s]+$/g, "").trim();
  if (t === "") return true;
  const nilish = t === "nil" || t === "none" || t === "none known" || t === "nkda" || t === "nka";
  if (nilish) return !allowNil;
  return PLACEHOLDER_TOKENS.has(t);
}
