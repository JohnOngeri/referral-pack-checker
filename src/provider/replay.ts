import type { z } from "zod";
import type {
  CallOptions,
  ModelProvider,
  RecordKey,
  StructuredResult,
  TextResult,
  TokenUsage,
} from "./types";
import { readRaw } from "./raw";

/**
 * Replay provider — reads the committed request/response under results/raw/ and
 * returns it without any network call. A judge with no API key runs scoring
 * offline this way. Every result is labelled mode: "replay".
 */
export class ReplayProvider implements ModelProvider {
  readonly mode = "replay" as const;
  readonly model: string;

  constructor(model: string) {
    this.model = model;
  }

  async parseStructured<T>(
    key: RecordKey,
    _opts: CallOptions,
    schema: z.ZodType<T>,
  ): Promise<StructuredResult<T>> {
    const rec = readRaw(key);
    const text = (rec.response as { text?: string }).text ?? "";
    let parsed: T | null = null;
    let rawText = text;
    try {
      const r = schema.safeParse(JSON.parse(text));
      parsed = r.success ? r.data : null;
      if (!r.success) rawText = `SCHEMA VALIDATION FAILED\n${JSON.stringify(r.error.format(), null, 2)}\n\n${text}`;
    } catch (e) {
      rawText = `JSON PARSE FAILED: ${(e as Error).message}\n\n${text}`;
    }
    return { parsed, rawText, usage: usageOf(rec.usage), stopReason: rec.stopReason, mode: this.mode };
  }

  async completeText(key: RecordKey, _opts: CallOptions): Promise<TextResult> {
    const rec = readRaw(key);
    const text = (rec.response as { text?: string }).text ?? "";
    return { text, usage: usageOf(rec.usage), stopReason: rec.stopReason, mode: this.mode };
  }
}

function usageOf(u: Partial<TokenUsage> | undefined): TokenUsage {
  return {
    inputTokens: u?.inputTokens ?? 0,
    outputTokens: u?.outputTokens ?? 0,
    cacheReadTokens: u?.cacheReadTokens ?? 0,
  };
}
