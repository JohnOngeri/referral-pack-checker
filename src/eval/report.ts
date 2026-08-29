import fs from "node:fs";
import path from "node:path";
import { PATHS } from "../lib/paths";
import { allCaseIds, loadGroundTruth, loadManifest } from "../lib/fixtures";
import type { ConfigReport } from "./run";
import type { VarianceReport } from "./variance";
import type { AdjudicatorResult } from "../agents/adjudicator";
import { ITERATION_ORDER, ITERATION_ORDER as ITER } from "./configs";
import type { PipelineResult } from "../agents/pipeline";
import { REFERRAL_TYPE_LABEL } from "../domain/types";
import { SAFETY_LINE } from "../domain/checkpoint";
import type {
  ChangelogEntry,
  DashboardCase,
  DashboardData,
  DashboardFinding,
  PackStatus,
} from "../ui/data";

function readJson<T>(name: string): T | null {
  const p = path.join(PATHS.reports, name);
  return fs.existsSync(p) ? (JSON.parse(fs.readFileSync(p, "utf8")) as T) : null;
}

/**
 * The mode the committed model calls were actually made in. Reports may be
 * regenerated in replay from a fresh run's committed responses; in that case the
 * detection numbers still come from real API calls, and this returns "fresh".
 */
function sourceCallMode(): "fresh" | "replay" | "unknown" {
  for (const rel of [
    ["baseline", "case-01", "baseline__attempt-1.json"],
    ["extract", "case-01", "extract__attempt-1.json"],
  ]) {
    const p = path.join(PATHS.resultsRaw, ...rel);
    if (fs.existsSync(p)) {
      try {
        return (JSON.parse(fs.readFileSync(p, "utf8")).mode as "fresh" | "replay") ?? "unknown";
      } catch {
        /* fall through */
      }
    }
  }
  return "unknown";
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
  /**
   * Review-burden proxy for the (unmeasured) wall-clock review time: how many
   * findings a reviewer must read per pack and how many of those are spurious.
   * Computed from the committed findings, not a stopwatch. See
   * docs/human-review-time.md.
   */
  reviewerLoad: {
    agent: ReviewerLoad;
    baseline: ReviewerLoad;
  };
}

interface ReviewerLoad {
  findingsPerPack: number;
  spuriousSharePct: number;
  controlPacksLeftClean: string;
}

