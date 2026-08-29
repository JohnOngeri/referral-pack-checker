# Trajectory — case-03 (anaemia_review)
Mode: REPLAY   Model: gemini-3.1-flash-lite   Ran: 2026-08-29T09:39:43.658Z
REPLAY RUN — model outputs read from committed files, no API call made.

------------------------------------------------------------------------

## Stage 1 — Reading the referral pack (model call)
Instruction: transcribe the pack into the typed schema; quote every source span; mark absent, never guess.
Context given: the pack text with line numbers (20 lines).

Attempt 1: schema valid; 2 semantic issue(s); stop_reason=STOP; tokens in/out 794/1701
  Issues fed back to the model:
   - urineProtein.provenance: provenance quote "15 | " does not appear in the pack text. Quote the exact source text or set provenance to null and absent to true.
   - antiD.provenance: provenance quote "19 | To: General Hospital -- Obstetric Day Unit" does not appear in the pack text. Quote the exact source text or set provenance to null and absent to true.

Attempt 2: schema valid; 0 semantic issue(s); stop_reason=STOP; tokens in/out 926/1634
  Accepted.

------------------------------------------------------------------------

## Stage 2 — Checking against facility requirements (deterministic)
No model call. The extracted structure is compared field by field to the requirement set.
  patientId                  present_current
  ageYears                   present_current
  lmp                        present_current
  gestationalAge             present_current
  gravidity                  present_current
  parity                     present_current
  haemoglobin                absent  <-- finding
  bloodGroup                 present_current
  rhesus                     present_current
  hivScreen                  present_current
  syphilisScreen             present_current
  medications                present_current
  reasonForReferral          present_current
  referringFacility          present_current
  referringClinician         present_current
  referralDate               present_current
  receivingFacility          present_current
  antiD                      not_required

------------------------------------------------------------------------

## Stage 3 — Looking for contradictions (deterministic)
  No contradictions found.

------------------------------------------------------------------------

## Stage 4 — Preparing the summary (model call, verified fields only)

Attempt 1: schema valid; 0 clinical-language issue(s)
  Accepted.

Headline: Referral for anaemia review. The referral pack is incomplete.
Gap list:
  - Haemoglobin result is missing from the pack.

------------------------------------------------------------------------

## Human checkpoint
State: awaiting_review
Nothing is finalised until a clinician approves. This tool checks documentation completeness only and makes no clinical assessment.
The workflow stops here. No summary is finalised and no send action exists.
Approval is recorded through the dashboard: Approve summary / Send back for correction / Re-run check.
