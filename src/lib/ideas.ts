import { createAdminClient } from "@/lib/supabase/admin";
import { randomUUID } from "crypto";

export type TopicIdea = {
  id: string;
  userId: string;
  title: string;
  driveFolderId: string | null;
  createdAt: string;
  updatedAt: string;
};

type IdeaRow = {
  id: string;
  user_id: string;
  title: string;
  drive_folder_id?: string | null;
  created_at: string;
  updated_at: string;
};

function rowToIdea(row: IdeaRow): TopicIdea {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    driveFolderId: row.drive_folder_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getTopicIdeas(userId: string): Promise<TopicIdea[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("topic_ideas")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as IdeaRow[]).map(rowToIdea);
}

export async function createTopicIdea(userId: string, title: string): Promise<TopicIdea> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("topic_ideas")
    .insert({
      id: randomUUID(),
      user_id: userId,
      title: title.trim(),
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return rowToIdea(data as IdeaRow);
}

export async function updateTopicIdea(userId: string, id: string, title: string): Promise<TopicIdea> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("topic_ideas")
    .update({
      title: title.trim(),
      updated_at: now,
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return rowToIdea(data as IdeaRow);
}

export async function deleteTopicIdea(userId: string, id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("topic_ideas")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}
