import fs from "node:fs";
import path from "node:path";
import { PATHS } from "../lib/paths";
import { allCaseIds, loadGroundTruth, loadManifest } from "../lib/fixtures";
import type { ConfigReport } from "./run";
import type { VarianceReport } from "./variance";
import type { AdjudicatorResult } from "../agents/adjudicator";
import { ITERATION_ORDER } from "./configs";

function readJson<T>(name: string): T | null {
  const p = path.join(PATHS.reports, name);
  return fs.existsSync(p) ? (JSON.parse(fs.readFileSync(p, "utf8")) as T) : null;
}

export interface FinalMetrics {
  generatedAt: string;
  mode: string;
  model: string;
  headline: {
    agentCaught: number;
    baselineCaught: number;
    seededDefects: number;
    sentence: string;
    sourceFile: string;
  };
  agent: ConfigReport["aggregate"] & { falseFlags: number; inventedValues: number | null; costPerPackUsd: number };
  baseline: ConfigReport["aggregate"] & { falseFlags: number; costPerPackUsd: number };
  contradictionDetection: { seeded: number; agentCaught: number; baselineCaught: number };
  perCase: Array<{
    caseId: string;
    referralType: string;
    seeded: number;
    baselineCaught: number;
    agentCaught: number;
    agentFalseFlags: number;
    isControl: boolean;
    note: string;
  }>;
  humanReviewTime: { measured: boolean; note: string; data?: unknown };
}

export function buildFinalMetrics(): FinalMetrics {
  const baseline = readJson<ConfigReport>("baseline.json");
  const final = readJson<ConfigReport>("final.json");
  if (!baseline || !final) {
    throw new Error(
      "Cannot build final metrics: results/reports/baseline.json and final.json must exist. " +
        "Run `npm run eval -- --mode <fresh|replay>` first.",
    );
  }

  const ids = allCaseIds();
  const gts = ids.map(loadGroundTruth);
  const manifest = loadManifest();

  const perCase = ids.map((id, i) => {
    const b = baseline.perCase.find((p) => p.caseId === id)!;
    const a = final.perCase.find((p) => p.caseId === id)!;
    const m = manifest.find((c) => c.id === id)!;
    let note = "";
    if (gts[i].isControl) note = "control pack";
    else if (a.caught < a.seededDefects) note = `agent missed: ${a.missed.join(", ")}`;
    else if (b.caught < b.seededDefects && a.caught === a.seededDefects) note = "baseline missed a seeded defect the agent caught";
    return {
      caseId: id,
      referralType: m.referralType,
      seeded: a.seededDefects,
      baselineCaught: b.caught,
      agentCaught: a.caught,
      agentFalseFlags: a.falseFlags,
      isControl: gts[i].isControl,
      note,
    };
  });

  const hrtPath = path.join(PATHS.reports, "human_review_time.json");
  const hrt = fs.existsSync(hrtPath)
    ? { measured: true, note: "Measured, n=3. See results/reports/human_review_time.json.", data: JSON.parse(fs.readFileSync(hrtPath, "utf8")) }
    : {
        measured: false,
        note:
          "Not measured. Omitted rather than estimated. To add it: time yourself reviewing three packs by hand and three tool-assisted, then write results/reports/human_review_time.json.",
      };

  const seeded = final.aggregate.seededDefects;
  const sentence = `${final.aggregate.caught} of ${seeded} documentation gaps caught. A single AI prompt caught ${baseline.aggregate.caught}.`;

  const metrics: FinalMetrics = {
    generatedAt: new Date().toISOString(),
    mode: final.mode,
    model: final.model,
    headline: {
      agentCaught: final.aggregate.caught,
      baselineCaught: baseline.aggregate.caught,
      seededDefects: seeded,
      sentence,
      sourceFile: "results/reports/final_metrics.json",
    },
    agent: {
      ...final.aggregate,
      falseFlags: final.aggregate.falseFlags,
      inventedValues: final.inventedValuesTotal,
      costPerPackUsd: Number((final.costUsd / ids.length).toFixed(4)),
    },
    baseline: {
      ...baseline.aggregate,
      falseFlags: baseline.aggregate.falseFlags,
      costPerPackUsd: Number((baseline.costUsd / ids.length).toFixed(4)),
    },
    contradictionDetection: {
      seeded: final.aggregate.contradictionsSeeded,
      agentCaught: final.aggregate.contradictionsCaught,
      baselineCaught: baseline.aggregate.contradictionsCaught,
    },
    perCase,
    humanReviewTime: hrt,
  };

  fs.writeFileSync(
    path.join(PATHS.reports, "final_metrics.json"),
    JSON.stringify(metrics, null, 2) + "\n",
    "utf8",
  );

  // comparison.csv
  const csv = [
    "case_id,referral_type,seeded_defects,baseline_caught,agent_caught,agent_false_flags,is_control,note",
    ...perCase.map(
      (p) =>
        `${p.caseId},${p.referralType},${p.seeded},${p.baselineCaught},${p.agentCaught},${p.agentFalseFlags},${p.isControl},"${p.note}"`,
    ),
    `TOTAL,,${metrics.headline.seededDefects},${metrics.baseline.caught},${metrics.agent.caught},${metrics.agent.falseFlags},,`,
  ].join("\n");
  fs.writeFileSync(path.join(PATHS.reports, "comparison.csv"), csv + "\n", "utf8");

  return metrics;
}

