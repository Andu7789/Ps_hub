import type { Member, Policy, PolicySignature } from "@/lib/types";

// Only a signature on the version currently in force counts: editing a
// policy's wording bumps its version (see hub_policies_bump_version), and
// everyone has to sign again.
export function hasSignedCurrent(policy: Pick<Policy, "id" | "version">, memberId: string, signatures: PolicySignature[]) {
  return signatures.some(
    (s) => s.policy_id === policy.id && s.policy_version === policy.version && s.member_id === memberId
  );
}

export type SignOffRow = {
  member: Member;
  signature: PolicySignature | null;
  // Signed an earlier version but not this one.
  signedOlderVersion: boolean;
};

// One row per active member for a policy's sign-off sheet, unsigned first
// so a manager sees who to chase at the top.
export function signOffSheet(policy: Pick<Policy, "id" | "version">, members: Member[], signatures: PolicySignature[]): SignOffRow[] {
  const forPolicy = signatures.filter((s) => s.policy_id === policy.id);
  return members
    .filter((m) => m.status === "active")
    .map((member) => {
      const mine = forPolicy.filter((s) => s.member_id === member.id);
      const current = mine.find((s) => s.policy_version === policy.version) ?? null;
      return { member, signature: current, signedOlderVersion: !current && mine.length > 0 };
    })
    .sort((a, b) => {
      if (Boolean(a.signature) !== Boolean(b.signature)) return a.signature ? 1 : -1;
      return a.member.full_name.localeCompare(b.member.full_name);
    });
}

export function outstandingCount(policy: Pick<Policy, "id" | "version">, members: Member[], signatures: PolicySignature[]) {
  return signOffSheet(policy, members, signatures).filter((r) => !r.signature).length;
}
