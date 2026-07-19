"use client";

import React, { useRef } from "react";
import { TransitionLink } from "./providers";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { EyeOff, GripVertical } from "lucide-react";
import {
  TopicStatusSelect,
  topicStatusFromItem,
  type TopicStatus,
} from "@/components/topic-status-select";
import { cn, topicDisplayName, formatRelativeTime } from "@/lib/utils";

export type TopicItem = {
  id: string;
  driveFolderId: string;
  driveFolderName: string;
  displayName: string | null;
  sortOrder: number;
  isHidden: boolean;
  isCompleted: boolean;
  isInProgress: boolean;
  isReadyToPickup: boolean;
  isArchived: boolean;
  completedAt: string | Date | null;
  updatedAt?: string;
};

type Props = {
  topic: TopicItem;
  busy?: boolean;
  onStatusChange: (status: TopicStatus) => void;
  onToggleHidden: () => void;
};

export function TopicRow({
  topic,
  busy,
  onStatusChange,
  onToggleHidden,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: topic.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const name = topicDisplayName(topic);
  const status = topicStatusFromItem(topic);


  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-2 py-2 shadow-sm sm:px-3 sm:py-3 dark:border-zinc-800 dark:bg-zinc-950",
        isDragging && "z-10 shadow-lg ring-2 ring-indigo-200 dark:ring-indigo-900",
        topic.isCompleted && "border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/50",
        topic.isInProgress && "border-sky-200 bg-sky-50/60 dark:border-sky-900/50 dark:bg-sky-900/20",
        topic.isReadyToPickup && "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-900/20",
        topic.isArchived && "border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-900/20",
        busy && "opacity-70",
      )}
    >
      <button
        type="button"
        className="cursor-grab touch-none rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 active:cursor-grabbing dark:hover:bg-zinc-900 dark:hover:text-zinc-300"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <TopicStatusSelect value={status} busy={busy} onChange={onStatusChange} />



      <div className="min-w-0 flex-1 flex flex-col">
          <TransitionLink
            href={`/topics/${topic.id}`}
            className={cn(
              "truncate text-sm font-medium text-zinc-900 hover:text-indigo-700 dark:text-zinc-100 dark:hover:text-indigo-400",
              topic.isCompleted && "text-zinc-500 line-through dark:text-zinc-500",
              topic.isInProgress && !topic.isCompleted && "text-sky-900 dark:text-sky-300",
              topic.isReadyToPickup && !topic.isCompleted && "text-emerald-900 dark:text-emerald-300",
            )}
          >
            {name}
          </TransitionLink>
        {topic.updatedAt && (
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500">Updated {formatRelativeTime(topic.updatedAt)}</span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {topic.isArchived && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-950/50 dark:text-amber-400">
            Missing
          </span>
        )}
        {topic.isHidden && (
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            Hidden
          </span>
        )}

        <button
          type="button"
          onClick={onToggleHidden}
          disabled={busy}
          className="rounded-lg p-2 text-zinc-400 opacity-100 transition hover:bg-zinc-100 hover:text-zinc-700 sm:p-1.5 sm:opacity-0 sm:group-hover:opacity-100 dark:hover:bg-zinc-900 dark:hover:text-zinc-300"
          title={topic.isHidden ? "Unhide topic" : "Hide topic"}
          aria-label={topic.isHidden ? "Unhide topic" : "Hide topic"}
        >
          <EyeOff className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}
