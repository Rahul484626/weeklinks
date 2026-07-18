import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTopicForUser } from "@/lib/topics";
import { createTopicFolder } from "@/lib/drive";

export async function POST(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  try {
    const body = await request.json();
    const { action, ids } = body as { action: string; ids: string[] };

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No ids provided" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const userId = session!.user.id;

    if (action === "delete") {
      const { error: delErr } = await supabase.from("topics").delete().in("id", ids).eq("user_id", userId);
      if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (action === "createFolder") {
      // For each topic without a drive folder, create one and update the topic
      for (const id of ids) {
        const topic = await getTopicForUser(userId, id);
        if (!topic) continue;
        if (topic.driveFolderId) continue; // already has folder
        const name = topic.displayName || topic.driveFolderName || `Topic-${id}`;
        try {
          const folder = await createTopicFolder(userId, name);
          const now = new Date().toISOString();
          const { error: updErr } = await supabase
            .from("topics")
            .update({ drive_folder_id: folder.id, drive_folder_name: folder.name, updated_at: now })
            .eq("id", id)
            .eq("user_id", userId);
          if (updErr) throw new Error(updErr.message);
        } catch (err) {
          console.error("Failed to create folder for topic", id, err);
        }
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Bulk action failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
