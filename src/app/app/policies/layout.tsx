import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { isModuleEnabled, requireManager } from "@/lib/auth";

export default async function PoliciesLayout({ children }: { children: ReactNode }) {
  const membership = await requireManager();
  if (!(await isModuleEnabled(membership.business_id, "staff_hub"))) redirect("/app");
  return children;
}
