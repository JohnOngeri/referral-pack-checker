# Trajectory — per-facility memory, demonstrated in isolation

Deterministic. No model call. The committed `src/memory/store.json` is not touched —
this runs on an in-memory store through the same `recordPack` / `memoryNotesFor`
functions and the same gap-list sort the pipeline uses.

`memoryNotesFor` only surfaces a field once the facility has **≥ 2 packs seen** and
the field has been flagged in **≥ 2** of them. It never pre-fills a value.

## Pack 1 from Demo Clinic
Deterministic checks flagged: `bloodGroup`, `haemoglobin`.
Store after recording: packsSeen=1, omissions={ bloodGroup=1, haemoglobin=1 }

## Pack 2 from Demo Clinic
Deterministic checks flagged: `bloodGroup`.
Store after recording: packsSeen=2, omissions={ bloodGroup=2, haemoglobin=1 }
`bloodGroup` is now missing in 2 of 2 packs — it crosses the threshold.

## Pack 3 from Demo Clinic

Gap list as the deterministic checks produced it (check order):
  1. haemoglobin — Haemoglobin result is older than the recency limit for this referral type.
  2. syphilisScreen — Syphilis screen result is not recorded in the pack.
  3. bloodGroup — Blood group (ABO) is not recorded anywhere in the pack.

Gap list after the memory reorder:
  1. bloodGroup — Blood group (ABO) is not recorded anywhere in the pack.  ← Demo Clinic has left this field out of 2 of its last 2 packs.
  2. haemoglobin — Haemoglobin result is older than the recency limit for this referral type.
  3. syphilisScreen — Syphilis screen result is not recorded in the pack.

`bloodGroup` moved to the top and carries a note. The note is a prompt to check;
no value was filled in, and nothing was asserted about pack 3 itself.

## Contrast — first pack from a facility with no history
Gap list is left in check order, no note:
  1. haemoglobin — Haemoglobin result is older than the recency limit for this referral type.
  2. syphilisScreen — Syphilis screen result is not recorded in the pack.
  3. bloodGroup — Blood group (ABO) is not recorded anywhere in the pack.

