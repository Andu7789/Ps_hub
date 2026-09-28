import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireManager } from "@/lib/auth";
import { inviteMemberAction } from "@/lib/actions/staff";
import { ROLE_LABELS, rolesAssignableBy } from "@/lib/permissions";
import { ActionForm } from "@/components/forms/action-form";
import { cardClass, inputClass, labelClass } from "@/components/ui/styles";
import type { Member } from "@/lib/types";

export const metadata: Metadata = { title: "Staff" };

export default async function StaffPage() {
  const membership = await requireManager();
  const supabase = await createClient();
  const { data } = await supabase
    .from("hub_members")
    .select("*")
    .eq("business_id", membership.business_id)
    .order("full_name");
  const members = (data ?? []) as Member[];
  const active = members.filter((m) => m.status === "active");
  const left = members.filter((m) => m.status === "left");
  const assignable = rolesAssignableBy(membership.role);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Staff</h1>
        <MemberList members={active} />
        {left.length > 0 && (
          <>
            <h2 className="mt-8 text-base font-semibold text-muted-foreground">Left</h2>
            <MemberList members={left} />
          </>
        )}
      </div>

      <aside className={`${cardClass} h-fit`}>
        <h2 className="text-base font-semibold text-foreground">Add someone</h2>
        <p className="mt-1 text-sm text-muted-foreground">They&apos;ll get an email with a link to sign in.</p>
        <div className="mt-4">
          <ActionForm action={inviteMemberAction} submitLabel="Send invite" pendingLabel="Sending…" resetOnSuccess>
            <div>
              <label htmlFor="full_name" className={labelClass}>
                Full name
              </label>
              <input id="full_name" name="full_name" required className={`mt-1 ${inputClass}`} />
            </div>
            <div>
              <label htmlFor="email" className={labelClass}>
                Email
              </label>
              <input id="email" name="email" type="email" required className={`mt-1 ${inputClass}`} />
            </div>
            {assignable.length > 1 && (
              <div>
                <label htmlFor="role" className={labelClass}>
                  Role
                </label>
                <select id="role" name="role" defaultValue="staff" className={`mt-1 ${inputClass}`}>
                  {assignable.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </ActionForm>
        </div>
      </aside>
    </div>
  );
}

function MemberList({ members }: { members: Member[] }) {
  if (members.length === 0) return <p className="mt-4 text-sm text-muted-foreground">Nobody yet.</p>;
  return (
    <ul className="mt-4 divide-y divide-border rounded-xl border border-border bg-card">
      {members.map((m) => (
        <li key={m.id}>
          <Link href={`/app/staff/${m.id}`} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted">
            <div>
              <p className="text-sm font-medium text-foreground">{m.full_name}</p>
              <p className="text-xs text-muted-foreground">{m.email}</p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p>{ROLE_LABELS[m.role]}</p>
              {!m.user_id && m.status === "active" && <p>Invite pending</p>}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
