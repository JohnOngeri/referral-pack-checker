import fs from "node:fs";
import path from "node:path";
import type { ModelProvider, RunMode } from "./types";
import { FreshProvider } from "./fresh";
import { ReplayProvider } from "./replay";
import { ROOT } from "../lib/paths";

export * from "./types";
export const DEFAULT_MODEL = "gemini-3.1-flash-lite";

/** Gemini API prices, USD per 1M tokens. Recorded per run for the cost metric. */
export const PRICES: Record<string, { in: number; out: number }> = {
  "gemini-3.1-flash-lite": { in: 0.1, out: 0.4 },
  "gemini-flash-lite-latest": { in: 0.1, out: 0.4 },
  "gemini-3.6-flash": { in: 0.3, out: 2.5 },
  "gemini-flash-latest": { in: 0.3, out: 2.5 },
  "gemini-3.1-pro-preview": { in: 1.25, out: 10 },
  "gemini-pro-latest": { in: 1.25, out: 10 },
};

export function priceFor(model: string): { in: number; out: number } {
  return PRICES[model] ?? { in: 0.1, out: 0.4 };
}

/** Load .env.local without a dependency, so scripts pick up the key. */
function loadEnvLocal(): void {
  const p = path.join(ROOT, ".env.local");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

function apiKey(): string | undefined {
  loadEnvLocal();
  return (process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY)?.trim();
}

export function resolveModel(): string {
  loadEnvLocal();
  return process.env.MODEL_ID?.trim() || DEFAULT_MODEL;
}

export class MissingApiKeyError extends Error {
  constructor() {
    super(
      "Fresh mode needs a model API key. Set GEMINI_API_KEY in .env.local (see .env.example), " +
        "or run in replay mode ( --mode replay ) against the committed responses in results/raw/.",
    );
    this.name = "MissingApiKeyError";
  }
}

/**
 * Build a provider for the requested mode.
 * - fresh: requires GEMINI_API_KEY. Fails loudly if absent — never emits placeholder output.
 * - replay: no key needed. Reads committed responses.
 */
export function makeProvider(mode: RunMode): ModelProvider {
  const model = resolveModel();
  if (mode === "replay") return new ReplayProvider(model);
  const key = apiKey();
  if (!key) throw new MissingApiKeyError();
  return new FreshProvider(model, key);
}

export function hasApiKey(): boolean {
  return !!apiKey();
}
