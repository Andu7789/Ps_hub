import { describe, expect, it } from "vitest";
import { isPlatformAdminEmail, monthlyValue, parseAdminEmails, pricesFromRows } from "@/lib/platform-admin";

describe("isPlatformAdminEmail", () => {
  it("matches listed addresses regardless of case and spacing", () => {
    const configured = " Owner@Example.com , second@example.com";
    expect(isPlatformAdminEmail("owner@example.com", configured)).toBe(true);
    expect(isPlatformAdminEmail("SECOND@example.com", configured)).toBe(true);
  });

  it("refuses everyone when nothing is configured", () => {
    expect(isPlatformAdminEmail("owner@example.com", undefined)).toBe(false);
    expect(isPlatformAdminEmail("owner@example.com", "")).toBe(false);
  });

  it("refuses a missing email and unlisted addresses", () => {
    expect(isPlatformAdminEmail(null, "owner@example.com")).toBe(false);
    expect(isPlatformAdminEmail("other@example.com", "owner@example.com")).toBe(false);
  });

  it("ignores blank or malformed entries", () => {
    expect([...parseAdminEmails(",, not-an-email ,a@b.c")]).toEqual(["a@b.c"]);
  });
});

describe("monthlyValue", () => {
  const prices = pricesFromRows([
    { price_key: "base", monthly_price: "10.00" },
    { price_key: "staff_hub", monthly_price: 29 },
    { price_key: "gdpr", monthly_price: "15.50" },
    { price_key: "unknown", monthly_price: 999 },
  ]);

  it("adds the base fee and each enabled module", () => {
    expect(monthlyValue(["staff_hub", "gdpr"], prices)).toBe(54.5);
  });

  it("charges the base fee with no modules on", () => {
    expect(monthlyValue([], prices)).toBe(10);
  });

  it("treats unpriced modules as free and ignores unknown keys", () => {
    expect(monthlyValue(["payroll", "nonsense", "base"], prices)).toBe(10);
  });

  it("counts excluded accounts as zero", () => {
    expect(monthlyValue(["staff_hub"], prices, true)).toBe(0);
  });
});
