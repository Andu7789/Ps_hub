import { describe, expect, it } from "vitest";
import { renderTemplate } from "@/lib/templates";
import { draftPrivacyNotice } from "@/lib/privacy";
import { bradfordFactor, holidayBalance, leaveYear } from "@/lib/absence";

describe("renderTemplate", () => {
  it("fills placeholders and flags missing ones", () => {
    const out = renderTemplate("Dear {{first_name}}, you start as {{ job_title }} on {{start_date}}. {{mystery}}", {
      full_name: "Sam Staff",
      email: "sam@x.test",
      job_title: null,
      start_date: "2026-10-05",
      business_name: "Sparkle",
      today: "2026-09-28",
    });
    expect(out).toBe("Dear Sam, you start as [job title] on 5 Oct 2026. [mystery]");
  });
});

describe("draftPrivacyNotice", () => {
  it("builds sections from the data map", () => {
    const text = draftPrivacyNotice({
      businessName: "Sparkle",
      contactEmail: "hello@sparkle.test",
      audience: "customers",
      ropa: [{ data_category: "Health information", purpose: "To keep you safe.", data_subjects: null, lawful_basis: "legal_obligation",
        special_category: true, special_condition: "Article 9(2)(h)", retention: "6 years", shared_with: "Your GP" }],
      processors: [{ name: "Xero", service: "accounting", location: "other" }],
    });
    expect(text).toContain("- Health information: To keep you safe. We rely on to meet a legal obligation.");
    expect(text).toContain("special category information, which we use under Article 9(2)(h)");
    expect(text).toContain("Xero, who provide accounting");
    expect(text).toContain("outside the UK");
    expect(text).toContain("hello@sparkle.test");
  });
});

describe("absence", () => {
  const sick = (start_on: string, days: number) => ({ kind: "sickness", start_on, end_on: start_on, days, status: "recorded" });

  it("scores frequent short absences higher (Bradford Factor)", () => {
    expect(bradfordFactor([sick("2026-09-01", 1), sick("2026-08-01", 1), sick("2026-07-01", 1)], "2026-09-28").score).toBe(27);
    expect(bradfordFactor([sick("2026-09-01", 3)], "2026-09-28").score).toBe(3);
    expect(bradfordFactor([sick("2025-06-01", 5)], "2026-09-28").score).toBe(0);
  });

  it("works out the leave year and balance", () => {
    expect(leaveYear("2026-03-10", 4)).toEqual({ start: "2025-04-01", end: "2026-03-31" });
    expect(leaveYear("2026-09-28", 1)).toEqual({ start: "2026-01-01", end: "2026-12-31" });
    const balance = holidayBalance(
      [
        { kind: "holiday", start_on: "2026-06-01", end_on: "2026-06-05", days: 5, status: "approved" },
        { kind: "holiday", start_on: "2026-11-02", end_on: "2026-11-03", days: 2, status: "requested" },
        { kind: "holiday", start_on: "2025-12-20", end_on: "2025-12-22", days: 2, status: "approved" },
      ],
      28,
      "2026-09-28",
      1
    );
    expect(balance).toMatchObject({ approved: 5, requested: 2, remaining: 23 });
  });
});
