# case-08 — deterministic check detail

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
- consistency.parity_matches_obstetric_history
  Recorded parity (2) does not match the obstetric history, which lists 3 previous births.
  detail: {"recorded_parity":2,"history_entries":3,"history_births_24w_plus":3,"history":[{"summary":"2017  SVD term","outcome":"term_birth","weeks":null},{"summary":"2019  SVD term","outcome":"term_birth","weeks":null},{"summary":"2023  SVD term","outcome":"term_birth","weeks":null}],"resolution":null}
