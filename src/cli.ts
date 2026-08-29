/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";
import { makeProvider, hasApiKey, resolveModel, type RunMode } from "./provider";
import { allCaseIds } from "./lib/fixtures";
import { runPipeline, persistResult } from "./agents/pipeline";
import { runConfig } from "./eval/run";
import { runVariance } from "./eval/variance";
import { runAdjudicator } from "./agents/adjudicator";
import { buildFinalMetrics, buildChangelog, writeDashboardData } from "./eval/report";
import { writeExtraTrajectories, trajectoryIndex } from "./eval/trajectories";
import { ITERATION_ORDER } from "./eval/configs";
import { PATHS } from "./lib/paths";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}
function resolveMode(): RunMode {
  const m = (arg("mode") ?? (hasApiKey() ? "fresh" : "replay")) as RunMode;
  if (m !== "fresh" && m !== "replay") throw new Error(`--mode must be fresh or replay, got ${m}`);
  return m;
}

async function cmdCheck() {
  const mode = resolveMode();
  const provider = makeProvider(mode);
  const ids = flag("all") ? allCaseIds() : [arg("case") ?? process.argv[3]].filter(Boolean);
  if (ids.length === 0 || !ids[0]) throw new Error("Usage: check <case-id> | check --all [--mode fresh|replay]");
  console.log(`[${mode.toUpperCase()}] model=${resolveModel()}  cases=${ids.join(", ")}`);
  for (const id of ids) {
    const r = await runPipeline(provider, id!);
    persistResult(r);
    const gaps = r.checks.findings.length;
    console.log(
      `  ${id}: ${gaps === 0 ? "no gaps" : `${gaps} finding(s)`} — ${r.checks.findings
        .map((f) => f.field)
        .join(", ") || "clean"}  (checkpoint: ${r.review.state})`,
    );
  }
  writeDashboardData();
}

async function cmdBaseline() {
  const mode = resolveMode();
  const provider = makeProvider(mode);
  console.log(`[${mode.toUpperCase()}] baseline over ${allCaseIds().length} cases`);
  const r = await runConfig(provider, "baseline");
  console.log(`  caught ${r.aggregate.caught}/${r.aggregate.seededDefects}  false flags ${r.aggregate.falseFlags}  -> results/reports/baseline.json`);
}

async function cmdSolve() {
  const mode = resolveMode();
  const provider = makeProvider(mode);
  console.log(`[${mode.toUpperCase()}] agent workflow (final config) over ${allCaseIds().length} cases`);
  const r = await runConfig(provider, "final");
  console.log(`  caught ${r.aggregate.caught}/${r.aggregate.seededDefects}  false flags ${r.aggregate.falseFlags}  -> results/reports/final.json`);
}

async function cmdEval() {
  const mode = resolveMode();
  const provider = makeProvider(mode);
  console.log(`[${mode.toUpperCase()}] full evaluation  model=${resolveModel()}`);
  for (const id of ITERATION_ORDER) {
    const r = await runConfig(provider, id);
    console.log(
      `  ${id.padEnd(9)} caught ${r.aggregate.caught}/${r.aggregate.seededDefects}  ff ${r.aggregate.falseFlags}  invented ${r.inventedValuesTotal ?? "-"}`,
    );
  }
  if (flag("no-variance") === false) {
    console.log("  variance (iter2 justification)...");
    const v = await runVariance(provider, 3);
    console.log(`    model stdev ${v.modelMeanStdev}  deterministic stdev ${v.deterministicMeanStdev}`);
  }
  if (flag("no-adjudicator") === false) {
    console.log("  removed experiment: contradiction adjudicator...");
    const a = await runAdjudicator(provider);
    console.log(`    agreement ${a.agreementRate}`);
  }
  await finalize(provider);
}

/** Standalone report: regenerate every derived artifact from the committed model
 * calls, so analysis-code changes take effect without a new evaluation. No new
 * API calls in replay mode. */
async function cmdReport() {
  const provider = makeProvider(resolveMode());
  for (const id of ITERATION_ORDER) {
    try {
      await runConfig(provider, id);
    } catch (e) {
      console.warn(`  config ${id}: ${(e as Error).message}`);
    }
  }
  try {
    await runVariance(provider, 3);
  } catch (e) {
    console.warn(`  variance: ${(e as Error).message}`);
  }
  try {
    await runAdjudicator(provider);
  } catch (e) {
    console.warn(`  adjudicator: ${(e as Error).message}`);
  }
  await finalize(provider);
}

/** Build final metrics, changelog, per-case pipeline data, trajectories and the
 * dashboard data from whatever configuration reports are already on disk. */
async function finalize(provider: ReturnType<typeof makeProvider>) {
  const metrics = buildFinalMetrics();
  const changelog = buildChangelog();
  fs.writeFileSync(path.join(process.cwd(), "CHANGELOG_IMPROVEMENT.md"), changelog, "utf8");
  for (const id of allCaseIds()) {
    try {
      const r = await runPipeline(provider, id);
      persistResult(r);
    } catch (e) {
      console.warn(`  pipeline ${id}: ${(e as Error).message}`);
    }
  }
  try {
    await writeExtraTrajectories(provider);
  } catch (e) {
    console.warn(`  extra trajectories: ${(e as Error).message}`);
  }
  trajectoryIndex();
  writeDashboardData();
  console.log(
    `Report written.\n  headline: ${metrics.headline.sentence}\n  -> results/reports/final_metrics.json\n  -> results/reports/comparison.csv\n  -> CHANGELOG_IMPROVEMENT.md\n  -> results/trajectories/\n  -> src/data/dashboard.json`,
  );
}

async function main() {
  const cmd = process.argv[2];
  try {
    if (cmd === "check") await cmdCheck();
    else if (cmd === "baseline") await cmdBaseline();
    else if (cmd === "solve") await cmdSolve();
    else if (cmd === "eval") await cmdEval();
    else if (cmd === "report") await cmdReport();
    else {
      console.log(
        "Commands:\n" +
          "  check <case-id> | check --all      run the full workflow for a case\n" +
          "  baseline                          run the single-prompt baseline over all cases\n" +
          "  solve                             run the agent workflow over all cases\n" +
          "  eval                              run every configuration + variance + adjudicator, build reports\n" +
          "  report                            rebuild metrics / changelog / dashboard data from committed reports\n" +
          "\nFlags: --mode fresh|replay   --no-variance   --no-adjudicator\n" +
          `\nCurrent: ${hasApiKey() ? "API key found (fresh available)" : "no API key (replay only)"}, ${PATHS.reports}`,
      );
      process.exitCode = cmd ? 1 : 0;
    }
  } catch (e) {
    console.error(`\nERROR: ${(e as Error).message}`);
    process.exitCode = 1;
  }
}

void main();
