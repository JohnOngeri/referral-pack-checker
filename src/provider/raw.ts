import fs from "node:fs";
import path from "node:path";
import { PATHS } from "../lib/paths";
import type { RawRecord, RecordKey } from "./types";

/** Deterministic path for a recorded interaction. */
export function rawPath(key: RecordKey): string {
  return path.join(
    PATHS.resultsRaw,
    key.phase,
    key.caseId,
    `${key.label}__attempt-${key.attempt}.json`,
  );
}

export function writeRaw(record: RawRecord): void {
  const p = rawPath(record);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(record, null, 2) + "\n", "utf8");
}

export function readRaw(key: RecordKey): RawRecord {
  const p = rawPath(key);
  if (!fs.existsSync(p)) {
    throw new Error(
      `Replay mode: no committed response at ${path.relative(process.cwd(), p)}.\n` +
        `Run a fresh pass first ( --mode fresh ) with an API key, or check that results/raw/ is committed.`,
    );
  }
  return JSON.parse(fs.readFileSync(p, "utf8")) as RawRecord;
}

export function rawExists(key: RecordKey): boolean {
  return fs.existsSync(rawPath(key));
}
