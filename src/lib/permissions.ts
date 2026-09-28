import type { Role } from "@/lib/types";

// Mirrors the RLS on hub_members (migration 0001): owners manage anyone,
// managers manage staff only. The database enforces this regardless; the
// app checks too so it can hide controls and give a clear error instead
// of a silent no-op.
export function canManageMember(actor: Role, target: Role): boolean {
  if (actor === "owner") return true;
  if (actor === "manager") return target === "staff";
  return false;
}

export function rolesAssignableBy(actor: Role): Role[] {
  if (actor === "owner") return ["staff", "manager", "owner"];
  if (actor === "manager") return ["staff"];
  return [];
}

export function isManagerRole(role: Role): boolean {
  return role === "owner" || role === "manager";
}

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  manager: "Manager",
  staff: "Staff",
};
