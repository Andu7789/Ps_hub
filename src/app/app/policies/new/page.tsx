import type { Metadata } from "next";
import Link from "next/link";
import { createPolicyAction } from "@/lib/actions/policies";
import { ActionForm } from "@/components/forms/action-form";
import { PolicyFields } from "@/components/forms/policy-fields";

export const metadata: Metadata = { title: "New policy" };

export default function NewPolicyPage() {
  return (
    <div className="max-w-3xl">
      <Link href="/app/policies" className="text-sm text-muted-foreground hover:underline">
        ← Policies
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-foreground">New policy</h1>
      <p className="mt-1 text-sm text-muted-foreground">Saved as a draft. Your team won&apos;t see it until you publish it.</p>
      <div className="mt-6">
        <ActionForm action={createPolicyAction} submitLabel="Save draft">
          <PolicyFields />
        </ActionForm>
      </div>
    </div>
  );
}
