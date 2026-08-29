import fs from "node:fs";
import path from "node:path";
import { PATHS } from "./paths";
import type { ReferralType, RequirementSet } from "../domain/types";

export interface CaseManifestEntry {
  id: string;
  file: string;
  referralType: ReferralType;
  patient: string;
  receivingFacility: string;
  receivingDepartment: string;
  seededDefectSummary: string;
}

export interface GroundTruthDefect {
  id: string;
  field: string;
  type: "missing" | "placeholder" | "stale" | "conditional" | "contradiction";
  category: "requirements" | "consistency";
  rule: string;
  summary: string;
  sourceSpan?: string;
  conflictingValues?: Record<string, unknown>;
  correctResolution: string;
  discoveredDuringEvaluation: boolean;
}

export interface GroundTruth {
  id: string;
  referralType: ReferralType;
  isControl: boolean;
  noFindingsExpected: boolean;
  isHardCase?: boolean;
  defects: GroundTruthDefect[];
  extractionExpectations: Array<{ field: string; expect: "present" | "absent"; note?: string }>;
  note?: string;
}

export function loadManifest(): CaseManifestEntry[] {
  const raw = fs.readFileSync(path.join(PATHS.packs, "manifest.json"), "utf8");
  return (JSON.parse(raw).cases as CaseManifestEntry[]);
}

export function loadPackText(caseId: string): string {
  const entry = loadManifest().find((c) => c.id === caseId);
  if (!entry) throw new Error(`Unknown case: ${caseId}`);
  return fs.readFileSync(path.join(PATHS.packs, entry.file), "utf8");
}

export function loadRequirementSet(type: ReferralType): RequirementSet {
  const raw = fs.readFileSync(path.join(PATHS.requirements, `${type}.json`), "utf8");
  return JSON.parse(raw) as RequirementSet;
}

export function loadGroundTruth(caseId: string): GroundTruth {
  const raw = fs.readFileSync(path.join(PATHS.groundTruth, `${caseId}.json`), "utf8");
  return JSON.parse(raw) as GroundTruth;
}

export function allCaseIds(): string[] {
  return loadManifest().map((c) => c.id);
}
