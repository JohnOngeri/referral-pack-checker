# case-12 — deterministic check detail

## Requirements
- patientId: present_current — Present and within the recency limit.
- ageYears: present_current — Present and within the recency limit.
- lmp: present_current — Present and within the recency limit.
- gestationalAge: present_current — Present and within the recency limit.
- edd: present_current — Present and within the recency limit.
- gravidity: present_current — Present and within the recency limit.
- parity: present_current — Present and within the recency limit.
- bloodGroup: present_current — Present and within the recency limit.
- rhesus: present_current — Present and within the recency limit.
- haemoglobin: present_current — Present and within the recency limit.
- hivScreen: present_current — Present and within the recency limit.
- syphilisScreen: present_current — Present and within the recency limit.
- previousObstetricHistory: present_current — Present and within the recency limit.
- reasonForReferral: present_current — Present and within the recency limit.
- referringFacility: present_current — Present and within the recency limit.
- referringClinician: present_current — Present and within the recency limit.
- referralDate: present_current — Present and within the recency limit.
- receivingFacility: present_current — Present and within the recency limit.
- antiD: not_required — Conditional (Required when the rhesus status is recorded as negative.) — condition not met.

## Consistency
- consistency.ga_matches_lmp
  The recorded gestational age (30+2) does not match the last menstrual period, which gives 36+1.
  detail: {"lmp":"2025-12-14","assessed_on":"2026-08-24","derived_ga_days":253,"recorded_ga_days":212,"delta_days":41,"tolerance_days":7,"resolution":null}
- consistency.edd_matches_lmp
  The estimated delivery date (31 Oct 2026) does not follow from the recorded last menstrual period, which gives 20 Sep 2026.
  detail: {"lmp":"2025-12-14","derived_edd":"2026-09-20","recorded_edd":"2026-10-31","delta_days":41,"tolerance_days":3,"resolution":null}
