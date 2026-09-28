import { createClient } from "@/lib/supabase/server";
import { DOCUMENT_CATEGORIES } from "@/lib/registers/defs";
import { formatCalendarDate } from "@/lib/format";
import { londonToday } from "@/lib/registers/values";

type FileRow = {
  id: string;
  title: string;
  category: string;
  expires_on: string | null;
  file_name: string;
  member: { full_name: string } | null;
};

// Uploaded files the viewer is allowed to see (RLS decides: managers see
// the business's files, staff see only files about themselves).
export async function FileList({ businessId, memberId, showPerson = false }: { businessId: string; memberId?: string; showPerson?: boolean }) {
  const supabase = await createClient();
  let query = supabase
    .from("hub_documents")
    .select("id, title, category, expires_on, file_name, member:hub_members(full_name)")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  if (memberId) query = query.eq("member_id", memberId);
  const { data } = await query;
  const files = (data ?? []) as unknown as FileRow[];
  const today = londonToday();

  if (files.length === 0) return <p className="text-sm text-muted-foreground">No files yet.</p>;
  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-card">
      {files.map((f) => (
        <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
          <div>
            <a href={`/files/${f.id}`} className="font-medium text-foreground hover:text-brand">
              {f.title}
            </a>
            <p className="text-xs text-muted-foreground">
              {DOCUMENT_CATEGORIES.find((c) => c.value === f.category)?.label ?? f.category}
              {showPerson && f.member ? ` · ${f.member.full_name}` : ""} · {f.file_name}
            </p>
          </div>
          {f.expires_on && (
            <span className={f.expires_on < today ? "text-danger" : "text-muted-foreground"}>
              {f.expires_on < today ? "Expired " : "Expires "}
              {formatCalendarDate(f.expires_on)}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
