import type { z } from "zod";

export type RunMode = "fresh" | "replay";

export interface CallOptions {
  system: string;
  user: string;
  /** Extra turns appended after the first user message (retry context). */
  followups?: Array<{ role: "assistant" | "user"; content: string }>;
  maxTokens?: number;
}

export interface StructuredResult<T> {
  parsed: T | null;
  /** The model's raw text or serialized structured output. */
  rawText: string;
  usage: TokenUsage;
  stopReason: string | null;
  /** "fresh" when this came from a live API call, "replay" when read from disk. */
  mode: RunMode;
}

export interface TextResult {
  text: string;
  usage: TokenUsage;
  stopReason: string | null;
  mode: RunMode;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
}

/** A recorded model interaction, committed under results/raw/. */
export interface RawRecord extends RecordKey {
  mode: RunMode;
  model: string;
  timestamp: string;
  request: unknown;
  response: unknown;
  usage: TokenUsage;
  stopReason: string | null;
}

export interface ModelProvider {
  readonly mode: RunMode;
  readonly model: string;
  parseStructured<T>(
    key: RecordKey,
    opts: CallOptions,
    schema: z.ZodType<T>,
  ): Promise<StructuredResult<T>>;
  completeText(key: RecordKey, opts: CallOptions): Promise<TextResult>;
}

export interface RecordKey {
  phase: "baseline" | "extract" | "summarise" | "adjudicator";
  caseId: string;
  label: string;
  attempt: number;
}
