import fs from "node:fs";
import path from "node:path";
import { PATHS } from "../lib/paths";
import { recordPack, memoryNotesFor, type MemoryStore } from "./index";

/**
 * Standalone demonstration of the per-facility memory mechanism.
 *
 * The twelve evaluation packs are sent by twelve different facilities, so the
 * store never has a second pack from the same facility to learn from and its
 * effect on the evaluation is nil (the changelog says so). This runs three packs
 * from ONE facility through the exact functions the pipeline uses
 * (`recordPack`, `memoryNotesFor`, and the same gap-list sort as
 * `src/eval/run.ts`), with no model call and no write to the committed store,
 * and shows the gap list reorder on the third pack.
 */

const FACILITY = "Demo Clinic";

/** The same reorder the pipeline applies in src/eval/run.ts. */
function applyMemory(
  store: MemoryStore,
  facility: string,
  findings: { field: string; plain: string }[],
): { field: string; plain: string; memoryNote?: string }[] {
  const notes = memoryNotesFor(store, facility, findings.map((f) => f.field));
  return findings
    .map((f) => ({ ...f, memoryNote: notes[f.field] }))
    .sort((a, b) => (b.memoryNote ? 1 : 0) - (a.memoryNote ? 1 : 0));
}

export function runMemoryDemo(): string {
  let store: MemoryStore = { version: 1, facilities: {} };
  const L: string[] = [];
  L.push("# Trajectory — per-facility memory, demonstrated in isolation");
  L.push("");
  L.push(
    "Deterministic. No model call. The committed `src/memory/store.json` is not touched —",
    "this runs on an in-memory store through the same `recordPack` / `memoryNotesFor`",
    "functions and the same gap-list sort the pipeline uses.",
    "",
    "`memoryNotesFor` only surfaces a field once the facility has **≥ 2 packs seen** and",
    "the field has been flagged in **≥ 2** of them. It never pre-fills a value.",
    "",
  );

  // Pack 1 — blood group and haemoglobin both missing.
  store = recordPack(store, FACILITY, ["bloodGroup", "haemoglobin"]);
  L.push("## Pack 1 from Demo Clinic");
  L.push("Deterministic checks flagged: `bloodGroup`, `haemoglobin`.");
  L.push("Store after recording: " + summarise(store));
  L.push("");

  // Pack 2 — blood group missing again.
  store = recordPack(store, FACILITY, ["bloodGroup"]);
  L.push("## Pack 2 from Demo Clinic");
  L.push("Deterministic checks flagged: `bloodGroup`.");
  L.push("Store after recording: " + summarise(store));
  L.push("`bloodGroup` is now missing in 2 of 2 packs — it crosses the threshold.");
  L.push("");

  // Pack 3 — three findings, blood group is NOT first in raw check order.
  const rawFindings = [
    { field: "haemoglobin", plain: "Haemoglobin result is older than the recency limit for this referral type." },
    { field: "syphilisScreen", plain: "Syphilis screen result is not recorded in the pack." },
    { field: "bloodGroup", plain: "Blood group (ABO) is not recorded anywhere in the pack." },
  ];
  L.push("## Pack 3 from Demo Clinic");
  L.push("");
  L.push("Gap list as the deterministic checks produced it (check order):");
  rawFindings.forEach((f, i) => L.push(`  ${i + 1}. ${f.field} — ${f.plain}`));
  L.push("");
  const reordered = applyMemory(store, FACILITY, rawFindings);
  L.push("Gap list after the memory reorder:");
  reordered.forEach((f, i) =>
    L.push(`  ${i + 1}. ${f.field} — ${f.plain}${f.memoryNote ? `  ← ${f.memoryNote}` : ""}`),
  );
  L.push("");
  L.push(
    "`bloodGroup` moved to the top and carries a note. The note is a prompt to check;",
    "no value was filled in, and nothing was asserted about pack 3 itself.",
    "",
  );

  // Contrast: a first-time facility gets no reorder.
  const fresh: MemoryStore = { version: 1, facilities: {} };
  const noReorder = applyMemory(fresh, "New Clinic", rawFindings);
  L.push("## Contrast — first pack from a facility with no history");
  L.push("Gap list is left in check order, no note:");
  noReorder.forEach((f, i) => L.push(`  ${i + 1}. ${f.field} — ${f.plain}`));
  L.push("");

  return L.join("\n");
}

function summarise(store: MemoryStore): string {
  const rec = store.facilities[FACILITY.toLowerCase()];
  if (!rec) return "(empty)";
  const oms = Object.entries(rec.omissions)
    .map(([k, n]) => `${k}=${n}`)
    .join(", ");
  return `packsSeen=${rec.packsSeen}, omissions={ ${oms} }`;
}

export function writeMemoryDemo(): string {
  const md = runMemoryDemo();
  fs.mkdirSync(PATHS.trajectories, { recursive: true });
  const out = path.join(PATHS.trajectories, "memory-demo.md");
  fs.writeFileSync(out, md + "\n", "utf8");
  return out;
}
