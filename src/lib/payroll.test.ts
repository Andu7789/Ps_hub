import { describe, expect, it } from "vitest";
import { payrollCsv, payrollRows } from "@/lib/payroll";

describe("payrollRows", () => {
  const input = {
    members: [{ id: "a", full_name: "Amy Adams", email: "amy@x.test" }],
    payDetails: [{ member_id: "a", payroll_id: "P1", pay_type: "hourly", rate: 12.6, tax_code: "1257L", ni_number: "AB123456C", pension_status: "enrolled" }],
    timesheets: [
      { member_id: "a", work_on: "2026-09-01", hours: 7.5, status: "approved" },
      { member_id: "a", work_on: "2026-09-02", hours: 8, status: "submitted" },
      { member_id: "a", work_on: "2026-08-31", hours: 6, status: "approved" },
    ],
    absences: [
      { member_id: "a", kind: "holiday", start_on: "2026-08-28", end_on: "2026-09-03", status: "approved" },
      { member_id: "a", kind: "holiday", start_on: "2026-09-21", end_on: "2026-09-21", status: "requested" },
      { member_id: "a", kind: "sickness", start_on: "2026-09-10", end_on: "2026-09-11", status: "recorded" },
    ],
  };

  it("counts approved hours and leave inside the period only", () => {
    const [row] = payrollRows(input, "2026-09-01", "2026-09-30");
    expect(row).toMatchObject({ payrollId: "P1", rate: "12.60", hours: 7.5, holidayDays: 3, sickDays: 2, unpaidDays: 0 });
  });
});

describe("payrollCsv", () => {
  it("quotes commas and neutralises formulas", () => {
    const csv = payrollCsv([
      { name: "Smith, Jo", email: "=HYPERLINK(1)", payrollId: "", payType: "", rate: "", taxCode: "", niNumber: "", pension: "", hours: 0, holidayDays: 0, sickDays: 0, unpaidDays: 0, otherLeaveDays: 0 },
    ]);
    expect(csv.split("\r\n")[1]).toMatch(/^"Smith, Jo",'=HYPERLINK\(1\),/);
  });
});
