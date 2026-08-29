import type { Finding } from "../domain/types";
import type { GroundTruth, GroundTruthDefect } from "../lib/fixtures";
import type { BaselineFinding } from "../baseline";

/** Fields that are all part of the same "pregnancy dating" concept. */
const DATING = new Set(["lmp", "edd", "gestationalAge"]);
const RHESUS = new Set(["antiD", "rhesus", "bloodGroup"]);

function fieldsMatch(gtField: string, found: string | null): boolean {
  if (!found) return false;
  if (gtField === found) return true;
  if (DATING.has(gtField) && DATING.has(found)) return true;
  if (RHESUS.has(gtField) && RHESUS.has(found)) return true;
  return false;
}

/** Keyword fallback for baseline lines whose field could not be classified. */
function lineMatchesDefect(line: string, defect: GroundTruthDefect): boolean {
  const l = line.toLowerCase();
  const map: Record<string, RegExp> = {
    bloodGroup: /blood group|abo/,
    haemoglobin: /haemoglobin|hemoglobin|\bhb\b/,
    antiD: /anti-?d|rhesus|rh[ -]?neg/,
    edd: /delivery date|edd|lmp|gestational|dates? (do not|don'?t|does not) (match|agree)|future/,
    gestationalAge: /gestational age|\bga\b|weeks|lmp/,
    parity: /parity|\bpara\b|obstetric history/,
    syphilisScreen: /syphilis|rpr|vdrl|before the (lmp|last menstrual)/,
  };
  const re = map[defect.field];
  return re ? re.test(l) : false;
}

export interface CaseScore {
  caseId: string;
  isControl: boolean;
  noFindingsExpected: boolean;
  seededDefects: number;
  caught: number;
  missed: string[];
  falseFlags: number;
  falseFlagLines: string[];
  matchedDefectIds: string[];
}

export function scoreAgent(gt: GroundTruth, findings: Finding[]): CaseScore {
  const usedFinding = new Set<number>();
  const matched: string[] = [];
  const missed: string[] = [];

  for (const defect of gt.defects) {
    const idx = findings.findIndex(
      (f, i) => !usedFinding.has(i) && fieldsMatch(defect.field, f.field),
    );
    if (idx >= 0) {
      usedFinding.add(idx);
      matched.push(defect.id);
    } else {
      missed.push(defect.id);
    }
  }

  const falseFlagLines = findings
    .filter((_, i) => !usedFinding.has(i))
    .map((f) => `${f.field}: ${f.plain}`);

  return {
    caseId: gt.id,
    isControl: gt.isControl,
    noFindingsExpected: gt.noFindingsExpected,
    seededDefects: gt.defects.length,
    caught: matched.length,
    missed,
    falseFlags: falseFlagLines.length,
    falseFlagLines,
    matchedDefectIds: matched,
  };
}

export function scoreBaseline(gt: GroundTruth, findings: BaselineFinding[]): CaseScore {
  const used = new Set<number>();
  const matched: string[] = [];
  const missed: string[] = [];

  for (const defect of gt.defects) {
    const idx = findings.findIndex(
      (f, i) =>
        !used.has(i) && (fieldsMatch(defect.field, f.field) || lineMatchesDefect(f.line, defect)),
    );
    if (idx >= 0) {
      used.add(idx);
      matched.push(defect.id);
    } else {
      missed.push(defect.id);
    }
  }

  const falseFlagLines = findings.filter((_, i) => !used.has(i)).map((f) => f.line);

  return {
    caseId: gt.id,
    isControl: gt.isControl,
    noFindingsExpected: gt.noFindingsExpected,
    seededDefects: gt.defects.length,
    caught: matched.length,
    missed,
    falseFlags: falseFlagLines.length,
    falseFlagLines,
    matchedDefectIds: matched,
  };
}

export interface Aggregate {
  cases: number;
  seededDefects: number;
  caught: number;
  recallPct: number;
  falseFlags: number;
  falseFlagsOnControls: number;
  contradictionsSeeded: number;
  contradictionsCaught: number;
}

export function aggregate(scores: CaseScore[], gts: GroundTruth[]): Aggregate {
  const byId = new Map(gts.map((g) => [g.id, g]));
  let seeded = 0,
    caught = 0,
    ff = 0,
    ffControls = 0,
    cSeeded = 0,
    cCaught = 0;
  for (const s of scores) {
    seeded += s.seededDefects;
    caught += s.caught;
    ff += s.falseFlags;
    if (s.isControl) ffControls += s.falseFlags;
    const gt = byId.get(s.caseId);
    if (gt) {
      for (const d of gt.defects) {
        if (d.type === "contradiction") {
          cSeeded += 1;
          if (s.matchedDefectIds.includes(d.id)) cCaught += 1;
        }
      }
    }
  }
  return {
    cases: scores.length,
    seededDefects: seeded,
    caught,
    recallPct: seeded ? Number(((caught / seeded) * 100).toFixed(1)) : 0,
    falseFlags: ff,
    falseFlagsOnControls: ffControls,
    contradictionsSeeded: cSeeded,
    contradictionsCaught: cCaught,
  };
}
