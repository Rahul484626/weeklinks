import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { syncTopicsFromDrive } from "@/lib/topics";

export async function POST() {
  const { session, error } = await requireSession();
  if (error) return error;

  try {
    const topics = await syncTopicsFromDrive(session!.user.id);
    return NextResponse.json({ topics });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to sync topics from Drive";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
