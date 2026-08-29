# Scope and Safety

**This tool checks documentation completeness and internal consistency only.**

It does not make a clinical assessment of any kind. Specifically, it never:

- decides whether a referral is warranted;
- suggests a diagnosis;
- interprets a value as normal, abnormal, concerning or reassuring;
- recommends treatment;
- assesses urgency;
- decides which of two conflicting values is correct.

When it finds a contradiction, it reports both values with the exact source text each
was read from, and leaves the decision to the clinician.

**A qualified clinician reviews and approves every output.** The workflow halts before a
summary is finalised and requires an explicit, named approval. This is enforced in code
(`src/domain/checkpoint.ts`), not only in the interface. There is no send action anywhere
in the product.

**All patient data is invented.** Every name, date and value in `fixtures/` was authored
for this project. No real or anonymised patient records, and no public dataset containing
real clinical records, were used.

**The requirement sets are illustrative.** The four sets in `fixtures/requirements/` were
authored for this project, structured after the kind of checklist a receiving facility
works from. A real deployment would load the facility's own documented requirements
instead.

**What the model is and is not used for.** A model performs the extraction step (reading
semi-structured card text into a typed structure) and writes the plain-English summary
from already-verified fields. The requirement check and the consistency check are
deterministic code, not model calls, so that rules which must never drift are not
re-decided on every run.
