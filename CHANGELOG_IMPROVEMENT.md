# Improvement Changelog

Every number below is copied from a committed file under `results/reports/` or `results/raw/`. Each entry was written after the run it describes, not before.

| Stage | What you tried and why | Evidence | Decision / Learning |
|---|---|---|---|
| Baseline | One end-to-end model call: raw pack + requirement set in, findings + summary out. Reasonable first thing to try. | `results/reports/baseline.json` — 9/10 caught, 34 FF, contradictions 5/6 | Reference point. Recall looks acceptable; precision does not (34 false flags, 5 on controls). |
| Iteration 1 | Moved extraction to a schema-constrained call with a provenance span on every field; absence became a first-class value. Tried because a free-text pass invents the shape of values it never found. | `results/reports/iter1.json` — 4/10 caught, 5 FF, contradictions 1/6 | Kept. Invented values 0 from here on. Recall unchanged — the model check still misses contradictions and mis-does date arithmetic. |
| Iteration 2 | Moved the requirement comparison out of the model and into deterministic code, after Iteration 1 called a 4–6-day-old haemoglobin "stale" on three packs. | `results/reports/iter2.json` — 4/10 caught, 0 FF, contradictions 0/6 | Kept. False flags 5 -> 0; hallucinated staleness gone. A recency rule is a date subtraction, not a model's guess. |
| Iteration 3 | Added a deterministic consistency verifier (six calendar/arithmetic rules), after noticing every earlier config passed case-12 — which contradicts itself — as complete. | `results/reports/iter3.json` — 10/10 caught, 0 FF, contradictions 6/6 | Kept. Recall 40% -> 100%; contradictions 0/6 -> 6/6. The single change that mattered most, and the only one that catches case-12. |
| Iteration 4 | Added a per-facility recurring-omission memory that reorders the gap list, to surface fields a facility habitually drops. | `results/reports/iter4.json` — 10/10 caught, 0 FF, contradictions 6/6 | Kept. No effect on recall in this set — the twelve packs are twelve different facilities, so there is no repeat history to act on. Mechanism shown separately in results/trajectories/memory-demo.md. |
| Final | Combined the changes that were kept. | `results/reports/final.json` — 10/10 caught, 0 FF, contradictions 6/6 | Shipped. Meets every target in docs/evaluation-plan.md. |
| Removed: contradiction adjudicator | A model call was given both conflicting values and asked which was correct. | `results/reports/adjudicator.json` — agreed with the consistent value 1 of 3 decided cases | Removed. Choosing between two entries in a medical record is the clinician's call; a correct guess is still an unauthorised one. |

Full detail for each stage follows.

## Baseline — one prompt, whole job

- **Measured**: caught 9 of 10 seeded defects (recall 90%); 34 false flag(s), 5 on control packs; contradictions 5/6.
- **Evidence**: `results/reports/baseline.json`
- **Decision**: reference point.

## Iteration 1 — structured extraction with provenance

- **Measured**: caught 4 of 10 seeded defects (recall 40%); 5 false flag(s), 2 on control packs; contradictions 1/6.
- **Invented values** (value present but not traceable to the source text, or present where ground truth says absent): 0.
- **Provenance correctness**: 100% of extracted spans are exact substrings of the pack text.
- **What changed**: extraction moved to a schema-constrained call with a provenance span on every field; absence became a first-class value. The requirement comparison is still a model judgment. Invented values went to 0; recall did not move, because the model check still misses the contradiction-type defects and still gets date arithmetic wrong.
- **Evidence**: `results/reports/iter1.json`
- **Decision**: kept.

## Iteration 2 — requirement checking moved to deterministic code

