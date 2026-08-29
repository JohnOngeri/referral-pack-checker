# Trajectory — case-05 (routine_ultrasound)
Mode: REPLAY   Model: gemini-3.1-flash-lite   Ran: 2026-08-29T10:00:44.272Z
REPLAY RUN — model outputs read from committed files, no API call made.

------------------------------------------------------------------------

## Stage 1 — Reading the referral pack (model call)
Instruction: transcribe the pack into the typed schema; quote every source span; mark absent, never guess.
Context given: the pack text with line numbers (19 lines).

Attempt 1: schema valid; 2 semantic issue(s); stop_reason=STOP; tokens in/out 799/1968
  Issues fed back to the model:
   - urineProtein.provenance: provenance quote "11 | BP 120/78 (14/08/26)" does not appear in the pack text. Quote the exact source text or set provenance to null and absent to true.
   - antiD.provenance: provenance quote "1 | Kibera Clinic  --  antenatal referral" does not appear in the pack text. Quote the exact source text or set provenance to null and absent to true.

Attempt 2: schema valid; 0 semantic issue(s); stop_reason=STOP; tokens in/out 947/1918
  Accepted.

------------------------------------------------------------------------

## Stage 2 — Checking against facility requirements (deterministic)
No model call. The extracted structure is compared field by field to the requirement set.
  patientId                  present_current
  ageYears                   present_current
  lmp                        present_current
  gestationalAge             present_current
  edd                        present_current
  gravidity                  present_current
  parity                     present_current
  reasonForReferral          present_current
  referringFacility          present_current
  referringClinician         present_current
  referralDate               present_current
  receivingFacility          present_current
  receivingDepartment        present_current
  bloodGroup                 not_required

------------------------------------------------------------------------

## Stage 3 — Looking for contradictions (deterministic)
  [consistency.edd_matches_lmp] The estimated delivery date (12 Aug 2026) does not follow from the recorded last menstrual period, which gives 27 Aug 2026.
     (recorded) Recorded estimated delivery date: 12 Aug 2026  [EDD  12/08/2026]
     (derived)  Estimated delivery date derived from LMP: 27 Aug 2026 (LMP + 280 days)  [LMP  20/11/2025]
     resolution: none — reported for the clinician to decide.

------------------------------------------------------------------------

## Stage 4 — Preparing the summary (model call, verified fields only)

Attempt 1: schema valid; 0 clinical-language issue(s)
  Accepted.

Headline: Referral for routine ultrasound for patient 5514. The referral pack is incomplete.
Gap list:
  - The estimated delivery date (12 Aug 2026) does not follow from the recorded last menstrual period, which gives 27 Aug 2026.

------------------------------------------------------------------------

## Human checkpoint
State: awaiting_review
Nothing is finalised until a clinician approves. This tool checks documentation completeness only and makes no clinical assessment.
The workflow stops here. No summary is finalised and no send action exists.
Approval is recorded through the dashboard: Approve summary / Send back for correction / Re-run check.
