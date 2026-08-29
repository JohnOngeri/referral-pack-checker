# case-03 — deterministic check detail

## Requirements
- patientId: present_current — Present and within the recency limit.
- ageYears: present_current — Present and within the recency limit.
- lmp: present_current — Present and within the recency limit.
- gestationalAge: present_current — Present and within the recency limit.
- gravidity: present_current — Present and within the recency limit.
- parity: present_current — Present and within the recency limit.
- haemoglobin: absent — Haemoglobin is mandatory for anaemia review.
- bloodGroup: present_current — Present and within the recency limit.
- rhesus: present_current — Present and within the recency limit.
- hivScreen: present_current — Present and within the recency limit.
- syphilisScreen: present_current — Present and within the recency limit.
- medications: present_current — Present and within the recency limit.
- reasonForReferral: present_current — Present and within the recency limit.
- referringFacility: present_current — Present and within the recency limit.
- referringClinician: present_current — Present and within the recency limit.
- referralDate: present_current — Present and within the recency limit.
- receivingFacility: present_current — Present and within the recency limit.
- antiD: not_required — Conditional (Required when the rhesus status is recorded as negative.) — condition not met.

## Consistency
- none
