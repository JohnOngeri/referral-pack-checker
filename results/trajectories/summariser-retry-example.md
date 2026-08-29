# Trajectory — summariser retry (clinical-language guard)

The summariser is a model call, but its output passes through a deterministic
guard (`clinicalLanguageIssues` in `src/agents/summary-schema.ts`). If the draft
characterises any value as normal / abnormal / concerning / severe / urgent etc.,
the attempt is rejected and the summariser retries with the specific offending
phrases attached, up to 3 attempts.

No pack in the committed evaluation tripped this guard. This is the guard run
against a constructed draft, so the retry path is visible.

## Instruction (summariser system prompt, rule 4)
```
4. Report presence, currency and consistency only. Never say a value is normal, abnormal, low, high, concerning, reassuring, mild or severe. Never assess urgency. Never say whether the referral is warranted.
```

## Attempt 1 — rejected
Draft headline:
> Referral for anaemia review. The haemoglobin result of 8.1 is concerning and abnormal; the pack is otherwise complete.

Guard result: 3 issue(s)
  - headline: contains "concerning" — reads as a clinical assessment.
  - summaryRows[0]: contains "abnormal" — reads as a clinical assessment.
  - gapList[0]: contains "severe" — reads as a clinical assessment.

## Follow-up appended to the next request (verbatim)
```
The summary used language that reads as a clinical assessment:
- headline: contains "concerning" — reads as a clinical assessment.
- summaryRows[0]: contains "abnormal" — reads as a clinical assessment.
- gapList[0]: contains "severe" — reads as a clinical assessment.

Rewrite. Report only presence, currency and consistency. Call record_referral_summary again.
```

## Attempt 2 — accepted
Draft headline:
> Referral for anaemia review. The haemoglobin result was recorded 2 weeks ago; this referral type needs a result from the last 8 weeks.

Guard result: 0 issue(s) — accepted.

The gap list now states currency and presence only: "taken 14 days ago; needs a
result from the last 8 weeks", not "severe" or "urgent".
