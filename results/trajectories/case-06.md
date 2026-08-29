# Trajectory — case-06 (anaemia_review)
Mode: REPLAY   Model: gemini-3.1-flash-lite   Ran: 2026-08-29T11:06:23.930Z
REPLAY RUN — model outputs read from committed files, no API call made.

------------------------------------------------------------------------

## Stage 1 — Reading the referral pack (model call)
Instruction: transcribe the pack into the typed schema; quote every source span; mark absent, never guess.
Context given: the pack text with line numbers (18 lines).

Attempt 1: schema valid; 0 semantic issue(s); stop_reason=STOP; tokens in/out 784/1640
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
  haemoglobin                present_current
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
  antiD                      conditionally_required_absent  <-- finding

------------------------------------------------------------------------

## Stage 3 — Looking for contradictions (deterministic)
  No contradictions found.

------------------------------------------------------------------------

## Stage 4 — Preparing the summary (model call, verified fields only)

Attempt 1: schema valid; 0 clinical-language issue(s)
  Accepted.

Headline: Referral for anaemia review. The referral pack is incomplete.
Gap list:
  - Anti-D immunoglobulin record is not in this pack. Mandatory here because: Required when the rhesus status is recorded as negative.

------------------------------------------------------------------------

## Human checkpoint
State: awaiting_review
Nothing is finalised until a clinician approves. This tool checks documentation completeness only and makes no clinical assessment.
The workflow stops here. No summary is finalised and no send action exists.
Approval is recorded through the dashboard: Approve summary / Send back for correction / Re-run check.
