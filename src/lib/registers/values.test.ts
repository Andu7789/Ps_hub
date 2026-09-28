import { describe, expect, it } from "vitest";
import { addMonths, isoToLondonLocal, londonLocalToIso, parseFields, weekdaysBetween } from "@/lib/registers/values";
import { getRegister, REGISTERS } from "@/lib/registers/defs";

describe("London time", () => {
  it("converts winter (GMT) and summer (BST) wall-clock times", () => {
    expect(londonLocalToIso("2026-01-15T09:30")).toBe("2026-01-15T09:30:00.000Z");
    expect(londonLocalToIso("2026-07-15T09:30")).toBe("2026-07-15T08:30:00.000Z");
  });

  it("round-trips", () => {
    expect(isoToLondonLocal("2026-07-15T08:30:00.000Z")).toBe("2026-07-15T09:30");
    expect(isoToLondonLocal(londonLocalToIso("2026-10-25T12:00")!)).toBe("2026-10-25T12:00");
  });

  it("rejects junk", () => {
    expect(londonLocalToIso("tomorrow")).toBeNull();
  });
});

describe("date helpers", () => {
  it("counts weekdays inclusively", () => {
    expect(weekdaysBetween("2026-09-28", "2026-10-02")).toBe(5); // Mon-Fri
    expect(weekdaysBetween("2026-10-03", "2026-10-04")).toBe(0); // weekend
    expect(weekdaysBetween("2026-09-25", "2026-09-28")).toBe(2); // Fri-Mon
  });

  it("adds months, clamping to month end", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2026-03-15", 12)).toBe("2027-03-15");
    expect(addMonths("2026-03-15", -3)).toBe("2025-12-15");
  });
});

describe("parseFields", () => {
  const training = getRegister("training")!;
  const form = (entries: Record<string, string>) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(entries)) fd.set(k, v);
    return fd;
  };

  it("parses and checks each type", () => {
    const result = parseFields(training, form({
      member_id: "0b0c6a52-1a0e-4c55-9f1f-3a3b4b5c6d7e",
      course: " First aid ",
      category: "first_aid",
      completed_on: "2026-01-10",
      expires_on: "",
    }), training.fields.map((f) => f.name));
    expect(result.values).toMatchObject({ course: "First aid", category: "first_aid", completed_on: "2026-01-10", expires_on: null });
  });

  it("rejects missing required fields, bad dates and unknown options", () => {
    expect(parseFields(training, form({ course: "x", category: "other" }), ["member_id", "course"]).error).toMatch(/Person/);
    expect(parseFields(training, form({ completed_on: "31/01/2026" }), ["completed_on"]).error).toMatch(/valid date/);
    expect(parseFields(training, form({ category: "made_up" }), ["category"]).error).toMatch(/category/);
  });

  it("never reads read-only fields from the form", () => {
    const risks = getRegister("risks")!;
    const result = parseFields(risks, form({ score: "25" }), ["score"]);
    expect(result.values).toEqual({});
  });

  it("respects narrowed options for staff", () => {
    const absences = getRegister("absences")!;
    const narrowed = absences.staff!.create!.options;
    expect(parseFields(absences, form({ kind: "unpaid" }), ["kind"], narrowed).error).toBeDefined();
    expect(parseFields(absences, form({ kind: "holiday" }), ["kind"], narrowed).values).toEqual({ kind: "holiday" });
  });
});

describe("register definitions", () => {
  it("have unique keys and valid field references", () => {
    const keys = REGISTERS.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const r of REGISTERS) {
      const names = new Set(r.fields.map((f) => f.name));
      for (const col of r.list) expect(names, `${r.key}.${col}`).toContain(col);
      expect(names.has(r.titleField) || r.titleField === "id", `${r.key} title`).toBe(true);
      for (const d of r.due ?? []) expect(names, `${r.key} due ${d.field}`).toContain(d.field);
      for (const f of r.fields.filter((x) => x.type === "ref")) expect(getRegister(f.ref!), `${r.key}.${f.name}`).toBeDefined();
      for (const s of r.staff?.create?.fields ?? []) expect(names, `${r.key} staff ${s}`).toContain(s);
      if (r.staff) expect(r.memberField, `${r.key} memberField`).toBeDefined();
    }
  });
});
