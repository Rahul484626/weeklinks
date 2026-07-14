import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { downloadFile } from "@/lib/drive";

type Params = { params: Promise<{ fileId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { fileId } = await params;

  try {
    const file = await downloadFile(session!.user.id, fileId);
    return new NextResponse(new Uint8Array(file.buffer), {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(file.name)}"`,
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to download file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
