import { describe, expect, it } from "vitest";
import { hasSignedCurrent, outstandingCount, signOffSheet } from "@/lib/policies";
import type { Member, PolicySignature } from "@/lib/types";

const member = (id: string, full_name: string, status: Member["status"] = "active"): Member => ({
  id,
  business_id: "b",
  user_id: null,
  email: `${id}@x.test`,
  full_name,
  role: "staff",
  status,
  created_at: "2026-01-01T00:00:00Z",
});

const signature = (member_id: string, policy_version: number, policy_id = "p"): PolicySignature => ({
  id: `${member_id}-${policy_version}`,
  business_id: "b",
  policy_id,
  policy_version,
  member_id,
  signed_name: member_id,
  signed_at: "2026-01-02T00:00:00Z",
});

const policy = { id: "p", version: 2 };

describe("hasSignedCurrent", () => {
  it("only counts a signature on the current version", () => {
    expect(hasSignedCurrent(policy, "a", [signature("a", 2)])).toBe(true);
    expect(hasSignedCurrent(policy, "a", [signature("a", 1)])).toBe(false);
    expect(hasSignedCurrent(policy, "a", [signature("a", 2, "other")])).toBe(false);
  });
});

describe("signOffSheet", () => {
  const members = [member("a", "Amy"), member("b", "Ben"), member("c", "Cal"), member("d", "Dee", "left")];
  const signatures = [signature("a", 2), signature("b", 1)];

  it("lists active members only, unsigned first then by name", () => {
    const sheet = signOffSheet(policy, members, signatures);
    expect(sheet.map((r) => r.member.full_name)).toEqual(["Ben", "Cal", "Amy"]);
  });

  it("flags who signed an older version", () => {
    const sheet = signOffSheet(policy, members, signatures);
    const ben = sheet.find((r) => r.member.id === "b")!;
    expect(ben.signature).toBeNull();
    expect(ben.signedOlderVersion).toBe(true);
    expect(sheet.find((r) => r.member.id === "c")!.signedOlderVersion).toBe(false);
  });

  it("counts who still needs to sign", () => {
    expect(outstandingCount(policy, members, signatures)).toBe(2);
  });
});
