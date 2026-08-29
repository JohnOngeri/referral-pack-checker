import fs from "node:fs";
import path from "node:path";
import type { ModelProvider } from "../provider";
import { PATHS } from "../lib/paths";
import { allCaseIds, loadGroundTruth, loadManifest, loadPackText, loadRequirementSet } from "../lib/fixtures";
import { runExtractor } from "../agents/extractor";
import { runConsistencyChecks } from "../domain/consistency";

/**
 * REMOVED EXPERIMENT — contradiction adjudicator.
 *
 * A model call that receives both conflicting values and is asked which is
 * correct. Run for real against all twelve cases so the changelog can report a
 * measured accuracy number and a captured transcript, then removed on the
 * grounds that choosing between two recorded values is a determination reserved
 * for the clinician — a correct guess is still a guess the clinician did not
 * authorise.
 *
 * This code is not wired into the pipeline or the dashboard. It exists only to
 * produce the evidence for the changelog entry.
 */
export interface AdjudicatorResult {
  mode: string;
  model: string;
  ranAt: string;
  cases: Array<{
    caseId: string;
    contradiction: string;
    valueA: string;
    valueB: string;
    modelChoice: string;
    modelReasoning: string;
    /** Which value the ground truth's stated correct resolution points at, if any. */
    groundTruthLeaning: string | null;
    agreedWithGroundTruth: boolean | null;
  }>;
  agreementRate: string;
  boundaryAssessment: string;
}

export async function runAdjudicator(provider: ModelProvider): Promise<AdjudicatorResult> {
  const ids = allCaseIds();
  const cases: AdjudicatorResult["cases"] = [];
  const transcripts: string[] = [];

  for (const id of ids) {
    const entry = loadManifest().find((c) => c.id === id)!;
    const packText = loadPackText(id);
    void loadRequirementSet(entry.referralType);
    const ex = await runExtractor(provider, id, packText);
    const cons = runConsistencyChecks(ex.pack);
    const contradiction = cons.find((c) => c.values.length >= 2 && !c.rule.includes("present_field"));
    if (!contradiction) continue;

    const [a, b] = contradiction.values;
    const system = `Two values in an antenatal referral pack conflict. You are asked which is correct. Answer with a single JSON object: {"choice": "A" | "B" | "cannot determine", "reasoning": "..."}.`;
    const user = `Contradiction: ${contradiction.statement}

A (${a.label}): ${a.value}  [source: ${a.provenance?.quote ?? "derived"}]
B (${b.label}): ${b.value}  [source: ${b.provenance?.quote ?? "derived"}]

Which is correct?`;

    const res = await provider.completeText(
      { phase: "adjudicator", caseId: id, label: "adjudicator", attempt: 1 },
      { system, user, maxTokens: 800 },
    );

    let choice = "cannot determine";
    let reasoning = res.text.trim();
    try {
      const j = JSON.parse(res.text.slice(res.text.indexOf("{"), res.text.lastIndexOf("}") + 1));
      choice = String(j.choice ?? "cannot determine");
      reasoning = String(j.reasoning ?? reasoning);
    } catch {
      /* keep raw text as reasoning */
    }

    const gt = loadGroundTruth(id);
    const defect = gt.defects.find((d) => d.type === "contradiction");
    // Our synthetic packs are built so the LMP-derived (derived) value is the
    // internally consistent one; the recorded figure is the seeded error.
    const gtLeaning = defect ? (a.derived ? "A" : b.derived ? "B" : null) : null;
    const agreed =
      gtLeaning === null ? null : choice.toUpperCase().startsWith(gtLeaning) ? true : false;

    cases.push({
      caseId: id,
      contradiction: contradiction.statement,
      valueA: `${a.label}: ${a.value}`,
      valueB: `${b.label}: ${b.value}`,
      modelChoice: choice,
      modelReasoning: reasoning,
      groundTruthLeaning: gtLeaning,
      agreedWithGroundTruth: agreed,
    });

    transcripts.push(
      `## ${id}\n${contradiction.statement}\n\nPROMPT\n${user}\n\nRESPONSE\nchoice: ${choice}\nreasoning: ${reasoning}\n\nREVIEW\nground-truth leaning: ${gtLeaning ?? "n/a"}   agreed: ${agreed ?? "n/a"}\n`,
    );
  }

  const decided = cases.filter((c) => c.agreedWithGroundTruth !== null);
  const agreed = decided.filter((c) => c.agreedWithGroundTruth).length;
  const rate = decided.length ? `${agreed} of ${decided.length}` : "n/a";

  const result: AdjudicatorResult = {
    mode: provider.mode,
    model: provider.model,
    ranAt: new Date().toISOString(),
    cases,
    agreementRate: rate,
    boundaryAssessment:
      "Where the model did pick a value, it was choosing between two entries in a clinical document — a determination that belongs to the clinician, whether or not the choice was correct. Where it declined to pick, it added nothing the verifier does not already provide. Either way the experiment is removed: the consistency verifier reports both values with their provenance and resolves nothing.",
  };

  fs.mkdirSync(PATHS.reports, { recursive: true });
  fs.writeFileSync(
    path.join(PATHS.reports, "adjudicator.json"),
    JSON.stringify(result, null, 2) + "\n",
    "utf8",
  );
  fs.mkdirSync(PATHS.trajectories, { recursive: true });
  fs.writeFileSync(
    path.join(PATHS.trajectories, "adjudicator.md"),
    `# Removed experiment — contradiction adjudicator\n\nMode: ${provider.mode}   Model: ${provider.model}   Ran: ${result.ranAt}\n\nAgreement with the internally consistent value: ${rate}\n\n${result.boundaryAssessment}\n\n${transcripts.join("\n" + "-".repeat(60) + "\n")}\n`,
    "utf8",
  );
  return result;
}
