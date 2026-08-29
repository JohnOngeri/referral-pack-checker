# Video Script — 5 minutes

Shot-by-shot. Timings are cumulative. Narration is what you say; on-screen is what
you do. Open on the dashboard, never a terminal.

Any term is explained where it first appears. Numbers in `<angle brackets>` are read
from `results/reports/final_metrics.json` — fill them in before recording.

---

## Pre-recording checklist

- [ ] `npm run eval -- --mode replay` has been run, so `src/data/dashboard.json` is current.
- [ ] `npm run dev` is running; browser at `http://localhost:3000`, window sized to 1440px wide.
- [ ] Dashboard is on the **Review** tab, case **case-12** selected (this is the default).
- [ ] A second browser tab open on the **Comparison** view.
- [ ] A third tab open on the **Changelog** view, scrolled to the "Removed" box, transcript collapsed.
- [ ] `fixtures/packs/case-12.txt` open in an editor, off screen, ready to show if asked.
- [ ] Screen recorder set to capture the browser only. Audio levels checked.
- [ ] Close every other tab and notification.

---

## 0:00–0:45  — The problem, as a human story

**On screen:** Dashboard, Review view, case 12. Do not click anything yet. Let the
headline number sit.

**Narration:**
"A woman is 34 weeks pregnant. Her nurse is referring her to a district hospital for
a planned caesarean. Before she travels, the nurse assembles a referral pack from
her antenatal card — her blood group, her dates, her recent blood tests.

Packs arrive at the receiving hospital incomplete all the time. A blood group that
was never copied across. Dates written two different ways. A test that exists on
paper but never made it into the pack. The nurse isn't careless — she's running a
full clinic, working from a paper card filled in by different people on different
days.

The woman is the one who pays for it. She arrives, and she waits while someone
chases the missing item, or repeats a test, or sends her back. Every clinical
decision was right. The delay came from paperwork.

This tool checks the paperwork. It does not make any clinical judgment — I'll come
back to that."

---

## 0:45–1:30 — The single-prompt baseline passes a broken pack

**On screen:** Click the **Comparison** tab. Point at the two bars and the table.

**Narration:**
"The obvious way to build this is one big instruction to an AI model: here's the
pack, here's what the hospital needs, tell me what's wrong and write me a summary.

We built exactly that as a baseline and ran it over twelve packs. It caught
`<baseline.caught>` of the `<seededDefects>` problems we'd planted. `<baseline.falseFlags>`
times it raised something against a pack that was actually fine.

Now look at the last row — case 12." **Scroll to case-12 row.**
"Every mandatory field on that pack is filled in. Nothing is missing. A checker that
only looks for blank fields passes it. The single prompt passed it too. But the
record doesn't agree with itself, and that's the case I want to show you."

---

## 1:30–3:30 — One full run in the dashboard

**On screen:** Back to the **Review** tab, case 12.

**Narration + actions:**

1. **(0:00 of this section)** "This is our workflow. Same pack, same requirements."
   Point at the headline: "`<agent.caught>` of `<seededDefects>` caught,
   `<agent.falseFlags>` false flags."

2. **Click "Re-run check".** The four stages light up one at a time as each finishes:
   "Reading the referral pack" — that's a model call, it turns the messy card text
   into a clean structure and quotes the source for every value. Then "Checking
   against facility requirements" and "Looking for contradictions" — those two are
   ordinary code, not AI, so the rules can't drift between runs. Then "Preparing the
   summary" — a model call again, but it can only use values that were verified.

3. When it settles: "Two findings." **Click the first finding card.**
   The drawer slides in from the right. "In plain English at the top: the recorded
   gestational age is 30 weeks 2 days, but the last menstrual period on the same card
   works out to 36 weeks 1 day. Underneath: the exact rule that fired, the exact text
   it read each value from, and the raw output. It reports both numbers. It does not
   tell you which one is right — that's the clinician's call."

4. **Close the drawer. Click the second finding.** "The estimated delivery date
   follows the wrong one of those two figures."

5. **Click "Pack and summary".** "On the left, the pack as received, with the two
   conflicting lines marked. On the right, the summary the tool drafted — from
   verified fields only. Nothing invented."

6. **Type a name in the approval box. Click "Approve summary".** "Nothing is final
   until a clinician approves it. That's enforced in the code, not just the screen.
   And there is no send button anywhere in this product — approving marks it
   reviewed, nothing more."

---

## 3:30–4:15 — Before and after, and the headline number

**On screen:** Still on "Pack and summary" for case 12. Then scroll up to the headline.

**Narration:**
"Received on the left, corrected summary on the right, the two problem lines marked.
One sentence each on what didn't add up.

Across all twelve packs: the single prompt caught `<baseline.caught>`. This workflow
caught `<agent.caught>`, with `<agent.falseFlags>` false alarms against the packs
that were fine. That number comes straight out of a committed results file — it's
not typed into the page."

---

## 4:15–5:00 — The changelog, the change that mattered, and the experiment we removed

**On screen:** **Changelog** tab.

**Narration:**
"We built this in steps and measured each one. Structured extraction cut invented
values to `<agent.inventedValues>`. Moving the requirement check from the model into
plain code took run-to-run variation to `<variance.deterministicMeanStdev>`. The
change that mattered most was adding the contradiction check — it's the only thing
that caught case 12, which every earlier version had passed as complete.

**Scroll to the red "Removed" box. Click "Show the case 12 transcript".**
And one thing we built, measured, and then deleted: a model call that looks at two
conflicting values and picks one. It agreed with the internally consistent value
`<adjudicator.agreementRate>` times. We removed it anyway. Choosing between two
values written in a medical record is a decision for the clinician. A correct guess
is still a guess she didn't ask for.

That's the whole idea: the checks that must never drift are plain code. The model is
spent on the messy reading step, where it actually helps."

---

## If you have 20 extra seconds

Show `results/trajectories/case-12.md` — the full readable trace of the run you just
did, top to bottom.
