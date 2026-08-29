export const C = {
  canvas: "#FAF8F5",
  surface: "#FFFDFA",
  ink: "#152238",
  ink62: "rgba(21,34,56,.62)",
  ink45: "rgba(21,34,56,.45)",
  ink32: "rgba(21,34,56,.32)",
  ink12: "rgba(21,34,56,.12)",
  ink08: "rgba(21,34,56,.08)",
  teal: "#0F766E",
  amber: "#B45309",
  red: "#B91C1C",
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
} as const;

export type Status = "ready" | "gaps" | "contradiction";

export function statusColor(s: Status): string {
  return s === "ready" ? C.teal : s === "gaps" ? C.amber : C.red;
}

/** Shape marker — status must be distinguishable without colour. */
export function shapeStyle(s: Status, size = 11): React.CSSProperties {
  if (s === "ready") {
    return { width: size, height: size, flex: "none", borderRadius: "50%", background: C.teal };
  }
  if (s === "gaps") {
    return {
      width: 0,
      height: 0,
      flex: "none",
      borderLeft: `${size / 2}px solid transparent`,
      borderRight: `${size / 2}px solid transparent`,
      borderBottom: `${size * 0.92}px solid ${C.amber}`,
    };
  }
  return { width: size, height: size, flex: "none", background: C.red };
}

export function findingShape(kind: string, size = 9): React.CSSProperties {
  return kind === "contradiction" ? shapeStyle("contradiction", size) : shapeStyle("gaps", size);
}

export function findingColor(kind: string): string {
  return kind === "contradiction" ? C.red : C.amber;
}