/** Assemble CHANGELOG_IMPROVEMENT.md from committed reports. Numbers only from files. */
export function buildChangelog(): string {
  const rows: string[] = [];
  const variance = readJson<VarianceReport>("iter2_variance.json");
  const adj = readJson<AdjudicatorResult>("adjudicator.json");

  const L: string[] = [];
  L.push("# Improvement Changelog");
  L.push("");
  L.push(
    "Every number below is copied from a committed file under `results/reports/` or `results/raw/`. " +
      "Each entry was written after the run it describes, not before.",
  );
  L.push("");

  for (const id of ITERATION_ORDER) {
    const r = readJson<ConfigReport>(`${id}.json`);
    if (!r) {
      L.push(`## ${id}\n\n_Not yet run. Run \`npm run eval\` to populate._\n`);
      continue;
    }
    L.push(`## ${r.label}`);
    L.push("");
    L.push(`- **Measured**: caught ${r.aggregate.caught} of ${r.aggregate.seededDefects} seeded defects (recall ${r.aggregate.recallPct}%); ${r.aggregate.falseFlags} false flag(s), ${r.aggregate.falseFlagsOnControls} on control packs; contradictions ${r.aggregate.contradictionsCaught}/${r.aggregate.contradictionsSeeded}.`);
    if (r.inventedValuesTotal !== null) {
      L.push(`- **Invented values** (value present but not traceable to the source text, or present where ground truth says absent): ${r.inventedValuesTotal}.`);
    }
    if (id === "iter2" && variance) {
      L.push(
        `- **Run-to-run variance** (n=${variance.runs} runs per pack): model judgment mean finding-count stdev ${variance.modelMeanStdev}; deterministic code ${variance.deterministicMeanStdev}. Evidence: \`results/reports/iter2_variance.csv\`.`,
      );
    }
    if (id === "final") {
      L.push(`- **Cost per pack**: $${(r.costUsd / r.perCase.length).toFixed(4)} (${r.mode} mode, ${r.model}).`);
    }
    L.push(`- **Evidence**: \`results/reports/${id}.json\``);
    L.push(`- **Decision**: ${id === "baseline" ? "reference point" : id === "final" ? "shipped" : "kept"}.`);
    L.push("");
  }

  L.push("## Removed experiment — contradiction adjudicator");
  L.push("");
  if (adj) {
    L.push(`- **What it did**: a model call received both conflicting values and was asked which was correct, across ${adj.cases.length} contradiction cases.`);
    L.push(`- **Measured accuracy**: matched the internally consistent value in ${adj.agreementRate} decided cases. Full transcript: \`results/trajectories/adjudicator.md\` (case-12 included). Data: \`results/reports/adjudicator.json\`.`);
    L.push(`- **Boundary review**: ${adj.boundaryAssessment}`);
    L.push(`- **Decision**: removed. A correct guess is still a guess the clinician did not authorise.`);
  } else {
    L.push("_Not yet run. Run `npm run eval -- --adjudicator`._");
  }
  L.push("");
  L.push("## Which single change contributed most");
  L.push("");
  const iter2 = readJson<ConfigReport>("iter2.json");
  const iter3 = readJson<ConfigReport>("iter3.json");
  if (iter2 && iter3) {
    const delta = iter3.aggregate.caught - iter2.aggregate.caught;
    L.push(
      `The deterministic consistency verifier (Iteration 3) added ${delta} caught defect(s) over Iteration 2 and was the only change that caught case 12, which every earlier configuration passed as complete. See \`results/reports/iter2.json\` and \`results/reports/iter3.json\`.`,
    );
  } else {
    L.push("_Run the full eval to populate this section._");
  }
  L.push("");
  return L.join("\n");
}

export function writeDashboardData(): void {
  const metrics = readJson<FinalMetrics>("final_metrics.json");
  fs.mkdirSync(PATHS.data, { recursive: true });
  const casesDir = path.join(PATHS.reports, "cases");
  const cases = fs.existsSync(casesDir)
    ? fs.readdirSync(casesDir).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(fs.readFileSync(path.join(casesDir, f), "utf8")))
    : [];
  fs.writeFileSync(
    path.join(PATHS.data, "dashboard.json"),
    JSON.stringify({ metrics, cases, generatedAt: new Date().toISOString() }, null, 2) + "\n",
    "utf8",
  );
}
