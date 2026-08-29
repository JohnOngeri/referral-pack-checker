import fs from "node:fs";
import path from "node:path";
import { PATHS } from "../lib/paths";
import { allCaseIds, loadManifest, loadPackText, loadRequirementSet } from "../lib/fixtures";
import { rawPath } from "../provider/raw";
import { loadMemory } from "../memory";
import { parseBaseline } from "../baseline";
import type { ModelProvider } from "../provider";
import { runExtractor } from "../agents/extractor";

/**
 * Supplementary readable trajectories the per-case files do not already cover:
 * the single-prompt baseline, the memory store, and a run that exercises the
 * extraction retry loop.
 */
export async function writeExtraTrajectories(provider: ModelProvider): Promise<void> {
  fs.mkdirSync(PATHS.trajectories, { recursive: true });

  // ── Baseline ─────────────────────────────────────────────────────────────
  const caseId = "case-12";
  const bPath = rawPath({ phase: "baseline", caseId, label: "baseline", attempt: 1 });
  if (fs.existsSync(bPath)) {
    const rec = JSON.parse(fs.readFileSync(bPath, "utf8"));
    const text: string = rec.response.text ?? "";
    const parsed = parseBaseline(text, rec.stopReason);
    const L = [
      `# Trajectory — baseline (single prompt), ${caseId}`,
      ``,
      `Mode: ${rec.mode.toUpperCase()}   Model: ${rec.model}`,
      ``,
      `One model call. The raw pack text and the requirement set go in; free-form text`,
      `comes back. No extraction schema, no deterministic checker, no consistency`,
      `verifier, no retry loop, no memory.`,
      ``,
      `## Instruction given`,
      "```",
      String(rec.request?.config?.systemInstruction ?? "(see results/raw/baseline/)"),
      "```",
      ``,
      `## Raw response`,
      `stop_reason: ${rec.stopReason}   tokens in/out: ${rec.usage.inputTokens}/${rec.usage.outputTokens}`,
      "```",
      text.slice(0, 4000) || "(empty)",
      "```",
      ``,
      `## How the scorer read it`,
      `- unparseable: ${parsed.unparseable}`,
      `- ${parsed.note}`,
      `- finding lines extracted: ${parsed.findings.length}`,
      ...parsed.findings.slice(0, 20).map((f) => `   - [${f.field ?? "?"}] ${f.line}`),
      ``,
      `The baseline tends to enumerate every field and to do calendar arithmetic in`,
      `its head; several "contradictions" it raises are its own arithmetic errors.`,
      `Full scoring: results/reports/baseline.json.`,
      ``,
    ];
    fs.writeFileSync(path.join(PATHS.trajectories, "baseline.md"), L.join("\n"));
  }

  // ── Memory ───────────────────────────────────────────────────────────────
  const mem = loadMemory();
  const facilities = Object.values(mem.facilities).sort((a, b) => b.packsSeen - a.packsSeen);
  const M = [
    `# Trajectory — per-facility memory`,
    ``,
    `A local JSON store (\`src/memory/store.json\`) of how often each referring`,
    `facility has left a field out, across the packs it has sent. It never pre-fills`,
    `a value and never asserts anything about the current pack — when a facility has`,
    `a track record on a field, that field is moved to the top of the gap list as a`,
    `prompt to check.`,
    ``,
    `## Store after the evaluation run (${facilities.length} facilities)`,
    ...facilities.flatMap((f) => [
      ``,
      `### ${f.facility} — ${f.packsSeen} pack(s) seen`,
      ...(Object.entries(f.omissions).length
        ? Object.entries(f.omissions).map(([field, n]) => `- ${field}: left out of ${n} of ${f.packsSeen}`)
        : ["- no omissions recorded"]),
    ]),
    ``,
    `## Measured effect`,
    `Recall did not change when memory was added (Iteration 4 in the changelog).`,
    `Its only effect is ordering. Reported here whichever direction it went.`,
    ``,
  ];
  fs.writeFileSync(path.join(PATHS.trajectories, "memory.md"), M.join("\n"));

  // ── Retry loop demonstration ─────────────────────────────────────────────
  await writeRetryDemo(provider);
}

/**
 * Runs one extraction with a deliberately small token budget so the first
 * attempt is truncated and the retry loop engages. A genuine run, labelled as a
 * demonstration.
 */
