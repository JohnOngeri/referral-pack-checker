# case-05 — deterministic check detail

## Requirements
- patientId: present_current — Present and within the recency limit.
- ageYears: present_current — Present and within the recency limit.
- lmp: present_current — Present and within the recency limit.
- gestationalAge: present_current — Present and within the recency limit.
- edd: present_current — Present and within the recency limit.
- gravidity: present_current — Present and within the recency limit.
- parity: present_current — Present and within the recency limit.
- reasonForReferral: present_current — Present and within the recency limit.
- referringFacility: present_current — Present and within the recency limit.
- referringClinician: present_current — Present and within the recency limit.
- referralDate: present_current — Present and within the recency limit.
- receivingFacility: present_current — Present and within the recency limit.
- receivingDepartment: present_current — Present and within the recency limit.
- bloodGroup: not_required — Conditional (Required when the stated reason for referral mentions bleeding or a placental concern.) — condition not met.

## Consistency
- consistency.edd_matches_lmp
  The estimated delivery date (12 Aug 2026) does not follow from the recorded last menstrual period, which gives 27 Aug 2026.
  detail: {"lmp":"2025-11-20","derived_edd":"2026-08-27","recorded_edd":"2026-08-12","delta_days":-15,"tolerance_days":3,"resolution":null}
