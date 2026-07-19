import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { getGlobalPrompts, createGlobalPrompt } from "@/lib/prompts";

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  try {
    const prompts = await getGlobalPrompts(session!.user.id);
    return NextResponse.json({ prompts });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load prompts";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  try {
    const { title, content } = await request.json();
    if (typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const prompt = await createGlobalPrompt(session!.user.id, title, content);
    return NextResponse.json({ prompt });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create prompt";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
