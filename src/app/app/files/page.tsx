import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireManager } from "@/lib/auth";
import { uploadFileAction } from "@/lib/actions/files";
import { DOCUMENT_CATEGORIES } from "@/lib/registers/defs";
import { ActionForm } from "@/components/forms/action-form";
import { FileList } from "@/components/files/file-list";
import { cardClass, inputClass, labelClass } from "@/components/ui/styles";

export const metadata: Metadata = { title: "Files" };

export default async function FilesPage({ searchParams }: { searchParams: Promise<{ member_id?: string }> }) {
  const { member_id } = await searchParams;
  const actor = await requireManager();
  const supabase = await createClient();
  const { data: members } = await supabase
    .from("hub_members")
    .select("id, full_name")
    .eq("business_id", actor.business_id)
    .order("full_name");

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Files</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Contracts, ID and right-to-work copies, DBS certificates, training certificates, insurance documents and safety
          data sheets. Files about a person are visible to them too.
        </p>
        <div className="mt-4">
          <FileList businessId={actor.business_id} showPerson />
        </div>
      </div>
      <aside className={`${cardClass} h-fit`}>
        <h2 className="text-base font-semibold text-foreground">Upload</h2>
        <div className="mt-4">
          <ActionForm action={uploadFileAction} submitLabel="Upload" pendingLabel="Uploading…" resetOnSuccess>
            <div>
              <label htmlFor="file" className={labelClass}>
                File (up to 4MB)
              </label>
              <input id="file" name="file" type="file" required className="mt-1 w-full text-sm" />
            </div>
            <div>
              <label htmlFor="title" className={labelClass}>
                Title
              </label>
              <input id="title" name="title" placeholder="Defaults to the file name" className={`mt-1 ${inputClass}`} />
            </div>
            <div>
              <label htmlFor="category" className={labelClass}>
                Type
              </label>
              <select id="category" name="category" defaultValue="other" className={`mt-1 ${inputClass}`}>
                {DOCUMENT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="member_id" className={labelClass}>
                About
              </label>
              <select id="member_id" name="member_id" defaultValue={member_id ?? ""} className={`mt-1 ${inputClass}`}>
                <option value="">The business (not one person)</option>
                {(members ?? []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="expires_on" className={labelClass}>
                Expires
              </label>
              <input id="expires_on" name="expires_on" type="date" className={`mt-1 ${inputClass}`} />
            </div>
          </ActionForm>
        </div>
      </aside>
    </div>
  );
}
