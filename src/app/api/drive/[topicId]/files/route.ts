import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { getTopicForUser } from "@/lib/topics";
import { listFolderFiles } from "@/lib/drive";

type Params = { params: Promise<{ topicId: string }> };

export async function GET(request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { topicId } = await params;
  const topic = await getTopicForUser(session!.user.id, topicId);

  if (!topic) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const targetFolderId = searchParams.get("folderId") || topic.driveFolderId;

  try {
    const files = await listFolderFiles(
      session!.user.id,
      targetFolderId,
    );
    return NextResponse.json({ topic, files });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to list Drive files";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
