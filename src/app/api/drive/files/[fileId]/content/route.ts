import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { getFileTextContent, updateFileTextContent } from "@/lib/drive";

type Params = { params: Promise<{ fileId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { fileId } = await params;

  try {
    const file = await getFileTextContent(session!.user.id, fileId);
    return NextResponse.json(file);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to read file content";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { fileId } = await params;
  const body = await request.json();

  if (typeof body.content !== "string") {
    return NextResponse.json(
      { error: "content string is required" },
      { status: 400 },
    );
  }

  try {
    const updated = await updateFileTextContent(
      session!.user.id,
      fileId,
      body.content,
    );
    return NextResponse.json(updated);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to save file content";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
