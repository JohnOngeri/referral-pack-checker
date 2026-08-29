/**
 * Human checkpoint.
 *
 * The workflow halts before a summary is finalised. Nothing is ever marked ready
 * to send automatically, and there is no send action anywhere in the product.
 * This is enforced here in code, not only in the interface.
 */

import type { SummaryOutput } from "../agents/summary-schema";

export type CheckpointState = "awaiting_review" | "approved" | "returned";

export interface ReviewRecord {
  state: CheckpointState;
  clinician: string | null;
  decidedAt: string | null;
  note: string | null;
}

export const SAFETY_LINE =
  "Nothing is finalised until a clinician approves. This tool checks documentation completeness only and makes no clinical assessment.";

export function freshCheckpoint(): ReviewRecord {
  return { state: "awaiting_review", clinician: null, decidedAt: null, note: null };
}

export function approve(_prev: ReviewRecord, clinician: string): ReviewRecord {
  const name = clinician.trim();
  if (!name) throw new Error("Approval requires a named clinician.");
  return { state: "approved", clinician: name, decidedAt: new Date().toISOString(), note: null };
}

export function sendBack(_prev: ReviewRecord, note: string): ReviewRecord {
  return { state: "returned", clinician: null, decidedAt: new Date().toISOString(), note: note.trim() || null };
}

/** The only way to obtain a finalised summary. Throws unless approved. */
export function finaliseSummary(review: ReviewRecord, summary: SummaryOutput): SummaryOutput {
  if (review.state !== "approved" || !review.clinician) {
    throw new Error(
      "Refusing to finalise: the summary has not been approved by a clinician. " +
        "There is no automatic path to a finalised summary.",
    );
  }
  return summary;
}

export function isFinalised(review: ReviewRecord): boolean {
  return review.state === "approved";
}