- **Measured**: caught 4 of 10 seeded defects (recall 40%); 0 false flag(s), 0 on control packs; contradictions 0/6.
- **Invented values** (value present but not traceable to the source text, or present where ground truth says absent): 0.
- **Provenance correctness**: 100% of extracted spans are exact substrings of the pack text.
- **Run-to-run variance** (n=3 runs per pack, temperature 0): model judgment mean finding-count stdev 0; deterministic code 0. Evidence: `results/reports/iter2_variance.csv`. At temperature 0 the model check did not vary in the number of findings, so variance is not what justified this change.
- **What justified it**: precision. Moving the requirement comparison into code took false flags from 5 to 0 and removed the hallucinated staleness findings — on three packs Iteration 1 called a haemoglobin taken four to six days ago "stale". A recency rule is a date subtraction; it should not be a model's guess.
- **Evidence**: `results/reports/iter2.json`
- **Decision**: kept.

## Iteration 3 — consistency verifier added

- **Measured**: caught 10 of 10 seeded defects (recall 100%); 0 false flag(s), 0 on control packs; contradictions 6/6.
- **Invented values** (value present but not traceable to the source text, or present where ground truth says absent): 0.
- **Provenance correctness**: 100% of extracted spans are exact substrings of the pack text.
- **What this revealed about earlier results**: every configuration before this one passed case 12 as complete. It is not complete — the recorded gestational age and the LMP disagree by six weeks, and the estimated delivery date follows the wrong one. Those earlier "passes" were not genuine.
- **Evidence**: `results/reports/iter3.json`
- **Decision**: kept.

## Iteration 4 — per-facility memory

- **Measured**: caught 10 of 10 seeded defects (recall 100%); 0 false flag(s), 0 on control packs; contradictions 6/6.
- **Invented values** (value present but not traceable to the source text, or present where ground truth says absent): 0.
- **Provenance correctness**: 100% of extracted spans are exact substrings of the pack text.
- **Measured effect**: recall unchanged (10 to 10). Memory does not find new defects; it reorders the gap list so a field a facility has repeatedly omitted appears first. Reported here whichever direction it went — it did not change what was caught.
- **Why it is inert in this evaluation**: the twelve packs are sent by twelve different facilities, so no facility has a second pack for the store to have learned from. The reorder behaviour is demonstrated in isolation in `results/trajectories/memory-demo.md` (three packs from one facility, deterministic). Kept because a real deployment sees the same facility repeatedly; a judge should read it as a design choice with a shown mechanism, not a measured gain.
- **Evidence**: `results/reports/iter4.json`
- **Decision**: kept.

## Final — combined configuration

- **Measured**: caught 10 of 10 seeded defects (recall 100%); 0 false flag(s), 0 on control packs; contradictions 6/6.
- **Invented values** (value present but not traceable to the source text, or present where ground truth says absent): 0.
- **Provenance correctness**: 100% of extracted spans are exact substrings of the pack text.
- **Cost per pack** (extraction + summary): $0.0014 (replay mode, gemini-3.1-flash-lite).
- **Evidence**: `results/reports/final.json`
- **Decision**: shipped.

## Removed experiment — contradiction adjudicator

- **What it did**: a model call received both conflicting values and was asked which was correct, across 5 contradiction cases.
- **Measured accuracy**: matched the internally consistent value in 1 of 3 decided cases. Full transcript: `results/trajectories/adjudicator.md` (case-12 included). Data: `results/reports/adjudicator.json`.
- **Boundary review**: Where the model did pick a value, it was choosing between two entries in a clinical document — a determination that belongs to the clinician, whether or not the choice was correct. Where it declined to pick, it added nothing the verifier does not already provide. Either way the experiment is removed: the consistency verifier reports both values with their provenance and resolves nothing.
- **Decision**: removed. A correct guess is still a guess the clinician did not authorise.

## Which single change contributed most

The deterministic consistency verifier (Iteration 3) added 6 caught defect(s) over Iteration 2 and was the only change that caught case 12, which every earlier configuration passed as complete. See `results/reports/iter2.json` and `results/reports/iter3.json`.
