import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getEnabledModules, requireManager } from "@/lib/auth";
import { policiesEnabled } from "@/lib/modules";

export default async function PoliciesLayout({ children }: { children: ReactNode }) {
  const membership = await requireManager();
  if (!policiesEnabled(await getEnabledModules(membership.business_id))) redirect("/app");
  return children;
}
