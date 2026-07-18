import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { updateTopicIdea, deleteTopicIdea } from "@/lib/ideas";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  try {
    const { id } = await params;
    const { title } = await request.json();
    if (typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const idea = await updateTopicIdea(session!.user.id, id, title);
    return NextResponse.json({ idea });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update idea";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  try {
    const { id } = await params;
    await deleteTopicIdea(session!.user.id, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to delete idea";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
