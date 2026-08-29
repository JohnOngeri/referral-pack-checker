# Trajectory — case-08 (routine_ultrasound)
Mode: REPLAY   Model: gemini-3.1-flash-lite   Ran: 2026-08-29T11:06:23.932Z
REPLAY RUN — model outputs read from committed files, no API call made.

------------------------------------------------------------------------

## Stage 1 — Reading the referral pack (model call)
Instruction: transcribe the pack into the typed schema; quote every source span; mark absent, never guess.
Context given: the pack text with line numbers (22 lines).

Attempt 1: schema valid; 0 semantic issue(s); stop_reason=STOP; tokens in/out 810/1920
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
  [consistency.parity_matches_obstetric_history] Recorded parity (2) does not match the obstetric history, which lists 3 previous births.
     (recorded) Recorded parity: 2  [P2]
     (derived)  Births counted from obstetric history: 3  [Obstetric history:
  2017  SVD term
  2019  SVD term
  2023  SVD term]
     resolution: none — reported for the clinician to decide.

------------------------------------------------------------------------

## Stage 4 — Preparing the summary (model call, verified fields only)

Attempt 1: schema valid; 0 clinical-language issue(s)
  Accepted.

Headline: Referral for routine ultrasound. The referral pack contains a contradiction regarding parity.
Gap list:
  - Recorded parity (2) does not match the obstetric history, which lists 3 previous births.

------------------------------------------------------------------------

## Human checkpoint
State: awaiting_review
Nothing is finalised until a clinician approves. This tool checks documentation completeness only and makes no clinical assessment.
The workflow stops here. No summary is finalised and no send action exists.
Approval is recorded through the dashboard: Approve summary / Send back for correction / Re-run check.
