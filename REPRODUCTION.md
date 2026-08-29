# Reproduction

For someone on a clean machine who has never seen this project.

## Prerequisites

| Tool | Version used | Notes |
|---|---|---|
| Node.js | 22.17 (any ≥ 20.9) | `node --version` |
| npm | 10.9 | ships with Node |
| A Google Gemini API key | — | only for **fresh** mode. Get one at https://aistudio.google.com/apikey. Free tier is enough. |

No database, no Docker, no external services. All twelve referral packs, the four
requirement sets and the twelve ground-truth files are committed under `fixtures/`.
All committed model responses are under `results/raw/`.

## Setup

```bash
git clone <this repo>
cd referral-pack-checker
npm install
cp .env.example .env.local        # then edit .env.local
```

For **fresh** mode, put your key in `.env.local`:

```
GEMINI_API_KEY=AIza...
MODEL_ID=gemini-3.6-flash
```

For **replay** mode you can leave `.env.local` empty — scoring reads the committed
responses and makes no API call.

## Run it

### Tests, types, lint, build

```bash
npm run typecheck
npm test
npm run lint
npm run build
```

All tests pass, including every consistency-rule test in `tests/consistency.test.ts`.

### The dashboard

```bash
npm run dev            # http://localhost:3000
```

The dashboard opens on case 12. If you have not run the evaluation yet, it shows a
short "not run" panel with the commands below.

### One pack, end to end

```bash
npm run check case-12 -- --mode replay      # or --mode fresh with a key
```

Prints the findings and the checkpoint state, and writes
`results/trajectories/case-12.md`.

### The baseline (single prompt)

```bash
npm run baseline -- --mode replay           # or fresh
# -> results/reports/baseline.json
```

### The full evaluation

```bash
npm run eval -- --mode replay               # offline, from committed responses
# or
npm run eval -- --mode fresh                # live model calls
```

This runs every configuration (baseline, iterations 1–4, final), the run-to-run
variance measurement, and the removed contradiction-adjudicator experiment, then
builds:

- `results/reports/final_metrics.json` — the headline numbers
- `results/reports/comparison.csv` — per-case baseline vs agent
- `CHANGELOG_IMPROVEMENT.md`
- `src/data/dashboard.json` — what the dashboard reads

To rebuild only the reports from existing committed run data:

```bash
npm run report -- --mode replay
```

## Expected output

A fresh run prints, per configuration, a line like:

```
  final     caught 10/10  ff 0  invented 0
```

and finishes with:

```
Report written.
  headline: 10 of 10 documentation gaps caught. A single AI prompt caught <n>.
```

The exact numbers are whatever the run produces. The committed
`results/reports/final_metrics.json` holds the numbers used in the README and the
dashboard.

## Approximate runtime and cost

| Mode | Model calls | Wall time | Cost |
|---|---|---|---|
| replay | 0 | under 30 s | $0 |
| fresh | ~100 | 15–30 min (free-tier rate limits pace the calls to ~1 per 6.5 s) | under $0.20 on `gemini-3.6-flash` |

`RPC_MIN_CALL_GAP_MS` controls the pacing (default 6500). Lower it if your key has a
higher rate limit.

## Troubleshooting

- **`Fresh mode needs a model API key`** — `.env.local` has no `GEMINI_API_KEY`. Add one, or use `--mode replay`.
- **`429` / `rate limited, retrying`** — free-tier requests-per-minute limit. The client backs off and retries automatically; the run is just slow. Leave it.
- **`Replay mode: no committed response at results/raw/...`** — you asked for replay before any fresh run was committed for that case. Run `npm run eval -- --mode fresh` once, or pull a revision where `results/raw/` is populated.
- **`next build` fails on `next-env.d.ts`** — run `npm run dev` once (or `npx next build`) to let Next generate it, then retry.
