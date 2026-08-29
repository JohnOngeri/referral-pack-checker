import fs from "node:fs";
import path from "node:path";
import { PATHS } from "../lib/paths";
import type { PipelineResult } from "./pipeline";
import { SAFETY_LINE } from "../domain/checkpoint";

/**
 * Human-readable trajectory for a full pipeline run: what each stage was given,
 * what it produced, validation results, retries, and the human checkpoint.
 * Written so a judge can read it top to bottom unaided.
 */
export function writeTrajectory(r: PipelineResult): void {
  fs.mkdirSync(PATHS.trajectories, { recursive: true });
  const L: string[] = [];
  const rule = () => L.push("\n" + "-".repeat(72) + "\n");

  L.push(`# Trajectory — ${r.caseId} (${r.referralType})`);
  L.push(`Mode: ${r.mode.toUpperCase()}   Model: ${r.model}   Ran: ${r.ranAt}`);
  if (r.mode === "replay") L.push("REPLAY RUN — model outputs read from committed files, no API call made.");
  rule();

  L.push("## Stage 1 — Reading the referral pack (model call)");
  L.push(`Instruction: transcribe the pack into the typed schema; quote every source span; mark absent, never guess.`);
  L.push(`Context given: the pack text with line numbers (${r.packText.split("\n").length} lines).`);
  r.extraction.attempts.forEach((a) => {
    L.push(
      `\nAttempt ${a.attempt}: schema ${a.schemaValid ? "valid" : "INVALID"}; ` +
        `${a.semanticIssues.length} semantic issue(s); stop_reason=${a.stopReason ?? "n/a"}; ` +
        `tokens in/out ${a.usage.inputTokens}/${a.usage.outputTokens}`,
    );
    if (a.semanticIssues.length) {
      L.push("  Issues fed back to the model:");
      a.semanticIssues.forEach((i) => L.push(`   - ${i}`));
    }
    if (a.ok) L.push("  Accepted.");
  });
  rule();

  L.push("## Stage 2 — Checking against facility requirements (deterministic)");
  L.push("No model call. The extracted structure is compared field by field to the requirement set.");
  r.checks.requirements.all.forEach((f) => {
    L.push(`  ${f.field.padEnd(26)} ${f.verdict}${f.verdict !== "not_required" && f.verdict !== "present_current" ? "  <-- finding" : ""}`);
  });
  rule();

  L.push("## Stage 3 — Looking for contradictions (deterministic)");
  if (r.checks.consistency.length === 0) {
    L.push("  No contradictions found.");
  } else {
    r.checks.consistency.forEach((c) => {
      L.push(`  [${c.rule}] ${c.statement}`);
      c.values.forEach((v) =>
        L.push(`     ${v.derived ? "(derived) " : "(recorded)"} ${v.label}: ${v.value}  [${v.provenance?.quote ?? "?"}]`),
      );
      L.push(`     resolution: none — reported for the clinician to decide.`);
    });
  }
  rule();

  L.push("## Stage 4 — Preparing the summary (model call, verified fields only)");
  r.summary.attempts.forEach((a) => {
    L.push(
      `\nAttempt ${a.attempt}: schema ${a.schemaValid ? "valid" : "INVALID"}; ` +
        `${a.clinicalLanguageIssues.length} clinical-language issue(s)`,
    );
    a.clinicalLanguageIssues.forEach((i) => L.push(`   - ${i}`));
    if (a.ok) L.push("  Accepted.");
  });
  L.push("\nHeadline: " + r.summary.summary.headline);
  L.push("Gap list:");
  if (r.summary.summary.gapList.length === 0) L.push("  (none)");
  r.summary.summary.gapList.forEach((g) => L.push(`  - ${g}`));
  rule();

  L.push("## Human checkpoint");
  L.push(`State: ${r.review.state}`);
  L.push(SAFETY_LINE);
  L.push("The workflow stops here. No summary is finalised and no send action exists.");
  L.push("Approval is recorded through the dashboard: Approve summary / Send back for correction / Re-run check.");

  fs.writeFileSync(path.join(PATHS.trajectories, `${r.caseId}.md`), L.join("\n") + "\n", "utf8");

  // Companion machine detail for the consistency evidence.
  const checks = [
    `# ${r.caseId} — deterministic check detail`,
    "",
    "## Requirements",
    ...r.checks.requirements.all.map((f) => `- ${f.field}: ${f.verdict} — ${f.detail}`),
    "",
    "## Consistency",
    ...(r.checks.consistency.length
      ? r.checks.consistency.map((c) => `- ${c.rule}\n  ${c.statement}\n  detail: ${JSON.stringify(c.detail)}`)
      : ["- none"]),
  ];
  fs.writeFileSync(path.join(PATHS.trajectories, `${r.caseId}.checks.md`), checks.join("\n") + "\n", "utf8");
}
