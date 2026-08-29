# Human review time

The hackathon metric table asks for "human time per task". This project does
**not** report a measured wall-clock figure, because none was collected and an
estimate placed next to measured detection numbers would be misleading. This note
gives (a) a computed proxy that ships with every run, and (b) an exact protocol
for someone who wants the real number.

## The proxy that ships: reviewer load

`results/reports/final_metrics.json` carries a `reviewerLoad` block, computed
directly from the committed findings:

| | Agent workflow | Single prompt |
|---|---:|---:|
| Findings a reviewer must read, per pack | ~0.8 | ~3.6 |
| Of those, spurious (must be dismissed) | 0% | ~79% |
| Packs that surface zero findings and are in fact clean | 4 of 4 | 2 of 4 |

Rationale: the reviewer has to read and adjudicate every line the tool emits. The
baseline emits roughly four times as many, and about four in five are wrong, so
the reviewer spends most of the effort discarding noise and — worse — learns to
distrust the tool. This is a structural stand-in for review time, tied to
evidence, not a stopwatch reading.

## The real number: stopwatch protocol

For someone with access to a qualified reviewer and permission to time them.

1. Pick 6 packs: 3 from `fixtures/packs/` you will review **by hand** (A) and 3
   you will review **with the tool's output open** (B). Balance referral types
   across the two sets. Suggested: A = case-02, case-06, case-09; B = case-03,
   case-08, case-12.
2. For each pack in set A: start a timer, have the reviewer read the pack against
   the matching requirement set in `fixtures/requirements/`, write down every gap
   or contradiction they find, stop the timer.
3. For each pack in set B: run `npm run check <case-id> -- --mode replay`, open
   `results/trajectories/<case-id>.md`, start a timer, have the reviewer confirm
   or reject each finding and the drafted summary, stop the timer.
4. Record the six durations and what the reviewer caught, in this shape:

```json
{
  "measuredBy": "role, not name",
  "date": "YYYY-MM-DD",
  "byHand":   [{ "caseId": "case-02", "seconds": 0, "defectsFound": [] }],
  "withTool": [{ "caseId": "case-03", "seconds": 0, "confirmed": [], "rejected": [] }],
  "notes": ""
}
```

5. Save it as `results/reports/human_review_time.json` and run
   `npm run report -- --mode replay`. `buildFinalMetrics()` picks the file up
   automatically: `humanReviewTime.measured` flips to `true` and the data is
   embedded in `final_metrics.json` and shown on the dashboard.

## Why it is not in the submission

No qualified reviewer was available to time under the hackathon's own rule that a
qualified human must be part of any solution that could affect someone. A
self-timed number from the author would not be a fair measure of a clinician's
review time. The mechanism is wired and documented so the gap is fillable, not
hidden.