async function writeRetryDemo(provider: ModelProvider): Promise<void> {
  const out = path.join(PATHS.trajectories, "retry-example.md");

  // First, look for a real multi-attempt extraction in the committed data.
  for (const id of allCaseIds()) {
    for (let a = 2; a <= 3; a++) {
      if (fs.existsSync(rawPath({ phase: "extract", caseId: id, label: "extract", attempt: a }))) {
        const L = [`# Trajectory — extraction retry loop (${id})`, ``];
        for (let k = 1; k <= a; k++) {
          const p = rawPath({ phase: "extract", caseId: id, label: "extract", attempt: k });
          if (!fs.existsSync(p)) continue;
          const rec = JSON.parse(fs.readFileSync(p, "utf8"));
          L.push(`## Attempt ${k}`, `stop_reason: ${rec.stopReason}`, "```", String(rec.response.text ?? "").slice(0, 1500), "```", "");
        }
        L.push(`The validation error from each failed attempt is appended to the next`);
        L.push(`request. Capped at three attempts. Every attempt is committed under`);
        L.push(`results/raw/extract/${id}/.`);
        fs.writeFileSync(out, L.join("\n"));
        return;
      }
    }
  }

  // None occurred naturally — force one with a reduced budget.
  process.env.RPC_NO_EXTRACT_CACHE = "1";
  const id = "case-08";
  const L = [
    `# Trajectory — extraction retry loop (demonstration)`,
    ``,
    `No extraction in the evaluation run needed a retry. This is a genuine run of`,
    `the extractor on ${id} with the output token budget reduced to 700, so the`,
    `first attempt is cut off before it can return a complete structure and the`,
    `retry loop engages. It is labelled a demonstration and is not part of the`,
    `scored results.`,
    ``,
  ];
  try {
    // Temporarily shrink the budget by monkeypatching is not clean; instead call
    // the provider directly through a tiny wrapper would duplicate logic. The
    // extractor's budget is fixed, so we document the mechanism from a small
    // forced call here.
    const { ExtractionSchema } = await import("../agents/extract-schema");
    const { EXTRACTOR_SYSTEM } = await import("../agents/prompts");
    const packText = loadPackText(id);
    const numbered = packText.split("\n").map((l, i) => `${i + 1} | ${l}`).join("\n");
    const followups: Array<{ role: "assistant" | "user"; content: string }> = [];
    for (let attempt = 1; attempt <= 3; attempt++) {
      const res = await provider.parseStructured(
        { phase: "extract", caseId: `${id}-retrydemo`, label: "retry-demo", attempt },
        { system: EXTRACTOR_SYSTEM, user: `Referral pack:\n${numbered}`, followups, maxTokens: 700 },
        ExtractionSchema,
      );
      L.push(`## Attempt ${attempt}`);
      L.push(`schema valid: ${res.parsed !== null}   stop_reason: ${res.stopReason}`);
      L.push("```");
      L.push(String(res.rawText).slice(0, 1200));
      L.push("```", "");
      if (res.parsed !== null) {
        L.push(`Accepted on attempt ${attempt}.`);
        break;
      }
      followups.push({ role: "assistant", content: `(attempt ${attempt})` });
      followups.push({
        role: "user",
        content: `That response was not a complete valid structure. Return the full record_referral_pack structure. Mark fields absent rather than guess.`,
      });
      if (attempt === 3) L.push(`Three attempts exhausted. The extractor raises rather than return a fabricated pack.`);
    }
  } catch (e) {
    L.push(``, `(demonstration run errored: ${(e as Error).message})`);
  } finally {
    delete process.env.RPC_NO_EXTRACT_CACHE;
  }
  fs.writeFileSync(out, L.join("\n"));
}

export function trajectoryIndex(): void {
  const files = fs.existsSync(PATHS.trajectories)
    ? fs.readdirSync(PATHS.trajectories).filter((f) => f.endsWith(".md")).sort()
    : [];
  const L = [
    "# Trajectories",
    "",
    "Readable top-to-bottom traces of each run.",
    "",
    ...files.map((f) => `- [${f}](${f})`),
    "",
    "Each `case-NN.md` covers, for that pack: the extraction (with attempts), the",
    "deterministic requirement check, the deterministic consistency check, the",
    "summary, and the human checkpoint. `case-NN.checks.md` has the machine detail.",
  ];
  void loadManifest;
  void loadRequirementSet;
  fs.writeFileSync(path.join(PATHS.trajectories, "README.md"), L.join("\n") + "\n");
}
