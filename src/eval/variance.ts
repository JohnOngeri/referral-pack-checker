import fs from "node:fs";
import path from "node:path";
import type { ModelProvider } from "../provider";
import { PATHS } from "../lib/paths";
import { allCaseIds, loadManifest, loadPackText, loadRequirementSet } from "../lib/fixtures";
import { runExtractor } from "../agents/extractor";
import { checkRequirements } from "../checks/requirements";
import { modelRequirementCheck } from "../checks/model-requirements";

/**
 * Iteration 2 justification: run the requirement comparison N times on the same
 * packs, once as a model judgment and once as deterministic code, and measure
 * run-to-run variance in the number of findings.
 */
export interface VarianceReport {
  runs: number;
  mode: string;
  model: string;
  ranAt: string;
  perCase: Array<{
    caseId: string;
    modelCounts: number[];
    modelStdev: number;
    deterministicCounts: number[];
    deterministicStdev: number;
  }>;
  modelMeanStdev: number;
  deterministicMeanStdev: number;
}

function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  const v = xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length;
  return Number(Math.sqrt(v).toFixed(3));
}

export async function runVariance(provider: ModelProvider, runs = 3): Promise<VarianceReport> {
  const ids = allCaseIds();
  const perCase: VarianceReport["perCase"] = [];

  for (const id of ids) {
    const entry = loadManifest().find((c) => c.id === id)!;
    const reqs = loadRequirementSet(entry.referralType);
    const ex = await runExtractor(provider, id, loadPackText(id));

    const modelCounts: number[] = [];
    for (let r = 1; r <= runs; r++) {
      const f = await modelRequirementCheck(provider, id, `variance-${r}`, ex.raw, reqs);
      modelCounts.push(f.length);
    }
    const detCounts: number[] = [];
    for (let r = 1; r <= runs; r++) {
      detCounts.push(checkRequirements(ex.pack, reqs).findings.length);
    }

    perCase.push({
      caseId: id,
      modelCounts,
      modelStdev: stdev(modelCounts),
      deterministicCounts: detCounts,
      deterministicStdev: stdev(detCounts),
    });
  }

  const report: VarianceReport = {
    runs,
    mode: provider.mode,
    model: provider.model,
    ranAt: new Date().toISOString(),
    perCase,
    modelMeanStdev: Number(
      (perCase.reduce((s, c) => s + c.modelStdev, 0) / perCase.length).toFixed(3),
    ),
    deterministicMeanStdev: Number(
      (perCase.reduce((s, c) => s + c.deterministicStdev, 0) / perCase.length).toFixed(3),
    ),
  };

  fs.mkdirSync(PATHS.reports, { recursive: true });
  fs.writeFileSync(
    path.join(PATHS.reports, "iter2_variance.json"),
    JSON.stringify(report, null, 2) + "\n",
    "utf8",
  );
  // Also a CSV, referenced from the changelog.
  const csv = [
    "case_id,model_run_1,model_run_2,model_run_3,model_stdev,deterministic_stdev",
    ...perCase.map(
      (c) =>
        `${c.caseId},${c.modelCounts.join(",")},${c.modelStdev},${c.deterministicStdev}`,
    ),
  ].join("\n");
  fs.writeFileSync(path.join(PATHS.reports, "iter2_variance.csv"), csv + "\n", "utf8");
  return report;
}
