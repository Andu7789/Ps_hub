// Every add-on a business can switch on. `available: false` modules are
// listed on the Modules page as coming soon so owners can see what's
// planned, but can't be enabled yet. Keys must match the check constraint
// on hub_business_modules.module_key.
export const MODULES = [
  {
    key: "staff_hub",
    name: "Staff Hub",
    description: "Employment details for every staff member, and policies staff read and sign.",
    available: true,
  },
  {
    key: "compliance",
    name: "Compliance & Safety",
    description: "Risk assessments, COSHH register, accident and incident log, safeguarding, audit calendar.",
    available: false,
  },
  {
    key: "gdpr",
    name: "GDPR Toolkit",
    description: "Subject access requests, breach log, processor register, DPIAs, privacy notices.",
    available: false,
  },
  {
    key: "clients",
    name: "Clients",
    description: "Client list, assessment scheduling, invoicing and disputes.",
    available: false,
  },
  {
    key: "website",
    name: "Website & Bookings",
    description: "Branded website with online booking and payments, and review collection.",
    available: false,
  },
  {
    key: "payroll",
    name: "Payroll Connect",
    description: "Sends hours, holiday and sickness to your payroll provider.",
    available: false,
  },
  {
    key: "suppliers",
    name: "Suppliers",
    description: "Approved wholesalers, product list and orders.",
    available: false,
  },
] as const;

export type ModuleKey = (typeof MODULES)[number]["key"];

export function isModuleKey(value: string): value is ModuleKey {
  return MODULES.some((m) => m.key === value);
}

export function getModule(key: ModuleKey) {
  return MODULES.find((m) => m.key === key)!;
}
