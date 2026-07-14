import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { getTopicsForUser } from "@/lib/topics";

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  const topics = await getTopicsForUser(session!.user.id);
  return NextResponse.json({ topics });
}
