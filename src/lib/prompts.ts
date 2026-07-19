import { createAdminClient } from "@/lib/supabase/admin";
import { randomUUID } from "crypto";

export type GlobalPrompt = {
  id: string;
  userId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

type PromptRow = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

function rowToPrompt(row: PromptRow): GlobalPrompt {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getGlobalPrompts(userId: string): Promise<GlobalPrompt[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("global_prompts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as PromptRow[]).map(rowToPrompt);
}

export async function createGlobalPrompt(
  userId: string,
  title: string,
  content: string
): Promise<GlobalPrompt> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("global_prompts")
    .insert({
      id: randomUUID(),
      user_id: userId,
      title: title.trim(),
      content: content.trim(),
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return rowToPrompt(data as PromptRow);
}

export async function updateGlobalPrompt(
  userId: string,
  id: string,
  title: string,
  content: string
): Promise<GlobalPrompt> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("global_prompts")
    .update({
      title: title.trim(),
      content: content.trim(),
      updated_at: now,
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return rowToPrompt(data as PromptRow);
}

export async function deleteGlobalPrompt(userId: string, id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("global_prompts")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}
