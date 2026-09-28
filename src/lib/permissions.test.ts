import { describe, expect, it } from "vitest";
import { canManageMember, rolesAssignableBy } from "@/lib/permissions";

describe("canManageMember", () => {
  it("lets owners manage anyone", () => {
    expect(canManageMember("owner", "owner")).toBe(true);
    expect(canManageMember("owner", "manager")).toBe(true);
    expect(canManageMember("owner", "staff")).toBe(true);
  });

  it("lets managers manage staff only", () => {
    expect(canManageMember("manager", "staff")).toBe(true);
    expect(canManageMember("manager", "manager")).toBe(false);
    expect(canManageMember("manager", "owner")).toBe(false);
  });

  it("lets staff manage nobody", () => {
    expect(canManageMember("staff", "staff")).toBe(false);
  });
});

describe("rolesAssignableBy", () => {
  it("matches what each role may manage", () => {
    expect(rolesAssignableBy("owner")).toEqual(["staff", "manager", "owner"]);
    expect(rolesAssignableBy("manager")).toEqual(["staff"]);
    expect(rolesAssignableBy("staff")).toEqual([]);
  });
});
