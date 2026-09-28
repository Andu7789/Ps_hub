import type { Metadata } from "next";
import { requireOwner } from "@/lib/auth";
import { updateBusinessAction } from "@/lib/actions/business";
import { ActionForm } from "@/components/forms/action-form";
import { cardClass, inputClass, labelClass } from "@/components/ui/styles";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { business } = await requireOwner();

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
      <section className={`${cardClass} mt-6`}>
        <ActionForm action={updateBusinessAction} submitLabel="Save">
          <div>
            <label htmlFor="name" className={labelClass}>
              Business name
            </label>
            <input id="name" name="name" defaultValue={business.name} required className={`mt-1 ${inputClass}`} />
          </div>
          <div>
            <label htmlFor="contact_email" className={labelClass}>
              Contact email
            </label>
            <input
              id="contact_email"
              name="contact_email"
              type="email"
              defaultValue={business.contact_email ?? ""}
              className={`mt-1 ${inputClass}`}
            />
          </div>
          <div>
            <label htmlFor="brand_color" className={labelClass}>
              Brand colour
            </label>
            <input
              id="brand_color"
              name="brand_color"
              type="color"
              defaultValue={business.brand_color}
              className="mt-1 h-10 w-20 cursor-pointer rounded-lg border border-border bg-card"
            />
          </div>
        </ActionForm>
      </section>
    </div>
  );
}
