import path from "node:path";

/** Repository root. All fixture and results paths hang off this. */
export const ROOT = process.cwd();

export const PATHS = {
  packs: path.join(ROOT, "fixtures", "packs"),
  requirements: path.join(ROOT, "fixtures", "requirements"),
  groundTruth: path.join(ROOT, "fixtures", "ground_truth"),
  resultsRaw: path.join(ROOT, "results", "raw"),
  trajectories: path.join(ROOT, "results", "trajectories"),
  reports: path.join(ROOT, "results", "reports"),
  memory: path.join(ROOT, "src", "memory", "store.json"),
  data: path.join(ROOT, "src", "data"),
} as const;
