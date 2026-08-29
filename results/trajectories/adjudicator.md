# Removed experiment — contradiction adjudicator

Mode: fresh   Model: gemini-3.1-flash-lite   Ran: 2026-08-29T09:33:47.088Z

Agreement with the internally consistent value: 2 of 3

Crossed. In every case the model chose between two values recorded in a clinical document. That determination belongs to the clinician, whether or not the choice was correct. The experiment is removed. The consistency verifier reports both values with their provenance and resolves nothing.

## case-05
The estimated delivery date is recorded as 12 Aug 2026. The recorded last menstrual period of 20 Nov 2025 gives 27 Aug 2026.

PROMPT
Contradiction: The estimated delivery date is recorded as 12 Aug 2026. The recorded last menstrual period of 20 Nov 2025 gives 27 Aug 2026.

A (Recorded estimated delivery date): 12 Aug 2026  [source: EDD  12/08/2026]
B (Estimated delivery date derived from LMP): 27 Aug 2026 (LMP + 280 days)  [source: LMP  20/11/2025]

Which is correct?

RESPONSE
choice: cannot determine
reasoning: The EDD is typically calculated based on the LMP, but clinical adjustments are often made based on early ultrasound scans. Without knowing if the 12 Aug date was derived from a scan (which is more accurate than LMP) or if it is a clerical error, it is impossible to determine which value is correct.

REVIEW
ground-truth leaning: B   agreed: false

------------------------------------------------------------
## case-07
Haemoglobin sample is dated 18 Sep 2026, which is after the referral date of 18 Aug 2026.

PROMPT
Contradiction: Haemoglobin sample is dated 18 Sep 2026, which is after the referral date of 18 Aug 2026.

A (Haemoglobin sample): 18 Sep 2026  [source: Hb 8.9   sample date 18/09/2026]
B (Referral date): 18 Aug 2026  [source: 18/08/2026]

Which is correct?

RESPONSE
choice: cannot determine
reasoning: While it is chronologically unusual for a sample date to post-date a referral, it is clinically possible for a sample to be taken after the initial referral request (e.g., a follow-up test or a clerical error in the referral date). Without access to the patient's medical record or the ability to verify the source documents, it is impossible to determine which date is erroneous.

REVIEW
ground-truth leaning: n/a   agreed: n/a

------------------------------------------------------------
## case-08
Parity is recorded as 2. The previous obstetric history lists 3 births at or beyond 24 weeks (3 previous pregnancies in total).

PROMPT
Contradiction: Parity is recorded as 2. The previous obstetric history lists 3 births at or beyond 24 weeks (3 previous pregnancies in total).

A (Recorded parity): 2  [source: P2]
B (Births counted from obstetric history): 3  [source: Obstetric history:
  2017  SVD term
  2019  SVD term
  2023  SVD term]

Which is correct?

RESPONSE
choice: B
reasoning: The obstetric history explicitly lists three distinct births (2017, 2019, 2023), all of which meet the criteria for parity (births at or beyond 24 weeks). The recorded parity of '2' is likely a clerical error.

REVIEW
ground-truth leaning: B   agreed: true

------------------------------------------------------------
## case-11
Syphilis screen is dated 20 Dec 2025, which is before the recorded last menstrual period of 8 Jan 2026.

PROMPT
Contradiction: Syphilis screen is dated 20 Dec 2025, which is before the recorded last menstrual period of 8 Jan 2026.

A (Syphilis screen): 20 Dec 2025  [source: RPR neg (20/12/25)]
B (Last menstrual period): 8 Jan 2026  [source: 08/01/2026]

Which is correct?

RESPONSE
choice: cannot determine
reasoning: While it is clinically unusual for a syphilis screen to predate the last menstrual period in a current pregnancy, it is possible that the screen was performed as part of pre-conception care or an earlier clinical encounter. Without access to the patient's medical history or the ability to verify the dates with the patient, it is impossible to determine which value is 'correct' or if both are accurate representations of different events.

REVIEW
ground-truth leaning: n/a   agreed: n/a

------------------------------------------------------------
## case-12
Gestational age is recorded as 30+2 weeks. The recorded last menstrual period of 14 Dec 2025 gives 36+1 weeks on 24 Aug 2026.

PROMPT
Contradiction: Gestational age is recorded as 30+2 weeks. The recorded last menstrual period of 14 Dec 2025 gives 36+1 weeks on 24 Aug 2026.

A (Recorded gestational age): 30+2 weeks  [source: GA 30+2   (recorded at visit 24/08/26)]
B (Gestational age derived from LMP): 36+1 weeks on 24 Aug 2026  [source: LMP 14/12/2025]

Which is correct?

RESPONSE
choice: B
reasoning: The gestational age derived from the Last Menstrual Period (LMP) of 14 Dec 2025 to the date of 24 Aug 2026 is mathematically 36 weeks and 1 day. The recorded value of 30+2 is inconsistent with the provided LMP date, suggesting a documentation error or a discrepancy in the clinical record.

REVIEW
ground-truth leaning: B   agreed: true

