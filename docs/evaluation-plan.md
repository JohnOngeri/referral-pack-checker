# Evaluation plan

What "a good result" means for the intended user, defined before the baseline and
the agent were run. This is the definition the twelve ground-truth files in
`fixtures/ground_truth/` encode — each was written from the pack text alone,
before any model was called (`discoveredDuringEvaluation: false` on every seeded
defect).

## Intended user

A nurse or clinician at a district / referral hospital who receives antenatal
referral packs and has to decide, in a few minutes, whether a pack is complete
and internally consistent enough to act on — or whether it has to go back to the
referring facility first.

## Primary metric

**Seeded-defect recall at zero false alarms on the control packs.**

A documentation gap the tool misses is the failure the user cares about most: it
lets an incomplete pack through. A false alarm on a pack that is actually fine is
the second failure: it wastes the user's time and trains them to ignore the tool.
The bar is therefore both-sided.

| Target | Value | Why |
|---|---:|---|
| Seeded defects caught (of 10) | 10 | every planted gap is a gap a real reviewer should catch |
| False flags on the two control packs | 0 | a clean pack must read as clean |
| False flags overall | ≤ 2 | the occasional debatable flag on a real defect pack is tolerable; a stream of them is not |
| Contradictions caught (of 6) | 6 | the completeness-only check cannot see these at all; they are the reason the tool exists |
| Invented values (value with no source span, or present where ground truth says absent) | 0 | filling a gap instead of reporting it is the one unacceptable behaviour |

Secondary, reported but not targeted: cost per pack, run-to-run variance in the
finding count, provenance correctness (share of extracted spans that are exact
substrings of the pack), and the reviewer-load proxy (see
[human-review-time.md](human-review-time.md)).

## Cases

Twelve synthetic packs, four referral types, all authored for this project:

- **8 defect packs** — exactly one seeded documentation defect each, except
  case-12 which has two.
- **2 control packs** (case-04, case-10) — complete and internally consistent;
  no finding should be raised.
- **2 "looks fine" packs** (case-09, case-11) — no *missing* field, but case-11
  has a date-order contradiction and case-09 hides the blood group in a margin
  note. These test whether the tool leans on field-presence alone.

The baseline and the agent get the **same twelve packs and the same requirement
sets**. The only resource difference: the agent workflow makes up to three
extraction attempts and one summary retry per pack and keeps a per-facility
memory file; the baseline is a single call. Both use the same model.

## The challenging case — case-12

Every mandatory field is present and current. A completeness-only check passes it.
The recorded gestational age (30+2 at the 24 Aug visit) and the recorded LMP
(14 Dec 2025, which gives 36+1 on that date) disagree by roughly six weeks, and
the recorded EDD follows the gestational age rather than the LMP.

What it revealed: **every configuration before the consistency verifier (through
Iteration 2) passed case-12 as complete.** Those passes were not genuine — the
record does not agree with itself. This is the case that separates "all boxes
ticked" from "correct", and it is the single reason the deterministic consistency
verifier is in the shipped design.

## Pass / fail for the submission

The shipped configuration meets every target above (see
`results/reports/final_metrics.json`). The baseline misses one defect (case-11)
and raises 34 false flags, 5 of them on the control packs — it fails the primary
metric on both sides.
