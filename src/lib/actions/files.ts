"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireManager } from "@/lib/auth";
import { field, optionalField, type ActionState } from "@/lib/action-state";
import { FILES_BUCKET } from "@/lib/files";

const MAX_FILE_BYTES = 4 * 1024 * 1024;
const CATEGORIES = ["contract", "id_right_to_work", "dbs", "certificate", "insurance", "safety_data_sheet", "policy", "other"];
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
];

// Files live in a private bucket only the server can reach. The row in
// hub_documents is what decides who may see a file (see DECISIONS.md), so
// the row is written with the manager's own session (RLS applies) and the
// bytes with the service role.
export async function uploadFileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireManager();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file to upload." };
  if (file.size > MAX_FILE_BYTES) return { error: "Files can be up to 4MB." };
  if (file.type && !ALLOWED_TYPES.includes(file.type)) return { error: "Upload a PDF, image, Word, Excel or text file." };

  const title = field(formData, "title") || file.name;
  const category = CATEGORIES.includes(field(formData, "category")) ? field(formData, "category") : "other";
  const memberId = optionalField(formData, "member_id");
  const expiresOn = optionalField(formData, "expires_on");
  if (expiresOn && !/^\d{4}-\d{2}-\d{2}$/.test(expiresOn)) return { error: "Enter a valid expiry date." };

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-100) || "file";
  const path = `${actor.business_id}/${crypto.randomUUID()}-${safeName}`;

  const supabase = await createClient();
  const { data: row, error: rowError } = await supabase
    .from("hub_documents")
    .insert({
      business_id: actor.business_id,
      member_id: memberId,
      title,
      category,
      expires_on: expiresOn,
      storage_path: path,
      file_name: file.name.slice(0, 200),
      content_type: file.type || null,
      size_bytes: file.size,
    })
    .select("id")
    .single();
  if (rowError || !row) return { error: "Couldn't save the file details. Check who it's for." };

  const service = createServiceClient();
  const { error: uploadError } = await service.storage
    .from(FILES_BUCKET)
    .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
  if (uploadError) {
    console.error("Upload failed", uploadError);
    await supabase.from("hub_documents").delete().eq("id", row.id);
    return { error: "The upload failed. Try again." };
  }

  revalidatePath("/app/files");
  if (memberId) revalidatePath(`/app/staff/${memberId}`);
  return { ok: `Uploaded ${file.name}.` };
}

export async function deleteFileAction(formData: FormData) {
  const actor = await requireManager();
  const id = field(formData, "id");
  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("hub_documents")
    .select("id, storage_path")
    .eq("id", id)
    .eq("business_id", actor.business_id)
    .maybeSingle();
  if (doc) {
    await supabase.from("hub_documents").delete().eq("id", doc.id);
    await createServiceClient().storage.from(FILES_BUCKET).remove([doc.storage_path]);
  }
  revalidatePath("/app/files");
  redirect("/app/files");
}
