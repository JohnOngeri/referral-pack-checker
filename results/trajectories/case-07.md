# Trajectory — case-07 (hypertension_review)
Mode: REPLAY   Model: gemini-3.1-flash-lite   Ran: 2026-08-29T12:11:15.792Z
REPLAY RUN — model outputs read from committed files, no API call made.

------------------------------------------------------------------------

## Stage 1 — Reading the referral pack (model call)
Instruction: transcribe the pack into the typed schema; quote every source span; mark absent, never guess.
Context given: the pack text with line numbers (22 lines).

Attempt 1: schema valid; 0 semantic issue(s); stop_reason=STOP; tokens in/out 847/1887
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
  bloodPressure              present_current
  urineProtein               present_current
  haemoglobin                present_current
  hivScreen                  present_current
  syphilisScreen             present_current
  medications                present_current
  reasonForReferral          present_current
  referringFacility          present_current
  referringClinician         present_current
  referralDate               present_current
  receivingFacility          present_current

------------------------------------------------------------------------

## Stage 3 — Looking for contradictions (deterministic)
  [consistency.no_future_dates] Haemoglobin sample is dated 18 Sep 2026, after the day the referral was written (18 Aug 2026).
     (recorded) Haemoglobin sample: 18 Sep 2026  [Hb 8.9   sample date 18/09/2026]
     (recorded) Referral date: 18 Aug 2026  [18/08/2026]
     resolution: none — reported for the clinician to decide.

------------------------------------------------------------------------

## Stage 4 — Preparing the summary (model call, verified fields only)

Attempt 1: schema valid; 0 clinical-language issue(s)
  Accepted.

Headline: This is a referral for a hypertension in pregnancy review. The referral pack is incomplete.
Gap list:
  - Haemoglobin sample is dated 18 Sep 2026, after the day the referral was written (18 Aug 2026).

------------------------------------------------------------------------

## Human checkpoint
State: awaiting_review
Nothing is finalised until a clinician approves. This tool checks documentation completeness only and makes no clinical assessment.
The workflow stops here. No summary is finalised and no send action exists.
Approval is recorded through the dashboard: Approve summary / Send back for correction / Re-run check.
