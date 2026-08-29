"use client";
import React, { useMemo, useState } from "react";
import { C, shapeStyle, findingShape, findingColor, type Status } from "./theme";
import type { DashboardData, DashboardCase, DashboardFinding } from "./data";
import { StageProgress } from "./StageProgress";
import { EvidenceDrawer } from "./EvidenceDrawer";
import { ComparisonView, ChangelogView, ScopeView, NotRun } from "./views";
import { SAFETY_LINE } from "@/domain/checkpoint";

type View = "review" | "compare" | "changelog" | "scope";

export default function Dashboard({ data }: { data: DashboardData | null }) {
  const [view, setView] = useState<View>("review");
  const cases = data?.cases ?? [];
  const defaultId = cases.find((c) => c.id === "case-12")?.id ?? cases[0]?.id ?? "";
  const [caseId, setCaseId] = useState(defaultId);
  const [tab, setTab] = useState<"findings" | "summary">("findings");
  const [drawerIdx, setDrawerIdx] = useState<number | null>(null);
  const [approval, setApproval] = useState<"awaiting" | "approved" | "returned">("awaiting");
  const [clinician, setClinician] = useState("");

  const [stageActive, setStageActive] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [stageNote, setStageNote] = useState("");
  const [liveStages, setLiveStages] = useState<DashboardCase["stages"] | null>(null);

  const current = cases.find((c) => c.id === caseId) ?? null;

  const modeLabel = data?.metrics?.mode === "fresh" ? "Fresh run" : "Replay";

  function selectCase(id: string) {
    setCaseId(id);
    setDrawerIdx(null);
    setTab("findings");
    setApproval("awaiting");
    setStageActive(null);
    setLiveStages(null);
    setStageNote("");
  }

  async function rerun() {
    if (!current || running) return;
    setRunning(true);
    setApproval("awaiting");
    setDrawerIdx(null);
    setStageActive(0);
    setStageNote("");
    try {
      const res = await fetch(`/api/rerun/${current.id}`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        setStageNote(body.error ?? "Re-run failed.");
        setRunning(false);
        setStageActive(null);
        return;
      }
      const stages: DashboardCase["stages"] = body.stages;
      setLiveStages(stages);
      // Play the real per-stage durations back, clamped for visibility.
      for (let i = 0; i < stages.length; i++) {
        setStageActive(i);
        const d = Math.min(3500, Math.max(350, stages[i].ms));
        await new Promise((r) => setTimeout(r, d));
      }
      setStageActive(null);
      setStageNote(
        `${body.mode === "fresh" ? "Fresh run" : "Replay"} · stage timings from this run · ${body.elapsedMs} ms total`,
      );
      // Refresh page data.
      window.location.reload();
    } catch (e) {
      setStageNote((e as Error).message);
      setRunning(false);
      setStageActive(null);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: C.canvas, color: C.ink }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 32,
          padding: "16px 40px",
          borderBottom: `1px solid ${C.ink12}`,
          position: "sticky",
          top: 0,
          zIndex: 30,
          background: C.canvas,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-.01em" }}>Referral Pack Checker</span>
        <nav style={{ display: "flex", gap: 4, marginRight: "auto", flexWrap: "wrap" }}>
          {([
            ["review", "Review"],
            ["compare", "Comparison"],
            ["changelog", "Changelog"],
            ["scope", "Scope"],
          ] as Array<[View, string]>).map(([v, l]) => (
            <button
              key={v}
              onClick={() => {
                setView(v);
                setDrawerIdx(null);
              }}
              style={{
                padding: "7px 13px",
                border: 0,
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 13.5,
                fontWeight: 500,
                background: view === v ? "rgba(21,34,56,.07)" : "transparent",
                color: view === v ? C.ink : C.ink62,
              }}
            >
              {l}
            </button>
          ))}
        </nav>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            padding: "6px 12px",
            border: `1px solid ${C.ink12}`,
            borderRadius: 4,
            background: C.surface,
          }}
          title={
            data?.metrics?.mode === "fresh"
              ? "This data was produced by live model calls."
              : "This data was read from committed model responses. No API call was made."
          }
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: data?.metrics?.mode === "fresh" ? C.teal : C.ink32,
            }}
          />
          <span style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase" }}>
            {modeLabel}
          </span>
        </div>
      </header>

      <div
        style={{
          padding: "11px 40px",
          background: C.surface,
          borderBottom: `1px solid ${C.ink12}`,
          fontSize: 12.5,
          color: C.ink62,
        }}
      >
        {SAFETY_LINE}
      </div>

      {view === "review" ? (
        !data?.metrics || !current ? (
          <NotRun />
        ) : (
          <ReviewView
            data={data}
            current={current}
            cases={cases}
            selectCase={selectCase}
            tab={tab}
            setTab={setTab}
            drawerIdx={drawerIdx}
            setDrawerIdx={setDrawerIdx}
            approval={approval}
            setApproval={setApproval}
            clinician={clinician}
            setClinician={setClinician}
            stages={liveStages ?? current.stages}
            stageActive={stageActive}
            running={running}
            stageNote={stageNote}
            rerun={rerun}
          />
        )
      ) : null}
      {view === "compare" ? <ComparisonView data={data ?? emptyData()} /> : null}
      {view === "changelog" ? <ChangelogView data={data ?? emptyData()} /> : null}
      {view === "scope" ? <ScopeView data={data ?? emptyData()} /> : null}

      <EvidenceDrawer
        finding={current && drawerIdx !== null ? current.findings[drawerIdx] ?? null : null}
        onClose={() => setDrawerIdx(null)}
      />
    </div>
  );
}

