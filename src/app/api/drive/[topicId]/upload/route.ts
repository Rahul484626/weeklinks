import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { getTopicForUser } from "@/lib/topics";
import { replaceFileContent, uploadFileToFolder } from "@/lib/drive";

const MAX_UPLOAD_BYTES =
  Number(process.env.MAX_UPLOAD_MB ?? 500) * 1024 * 1024;

type Params = { params: Promise<{ topicId: string }> };

export async function POST(request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { topicId } = await params;
  const topic = await getTopicForUser(session!.user.id, topicId);

  if (!topic) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    const conflictAction = form.get("conflictAction");
    const replaceFileId = form.get("replaceFileId");
    const targetName = form.get("targetName");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        {
          error: `File exceeds max size of ${process.env.MAX_UPLOAD_MB ?? 500} MB`,
        },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "application/octet-stream";

    if (conflictAction === "replace") {
      if (typeof replaceFileId !== "string" || !replaceFileId.trim()) {
        return NextResponse.json(
          { error: "replaceFileId is required to replace a file" },
          { status: 400 },
        );
      }

      const uploaded = await replaceFileContent(
        session!.user.id,
        replaceFileId,
        { mimeType, buffer },
      );
      return NextResponse.json({ file: uploaded, action: "replace" });
    }

    const uploadName =
      typeof targetName === "string" && targetName.trim()
        ? targetName.trim()
        : file.name;

    const folderId = form.get("folderId");
    const targetFolderId =
      typeof folderId === "string" && folderId.trim()
        ? folderId.trim()
        : topic.driveFolderId;

    const uploaded = await uploadFileToFolder(
      session!.user.id,
      targetFolderId,
      {
        name: uploadName,
        mimeType,
        buffer,
      },
    );

    return NextResponse.json({
      file: uploaded,
      action: conflictAction === "rename" ? "rename" : "create",
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to upload file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
