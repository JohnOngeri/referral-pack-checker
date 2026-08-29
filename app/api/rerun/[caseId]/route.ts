import { NextResponse } from "next/server";
import { makeProvider, hasApiKey } from "@/provider";
import { runPipeline, persistResult } from "@/agents/pipeline";
import { writeDashboardData } from "@/eval/report";
import { allCaseIds } from "@/lib/fixtures";

export const dynamic = "force-dynamic";

/**
 * Re-run the full workflow for one pack. Defaults to replay (reading the
 * committed model responses) so the dashboard button never spends API quota or
 * overwrites committed evidence. Set RPC_RERUN_FRESH=1 to make live calls — that
 * path is for deliberately regenerating evidence, and `npm run eval -- --mode
 * fresh` is the supported way to do it. Returns the real per-stage timings so
 * the dashboard can animate genuine completion.
 */
export async function POST(_req: Request, { params }: { params: { caseId: string } }) {
  const caseId = params.caseId;
  if (!allCaseIds().includes(caseId)) {
    return NextResponse.json({ error: `Unknown case ${caseId}` }, { status: 404 });
  }
  const wantsFresh = process.env.RPC_RERUN_FRESH === "1" && !process.env.RPC_FORCE_REPLAY;
  const mode = wantsFresh && hasApiKey() ? "fresh" : "replay";
  try {
    const provider = makeProvider(mode);
    const started = Date.now();
    const result = await runPipeline(provider, caseId);
    try {
      persistResult(result);
      writeDashboardData();
    } catch {
      // read-only filesystem (serverless) — the recomputed result is still returned
    }
    return NextResponse.json({
      caseId,
      mode,
      elapsedMs: Date.now() - started,
      stages: result.stages.map((s) => ({
        key: s.key,
        label: s.label,
        detail: s.detail,
        ms: Math.max(0, new Date(s.finishedAt).getTime() - new Date(s.startedAt).getTime()),
      })),
      findings: result.checks.findings.map((f) => ({ field: f.field, kind: f.kind, plain: f.plain })),
      statusState: result.review.state,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, mode }, { status: 500 });
  }
}
