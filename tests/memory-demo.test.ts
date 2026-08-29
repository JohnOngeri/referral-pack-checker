import { describe, it, expect } from "vitest";
import { runMemoryDemo } from "../src/memory/demo";
import { recordPack, memoryNotesFor, type MemoryStore } from "../src/memory";

describe("per-facility memory", () => {
  it("surfaces a field only after >= 2 packs seen and >= 2 omissions", () => {
    let store: MemoryStore = { version: 1, facilities: {} };
    store = recordPack(store, "Demo Clinic", ["bloodGroup"]);
    // one pack, one omission -> no note yet
    expect(memoryNotesFor(store, "Demo Clinic", ["bloodGroup"])).toEqual({});
    store = recordPack(store, "Demo Clinic", ["bloodGroup"]);
    const notes = memoryNotesFor(store, "Demo Clinic", ["bloodGroup", "haemoglobin"]);
    expect(notes.bloodGroup).toMatch(/2 of its last 2/);
    expect(notes.haemoglobin).toBeUndefined();
  });

  it("does not surface anything for a first-time facility", () => {
    const store: MemoryStore = { version: 1, facilities: {} };
    expect(memoryNotesFor(store, "New Clinic", ["bloodGroup"])).toEqual({});
  });

  it("demo output moves the repeat-omission field to the top of the gap list", () => {
    const md = runMemoryDemo();
    const reordered = md.slice(md.indexOf("Gap list after the memory reorder:"));
    expect(reordered).toMatch(/1\. bloodGroup/);
  });
});
