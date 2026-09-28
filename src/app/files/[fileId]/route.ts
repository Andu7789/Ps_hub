import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { FILES_BUCKET } from "@/lib/files";

// Opens an uploaded file. Only works if the signed-in person can read the
// file's row (RLS), then hands them a one-minute link to the private
// bucket.
export async function GET(request: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  const supabase = await createClient();
  const { data: doc } = await supabase.from("hub_documents").select("storage_path, file_name").eq("id", fileId).maybeSingle();
  if (!doc) return new NextResponse("Not found", { status: 404 });

  const { data, error } = await createServiceClient()
    .storage.from(FILES_BUCKET)
    .createSignedUrl(doc.storage_path, 60, { download: doc.file_name });
  if (error || !data) return new NextResponse("Couldn't open the file", { status: 502 });
  return NextResponse.redirect(data.signedUrl, { status: 303, headers: { "Cache-Control": "no-store" } });
}
