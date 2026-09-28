// Drafts a privacy notice from the business's data map and processor
// register. A starting point for the business to review, not a finished
// legal document — the generated text says so at the top.

export type RopaEntry = {
  data_category: string;
  purpose: string;
  data_subjects: string | null;
  lawful_basis: string;
  special_category: boolean;
  special_condition: string | null;
  retention: string | null;
  shared_with: string | null;
};

export type ProcessorEntry = { name: string; service: string | null; location: string };

const LAWFUL_BASIS_TEXT: Record<string, string> = {
  consent: "your consent",
  contract: "to perform our contract with you",
  legal_obligation: "to meet a legal obligation",
  vital_interests: "to protect someone's life",
  public_task: "to carry out a public task",
  legitimate_interests: "our legitimate interests",
};

const AUDIENCE_TEXT: Record<string, string> = {
  customers: "our customers and clients",
  staff: "our staff",
  job_applicants: "people who apply to work for us",
  website: "visitors to our website",
};

export function draftPrivacyNotice(opts: {
  businessName: string;
  contactEmail: string | null;
  audience: string;
  ropa: RopaEntry[];
  processors: ProcessorEntry[];
}): string {
  const who = AUDIENCE_TEXT[opts.audience] ?? "people whose data we hold";
  const contact = opts.contactEmail ?? "[contact email]";
  const lines: string[] = [
    "DRAFT generated from your data map. Review and edit before publishing.",
    "",
    `This notice explains how ${opts.businessName} collects and uses personal information about ${who}. ${opts.businessName} is the controller of this information.`,
    "",
    "What we collect and why",
  ];

  if (opts.ropa.length === 0) {
    lines.push("[Add entries to your data map to fill this section.]");
  }
  for (const r of opts.ropa) {
    const basis = LAWFUL_BASIS_TEXT[r.lawful_basis] ?? r.lawful_basis;
    let line = `- ${r.data_category}: ${r.purpose.replace(/\.$/, "")}. We rely on ${basis}.`;
    if (r.special_category) {
      line += ` This is special category information, which we use under ${r.special_condition || "[Article 9 condition]"}.`;
    }
    if (r.retention) line += ` We keep it for ${r.retention.replace(/\.$/, "")}.`;
    lines.push(line);
  }

  const sharing = [...new Set(opts.ropa.map((r) => r.shared_with).filter(Boolean))];
  lines.push("", "Who we share it with");
  if (sharing.length === 0 && opts.processors.length === 0) {
    lines.push("We do not share your information with anyone else unless the law requires it.");
  } else {
    for (const s of sharing) lines.push(`- ${s}`);
    for (const p of opts.processors) {
      lines.push(`- ${p.name}${p.service ? `, who provide ${p.service}` : ""}, acting on our instructions.`);
    }
  }
  if (opts.processors.some((p) => p.location !== "uk")) {
    lines.push("Some of these suppliers store information outside the UK. Where they do, we make sure appropriate safeguards are in place.");
  }

  lines.push(
    "",
    "Your rights",
    "You have the right to ask for a copy of your information, to have it corrected or deleted, to restrict or object to how we use it, and to data portability. Where we rely on your consent, you can withdraw it at any time.",
    `To make a request, contact us at ${contact}. We will respond within one month.`,
    "",
    "Complaints",
    `If you are unhappy with how we have handled your information, please contact us first at ${contact}. You also have the right to complain to the Information Commissioner's Office (ico.org.uk, 0303 123 1113).`
  );
  return lines.join("\n");
}
