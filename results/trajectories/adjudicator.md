# Removed experiment — contradiction adjudicator

Mode: replay   Model: gemini-3.1-flash-lite   Ran: 2026-08-29T12:11:15.775Z

Agreement with the internally consistent value: 1 of 3

Where the model did pick a value, it was choosing between two entries in a clinical document — a determination that belongs to the clinician, whether or not the choice was correct. Where it declined to pick, it added nothing the verifier does not already provide. Either way the experiment is removed: the consistency verifier reports both values with their provenance and resolves nothing.

## case-05
The estimated delivery date (12 Aug 2026) does not follow from the recorded last menstrual period, which gives 27 Aug 2026.

PROMPT
Contradiction: The estimated delivery date (12 Aug 2026) does not follow from the recorded last menstrual period, which gives 27 Aug 2026.

A (Recorded estimated delivery date): 12 Aug 2026  [source: EDD  12/08/2026]
B (Estimated delivery date derived from LMP): 27 Aug 2026 (LMP + 280 days)  [source: LMP  20/11/2025]

Which is correct?

RESPONSE
choice: cannot determine
reasoning: An estimated delivery date (EDD) is often adjusted based on early ultrasound dating scans, which are clinically considered more accurate than calculations based solely on the last menstrual period (LMP). Without access to the clinical notes or ultrasound report, it is impossible to determine if the 12 Aug date is a corrected clinical estimate or an error.

REVIEW
ground-truth leaning: B   agreed: false

------------------------------------------------------------
## case-07
Haemoglobin sample is dated 18 Sep 2026, after the day the referral was written (18 Aug 2026).

PROMPT
Contradiction: Haemoglobin sample is dated 18 Sep 2026, after the day the referral was written (18 Aug 2026).

A (Haemoglobin sample): 18 Sep 2026  [source: Hb 8.9   sample date 18/09/2026]
B (Referral date): 18 Aug 2026  [source: 18/08/2026]

Which is correct?

RESPONSE
choice: cannot determine
reasoning: While the dates are chronologically inconsistent for a standard referral process, it is impossible to determine which is 'correct' without external verification. The haemoglobin sample date may be a typo (e.g., meant to be August), or the referral date may be incorrect, or the sample was indeed taken a month after the referral was initially drafted.

REVIEW
ground-truth leaning: n/a   agreed: n/a

------------------------------------------------------------
## case-08
Recorded parity (2) does not match the obstetric history, which lists 3 previous births.

PROMPT
Contradiction: Recorded parity (2) does not match the obstetric history, which lists 3 previous births.

A (Recorded parity): 2  [source: P2]
B (Births counted from obstetric history): 3  [source: Obstetric history:
  2017  SVD term
  2019  SVD term
  2023  SVD term]

Which is correct?

RESPONSE
choice: B
reasoning: The obstetric history provides a detailed, itemized list of three specific births (2017, 2019, 2023), which serves as primary evidence that the parity count of 2 is an error.

REVIEW
ground-truth leaning: B   agreed: true

------------------------------------------------------------
## case-11
Syphilis screen is dated 20 Dec 2025, before the recorded last menstrual period (8 Jan 2026).

PROMPT
Contradiction: Syphilis screen is dated 20 Dec 2025, before the recorded last menstrual period (8 Jan 2026).

A (Syphilis screen): 20 Dec 2025  [source: RPR neg (20/12/25)]
B (Last menstrual period): 8 Jan 2026  [source: 08/01/2026]

Which is correct?

RESPONSE
choice: cannot determine
reasoning: While the dates are chronologically inconsistent for a standard pregnancy timeline, both values are documented clinical data points. It is impossible to determine which is 'correct' without verifying the patient's records, as either the syphilis screen date could be a clerical error, the LMP could be misremembered or misrecorded, or the screen could have been performed prior to the current pregnancy.

REVIEW
ground-truth leaning: n/a   agreed: n/a

------------------------------------------------------------
## case-12
The recorded gestational age (30+2) does not match the last menstrual period, which gives 36+1.

PROMPT
Contradiction: The recorded gestational age (30+2) does not match the last menstrual period, which gives 36+1.

A (Recorded gestational age): 30+2 weeks  [source: GA 30+2   (recorded at visit 24/08/26)]
B (Gestational age derived from LMP): 36+1 weeks on 24 Aug 2026  [source: LMP 14/12/2025]

Which is correct?

RESPONSE
choice: cannot determine
reasoning: A discrepancy between gestational age based on LMP and clinical assessment (often via ultrasound) is common. Without information regarding whether an early dating scan was performed to confirm or override the LMP-based date, it is impossible to determine which value is clinically accurate.

REVIEW
ground-truth leaning: B   agreed: false

