import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { reorderTopics, updateTopic } from "@/lib/topics";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();

  if (Array.isArray(body.orderedIds)) {
    const topics = await reorderTopics(session!.user.id, body.orderedIds);
    return NextResponse.json({ topics });
  }

  const topic = await updateTopic(session!.user.id, id, {
    isCompleted: body.isCompleted,
    displayName: body.displayName,
    sortOrder: body.sortOrder,
    isHidden: body.isHidden,
  });

  if (!topic) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  return NextResponse.json({ topic });
}
