import { z } from "zod";

export const SummarySchema = z.object({
  headline: z.string(),
  summaryRows: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
      state: z.enum(["verified", "outstanding"]),
    }),
  ),
  gapList: z.array(z.string()),
  beforeYouSend: z.array(z.string()),
});

export type SummaryOutput = z.infer<typeof SummarySchema>;

/** Words that would make the summary read as a clinical assessment. */
const CLINICAL_WORDS =
  /\b(normal|abnormal|concerning|reassuring|worrying|severe|mild|moderate|dangerous|urgent|emergenc|high risk|low risk|elevated|raised (?:bp|blood pressure) is|too (?:high|low)|within normal|deranged|critical)\b/i;

export function clinicalLanguageIssues(out: SummaryOutput): string[] {
  const issues: string[] = [];
  const scan = (where: string, text: string) => {
    const m = text.match(CLINICAL_WORDS);
    if (m) issues.push(`${where}: contains "${m[0]}" — reads as a clinical assessment.`);
  };
  scan("headline", out.headline);
  out.summaryRows.forEach((r, i) => scan(`summaryRows[${i}]`, `${r.label} ${r.value}`));
  out.gapList.forEach((g, i) => scan(`gapList[${i}]`, g));
  out.beforeYouSend.forEach((b, i) => scan(`beforeYouSend[${i}]`, b));
  return issues;
}
