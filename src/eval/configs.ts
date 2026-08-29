export interface EvalConfig {
  id: string;
  label: string;
  kind: "baseline" | "agent";
  /** How the requirement comparison is done. */
  checkMode: "model" | "deterministic";
  useConsistency: boolean;
  useMemory: boolean;
  /** One-line description of what changed vs the previous config. */
  changed: string;
}

export const CONFIGS: Record<string, EvalConfig> = {
  baseline: {
    id: "baseline",
    label: "Baseline — one prompt, whole job",
    kind: "baseline",
    checkMode: "model",
    useConsistency: false,
    useMemory: false,
    changed: "Single end-to-end model call from the raw pack text and the requirement set.",
  },
  iter1: {
    id: "iter1",
    label: "Iteration 1 — structured extraction with provenance",
    kind: "agent",
    checkMode: "model",
    useConsistency: false,
    useMemory: false,
    changed:
      "Extraction moved to a schema-constrained call with a provenance span on every field; absence is a first-class value. Requirement comparison is still a model judgment.",
  },
  iter2: {
    id: "iter2",
    label: "Iteration 2 — requirement checking moved to deterministic code",
    kind: "agent",
    checkMode: "deterministic",
    useConsistency: false,
    useMemory: false,
    changed: "The requirement comparison is now deterministic code, not a model call.",
  },
  iter3: {
    id: "iter3",
    label: "Iteration 3 — consistency verifier added",
    kind: "agent",
    checkMode: "deterministic",
    useConsistency: true,
    useMemory: false,
    changed: "A deterministic consistency verifier runs the six calendar and arithmetic rules over the extraction.",
  },
  iter4: {
    id: "iter4",
    label: "Iteration 4 — per-facility memory",
    kind: "agent",
    checkMode: "deterministic",
    useConsistency: true,
    useMemory: true,
    changed: "A per-facility recurring-omission store reorders the gap list to surface repeat omissions first.",
  },
  final: {
    id: "final",
    label: "Final — combined configuration",
    kind: "agent",
    checkMode: "deterministic",
    useConsistency: true,
    useMemory: true,
    changed: "The shipped configuration.",
  },
};

export const ITERATION_ORDER = ["baseline", "iter1", "iter2", "iter3", "iter4", "final"];
