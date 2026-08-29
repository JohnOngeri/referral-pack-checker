"use client";
import React, { useState } from "react";
import { C } from "./theme";
import type { DashboardData } from "./data";

const h2: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 600,
  letterSpacing: "-.02em",
  margin: "0 0 32px",
};
const wrap: React.CSSProperties = { maxWidth: 1320, margin: "0 auto", padding: "56px 40px 96px" };
const sourceLine: React.CSSProperties = {
  fontSize: 12,
  color: C.ink45,
  fontFamily: C.mono,
  marginTop: 16,
};

export function ComparisonView({ data }: { data: DashboardData }) {
  const m = data.metrics;
  if (!m) return <NotRun />;
  const bars = [
    { label: "Agent workflow, defects caught", value: `${m.headline.agentCaught} / ${m.headline.seededDefects}`, pct: pct(m.headline.agentCaught, m.headline.seededDefects), c: C.teal },
    { label: "Single prompt, defects caught", value: `${m.headline.baselineCaught} / ${m.headline.seededDefects}`, pct: pct(m.headline.baselineCaught, m.headline.seededDefects), c: C.ink45 },
    { label: "Agent workflow, false flags", value: `${m.agent.falseFlags}`, pct: Math.max(2, pct(m.agent.falseFlags, m.headline.seededDefects)), c: m.agent.falseFlags === 0 ? C.teal : C.red },
    { label: "Single prompt, false flags", value: `${m.baseline.falseFlags}`, pct: Math.max(2, pct(m.baseline.falseFlags, m.headline.seededDefects)), c: m.baseline.falseFlags === 0 ? C.teal : C.red },
  ];
  return (
    <div style={wrap}>
      <h2 style={h2}>Single prompt against the agent workflow</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 48, alignItems: "start" }}>
        <div>
          {bars.map((b) => (
            <div key={b.label} style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 13, marginBottom: 8 }}>
                <span>{b.label}</span>
                <span style={{ fontWeight: 600 }}>{b.value}</span>
              </div>
              <div style={{ height: 12, background: C.ink08, borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${b.pct}%`, background: b.c }} />
              </div>
            </div>
          ))}
          <p style={{ fontSize: 12.5, color: C.ink62, maxWidth: "52ch", marginTop: 32 }}>
            Both runs received the same twelve packs and the same requirement sets, and were scored identically.
            Contradictions caught: agent {m.agent.contradictionsCaught} of {m.agent.contradictionsSeeded}, single
            prompt {m.baseline.contradictionsCaught} of {m.agent.contradictionsSeeded}. Cost per pack: agent $
            {m.agent.costPerPackUsd.toFixed(4)}, single prompt ${m.baseline.costPerPackUsd.toFixed(4)}.
          </p>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", fontSize: 13, width: "100%", minWidth: 520 }}>
            <thead>
              <tr>
                {["Pack", "Referral type", "Seeded", "Single prompt", "Agent", "Note"].map((h, i) => (
                  <th
                    key={h}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: ".08em",
                      textTransform: "uppercase",
                      color: C.ink45,
                      padding: "0 12px 10px 0",
                      borderBottom: `1px solid ${C.ink12}`,
                      textAlign: i >= 2 && i <= 4 ? "right" : "left",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {m.perCase.map((r) => (
                <tr key={r.caseId}>
                  <td style={{ ...cell, fontFamily: C.mono, fontSize: 12 }}>{r.caseId}</td>
                  <td style={cell}>{r.referralType.replace(/_/g, " ")}</td>
                  <td style={{ ...cell, textAlign: "right" }}>{r.seeded}</td>
                  <td style={{ ...cell, textAlign: "right", color: C.ink45 }}>{r.baselineCaught}</td>
                  <td style={{ ...cell, textAlign: "right", fontWeight: 600 }}>{r.agentCaught}</td>
                  <td style={{ ...cell, fontSize: 11.5, color: C.ink45 }}>{r.isControl ? "control pack" : r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={sourceLine}>results/reports/comparison.csv · {m.mode} run · {m.model}</p>
        </div>
      </div>
    </div>
  );
}

const cell: React.CSSProperties = {
  padding: "11px 12px 11px 0",
  borderBottom: `1px solid ${C.ink08}`,
  textAlign: "left",
};

export function ChangelogView({ data }: { data: DashboardData }) {
  const [open, setOpen] = useState(false);
  if (data.changelog.length === 0) return <NotRun />;
  return (
    <div style={wrap}>
      <h2 style={h2}>Improvement changelog</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 1040 }}>
        {data.changelog.map((c) => (
          <div
            key={c.step + c.title}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(180px,1fr) minmax(0,2.4fr) auto",
              gap: "8px 32px",
              alignItems: "baseline",
              padding: "20px 24px",
              background: C.surface,
              border: `1px solid ${C.ink12}`,
              borderRadius: 4,
            }}
          >
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: C.ink45 }}>
                {c.step}
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>{c.title}</div>
            </div>
            <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "rgba(21,34,56,.78)" }}>{c.measured}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "3px 9px",
                  borderRadius: 3,
                  background: c.decision === "Removed" ? "rgba(185,28,28,.10)" : "rgba(15,118,110,.10)",
                  color: c.decision === "Removed" ? C.red : C.teal,
                }}
              >
                {c.decision}
              </span>
              <span style={{ fontSize: 11.5, fontFamily: C.mono, color: C.ink62 }}>{c.evidenceFile}</span>
            </div>
          </div>
        ))}
      </div>

      {data.adjudicator ? (
        <div
          style={{
            marginTop: 32,
            maxWidth: 1040,
            padding: 24,
            background: "#FBECEC",
            border: "1px solid rgba(185,28,28,.35)",
            borderRadius: 4,
          }}
        >
          <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ width: 11, height: 11, background: C.red }} />
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: C.red }}>
              Removed
            </span>
            <span style={{ fontSize: 17, fontWeight: 600 }}>Contradiction adjudicator</span>
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.65, margin: "14px 0 0", maxWidth: "80ch" }}>
            A model call was given both conflicting values and asked which was correct. It matched the internally
            consistent value in {data.adjudicator.agreementRate} decided cases. {data.adjudicator.boundaryAssessment}
          </p>
          <button
            onClick={() => setOpen(!open)}
            style={{
              marginTop: 14,
              padding: "9px 16px",
              border: "1px solid rgba(21,34,56,.22)",
              borderRadius: 4,
              background: C.surface,
              color: C.ink,
              fontSize: 13.5,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            {open ? "Hide the case 12 transcript" : "Show the case 12 transcript"}
          </button>
          {open ? (
            <pre
              style={{
                margin: "16px 0 0",
                padding: 20,
                background: C.surface,
                border: `1px solid ${C.ink12}`,
                borderRadius: 4,
                fontFamily: C.mono,
                fontSize: 12,
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
                overflowX: "auto",
              }}
            >
              {data.adjudicator.case12Transcript}
            </pre>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ScopeView({ data }: { data: DashboardData }) {
  const points = [
    "This tool checks documentation completeness and internal consistency only. It makes no clinical assessment of any kind.",
    "It never decides whether a referral is warranted, never interprets a value as normal or abnormal, never assesses urgency, and never resolves a contradiction.",
    "A qualified clinician reviews and approves every output. Nothing is finalised without approval, and there is no send action in the product.",
    "All patient data in the fixtures is invented for this project. No real or anonymised patient records were used.",
    "The requirement sets are illustrative, authored for this project. A real deployment would load a facility's own documented requirements.",
  ];
  return (
    <div style={wrap}>
      <h2 style={h2}>Scope and safety</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 820 }}>
        {points.map((p, i) => (
          <div
            key={i}
            style={{
              padding: "16px 20px",
              background: C.surface,
              border: `1px solid ${C.ink12}`,
              borderLeft: `3px solid ${C.teal}`,
              borderRadius: 4,
              fontSize: 14.5,
              lineHeight: 1.6,
            }}
          >
            {p}
          </div>
        ))}
      </div>
      <h3 style={{ fontSize: 15, fontWeight: 600, margin: "40px 0 16px" }}>Evidence and reproduction</h3>
      <ul style={{ fontSize: 13.5, lineHeight: 2, color: C.ink62, fontFamily: C.mono, paddingLeft: 18 }}>
        <li>results/raw/ — committed model requests and responses</li>
        <li>results/trajectories/ — readable per-stage trajectories, one per pack</li>
        <li>results/reports/ — metrics tables (final_metrics.json, comparison.csv, iter*.json)</li>
        <li>CHANGELOG_IMPROVEMENT.md — the iteration record, each entry linked to its evidence</li>
        <li>REPRODUCTION.md — clean-machine setup for fresh and replay mode</li>
        <li>SCOPE_AND_SAFETY.md — this page, in full</li>
      </ul>
      {data.metrics ? (
        <p style={sourceLine}>
          Data generated {new Date(data.generatedAt).toISOString().slice(0, 16).replace("T", " ")} ·{" "}
          {data.metrics.mode} run · {data.metrics.model}
        </p>
      ) : null}
    </div>
  );
}

function pct(a: number, b: number): number {
  return b ? Math.round((a / b) * 100) : 0;
}

export function NotRun() {
  return (
    <div style={{ ...wrap, textAlign: "center" }}>
      <div
        style={{
          maxWidth: 560,
          margin: "40px auto",
          padding: 32,
          background: C.surface,
          border: `1px solid ${C.ink12}`,
          borderRadius: 4,
        }}
      >
        <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 12 }}>The evaluation has not been run yet.</div>
        <p style={{ fontSize: 14, color: C.ink62 }}>
          Add a key to <code>.env.local</code> and run:
        </p>
        <pre
          style={{
            fontFamily: C.mono,
            fontSize: 13,
            background: C.canvas,
            padding: 14,
            borderRadius: 4,
            textAlign: "left",
            overflowX: "auto",
          }}
        >
          npm run eval{"\n"}npm run report
        </pre>
        <p style={{ fontSize: 13, color: C.ink45 }}>
          Or, with the committed responses, <code>npm run eval -- --mode replay</code>.
        </p>
      </div>
    </div>
  );
}
