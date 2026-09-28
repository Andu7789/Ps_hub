import { EMPLOYMENT_TYPE_LABELS, formatCalendarDate } from "@/lib/format";
import type { EmploymentType } from "@/lib/types";

export type TemplateValues = {
  full_name: string;
  email: string;
  job_title?: string | null;
  employment_type?: EmploymentType | null;
  start_date?: string | null;
  business_name: string;
  today: string;
};

// Fills {{placeholders}} from a person's record. Unknown placeholders and
// ones with no value are left visible as "[job title]" so a gap is
// obvious in the issued document rather than silently blank.
export function renderTemplate(body: string, v: TemplateValues): string {
  const values: Record<string, string | null | undefined> = {
    full_name: v.full_name,
    first_name: v.full_name.split(/\s+/)[0],
    email: v.email,
    job_title: v.job_title,
    employment_type: v.employment_type ? EMPLOYMENT_TYPE_LABELS[v.employment_type] : null,
    start_date: v.start_date ? formatCalendarDate(v.start_date) : null,
    business_name: v.business_name,
    today: formatCalendarDate(v.today),
  };
  return body.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_, key: string) => values[key] || `[${key.replace(/_/g, " ")}]`);
}

const SOLICITOR_NOTE =
  "STARTER TEMPLATE: this wording is a starting point only and is not legal advice. Have it checked by an employment solicitor and adapt it to your business before issuing it.";

export const STARTER_TEMPLATES: { kind: string; title: string; body: string }[] = [
  {
    kind: "contract",
    title: "Written statement of employment particulars",
    body: `${SOLICITOR_NOTE}

Employer: {{business_name}}
Employee: {{full_name}}
Job title: {{job_title}}
Employment type: {{employment_type}}
Start date: {{start_date}} (this is also the date your continuous employment began, unless stated otherwise)

1. Place of work
Your normal place of work is [address], and you may be asked to work at client premises within [area].

2. Hours of work
Your normal hours are [hours] per week, [days and times]. [Overtime arrangements.]

3. Pay
You will be paid [rate] per [hour / year], paid [weekly / monthly] by bank transfer on [pay day].

4. Holiday
The holiday year runs from [date] to [date]. You are entitled to [number] days' paid holiday per year including bank holidays, pro rata for part-time work.

5. Sickness absence and sick pay
Tell your manager before [time] on the first day you are unable to work. You are entitled to Statutory Sick Pay if you qualify. [Company sick pay, if any.]

6. Probationary period
Your first [3 / 6] months are a probationary period.

7. Notice
During probation either party may end employment with [one week's] notice. After that you must give [notice] and you are entitled to statutory minimum notice or [notice], whichever is longer.

8. Pension
You will be auto-enrolled into the workplace pension scheme if you are eligible, in line with the law.

9. Training
You must complete the training listed in your induction, including [mandatory courses]. The company pays for required training.

10. Other benefits
[Uniform, equipment, mileage, other benefits.]

11. Disciplinary and grievance
The disciplinary and grievance procedures are set out in the staff policies on the PS Business Hub, which do not form part of this contract.

Signed for {{business_name}}: ____________________   Date: {{today}}`,
  },
  {
    kind: "job_description",
    title: "Job description",
    body: `${SOLICITOR_NOTE}

Job title: {{job_title}}
Reports to: [manager]
Business: {{business_name}}

Purpose of the role
[One or two sentences on why the role exists.]

Main responsibilities
- [Responsibility]
- [Responsibility]
- [Responsibility]
- Follow the company's health and safety, safeguarding and data protection policies at all times.

Skills and experience
Essential: [list]
Desirable: [list]

This job description is not exhaustive and may change as the business develops, after discussion with the post holder.`,
  },
  {
    kind: "offer_letter",
    title: "Offer letter",
    body: `${SOLICITOR_NOTE}

{{today}}

Dear {{first_name}},

I am delighted to offer you the position of {{job_title}} with {{business_name}}, starting on {{start_date}}.

This offer is subject to [satisfactory references, right to work check, DBS check]. Your written statement of employment particulars will follow before your first day.

Please confirm your acceptance by signing below.

Yours sincerely,
[Name], {{business_name}}`,
  },
];

export const STANDARD_ONBOARDING_TASKS = [
  "Right to work check completed and copy kept",
  "Photo ID seen",
  "DBS check requested (if required for the role)",
  "References received",
  "Bank, NI number and tax details sent to payroll",
  "Emergency contact recorded",
  "Contract issued and signed",
  "Staff policies read and signed",
  "Induction and health and safety briefing",
  "Uniform and PPE issued",
];
