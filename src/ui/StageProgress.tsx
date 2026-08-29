"use client";
import React from "react";
import { C } from "./theme";

export interface Stage {
  key: string;
  label: string;
  detail: string;
  ms: number;
}

/**
 * Live stage progress. Each stage ticks over as the underlying work completes.
 * When `activeIndex` is null the run is finished and every stage shows done.
 */
export function StageProgress({
  stages,
  activeIndex,
  running,
  onRerun,
  note,
}: {
  stages: Stage[];
  activeIndex: number | null;
  running: boolean;
  onRerun: () => void;
  note: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
        marginTop: 28,
        padding: "14px 18px",
        background: C.surface,
        border: `1px solid ${C.ink12}`,
        borderRadius: 4,
      }}
    >
      {stages.map((st, i) => {
        const done = activeIndex === null ? true : i < activeIndex;
        const active = running && activeIndex === i;
        return (
          <span
            key={st.key}
            title={st.detail}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12.5,
              color: done ? C.ink62 : active ? C.ink : C.ink32,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                flex: "none",
                ...(done
                  ? { background: C.teal }
                  : active
                    ? { background: C.amber, animation: "rpc-pulse 1s ease-in-out infinite" }
                    : { border: `1px solid ${C.ink32}` }),
              }}
            />
            {st.label}
          </span>
        );
      })}
      <button
        onClick={onRerun}
        disabled={running}
        style={{
          marginLeft: "auto",
          padding: "6px 12px",
          fontSize: 12.5,
          border: `1px solid rgba(21,34,56,.22)`,
          borderRadius: 4,
          background: C.surface,
          color: C.ink,
          fontWeight: 500,
          cursor: running ? "default" : "pointer",
          opacity: running ? 0.5 : 1,
        }}
      >
        {running ? "Running…" : "Re-run check"}
      </button>
      {note ? (
        <span style={{ width: "100%", fontSize: 11.5, color: C.ink45 }}>{note}</span>
      ) : null}
    </div>
  );
}
