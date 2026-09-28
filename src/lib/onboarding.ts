import type { ModuleKey } from "@/lib/modules";

export type ChecklistItem = {
  key: string;
  label: string;
  href: string;
  done: boolean;
};

// What an owner needs counted to work out which steps are already done.
// Kept as plain numbers/booleans rather than raw rows, so this stays a
// pure function the page can call after its own queries and unit tests
// can call without a database.
export type OnboardingCounts = {
  activeMembers: number;
  publishedPolicies: number;
  riskAssessments: number;
  publishedPrivacyNotices: number;
  clients: number;
  services: number;
  payDetails: number;
  suppliers: number;
};

type ModuleStep = {
  module: ModuleKey;
  key: string;
  label: string;
  href: string;
  done: (c: OnboardingCounts) => boolean;
};

const MODULE_STEPS: ModuleStep[] = [
  { module: "staff_hub", key: "policy", label: "Publish a policy for your team to sign", href: "/app/policies/new", done: (c) => c.publishedPolicies > 0 },
  { module: "compliance", key: "risk-assessment", label: "Add a risk assessment", href: "/app/r/risk-assessments/new", done: (c) => c.riskAssessments > 0 },
  { module: "gdpr", key: "privacy-notice", label: "Publish a privacy notice", href: "/app/r/privacy-notices/new", done: (c) => c.publishedPrivacyNotices > 0 },
  { module: "clients", key: "client", label: "Add your first client", href: "/app/r/clients/new", done: (c) => c.clients > 0 },
  { module: "website", key: "website", label: "Add a service to your public page", href: "/app/website", done: (c) => c.services > 0 },
  { module: "payroll", key: "pay-details", label: "Add everyone's pay details", href: "/app/payroll", done: (c) => c.payDetails > 0 },
  { module: "suppliers", key: "supplier", label: "Add a supplier", href: "/app/r/suppliers/new", done: (c) => c.suppliers > 0 },
];

// The owner's getting-started checklist: always inviting the team, plus
// one step per module they've switched on. A module contributes nothing
// while it's off, and the whole list disappears once every step is done
// (see OverviewPage), so an established business never sees it again.
export function buildOnboardingChecklist(enabledModules: Set<ModuleKey>, counts: OnboardingCounts): ChecklistItem[] {
  const items: ChecklistItem[] = [
    { key: "invite", label: "Invite your team", href: "/app/staff", done: counts.activeMembers > 1 },
  ];
  for (const step of MODULE_STEPS) {
    if (enabledModules.has(step.module)) {
      items.push({ key: step.key, label: step.label, href: step.href, done: step.done(counts) });
    }
  }
  return items;
}
