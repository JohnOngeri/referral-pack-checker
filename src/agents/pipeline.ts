import fs from "node:fs";
import path from "node:path";
import type { ModelProvider } from "../provider";
import { priceFor } from "../provider";
import type { ReferralType } from "../domain/types";
import { PATHS } from "../lib/paths";
import { loadManifest, loadPackText, loadRequirementSet } from "../lib/fixtures";
import { runExtractor, type ExtractionResult } from "./extractor";
import { runSummariser, type SummariserResult } from "./summariser";
import { runChecks, type CheckResult } from "../checks";
import { loadMemory, memoryNotesFor, type MemoryStore } from "../memory";
import { freshCheckpoint, type ReviewRecord } from "../domain/checkpoint";
import { rawPath } from "../provider/raw";
import { writeTrajectory } from "./trajectory";
import { ruleCount } from "../checks/requirements";
import { CONSISTENCY_RULES } from "../domain/consistency";

export interface StageTiming {
  key: "reading" | "requirements" | "contradictions" | "summary";
  label: string;
  detail: string;
  startedAt: string;
  finishedAt: string;
}

export const STAGE_LABELS: Record<StageTiming["key"], string> = {
  reading: "Reading the referral pack",
  requirements: "Checking against facility requirements",
  contradictions: "Looking for contradictions",
  summary: "Preparing the summary",
};

export interface PipelineResult {
  caseId: string;
  referralType: ReferralType;
  patient: string;
  packText: string;
  mode: "fresh" | "replay";
  model: string;
  extraction: ExtractionResult;
  checks: CheckResult;
  summary: SummariserResult;
  review: ReviewRecord;
  stages: StageTiming[];
  costUsd: number;
  ranAt: string;
}

function costOf(model: string, usages: Array<{ inputTokens: number; outputTokens: number }>): number {
  const p = priceFor(model);
  return usages.reduce(
    (sum, u) => sum + (u.inputTokens * p.in + u.outputTokens * p.out) / 1_000_000,
    0,
  );
}

export async function runPipeline(
  provider: ModelProvider,
  caseId: string,
  opts: { memory?: MemoryStore; useMemory?: boolean } = {},
): Promise<PipelineResult> {
  const manifest = loadManifest();
  const entry = manifest.find((c) => c.id === caseId);
  if (!entry) throw new Error(`Unknown case ${caseId}`);
  const packText = loadPackText(caseId);
  const reqs = loadRequirementSet(entry.referralType);
  const stages: StageTiming[] = [];

  // Stage 1 — reading (model extraction)
  let t0 = new Date().toISOString();
  const extraction = await runExtractor(provider, caseId, packText);
  stages.push({
    key: "reading",
    label: STAGE_LABELS.reading,
    detail: `model call, ${extraction.attempts.length} attempt${extraction.attempts.length === 1 ? "" : "s"}`,
    startedAt: t0,
    finishedAt: new Date().toISOString(),
  });

  // Memory notes (per referring facility), computed before this pack is recorded.
  const memory = opts.memory ?? loadMemory();
  const facility = extraction.raw.referringFacility.value;
  const useMemory = opts.useMemory ?? true;
  const memoryNotes = useMemory
    ? memoryNotesFor(memory, facility, reqs.fields.map((f) => f.field))
    : {};

  // Stage 2 — requirements (deterministic)
  t0 = new Date().toISOString();
  // runChecks does both requirement + consistency; split timings for the UI.
  const checks = runChecks(extraction.pack, reqs, { memoryNotes });
  const reqCount = ruleCount(reqs);
  stages.push({
    key: "requirements",
    label: STAGE_LABELS.requirements,
    detail: `deterministic, ${reqCount} field rules`,
    startedAt: t0,
    finishedAt: new Date().toISOString(),
  });

  // Stage 3 — contradictions (deterministic)
  t0 = new Date().toISOString();
  stages.push({
    key: "contradictions",
    label: STAGE_LABELS.contradictions,
    detail: `deterministic, ${CONSISTENCY_RULES.length} rules`,
    startedAt: t0,
    finishedAt: new Date().toISOString(),
  });

  // Attach evidence file paths.
  for (const f of checks.findings) {
    f.evidenceFile =
      f.kind === "contradiction" || f.kind === "placeholder"
        ? path.relative(process.cwd(), path.join(PATHS.trajectories, `${caseId}.checks.md`))
        : path.relative(
            process.cwd(),
            rawPath({ phase: "extract", caseId, label: "extract", attempt: extraction.attempts.length }),
          );
  }

  // Stage 4 — summary (model)
  t0 = new Date().toISOString();
  const summary = await runSummariser(provider, caseId, extraction.raw, checks, reqs);
  stages.push({
    key: "summary",
    label: STAGE_LABELS.summary,
    detail: `model call, verified fields only, ${summary.attempts.length} attempt${summary.attempts.length === 1 ? "" : "s"}`,
    startedAt: t0,
    finishedAt: new Date().toISOString(),
  });

  const usages = [
    ...extraction.attempts.map((a) => a.usage),
    ...summary.attempts.map((a) => a.usage),
  ];
  const cost = provider.mode === "fresh" ? costOf(provider.model, usages) : 0;

  const result: PipelineResult = {
    caseId,
    referralType: entry.referralType,
    patient: entry.patient,
    packText,
    mode: provider.mode,
    model: provider.model,
    extraction,
    checks,
    summary,
    review: freshCheckpoint(),
    stages,
    costUsd: Number(cost.toFixed(4)),
    ranAt: new Date().toISOString(),
  };

  writeTrajectory(result);
  return result;
}

/** Write the machine-readable pipeline result for the dashboard to read. */
export function persistResult(result: PipelineResult): void {
  const dir = path.join(PATHS.reports, "cases");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${result.caseId}.json`), JSON.stringify(result, null, 2) + "\n", "utf8");
}
