// Every add-on a business can switch on. Setting `available: false` would
// list a module as coming soon without letting it be enabled. Keys must
// match the check constraint on hub_business_modules.module_key.
export const MODULES = [
  {
    key: "staff_hub",
    name: "Staff Hub",
    description: "Recruitment, onboarding, contracts, policies, training and competency, supervision, absence, performance, employee relations and benefits.",
    available: true,
  },
  {
    key: "compliance",
    name: "Compliance & Safety",
    description: "Risk register and matrix, risk assessments, COSHH, accidents and incidents, safeguarding, audit calendar, spot checks, insurance, vehicles and drivers, registrations.",
    available: true,
  },
  {
    key: "gdpr",
    name: "GDPR Toolkit",
    description: "Data map including special category data, processor register, subject access requests, breach log with the 72-hour clock, DPIAs, privacy notices.",
    available: true,
  },
  {
    key: "clients",
    name: "Clients",
    description: "Clients and leads, assessment scheduling, invoicing, disputes and networking contacts.",
    available: true,
  },
  {
    key: "website",
    name: "Website & Bookings",
    description: "Public page with your services and reviews, booking requests, review collection by email, printable flyer, custom domain.",
    available: true,
  },
  {
    key: "payroll",
    name: "Payroll Connect",
    description: "Pay details, pensions, timesheets, pay problems, pay run checklist, and an export for your payroll provider.",
    available: true,
  },
  {
    key: "suppliers",
    name: "Suppliers",
    description: "Approved wholesalers, products with stock levels and COSHH links, and orders.",
    available: true,
  },
] as const;

export type ModuleKey = (typeof MODULES)[number]["key"];

export function isModuleKey(value: string): value is ModuleKey {
  return MODULES.some((m) => m.key === value);
}

export function getModule(key: ModuleKey) {
  return MODULES.find((m) => m.key === key)!;
}

// The policy library is shared by Staff Hub, Compliance and GDPR: it's
// open while any of them is on (hub_policies_enabled in the database).
export function policiesEnabled(enabled: Set<ModuleKey>): boolean {
  return enabled.has("staff_hub") || enabled.has("compliance") || enabled.has("gdpr");
}
