import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createTopicFolder } from "@/lib/drive";
import { randomUUID } from "crypto";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  try {
    const { id } = await params;
    const supabase = createAdminClient();

    // 1. Fetch the topic idea to get the title
    const { data: idea, error: ideaErr } = await supabase
      .from("topic_ideas")
      .select("*")
      .eq("id", id)
      .eq("user_id", session!.user.id)
      .single();

    if (ideaErr || !idea) {
      return NextResponse.json({ error: "Topic idea not found" }, { status: 404 });
    }

    // 2. Create the folder on Google Drive
    const driveFolder = await createTopicFolder(session!.user.id, idea.title);

    // 3. Find the next sort order for topics
    const { data: topics, error: topicsErr } = await supabase
      .from("topics")
      .select("sort_order")
      .eq("user_id", session!.user.id);
    
    if (topicsErr) throw new Error(topicsErr.message);

    const maxSort = (topics ?? []).reduce(
      (max: number, topic: { sort_order: number }) => Math.max(max, topic.sort_order),
      -1
    );
    const nextSort = maxSort + 1;
    const now = new Date().toISOString();

    // 4. Insert into the public.topics table
    const { error: insertErr } = await supabase
      .from("topics")
      .insert({
        id: randomUUID(),
        user_id: session!.user.id,
        drive_folder_id: driveFolder.id,
        drive_folder_name: driveFolder.name,
        sort_order: nextSort,
        last_synced_at: now,
        created_at: now,
        updated_at: now,
      });

    if (insertErr) throw new Error(insertErr.message);

    // 5. Update the topic_ideas table to record the created drive folder id instead of deleting
    const { error: updateErr } = await supabase
      .from("topic_ideas")
      .update({
        drive_folder_id: driveFolder.id,
        updated_at: now,
      })
      .eq("id", id)
      .eq("user_id", session!.user.id);

    if (updateErr) throw new Error(updateErr.message);

    return NextResponse.json({ success: true, folderId: driveFolder.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to convert topic idea to Drive folder";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
