# Trajectory — case-12 (elective_caesarean)
Mode: FRESH   Model: gemini-3.6-flash   Ran: 2026-08-29T08:59:53.129Z

------------------------------------------------------------------------

## Stage 1 — Reading the referral pack (model call)
Instruction: transcribe the pack into the typed schema; quote every source span; mark absent, never guess.
Context given: the pack text with line numbers (19 lines).

Attempt 1: schema valid; 0 semantic issue(s); stop_reason=STOP; tokens in/out 832/6145
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
  bloodGroup                 present_current
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
  [consistency.ga_matches_lmp] Gestational age is recorded as 30+2 weeks. The recorded last menstrual period of 14 Dec 2025 gives 36+1 weeks on 24 Aug 2026.
     (recorded) Recorded gestational age: 30+2 weeks  [GA 30+2   (recorded at visit 24/08/26)]
     (derived)  Gestational age derived from LMP: 36+1 weeks on 24 Aug 2026  [14/12/2025]
     resolution: none — reported for the clinician to decide.
  [consistency.edd_matches_lmp] The estimated delivery date is recorded as 31 Oct 2026. The recorded last menstrual period of 14 Dec 2025 gives 20 Sep 2026.
     (recorded) Recorded estimated delivery date: 31 Oct 2026  [31/10/2026]
     (derived)  Estimated delivery date derived from LMP: 20 Sep 2026 (LMP + 280 days)  [14/12/2025]
     resolution: none — reported for the clinician to decide.

------------------------------------------------------------------------

## Stage 4 — Preparing the summary (model call, verified fields only)

Attempt 1: schema valid; 0 clinical-language issue(s)
  Accepted.

Headline: Referral from Mzilikazi Clinic to Central Hospital for elective caesarean booking. The pack contains all required fields, but includes contradictory date entries.
Gap list:
  (none)

------------------------------------------------------------------------

## Human checkpoint
State: awaiting_review
Nothing is finalised until a clinician approves. This tool checks documentation completeness only and makes no clinical assessment.
The workflow stops here. No summary is finalised and no send action exists.
Approval is recorded through the dashboard: Approve summary / Send back for correction / Re-run check.
