import fs from "node:fs";
import path from "node:path";
import type { ModelProvider, RunMode } from "../provider";
import { priceFor } from "../provider";
import type { Finding } from "../domain/types";
import { PATHS } from "../lib/paths";
import {
  allCaseIds,
  loadGroundTruth,
  loadManifest,
  loadPackText,
  loadRequirementSet,
} from "../lib/fixtures";
import { runExtractor } from "../agents/extractor";
import { checkRequirements } from "../checks/requirements";
import { runConsistencyChecks } from "../domain/consistency";
import { modelRequirementCheck } from "../checks/model-requirements";
import { runBaseline } from "../baseline";
import { runChecks } from "../checks";
import { loadMemory, memoryNotesFor, recordPack, resetMemory, saveMemory } from "../memory";
import { aggregate, scoreAgent, scoreBaseline, type CaseScore } from "./score";
import { scoreExtraction, type ExtractionScore } from "./extraction-score";
import { CONFIGS, type EvalConfig } from "./configs";
import { ruleCount } from "../checks/requirements";

export interface ConfigReport {
  configId: string;
  label: string;
  mode: RunMode;
  model: string;
  ranAt: string;
  perCase: Array<CaseScore & { findings: Array<{ field: string; kind: string; plain: string }> }>;
  extraction: ExtractionScore[] | null;
  aggregate: ReturnType<typeof aggregate>;
  inventedValuesTotal: number | null;
  provenanceCorrectness: number | null;
  unparseableCount: number | null;
  costUsd: number;
  notes: string[];
}

interface CaseOutcome {
  findings: Finding[];
  extractionScore: ExtractionScore | null;
  cost: number;
  unparseable: boolean;
}

async function outcomeForConfig(
  provider: ModelProvider,
  config: EvalConfig,
  caseId: string,
): Promise<CaseOutcome> {
  const entry = loadManifest().find((c) => c.id === caseId)!;
  const packText = loadPackText(caseId);
  const reqs = loadRequirementSet(entry.referralType);
  const gt = loadGroundTruth(caseId);
  const price = priceFor(provider.model);

  if (config.kind === "baseline") {
    const b = await runBaseline(provider, caseId);
    const findings: Finding[] = b.parsedFindings.map((f) => ({
      kind: "missing",
      field: f.field ?? "unknown",
      plain: f.line,
      rule: "baseline.free_text",
      provenance: null,
      raw: f.line,
      evidenceFile: "",
    }));
    return { findings, extractionScore: null, cost: b.costUsd, unparseable: b.unparseable };
  }

  const ex = await runExtractor(provider, caseId, packText);
  const extractionScore = scoreExtraction(gt, ex.raw, packText);
  const extractCost =
    provider.mode === "fresh"
      ? ex.attempts.reduce(
          (s, a) => s + (a.usage.inputTokens * price.in + a.usage.outputTokens * price.out) / 1_000_000,
          0,
        )
      : 0;

  let findings: Finding[] = [];
  let modelCheckCost = 0;

  if (config.checkMode === "model") {
    findings = await modelRequirementCheck(provider, caseId, config.id, ex.raw, reqs);
  } else {
    const cr = runChecks(ex.pack, reqs);
    findings = cr.findings.filter((f) => f.kind !== "contradiction" && f.kind !== "placeholder");
  }

  if (config.useConsistency) {
    for (const c of runConsistencyChecks(ex.pack)) {
      findings.push({
        kind: c.rule.includes("present_field_holds_real_value") ? "placeholder" : "contradiction",
        field: c.field,
        plain: c.statement,
        rule: c.rule,
        provenance: c.values[0]?.provenance ?? null,
        raw: JSON.stringify(c.detail),
        evidenceFile: "",
      });
    }
  }

  if (config.useMemory) {
    const notes = memoryNotesFor(
      loadMemory(),
      ex.raw.referringFacility.value,
      reqs.fields.map((f) => f.field),
    );
    findings = findings
      .map((f) => ({ ...f, memoryNote: notes[f.field] }))
      .sort((a, b) => (b.memoryNote ? 1 : 0) - (a.memoryNote ? 1 : 0));
  }

  return { findings, extractionScore, cost: extractCost + modelCheckCost, unparseable: false };
}

/** Prime the memory store from a deterministic pass so repeat omissions have history. */
async function primeMemory(provider: ModelProvider): Promise<void> {
  resetMemory();
  let store = loadMemory();
  for (const id of allCaseIds()) {
    const entry = loadManifest().find((c) => c.id === id)!;
    const reqs = loadRequirementSet(entry.referralType);
    const ex = await runExtractor(provider, id, loadPackText(id));
    const flagged = [
      ...checkRequirements(ex.pack, reqs).findings.map((f) => f.field),
      ...runConsistencyChecks(ex.pack).map((c) => c.field),
    ];
    store = recordPack(store, ex.raw.referringFacility.value, flagged);
  }
  saveMemory(store);
}

export async function runConfig(provider: ModelProvider, configId: string): Promise<ConfigReport> {
  const config = CONFIGS[configId];
  if (!config) throw new Error(`Unknown config ${configId}`);
  const ids = allCaseIds();
  const gts = ids.map(loadGroundTruth);

  if (config.useMemory) await primeMemory(provider);

  const perCase: ConfigReport["perCase"] = [];
  const extraction: ExtractionScore[] = [];
  let cost = 0;
  let unparseable = 0;

  for (let i = 0; i < ids.length; i++) {
    const { findings, extractionScore, cost: c, unparseable: u } = await outcomeForConfig(provider, config, ids[i]);
    cost += c;
    if (u) unparseable += 1;
    if (extractionScore) extraction.push(extractionScore);

    const score =
      config.kind === "baseline"
        ? scoreBaseline(
            gts[i],
            findings.map((f) => ({ field: f.field === "unknown" ? null : f.field, line: f.plain })),
          )
        : scoreAgent(gts[i], findings);

    perCase.push({
      ...score,
      findings: findings.map((f) => ({ field: f.field, kind: f.kind, plain: f.plain })),
    });
  }

  const provTotal = extraction.reduce((s, e) => s + e.provenanceTotal, 0);
  const provOk = extraction.reduce((s, e) => s + e.provenanceOk, 0);

  const report: ConfigReport = {
    configId,
    label: config.label,
    mode: provider.mode,
    model: provider.model,
    ranAt: new Date().toISOString(),
    perCase,
    extraction: extraction.length ? extraction : null,
    aggregate: aggregate(perCase, gts),
    inventedValuesTotal: extraction.length ? extraction.reduce((s, e) => s + e.inventedValues, 0) : null,
    provenanceCorrectness: provTotal ? Number(((provOk / provTotal) * 100).toFixed(1)) : null,
    unparseableCount: config.kind === "baseline" ? unparseable : null,
    costUsd: Number(cost.toFixed(4)),
    notes: [],
  };

  fs.mkdirSync(PATHS.reports, { recursive: true });
  fs.writeFileSync(
    path.join(PATHS.reports, `${configId}.json`),
    JSON.stringify(report, null, 2) + "\n",
    "utf8",
  );
  return report;
}

export function ruleCounts(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id of ["elective_caesarean", "hypertension_review", "anaemia_review", "routine_ultrasound"] as const) {
    out[id] = ruleCount(loadRequirementSet(id));
  }
  return out;
}
