# case-11 — deterministic check detail

## Requirements
- patientId: present_current — Present and within the recency limit.
- ageYears: present_current — Present and within the recency limit.
- lmp: present_current — Present and within the recency limit.
- gestationalAge: present_current — Present and within the recency limit.
- gravidity: present_current — Present and within the recency limit.
- parity: present_current — Present and within the recency limit.
- haemoglobin: present_current — Present and within the recency limit.
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
- consistency.no_date_before_lmp
  Syphilis screen is dated 20 Dec 2025, before the recorded last menstrual period (8 Jan 2026).
  detail: {"field_date":"2025-12-20","lmp":"2026-01-08","days_before":19,"resolution":null}
