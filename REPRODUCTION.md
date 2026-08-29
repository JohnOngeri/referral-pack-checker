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
MODEL_ID=gemini-3.1-flash-lite
```

`MODEL_ID` is optional and defaults to `gemini-3.1-flash-lite` — the model behind
every committed number in `results/`. Set it only if you want to run a different
model, in which case the numbers you get will not match the committed ones.

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

- `results/reports/final_metrics.json` — the headline numbers, including the
  `reviewerLoad` block (findings a clinician must read per pack, and how many are
  spurious — the review-burden proxy that stands in for unmeasured wall-clock time)
- `results/reports/comparison.csv` — per-case baseline vs agent
- `CHANGELOG_IMPROVEMENT.md`
- `src/data/dashboard.json` — what the dashboard reads

To rebuild only the reports from existing committed run data:

```bash
npm run report -- --mode replay
```

### The memory mechanism, in isolation

The twelve evaluation packs come from twelve different referring facilities, so
per-facility memory has no repeat history to act on there (the changelog reports
this honestly). To see the mechanism work, run the standalone demo — three packs
from one facility, deterministic, no model call:

```bash
npm run memory-demo
# -> results/trajectories/memory-demo.md
```

### Human review time

Wall-clock review time was **not** measured; an estimate beside measured numbers
would mislead. Two things are provided instead:

- a computed **reviewer-load** proxy in `final_metrics.json` (`reviewerLoad`), and
- a stopwatch protocol in [docs/human-review-time.md](docs/human-review-time.md).
  Follow it, write `results/reports/human_review_time.json`, and
  `npm run report` folds the real minutes into the metrics table automatically.

## Expected output

A fresh run prints, per configuration, a line like:

```
  final     caught 10/10  ff 0  invented 0
```

and finishes with:

```
Report written.
  headline: 10 of 10 documentation gaps caught, with 0 false alarms. The single-prompt baseline caught 9, with 34.
```

The exact numbers are whatever the run produces. The committed
`results/reports/final_metrics.json` holds the numbers used in the README and the
dashboard. What a good result looks like — defined before the run, from the
ground-truth files — is written up in
[docs/evaluation-plan.md](docs/evaluation-plan.md).

## Approximate runtime and cost

| Mode | Model calls | Wall time | Cost |
|---|---|---|---|
| replay | 0 | under 30 s | $0 |
| fresh | ~100 | 15–30 min (free-tier rate limits pace the calls to ~1 per 6.5 s) | under $0.05 on `gemini-3.1-flash-lite` (committed run: $0.0014/pack for the workflow, $0.0003/pack for the baseline) |

`RPC_MIN_CALL_GAP_MS` controls the pacing (default 6500). Lower it if your key has a
higher rate limit.

## Troubleshooting

- **`Fresh mode needs a model API key`** — `.env.local` has no `GEMINI_API_KEY`. Add one, or use `--mode replay`.
- **`429` / `rate limited, retrying`** — free-tier requests-per-minute limit. The client backs off and retries automatically; the run is just slow. Leave it.
- **`Replay mode: no committed response at results/raw/...`** — you asked for replay before any fresh run was committed for that case. Run `npm run eval -- --mode fresh` once, or pull a revision where `results/raw/` is populated.
- **`next build` fails on `next-env.d.ts`** — `next-env.d.ts` is gitignored and Next regenerates it on the first `next dev`/`next build`. If a stale copy causes trouble, delete it and run `npm run dev` once, then retry.