function emptyData(): DashboardData {
  return { generatedAt: new Date().toISOString(), metrics: null, cases: [], changelog: [], adjudicator: null, variance: null };
}

function ReviewView(props: {
  data: DashboardData;
  current: DashboardCase;
  cases: DashboardCase[];
  selectCase: (id: string) => void;
  tab: "findings" | "summary";
  setTab: (t: "findings" | "summary") => void;
  drawerIdx: number | null;
  setDrawerIdx: (n: number | null) => void;
  approval: "awaiting" | "approved" | "returned";
  setApproval: (a: "awaiting" | "approved" | "returned") => void;
  clinician: string;
  setClinician: (s: string) => void;
  stages: DashboardCase["stages"];
  stageActive: number | null;
  running: boolean;
  stageNote: string;
  rerun: () => void;
}) {
  const { data, current, cases } = props;
  const m = data.metrics!;
  const secondaryBtn: React.CSSProperties = {
    padding: "9px 16px",
    border: "1px solid rgba(21,34,56,.22)",
    borderRadius: 4,
    background: C.surface,
    color: C.ink,
    fontSize: 13.5,
    fontWeight: 500,
    cursor: "pointer",
  };

  const approved = props.approval === "approved";
  const returned = props.approval === "returned";

  return (
    <div style={{ maxWidth: 1320, margin: "0 auto", padding: "0 40px 96px" }}>
      {/* Headline */}
      <div style={{ padding: "64px 0 48px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 18, fontWeight: 600, letterSpacing: "-.04em", lineHeight: 1, flexWrap: "wrap" }}>
          <span style={{ fontSize: 120 }}>{m.headline.agentCaught}</span>
          <span style={{ fontSize: 40, color: C.ink45 }}>of {m.headline.seededDefects}</span>
        </div>
        <p style={{ fontSize: 20, lineHeight: 1.5, margin: "24px 0 0", maxWidth: "44ch" }}>
          documentation gaps caught. A single AI prompt caught {m.headline.baselineCaught}.
        </p>
        <p style={{ fontSize: 12, color: C.ink45, margin: "10px 0 0", fontFamily: C.mono }}>
          {m.headline.sourceFile} · {m.mode === "fresh" ? "Fresh run" : "Replay"} · {m.model}
        </p>
      </div>

      <div style={{ display: "flex", gap: 48, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* Left rail */}
        <aside style={{ flex: "1 1 240px", maxWidth: 280, alignSelf: "flex-start" }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: C.ink45, padding: "0 0 12px" }}>
            Packs
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {cases.map((p) => {
              const sel = p.id === current.id;
              return (
                <button
                  key={p.id}
                  onClick={() => props.selectCase(p.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 11,
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 12px",
                    border: 0,
                    borderLeft: `2px solid ${sel ? statusRuleColor(p.status) : "transparent"}`,
                    borderRadius: "0 4px 4px 0",
                    background: sel ? C.surface : "transparent",
                    cursor: "pointer",
                    color: C.ink,
                  }}
                >
                  <span style={shapeStyle(p.status, 10)} />
                  <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 500 }}>{p.id}</span>
                    <span
                      style={{
                        fontSize: 11.5,
                        color: C.ink45,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: 196,
                      }}
                    >
                      {p.referralLabel}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Main column */}
        <main style={{ flex: "999 1 620px", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
            <span style={shapeStyle(current.status, 14)} />
            <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-.02em", margin: 0 }}>{current.statusLine}</h1>
          </div>
          <div style={{ fontSize: 13, color: C.ink62, marginTop: 8 }}>
            {current.id} · {current.patient} · {current.referralLabel} · {current.receivingFacility}
          </div>

          <StageProgress
            stages={props.stages}
            activeIndex={props.stageActive}
            running={props.running}
            onRerun={props.rerun}
            note={props.stageNote}
          />

          {/* Tabs */}
          <div style={{ display: "flex", gap: 24, marginTop: 36, borderBottom: `1px solid ${C.ink12}` }}>
            {([
              ["findings", "Findings"],
              ["summary", "Pack and summary"],
            ] as Array<["findings" | "summary", string]>).map(([t, l]) => {
              const on = props.tab === t;
              return (
                <button
                  key={t}
                  onClick={() => props.setTab(t)}
                  style={{
                    padding: "0 0 12px",
                    border: 0,
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: on ? 600 : 500,
                    color: on ? C.ink : C.ink45,
                    borderBottom: `2px solid ${on ? C.ink : "transparent"}`,
                    marginBottom: -1,
                  }}
                >
                  {l}
                </button>
              );
            })}
          </div>

          {props.tab === "findings" ? (
            <FindingsList findings={current.findings} onOpen={props.setDrawerIdx} />
          ) : (
            <PackAndSummary current={current} />
          )}

          {/* Approval checkpoint */}
          <div
            style={{
              marginTop: 32,
              padding: 24,
              borderRadius: 4,
              border: `1px solid ${approved ? "rgba(15,118,110,.4)" : C.ink12}`,
              background: approved ? "rgba(15,118,110,.07)" : C.surface,
            }}
          >
            <div style={{ display: "flex", gap: 32, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 280 }}>
                <div style={{ fontSize: 17, fontWeight: 600 }}>
                  {approved
                    ? `Approved by ${props.clinician || "the reviewing clinician"}`
                    : returned
                      ? "Returned to the referring clinician"
                      : "Waiting for a clinician's approval"}
                </div>
                <div style={{ fontSize: 12.5, color: C.ink62, marginTop: 8, maxWidth: "62ch" }}>{current.checkpoint.safetyLine}</div>
                {!approved ? (
                  <input
                    value={props.clinician}
                    onChange={(e) => props.setClinician(e.target.value)}
                    placeholder="Reviewing clinician name"
                    style={{
                      marginTop: 12,
                      padding: "8px 10px",
                      border: `1px solid ${C.ink12}`,
                      borderRadius: 4,
                      fontSize: 13,
                      width: 260,
                      maxWidth: "100%",
                      background: C.canvas,
                      color: C.ink,
                    }}
                  />
                ) : null}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  onClick={() => props.clinician.trim() && props.setApproval("approved")}
                  disabled={!props.clinician.trim() || approved}
                  style={{
                    padding: "9px 16px",
                    border: `1px solid ${C.teal}`,
                    borderRadius: 4,
                    background: approved ? "rgba(15,118,110,.14)" : C.teal,
                    color: approved ? C.teal : C.surface,
                    fontSize: 13.5,
                    fontWeight: 600,
                    cursor: !props.clinician.trim() || approved ? "default" : "pointer",
                    opacity: !props.clinician.trim() && !approved ? 0.5 : 1,
                  }}
                >
                  Approve summary
                </button>
                <button onClick={() => props.setApproval("returned")} style={secondaryBtn}>
                  Send back for correction
                </button>
                <button onClick={props.rerun} style={secondaryBtn}>
                  Re-run check
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function FindingsList({
  findings,
  onOpen,
}: {
  findings: DashboardFinding[];
  onOpen: (n: number) => void;
}) {
  if (findings.length === 0) {
    return (
      <div
        style={{
          marginTop: 24,
          padding: 24,
          background: C.surface,
          border: `1px solid ${C.ink12}`,
          borderRadius: 4,
          fontSize: 16,
        }}
      >
        Nothing outstanding in this pack.
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 24 }}>
      {findings.map((f, i) => (
        <button
          key={i}
          onClick={() => onOpen(i)}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 10,
            textAlign: "left",
            width: "100%",
            padding: "22px 24px",
            cursor: "pointer",
            background: C.surface,
            border: `1px solid ${C.ink12}`,
            borderLeft: `3px solid ${findingColor(f.kind)}`,
            borderRadius: 4,
            color: C.ink,
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: ".08em",
              textTransform: "uppercase",
              color: findingColor(f.kind),
            }}
          >
            <span style={findingShape(f.kind, 9)} />
            {f.kind === "contradiction" ? "Contradiction" : f.kind === "stale" ? "Out of date" : f.kind === "conditional" ? "Conditionally required" : f.kind === "placeholder" ? "Placeholder" : "Missing"}
          </span>
          <span style={{ fontSize: 16, lineHeight: 1.6 }}>{f.plain}</span>
          {f.memoryNote ? <span style={{ fontSize: 12.5, color: C.amber }}>{f.memoryNote}</span> : null}
          <span style={{ fontSize: 12.5, color: C.ink45 }}>Evidence</span>
        </button>
      ))}
    </div>
  );
}

function PackAndSummary({ current }: { current: DashboardCase }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 24, marginTop: 24 }}>
      <div style={{ background: C.surface, border: `1px solid ${C.ink12}`, borderRadius: 4 }}>
        <div style={panelHead}>As received</div>
        <div style={{ padding: 20, fontFamily: C.mono, fontSize: 12.5, lineHeight: 1.9, overflowX: "auto" }}>
          {current.packLines.map((l, i) => {
            const flagged = current.flaggedLines.includes(i + 1);
            return (
              <div
                key={i}
                style={
                  flagged
                    ? { padding: "2px 10px", margin: "0 -10px", background: "#FBF1E4", boxShadow: `inset 2px 0 0 ${C.amber}` }
                    : { padding: "2px 0" }
                }
              >
                {l || " "}
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ background: C.surface, border: `1px solid ${C.ink12}`, borderRadius: 4 }}>
        <div style={panelHead}>Summary, unapproved</div>
        <div style={{ padding: "12px 20px 20px" }}>
          <p style={{ fontSize: 13.5, lineHeight: 1.6, margin: "8px 0 12px" }}>{current.summary.headline}</p>
          {current.summary.rows.map((r, i) => (
            <div
              key={i}
              style={{ display: "flex", gap: 16, alignItems: "baseline", padding: "12px 0", borderBottom: `1px solid ${C.ink08}` }}
            >
              <span style={{ flex: "0 0 34%", fontSize: 12.5, color: C.ink62 }}>{r.label}</span>
              <span style={{ flex: 1, fontSize: 13.5 }}>{r.value}</span>
              <span
                style={{
                  flex: "none",
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "3px 9px",
                  borderRadius: 3,
                  background: r.state === "verified" ? "rgba(15,118,110,.10)" : "rgba(180,83,9,.12)",
                  color: r.state === "verified" ? C.teal : C.amber,
                }}
              >
                {r.state}
              </span>
            </div>
          ))}
          {current.summary.gapList.length > 0 ? (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: C.ink45, marginBottom: 8 }}>
                Before you send
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7 }}>
                {current.summary.gapList.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const panelHead: React.CSSProperties = {
  padding: "14px 20px",
  borderBottom: `1px solid ${C.ink12}`,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: ".08em",
  textTransform: "uppercase",
  color: C.ink45,
};

function statusRuleColor(s: Status): string {
  return s === "contradiction" ? C.red : s === "gaps" ? C.amber : C.teal;
}