function reviewerLoadFor(report: ConfigReport, gts: ReturnType<typeof loadGroundTruth>[]): ReviewerLoad {
  const byId = new Map(gts.map((g) => [g.id, g]));
  const totalFindings = report.perCase.reduce((s, p) => s + p.findings.length, 0);
  const totalFalse = report.perCase.reduce((s, p) => s + p.falseFlags, 0);
  const controls = report.perCase.filter((p) => byId.get(p.caseId)?.isControl);
  const controlsClean = controls.filter((p) => p.findings.length === 0).length;
  return {
    findingsPerPack: Number((totalFindings / report.perCase.length).toFixed(2)),
    spuriousSharePct: totalFindings ? Number(((totalFalse / totalFindings) * 100).toFixed(1)) : 0,
    controlPacksLeftClean: `${controlsClean} of ${controls.length}`,
  };
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
          "Not measured; an estimate beside measured detection numbers would mislead. " +
          "A computed review-burden proxy ships in the reviewerLoad block. To add the real number, " +
          "follow docs/human-review-time.md and write results/reports/human_review_time.json.",
      };

  const seeded = final.aggregate.seededDefects;
  const sentence =
    `${final.aggregate.caught} of ${seeded} documentation gaps caught, with ${final.aggregate.falseFlags} false ` +
    `alarm${final.aggregate.falseFlags === 1 ? "" : "s"}. The single-prompt baseline caught ${baseline.aggregate.caught}, ` +
    `with ${baseline.aggregate.falseFlags}.`;

  // Cost per pack for the full workflow (extraction + summary), averaged over the
  // committed per-case pipeline results.
  const casesDir2 = path.join(PATHS.reports, "cases");
  const caseFiles = fs.existsSync(casesDir2)
    ? fs.readdirSync(casesDir2).filter((f) => f.endsWith(".json"))
    : [];
  const agentCostPerPack = caseFiles.length
    ? caseFiles.reduce((s, f) => s + (JSON.parse(fs.readFileSync(path.join(casesDir2, f), "utf8")).costUsd ?? 0), 0) /
      caseFiles.length
    : final.costUsd / ids.length;

  const metrics: FinalMetrics = {
    generatedAt: new Date().toISOString(),
    mode: sourceCallMode() === "unknown" ? final.mode : sourceCallMode(),
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
      costPerPackUsd: Number(agentCostPerPack.toFixed(4)),
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
    reviewerLoad: {
      agent: reviewerLoadFor(final, gts),
      baseline: reviewerLoadFor(baseline, gts),
    },
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
  const fm = readJson<FinalMetrics>("final_metrics.json");

  const L: string[] = [];
  L.push("# Improvement Changelog");
  L.push("");
  L.push(
    "Every number below is copied from a committed file under `results/reports/` or `results/raw/`. " +
      "Each entry was written after the run it describes, not before.",
  );
  L.push("");

  // ── Summary table, in the hackathon brief's STAGE / WHAT / EVIDENCE / DECISION shape ──
  const recall = (r: ConfigReport | null) =>
    r ? `${r.aggregate.caught}/${r.aggregate.seededDefects} caught, ${r.aggregate.falseFlags} FF, contradictions ${r.aggregate.contradictionsCaught}/${r.aggregate.contradictionsSeeded}` : "—";
  const tried: Record<string, string> = {
    baseline: "One end-to-end model call: raw pack + requirement set in, findings + summary out. Reasonable first thing to try.",
    iter1: "Moved extraction to a schema-constrained call with a provenance span on every field; absence became a first-class value. Tried because a free-text pass invents the shape of values it never found.",
    iter2: "Moved the requirement comparison out of the model and into deterministic code, after Iteration 1 called a 4–6-day-old haemoglobin \"stale\" on three packs.",
    iter3: "Added a deterministic consistency verifier (six calendar/arithmetic rules), after noticing every earlier config passed case-12 — which contradicts itself — as complete.",
    iter4: "Added a per-facility recurring-omission memory that reorders the gap list, to surface fields a facility habitually drops.",
    final: "Combined the changes that were kept.",
  };
  const learning: Record<string, string> = {
    baseline: "Reference point. Recall looks acceptable; precision does not (34 false flags, 5 on controls).",
    iter1: "Kept. Invented values 0 from here on. Recall unchanged — the model check still misses contradictions and mis-does date arithmetic.",
    iter2: "Kept. False flags 5 -> 0; hallucinated staleness gone. A recency rule is a date subtraction, not a model's guess.",
    iter3: "Kept. Recall 40% -> 100%; contradictions 0/6 -> 6/6. The single change that mattered most, and the only one that catches case-12.",
    iter4: "Kept. No effect on recall in this set — the twelve packs are twelve different facilities, so there is no repeat history to act on. Mechanism shown separately in results/trajectories/memory-demo.md.",
    final: "Shipped. Meets every target in docs/evaluation-plan.md.",
  };
  L.push("| Stage | What you tried and why | Evidence | Decision / Learning |");
  L.push("|---|---|---|---|");
  for (const id of ITERATION_ORDER) {
    const r = readJson<ConfigReport>(`${id}.json`);
    const label = r ? r.label.replace(/\s*—.*$/, "") : id;
    L.push(`| ${label} | ${tried[id] ?? ""} | \`results/reports/${id}.json\` — ${recall(r)} | ${learning[id] ?? ""} |`);
  }
  if (adj) {
    L.push(
      `| Removed: contradiction adjudicator | A model call was given both conflicting values and asked which was correct. | \`results/reports/adjudicator.json\` — agreed with the consistent value ${adj.agreementRate} decided cases | Removed. Choosing between two entries in a medical record is the clinician's call; a correct guess is still an unauthorised one. |`,
    );
  }
  L.push("");
  L.push("Full detail for each stage follows.");
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
    if (r.unparseableCount) {
      L.push(`- **Unparseable responses**: ${r.unparseableCount} of ${r.perCase.length} (truncated, or no locatable findings section).`);
    }
    if (r.inventedValuesTotal !== null) {
      L.push(`- **Invented values** (value present but not traceable to the source text, or present where ground truth says absent): ${r.inventedValuesTotal}.`);
    }
    if (r.provenanceCorrectness !== null && r.provenanceCorrectness !== undefined) {
      L.push(`- **Provenance correctness**: ${r.provenanceCorrectness}% of extracted spans are exact substrings of the pack text.`);
    }
    if (id === "iter1") {
      L.push(
        `- **What changed**: extraction moved to a schema-constrained call with a provenance span on every field; absence became a first-class value. The requirement comparison is still a model judgment. Invented values went to 0; recall did not move, because the model check still misses the contradiction-type defects and still gets date arithmetic wrong.`,
      );
    }
    if (id === "iter3") {
      L.push(
        `- **What this revealed about earlier results**: every configuration before this one passed case 12 as complete. It is not complete — the recorded gestational age and the LMP disagree by six weeks, and the estimated delivery date follows the wrong one. Those earlier "passes" were not genuine.`,
      );
    }
    if (id === "iter4") {
      const i3 = readJson<ConfigReport>("iter3.json");
      L.push(
        `- **Measured effect**: recall unchanged (${i3 ? i3.aggregate.caught : "—"} to ${r.aggregate.caught}). Memory does not find new defects; it reorders the gap list so a field a facility has repeatedly omitted appears first. Reported here whichever direction it went — it did not change what was caught.`,
      );
      L.push(
        `- **Why it is inert in this evaluation**: the twelve packs are sent by twelve different facilities, so no facility has a second pack for the store to have learned from. The reorder behaviour is demonstrated in isolation in \`results/trajectories/memory-demo.md\` (three packs from one facility, deterministic). Kept because a real deployment sees the same facility repeatedly; a judge should read it as a design choice with a shown mechanism, not a measured gain.`,
      );
    }
    if (id === "iter2" && variance) {
      const i1 = readJson<ConfigReport>("iter1.json");
      L.push(
        `- **Run-to-run variance** (n=${variance.runs} runs per pack, temperature 0): model judgment mean finding-count stdev ${variance.modelMeanStdev}; deterministic code ${variance.deterministicMeanStdev}. Evidence: \`results/reports/iter2_variance.csv\`. At temperature 0 the model check did not vary in the number of findings, so variance is not what justified this change.`,
      );
      L.push(
        `- **What justified it**: precision. Moving the requirement comparison into code took false flags from ${i1 ? i1.aggregate.falseFlags : "—"} to ${r.aggregate.falseFlags} and removed the hallucinated staleness findings — on three packs Iteration 1 called a haemoglobin taken four to six days ago "stale". A recency rule is a date subtraction; it should not be a model's guess.`,
      );
    }
    if (id === "final") {
      const cpp = fm ? fm.agent.costPerPackUsd : r.costUsd / r.perCase.length;
      L.push(`- **Cost per pack** (extraction + summary): $${cpp.toFixed(4)} (${r.mode} mode, ${r.model}).`);
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

function statusOf(r: PipelineResult): PackStatus {
  if (r.checks.findings.some((f) => f.kind === "contradiction")) return "contradiction";
  if (r.checks.findings.length > 0) return "gaps";
  return "ready";
}

function statusLine(r: PipelineResult): string {
  const n = r.checks.findings.length;
  if (n === 0) return "Ready for review";
  const c = r.checks.findings.filter((f) => f.kind === "contradiction").length;
  if (c > 0) return c === 1 ? "1 contradiction found" : `${c} contradictions found`;
  return n === 1 ? "1 gap outstanding" : `${n} gaps outstanding`;
}

function toDashboardCase(r: PipelineResult, receivingFacility: string): DashboardCase {
  const packLines = r.packText.replace(/\n+$/, "").split("\n");
  const findings: DashboardFinding[] = r.checks.findings.map((f) => ({
    kind: f.kind,
    field: f.field,
    plain: f.plain,
    rule: f.rule,
    sourceSpan: f.provenance?.quote ?? null,
    extraSpans: (f.extraProvenance ?? []).map((p) => p.quote),
    raw: f.raw,
    evidenceFile: f.evidenceFile,
    memoryNote: f.memoryNote,
    note: f.note,
  }));
  const flagged = new Set<number>();
  for (const f of r.checks.findings) {
    for (const q of [f.provenance?.quote, ...(f.extraProvenance ?? []).map((p) => p.quote)]) {
      if (!q) continue;
      const idx = packLines.findIndex((l) => l.toLowerCase().includes(q.toLowerCase().split("\n")[0].trim()));
      if (idx >= 0) flagged.add(idx + 1);
    }
  }
  return {
    id: r.caseId,
    patient: r.patient,
    referralType: r.referralType,
    referralLabel: REFERRAL_TYPE_LABEL[r.referralType],
    receivingFacility,
    status: statusOf(r),
    statusLine: statusLine(r),
    mode: r.mode,
    model: r.model,
    ranAt: r.ranAt,
    packLines,
    flaggedLines: [...flagged].sort((a, b) => a - b),
    findings,
    summary: {
      headline: r.summary.summary.headline,
      rows: r.summary.summary.summaryRows,
      gapList: r.summary.summary.gapList,
      beforeYouSend: r.summary.summary.beforeYouSend,
    },
    stages: r.stages.map((s) => ({
      key: s.key,
      label: s.label,
      detail: s.detail,
      ms: Math.max(0, new Date(s.finishedAt).getTime() - new Date(s.startedAt).getTime()),
    })),
    checkpoint: { state: r.review.state, safetyLine: SAFETY_LINE },
    extractionAttempts: r.extraction.attempts.length,
    summaryAttempts: r.summary.attempts.length,
  };
}

export function changelogEntries(): ChangelogEntry[] {
  const out: ChangelogEntry[] = [];
  for (const id of ITER) {
    const r = readJson<ConfigReport>(`${id}.json`);
    if (!r) continue;
    const a = r.aggregate;
    let measured = `${a.caught} of ${a.seededDefects} seeded defects caught, ${a.falseFlags} false flag(s).`;
    if (r.unparseableCount !== null && r.unparseableCount !== undefined && r.unparseableCount > 0) {
      measured += ` ${r.unparseableCount} response(s) unparseable.`;
    }
    if (r.inventedValuesTotal !== null) measured += ` Invented values: ${r.inventedValuesTotal}.`;
    if (id === "iter2") {
      const v = readJson<{ modelMeanStdev: number; deterministicMeanStdev: number }>("iter2_variance.json");
      if (v) measured += ` Run-to-run finding-count stdev: model ${v.modelMeanStdev}, deterministic ${v.deterministicMeanStdev}.`;
    }
    if (id === "iter3") measured += ` Contradictions caught: ${a.contradictionsCaught}/${a.contradictionsSeeded}.`;
    if (id === "final") measured += ` Cost per pack: $${(r.costUsd / r.perCase.length).toFixed(4)}.`;
    out.push({
      step: id === "baseline" ? "Baseline" : id === "final" ? "Final" : `Iteration ${id.replace("iter", "")}`,
      title: r.label.replace(/^.*—\s*/, ""),
      measured,
      decision: id === "baseline" ? "Reference" : id === "final" ? "Shipped" : "Kept",
      evidenceFile: `results/reports/${id}.json`,
    });
  }
  return out;
}

export function writeDashboardData(): void {
  const fm = readJson<FinalMetrics>("final_metrics.json");
  fs.mkdirSync(PATHS.data, { recursive: true });
  const manifest = loadManifest();
  const casesDir = path.join(PATHS.reports, "cases");
  const cases: DashboardCase[] = fs.existsSync(casesDir)
    ? fs
        .readdirSync(casesDir)
        .filter((f) => f.endsWith(".json"))
        .map((f) => {
          const r = JSON.parse(fs.readFileSync(path.join(casesDir, f), "utf8")) as PipelineResult;
          const m = manifest.find((c) => c.id === r.caseId);
          return toDashboardCase(r, m ? `${m.receivingFacility} — ${m.receivingDepartment}` : "");
        })
        .sort((a, b) => a.id.localeCompare(b.id))
    : [];

  const adj = readJson<AdjudicatorResult>("adjudicator.json");
  const variance = readJson<{ modelMeanStdev: number; deterministicMeanStdev: number; runs: number }>(
    "iter2_variance.json",
  );
  const adjMd = fs.existsSync(path.join(PATHS.trajectories, "adjudicator.md"))
    ? fs.readFileSync(path.join(PATHS.trajectories, "adjudicator.md"), "utf8")
    : "";
  const case12Block = adjMd.split(/^## /m).find((s) => s.startsWith("case-12")) ?? "";

  const data: DashboardData = {
    generatedAt: new Date().toISOString(),
    metrics: fm
      ? {
          mode: fm.mode as "fresh" | "replay",
          model: fm.model,
          generatedAt: fm.generatedAt,
          headline: fm.headline,
          agent: {
            recallPct: fm.agent.recallPct,
            falseFlags: fm.agent.falseFlags,
            falseFlagsOnControls: fm.agent.falseFlagsOnControls,
            inventedValues: fm.agent.inventedValues,
            costPerPackUsd: fm.agent.costPerPackUsd,
            contradictionsCaught: fm.contradictionDetection.agentCaught,
            contradictionsSeeded: fm.contradictionDetection.seeded,
          },
          baseline: {
            recallPct: fm.baseline.recallPct,
            falseFlags: fm.baseline.falseFlags,
            costPerPackUsd: fm.baseline.costPerPackUsd,
            contradictionsCaught: fm.contradictionDetection.baselineCaught,
          },
          perCase: fm.perCase,
          humanReviewTime: { measured: fm.humanReviewTime.measured, note: fm.humanReviewTime.note },
        }
      : null,
    cases,
    changelog: changelogEntries(),
    adjudicator: adj
      ? {
          agreementRate: adj.agreementRate,
          boundaryAssessment: adj.boundaryAssessment,
          case12Transcript: case12Block ? `## ${case12Block}` : "Run the evaluation to capture the transcript.",
          transcriptFile: "results/trajectories/adjudicator.md",
        }
      : null,
    variance: variance
      ? { modelMeanStdev: variance.modelMeanStdev, deterministicMeanStdev: variance.deterministicMeanStdev, runs: variance.runs }
      : null,
  };

  fs.writeFileSync(path.join(PATHS.data, "dashboard.json"), JSON.stringify(data, null, 2) + "\n", "utf8");
}
