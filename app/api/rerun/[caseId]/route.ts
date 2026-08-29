import { NextResponse } from "next/server";
import { makeProvider, hasApiKey } from "@/provider";
import { runPipeline, persistResult } from "@/agents/pipeline";
import { writeDashboardData } from "@/eval/report";
import { allCaseIds } from "@/lib/fixtures";

export const dynamic = "force-dynamic";

/**
 * Re-run the full workflow for one pack. Uses fresh mode when a key is present,
 * otherwise replay (reading committed model responses). Returns the real
 * per-stage timings so the dashboard can animate genuine completion.
 */
export async function POST(_req: Request, { params }: { params: { caseId: string } }) {
  const caseId = params.caseId;
  if (!allCaseIds().includes(caseId)) {
    return NextResponse.json({ error: `Unknown case ${caseId}` }, { status: 404 });
  }
  // RPC_FORCE_REPLAY keeps a demo from spending API quota even when a key is present.
  const mode = process.env.RPC_FORCE_REPLAY || !hasApiKey() ? "replay" : "fresh";
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
