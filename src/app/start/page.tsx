import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership, requireUser } from "@/lib/auth";
import { createBusinessAction } from "@/lib/actions/business";
import { ActionForm } from "@/components/forms/action-form";
import { inputClass, labelClass } from "@/components/ui/styles";

export const metadata: Metadata = { title: "Set up your business" };

// Where a signed-in person with no business lands: set one up, or (if
// they were expecting an invite) find out why it isn't showing.
export default async function StartPage() {
  const user = await requireUser();
  if (await getCurrentMembership()) redirect("/");

  // An invite sent after they last signed in hasn't been linked yet.
  const supabase = await createClient();
  const { data: claimed } = await supabase.rpc("hub_claim_invites");
  if (claimed) redirect("/");

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-semibold text-foreground">Set up your business</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        You&apos;ll be the owner, and can invite your team straight after.
      </p>
      <div className="mt-6">
        <ActionForm action={createBusinessAction} submitLabel="Create business" pendingLabel="Creating…">
          <div>
            <label htmlFor="business_name" className={labelClass}>
              Business name
            </label>
            <input id="business_name" name="business_name" required className={`mt-1 ${inputClass}`} />
          </div>
          <div>
            <label htmlFor="owner_name" className={labelClass}>
              Your full name
            </label>
            <input id="owner_name" name="owner_name" required autoComplete="name" className={`mt-1 ${inputClass}`} />
          </div>
        </ActionForm>
      </div>
      <p className="mt-8 text-sm text-muted-foreground">
        Expecting to join an existing business? Ask them to invite {user.email}. Invites are sent to that exact
        address.
      </p>
    </div>
  );
}
