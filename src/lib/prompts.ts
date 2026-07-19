import { createAdminClient } from "@/lib/supabase/admin";
import { randomUUID } from "crypto";

export type GlobalPrompt = {
  id: string;
  userId: string;
  title: string;
  content: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type PromptRow = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

function rowToPrompt(row: PromptRow): GlobalPrompt {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    content: row.content,
    sortOrder: row.sort_order,
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
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as PromptRow[]).map(rowToPrompt);
}

export async function createGlobalPrompt(
  userId: string,
  title: string,
  content: string
): Promise<GlobalPrompt> {
  const supabase = createAdminClient();
  
  // Find max sort_order to append new prompt at the end
  const { data: maxData } = await supabase
    .from("global_prompts")
    .select("sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: false })
    .limit(1);

  let nextSort = 0;
  if (maxData && maxData.length > 0) {
    nextSort = (maxData[0].sort_order ?? 0) + 1;
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("global_prompts")
    .insert({
      id: randomUUID(),
      user_id: userId,
      title: title.trim(),
      content: content.trim(),
      sort_order: nextSort,
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

export async function reorderGlobalPrompts(
  userId: string,
  orderedIds: string[]
): Promise<GlobalPrompt[]> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const promises = orderedIds.map((id, index) =>
    supabase
      .from("global_prompts")
      .update({ sort_order: index, updated_at: now })
      .eq("id", id)
      .eq("user_id", userId)
  );

  await Promise.all(promises);
  return getGlobalPrompts(userId);
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
