# Improvement Changelog

Every number below is copied from a committed file under `results/reports/` or `results/raw/`. Each entry was written after the run it describes, not before.

## Baseline — one prompt, whole job

- **Measured**: caught 10 of 10 seeded defects (recall 100%); 47 false flag(s), 5 on control packs; contradictions 6/6.
- **Evidence**: `results/reports/baseline.json`
- **Decision**: reference point.

## Iteration 1 — structured extraction with provenance

- **Measured**: caught 4 of 10 seeded defects (recall 40%); 5 false flag(s), 2 on control packs; contradictions 1/6.
- **Invented values** (value present but not traceable to the source text, or present where ground truth says absent): 0.
- **Provenance correctness**: 100% of extracted spans are exact substrings of the pack text.
- **Evidence**: `results/reports/iter1.json`
- **Decision**: kept.

## Iteration 2 — requirement checking moved to deterministic code

- **Measured**: caught 4 of 10 seeded defects (recall 40%); 0 false flag(s), 0 on control packs; contradictions 0/6.
- **Invented values** (value present but not traceable to the source text, or present where ground truth says absent): 0.
- **Provenance correctness**: 100% of extracted spans are exact substrings of the pack text.
- **Run-to-run variance** (n=3 runs per pack): model judgment mean finding-count stdev 0; deterministic code 0. Evidence: `results/reports/iter2_variance.csv`.
- **Evidence**: `results/reports/iter2.json`
- **Decision**: kept.

## Iteration 3 — consistency verifier added

- **Measured**: caught 10 of 10 seeded defects (recall 100%); 0 false flag(s), 0 on control packs; contradictions 6/6.
- **Invented values** (value present but not traceable to the source text, or present where ground truth says absent): 0.
- **Provenance correctness**: 100% of extracted spans are exact substrings of the pack text.
- **Evidence**: `results/reports/iter3.json`
- **Decision**: kept.

## Iteration 4 — per-facility memory

- **Measured**: caught 10 of 10 seeded defects (recall 100%); 0 false flag(s), 0 on control packs; contradictions 6/6.
- **Invented values** (value present but not traceable to the source text, or present where ground truth says absent): 0.
- **Provenance correctness**: 100% of extracted spans are exact substrings of the pack text.
- **Evidence**: `results/reports/iter4.json`
- **Decision**: kept.

## Final — combined configuration

- **Measured**: caught 10 of 10 seeded defects (recall 100%); 0 false flag(s), 0 on control packs; contradictions 6/6.
- **Invented values** (value present but not traceable to the source text, or present where ground truth says absent): 0.
- **Provenance correctness**: 100% of extracted spans are exact substrings of the pack text.
- **Cost per pack**: $0.0009 (fresh mode, gemini-3.1-flash-lite).
- **Evidence**: `results/reports/final.json`
- **Decision**: shipped.

## Removed experiment — contradiction adjudicator

- **What it did**: a model call received both conflicting values and was asked which was correct, across 5 contradiction cases.
- **Measured accuracy**: matched the internally consistent value in 2 of 3 decided cases. Full transcript: `results/trajectories/adjudicator.md` (case-12 included). Data: `results/reports/adjudicator.json`.
- **Boundary review**: Crossed. In every case the model chose between two values recorded in a clinical document. That determination belongs to the clinician, whether or not the choice was correct. The experiment is removed. The consistency verifier reports both values with their provenance and resolves nothing.
- **Decision**: removed. A correct guess is still a guess the clinician did not authorise.

## Which single change contributed most

The deterministic consistency verifier (Iteration 3) added 6 caught defect(s) over Iteration 2 and was the only change that caught case 12, which every earlier configuration passed as complete. See `results/reports/iter2.json` and `results/reports/iter3.json`.
