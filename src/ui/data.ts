/** The exact shape the dashboard consumes. Produced by writeDashboardData(). */

export interface DashboardData {
  generatedAt: string;
  /** Null until the evaluation has been run. */
  metrics: DashboardMetrics | null;
  cases: DashboardCase[];
  changelog: ChangelogEntry[];
  adjudicator: AdjudicatorSummary | null;
  variance: { modelMeanStdev: number; deterministicMeanStdev: number; runs: number } | null;
}

export interface DashboardMetrics {
  mode: "fresh" | "replay";
  model: string;
  generatedAt: string;
  headline: { agentCaught: number; baselineCaught: number; seededDefects: number; sentence: string; sourceFile: string };
  agent: { recallPct: number; falseFlags: number; falseFlagsOnControls: number; inventedValues: number | null; costPerPackUsd: number; contradictionsCaught: number; contradictionsSeeded: number };
  baseline: { recallPct: number; falseFlags: number; costPerPackUsd: number; contradictionsCaught: number };
  perCase: Array<{ caseId: string; referralType: string; seeded: number; baselineCaught: number; agentCaught: number; agentFalseFlags: number; isControl: boolean; note: string }>;
  humanReviewTime: { measured: boolean; note: string };
}

export type PackStatus = "ready" | "gaps" | "contradiction";

export interface DashboardFinding {
  kind: "missing" | "placeholder" | "stale" | "conditional" | "contradiction";
  field: string;
  plain: string;
  rule: string;
  sourceSpan: string | null;
  extraSpans: string[];
  raw: string;
  evidenceFile: string;
  memoryNote?: string;
  note?: string;
}

export interface DashboardCase {
  id: string;
  patient: string;
  referralType: string;
  referralLabel: string;
  receivingFacility: string;
  status: PackStatus;
  statusLine: string;
  mode: "fresh" | "replay";
  model: string;
  ranAt: string;
  packLines: string[];
  /** 1-indexed lines to highlight (source spans of findings). */
  flaggedLines: number[];
  findings: DashboardFinding[];
  summary: {
    headline: string;
    rows: Array<{ label: string; value: string; state: "verified" | "outstanding" }>;
    gapList: string[];
    beforeYouSend: string[];
  };
  stages: Array<{ key: string; label: string; detail: string; ms: number }>;
  checkpoint: { state: string; safetyLine: string };
  extractionAttempts: number;
  summaryAttempts: number;
}

export interface ChangelogEntry {
  step: string;
  title: string;
  measured: string;
  decision: string;
  evidenceFile: string;
}

export interface AdjudicatorSummary {
  agreementRate: string;
  boundaryAssessment: string;
  case12Transcript: string;
  transcriptFile: string;
}
