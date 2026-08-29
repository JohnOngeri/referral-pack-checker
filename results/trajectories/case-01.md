# Trajectory — case-01 (elective_caesarean)
Mode: REPLAY   Model: gemini-3.1-flash-lite   Ran: 2026-08-29T10:21:35.678Z
REPLAY RUN — model outputs read from committed files, no API call made.

------------------------------------------------------------------------

## Stage 1 — Reading the referral pack (model call)
Instruction: transcribe the pack into the typed schema; quote every source span; mark absent, never guess.
Context given: the pack text with line numbers (19 lines).

Attempt 1: schema valid; 0 semantic issue(s); stop_reason=STOP; tokens in/out 824/1991
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
  bloodGroup                 absent  <-- finding
  rhesus                     present_current
  haemoglobin                present_current
  hivScreen                  present_current
  syphilisScreen             present_current
  previousObstetricHistory   present_current
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

Headline: This is a referral for an elective caesarean booking. The referral pack is incomplete.
Gap list:
  - Blood group is not recorded anywhere in this pack, and elective caesarean booking requires it.

------------------------------------------------------------------------

## Human checkpoint
State: awaiting_review
Nothing is finalised until a clinician approves. This tool checks documentation completeness only and makes no clinical assessment.
The workflow stops here. No summary is finalised and no send action exists.
Approval is recorded through the dashboard: Approve summary / Send back for correction / Re-run check.
