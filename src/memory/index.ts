import fs from "node:fs";
import path from "node:path";
import { PATHS } from "../lib/paths";

/**
 * Per-facility recurring-omission store.
 *
 * Records, per referring facility, how often each field has been missing across
 * the packs this facility has sent. When a facility has a track record of
 * omitting a field, the checker surfaces that field earlier and more prominently
 * in the gap list, as a prompt to check.
 *
 * It never pre-fills a value and never asserts anything about the current pack.
 */

export interface FacilityRecord {
  facility: string;
  packsSeen: number;
  /** field -> number of packs where it was missing / stale / contradictory. */
  omissions: Record<string, number>;
}

export interface MemoryStore {
  version: 1;
  facilities: Record<string, FacilityRecord>;
}

function empty(): MemoryStore {
  return { version: 1, facilities: {} };
}

export function loadMemory(): MemoryStore {
  if (!fs.existsSync(PATHS.memory)) return empty();
  try {
    return JSON.parse(fs.readFileSync(PATHS.memory, "utf8")) as MemoryStore;
  } catch {
    return empty();
  }
}

export function saveMemory(store: MemoryStore): void {
  fs.mkdirSync(path.dirname(PATHS.memory), { recursive: true });
  fs.writeFileSync(PATHS.memory, JSON.stringify(store, null, 2) + "\n", "utf8");
}

export function resetMemory(): void {
  saveMemory(empty());
}

const KEY = (f: string) => f.trim().toLowerCase();

/**
 * Notes to attach to findings for the current pack, before this pack is itself
 * recorded. Returns field -> human sentence, e.g.
 *   "Ext 4 Clinic has omitted this field in 3 of its last 5 packs."
 */
export function memoryNotesFor(
  store: MemoryStore,
  facility: string | null,
  fields: string[],
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!facility) return out;
  const rec = store.facilities[KEY(facility)];
  if (!rec || rec.packsSeen < 2) return out;
  for (const field of fields) {
    const n = rec.omissions[field] ?? 0;
    if (n >= 2) {
      out[field] = `${rec.facility} has left this field out of ${n} of its last ${rec.packsSeen} packs.`;
    }
  }
  return out;
}

/** Record the outcome of a pack: which fields were flagged, for this facility. */
export function recordPack(
  store: MemoryStore,
  facility: string | null,
  flaggedFields: string[],
): MemoryStore {
  if (!facility) return store;
  const k = KEY(facility);
  const rec = store.facilities[k] ?? { facility, packsSeen: 0, omissions: {} };
  rec.packsSeen += 1;
  for (const f of new Set(flaggedFields)) {
    rec.omissions[f] = (rec.omissions[f] ?? 0) + 1;
  }
  store.facilities[k] = rec;
  return store;
}
