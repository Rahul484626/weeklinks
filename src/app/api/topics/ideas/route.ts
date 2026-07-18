import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { getTopicIdeas, createTopicIdea } from "@/lib/ideas";

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  try {
    const ideas = await getTopicIdeas(session!.user.id);
    return NextResponse.json({ ideas });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load ideas";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  try {
    const { title } = await request.json();
    if (typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const idea = await createTopicIdea(session!.user.id, title);
    return NextResponse.json({ idea });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create idea";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
