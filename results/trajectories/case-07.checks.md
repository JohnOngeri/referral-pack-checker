# case-07 — deterministic check detail

## Requirements
- patientId: present_current — Present and within the recency limit.
- ageYears: present_current — Present and within the recency limit.
- lmp: present_current — Present and within the recency limit.
- gestationalAge: present_current — Present and within the recency limit.
- gravidity: present_current — Present and within the recency limit.
- parity: present_current — Present and within the recency limit.
- bloodPressure: present_current — Present and within the recency limit.
- urineProtein: present_current — Present and within the recency limit.
- haemoglobin: present_current — Present and within the recency limit.
- hivScreen: present_current — Present and within the recency limit.
- syphilisScreen: present_current — Present and within the recency limit.
- medications: present_current — Present and within the recency limit.
- reasonForReferral: present_current — Present and within the recency limit.
- referringFacility: present_current — Present and within the recency limit.
- referringClinician: present_current — Present and within the recency limit.
- referralDate: present_current — Present and within the recency limit.
- receivingFacility: present_current — Present and within the recency limit.

## Consistency
- consistency.no_future_dates
  Haemoglobin sample is dated 18 Sep 2026, after the day the referral was written (18 Aug 2026).
  detail: {"field_date":"2026-09-18","referral_date":"2026-08-18","days_after":31,"resolution":null}
