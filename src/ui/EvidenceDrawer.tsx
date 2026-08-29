"use client";
import React from "react";
import { C } from "./theme";
import type { DashboardFinding } from "./data";

const label: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: ".08em",
  textTransform: "uppercase",
  color: C.ink45,
  marginBottom: 6,
};

export function EvidenceDrawer({
  finding,
  onClose,
}: {
  finding: DashboardFinding | null;
  onClose: () => void;
}) {
  const open = finding !== null;
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 50,
          background: "rgba(21,34,56,.18)",
          transition: "opacity .28s ease",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
        }}
      />
      <aside
        aria-hidden={!open}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(520px, 100%)",
          zIndex: 60,
          background: C.surface,
          borderLeft: `1px solid ${C.ink12}`,
          boxShadow: "-16px 0 48px rgba(21,34,56,.12)",
          padding: 32,
          overflow: "auto",
          transition: "transform .28s cubic-bezier(.4,0,.2,1)",
          transform: open ? "translateX(0)" : "translateX(101%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 28,
          }}
        >
          <span style={label}>Evidence</span>
          <button
            onClick={onClose}
            style={{
              padding: "9px 16px",
              border: `1px solid rgba(21,34,56,.22)`,
              borderRadius: 4,
              background: C.surface,
              color: C.ink,
              fontSize: 13.5,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>

        {finding ? (
          <>
            <div style={{ fontSize: 17, lineHeight: 1.6 }}>{finding.plain}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 32 }}>
              <div>
                <div style={label}>Field</div>
                <div style={{ fontFamily: C.mono, fontSize: 13 }}>{finding.field}</div>
              </div>
              <div>
                <div style={label}>Rule fired</div>
                <div style={{ fontFamily: C.mono, fontSize: 13 }}>{finding.rule}</div>
              </div>
              {finding.sourceSpan ? (
                <div>
                  <div style={label}>Source span</div>
                  <div
                    style={{
                      fontFamily: C.mono,
                      fontSize: 13,
                      padding: "12px 14px",
                      background: C.canvas,
                      borderLeft: `2px solid ${C.teal}`,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {finding.sourceSpan}
                  </div>
                </div>
              ) : null}
              {finding.extraSpans.length > 0 ? (
                <div>
                  <div style={label}>Second value</div>
                  {finding.extraSpans.map((s, i) => (
                    <div
                      key={i}
                      style={{
                        fontFamily: C.mono,
                        fontSize: 13,
                        padding: "12px 14px",
                        background: C.canvas,
                        borderLeft: `2px solid ${C.amber}`,
                        whiteSpace: "pre-wrap",
                        marginTop: i ? 8 : 0,
                      }}
                    >
                      {s}
                    </div>
                  ))}
                </div>
              ) : null}
              <div>
                <div style={label}>Raw check output</div>
                <pre
                  style={{
                    margin: 0,
                    fontFamily: C.mono,
                    fontSize: 12,
                    lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                    padding: 14,
                    background: C.canvas,
                    overflowX: "auto",
                  }}
                >
                  {finding.raw}
                </pre>
              </div>
              {finding.memoryNote ? (
                <div>
                  <div style={label}>Facility history</div>
                  <div style={{ fontSize: 13.5 }}>{finding.memoryNote}</div>
                </div>
              ) : null}
              {finding.note ? (
                <div style={{ fontSize: 13, color: C.ink62, paddingTop: 4 }}>{finding.note}</div>
              ) : null}
              {finding.evidenceFile ? (
                <div>
                  <div style={label}>Evidence file</div>
                  <div style={{ fontFamily: C.mono, fontSize: 12, color: C.ink62, wordBreak: "break-all" }}>
                    {finding.evidenceFile}
                  </div>
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </aside>
    </>
  );
}
