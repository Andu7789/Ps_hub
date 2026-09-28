import { describe, expect, it } from "vitest";
import { buildOnboardingChecklist, type OnboardingCounts } from "@/lib/onboarding";
import { MODULES } from "@/lib/modules";

const zero: OnboardingCounts = {
  activeMembers: 1,
  publishedPolicies: 0,
  riskAssessments: 0,
  publishedPrivacyNotices: 0,
  clients: 0,
  services: 0,
  payDetails: 0,
  suppliers: 0,
};

describe("buildOnboardingChecklist", () => {
  it("always includes inviting the team, done once someone else has joined", () => {
    const noModules = buildOnboardingChecklist(new Set(), zero);
    expect(noModules).toEqual([{ key: "invite", label: "Invite your team", href: "/app/staff", done: false }]);

    const withTeam = buildOnboardingChecklist(new Set(), { ...zero, activeMembers: 3 });
    expect(withTeam[0].done).toBe(true);
  });

  it("adds one step per enabled module, and nothing for a module that's off", () => {
    const items = buildOnboardingChecklist(new Set(["staff_hub", "clients"]), zero);
    expect(items.map((i) => i.key)).toEqual(["invite", "policy", "client"]);
  });

  it("marks a module's step done from its own count, independent of the others", () => {
    const items = buildOnboardingChecklist(
      new Set(["staff_hub", "compliance", "clients"]),
      { ...zero, publishedPolicies: 1, riskAssessments: 0, clients: 2 }
    );
    const byKey = Object.fromEntries(items.map((i) => [i.key, i.done]));
    expect(byKey.policy).toBe(true);
    expect(byKey["risk-assessment"]).toBe(false);
    expect(byKey.client).toBe(true);
  });

  it("covers every module with its own step", () => {
    const all = MODULES.map((m) => m.key);
    const items = buildOnboardingChecklist(new Set(all), {
      ...zero,
      activeMembers: 2,
      publishedPolicies: 1,
      riskAssessments: 1,
      publishedPrivacyNotices: 1,
      clients: 1,
      services: 1,
      payDetails: 1,
      suppliers: 1,
    });
    expect(items).toHaveLength(1 + all.length);
    expect(items.every((i) => i.done)).toBe(true);
  });
});
