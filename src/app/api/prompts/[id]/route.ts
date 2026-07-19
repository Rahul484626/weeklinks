import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { updateGlobalPrompt, deleteGlobalPrompt, reorderGlobalPrompts } from "@/lib/prompts";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteParams) {
  const { session, error } = await requireSession();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();

    // Handle bulk reordering
    if (Array.isArray(body.orderedIds)) {
      const prompts = await reorderGlobalPrompts(session!.user.id, body.orderedIds);
      return NextResponse.json({ prompts });
    }

    // Handle individual item update
    const { title, content } = body;
    if (typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const prompt = await updateGlobalPrompt(session!.user.id, id, title, content);
    return NextResponse.json({ prompt });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update prompt";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { session, error } = await requireSession();
  if (error) return error;

  try {
    const { id } = await params;
    await deleteGlobalPrompt(session!.user.id, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to delete prompt";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
