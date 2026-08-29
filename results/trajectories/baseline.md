# Trajectory — baseline (single prompt), case-12

Mode: FRESH   Model: gemini-3.1-flash-lite

One model call. The raw pack text and the requirement set go in; free-form text
comes back. No extraction schema, no deterministic checker, no consistency
verifier, no retry loop, no memory.

## Instruction given
```
You are an experienced antenatal clinician reviewing a referral pack before it is sent to a higher-level facility. You are given the raw pack text and the receiving facility's requirement set.

In one pass, do the whole job:
- Identify every field that is missing, that is present but out of date under the stated recency limits, or that contradicts another field in the pack (for example a gestational age that does not match the last menstrual period, a date in the future, a parity that does not match the obstetric history).
- Then write a corrected referral summary and a short "before you send" list of what the referring clinician needs to add or fix.

Report contradictions by stating both values; do not decide which is right. Do not make any clinical assessment — this is a check of paperwork completeness and internal consistency only.

Write your answer as clear prose with clearly labelled sections: FINDINGS (one per line, each naming the field), SUMMARY, BEFORE YOU SEND.
```

## Raw response
stop_reason: STOP   tokens in/out: 726/562
```
### FINDINGS
*   **LMP:** The recorded date (14/12/2025) is in the future relative to the referral date (24/08/2026).
*   **Gestational Age:** The GA (30+2) is inconsistent with the LMP (14/12/2025); based on the LMP, the patient would not yet be pregnant.
*   **Haemoglobin:** The result (20/08/26) is 4 days old, which is within the 56-day limit; however, the record is valid.
*   **HIV Screening Status:** The result (20/12/25) is 247 days old, which is within the 365-day limit.
*   **Syphilis Screening Status:** The result (20/12/25) is 247 days old, which is within the 365-day limit.
*   **Referral Date:** Present.
*   **Referring Clinician:** Present.
*   **Referring Facility:** Present.
*   **Receiving Facility:** Present.
*   **Anti-D Immunoglobulin Record:** Not required (Rhesus status is positive).

### SUMMARY
Patient J. Sibanda (PID 1188-05), a 31-year-old G3 P2, is referred by Sr T. Ndlovu of Mzilikazi Clinic to Central Hospital for an elective LSCS booking due to a previous caesarean section in 2023. The patient’s obstetric history includes a 2019 term SVD and a 2023 term LSCS. Current investigations include Hb 11.7 g/dL (20/08/26), Blood Group O Positive, HIV negative (20/12/25), and Syphilis negative (20/12/25). The patient is currently maintained on ferrous sulphate, folic acid, calcium, and aspirin 75mg.

### BEFORE YOU SEND
*   **Correct the LMP:** The current date (14/12/2025) is in the future. Please verify and update the correct LMP.
*   **Reconcile Gestational Age:** Once the LMP is corrected, please recalculate the gestational age to ensure it is consistent with the new date.
*   **Verify Referral Date:** Ensure the referral date (24/08/2026) is accurate, as it currently conflicts with the future-dated LMP.
```

## How the scorer read it
- unparseable: false
- Parsed 2 finding line(s) from the FINDINGS section.
- finding lines extracted: 2
   - [lmp] LMP: The recorded date (14/12/2025) is in the future relative to the referral date (24/08/2026).
   - [gestationalAge] Gestational Age: The GA (30+2) is inconsistent with the LMP (14/12/2025); based on the LMP, the patient would not yet be pregnant.

The baseline tends to enumerate every field and to do calendar arithmetic in
its head; several "contradictions" it raises are its own arithmetic errors.
Full scoring: results/reports/baseline.json.
