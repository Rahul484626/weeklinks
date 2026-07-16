import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { listTopicFolders } from "@/lib/drive";

type TopicRow = {
  id: string;
  user_id: string;
  drive_folder_id: string;
  drive_folder_name: string;
  display_name: string | null;
  sort_order: number;
  is_hidden: boolean;
  is_completed: boolean;
  is_in_progress: boolean;
  is_ready_to_pickup: boolean;
  is_archived: boolean;
  completed_at: string | null;
  last_synced_at: string;
  created_at: string;
  updated_at: string;
};

export type Topic = {
  id: string;
  userId: string;
  driveFolderId: string;
  driveFolderName: string;
  displayName: string | null;
  sortOrder: number;
  isHidden: boolean;
  isCompleted: boolean;
  isInProgress: boolean;
  isReadyToPickup: boolean;
  isArchived: boolean;
  completedAt: string | null;
  lastSyncedAt: string;
  createdAt: string;
  updatedAt: string;
};

function rowToTopic(row: TopicRow): Topic {
  return {
    id: row.id,
    userId: row.user_id,
    driveFolderId: row.drive_folder_id,
    driveFolderName: row.drive_folder_name,
    displayName: row.display_name,
    sortOrder: row.sort_order,
    isHidden: row.is_hidden,
    isCompleted: row.is_completed,
    isInProgress: row.is_in_progress,
    isReadyToPickup: row.is_ready_to_pickup,
    isArchived: row.is_archived,
    completedAt: row.completed_at,
    lastSyncedAt: row.last_synced_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getTopicsForUser(userId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("topics")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("drive_folder_name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as TopicRow[]).map(rowToTopic);
}

export async function syncTopicsFromDrive(userId: string) {
  const folders = await listTopicFolders(userId);
  const existing = await getTopicsForUser(userId);
  const existingByDriveId = new Map(
    existing.map((topic) => [topic.driveFolderId, topic]),
  );

  const maxSort =
    existing.reduce((max, topic) => Math.max(max, topic.sortOrder), -1) + 1;
  let nextSort = maxSort;
  const now = new Date().toISOString();
  const seenIds = new Set<string>();
  const supabase = createAdminClient();

  for (const folder of folders) {
    seenIds.add(folder.id);
    const current = existingByDriveId.get(folder.id);

    if (current) {
      const { error } = await supabase
        .from("topics")
        .update({
          drive_folder_name: folder.name,
          is_archived: false,
          last_synced_at: now,
          updated_at: now,
        })
        .eq("id", current.id);

      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("topics").insert({
        id: randomUUID(),
        user_id: userId,
        drive_folder_id: folder.id,
        drive_folder_name: folder.name,
        sort_order: nextSort,
        last_synced_at: now,
        updated_at: now,
      });

      if (error) throw new Error(error.message);
      nextSort += 1;
    }
  }

  const missing = existing.filter(
    (topic) => !seenIds.has(topic.driveFolderId) && !topic.isArchived,
  );

  if (missing.length > 0) {
    const { error } = await supabase
      .from("topics")
      .update({
        is_archived: true,
        last_synced_at: now,
        updated_at: now,
      })
      .in(
        "id",
        missing.map((t) => t.id),
      );

    if (error) throw new Error(error.message);
  }

  return getTopicsForUser(userId);
}

export type TopicPatch = {
  isCompleted?: boolean;
  isInProgress?: boolean;
  isReadyToPickup?: boolean;
  displayName?: string | null;
  sortOrder?: number;
  isHidden?: boolean;
};

export async function updateTopic(
  userId: string,
  topicId: string,
  patch: TopicPatch,
) {
  const topic = await getTopicForUser(userId, topicId);
  if (!topic) return null;

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof patch.isCompleted === "boolean") {
    updates.is_completed = patch.isCompleted;
    updates.completed_at = patch.isCompleted ? new Date().toISOString() : null;
    if (patch.isCompleted) {
      updates.is_in_progress = false;
      updates.is_ready_to_pickup = false;
    }
  }

  if (typeof patch.isInProgress === "boolean") {
    updates.is_in_progress = patch.isInProgress;
    if (patch.isInProgress) {
      updates.is_completed = false;
      updates.completed_at = null;
      updates.is_ready_to_pickup = false;
    }
  }

  if (typeof patch.isReadyToPickup === "boolean") {
    updates.is_ready_to_pickup = patch.isReadyToPickup;
    if (patch.isReadyToPickup) {
      updates.is_completed = false;
      updates.completed_at = null;
      updates.is_in_progress = false;
    }
  }

  if (patch.displayName !== undefined) {
    const trimmed = patch.displayName?.trim() ?? "";
    updates.display_name = trimmed.length > 0 ? trimmed : null;
  }

  if (typeof patch.sortOrder === "number") {
    updates.sort_order = patch.sortOrder;
  }

  if (typeof patch.isHidden === "boolean") {
    updates.is_hidden = patch.isHidden;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("topics")
    .update(updates)
    .eq("id", topicId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return rowToTopic(data as TopicRow);
}

export async function reorderTopics(userId: string, orderedIds: string[]) {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from("topics")
        .update({ sort_order: index, updated_at: now })
        .eq("id", id)
        .eq("user_id", userId),
    ),
  );

  return getTopicsForUser(userId);
}

export async function getTopicForUser(userId: string, topicId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("topics")
    .select("*")
    .eq("id", topicId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return rowToTopic(data as TopicRow);
}
