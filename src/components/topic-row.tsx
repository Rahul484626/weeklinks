"use client";

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
        "group flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-2 py-2 shadow-sm sm:px-3 sm:py-3",
        isDragging && "z-10 shadow-lg ring-2 ring-indigo-200",
        topic.isCompleted && "border-zinc-300 bg-zinc-50",
        topic.isInProgress && "border-sky-200 bg-sky-50/60",
        topic.isReadyToPickup && "border-emerald-200 bg-emerald-50/60",
        topic.isArchived && "border-amber-200 bg-amber-50/50",
        busy && "opacity-70",
      )}
    >
      <button
        type="button"
        className="cursor-grab touch-none rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 active:cursor-grabbing"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <TopicStatusSelect
        value={status}
        busy={busy}
        onChange={onStatusChange}
      />

      <div className="min-w-0 flex-1 flex flex-col">
        <TransitionLink
          href={`/topics/${topic.id}`}
          className={cn(
            "truncate text-sm font-medium text-zinc-900 hover:text-indigo-700",
            topic.isCompleted && "text-zinc-500 line-through",
            topic.isInProgress && !topic.isCompleted && "text-sky-900",
            topic.isReadyToPickup && !topic.isCompleted && "text-emerald-900",
          )}
        >
          {name}
        </TransitionLink>
        {topic.updatedAt && (
          <span className="text-[11px] text-zinc-400">
            Updated {formatRelativeTime(topic.updatedAt)}
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {topic.isArchived && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
            Missing
          </span>
        )}
        {topic.isHidden && (
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
            Hidden
          </span>
        )}


        <button
          type="button"
          onClick={onToggleHidden}
          disabled={busy}
          className="rounded-lg p-2 text-zinc-400 opacity-100 transition hover:bg-zinc-100 hover:text-zinc-700 sm:p-1.5 sm:opacity-0 sm:group-hover:opacity-100"
          title={topic.isHidden ? "Unhide topic" : "Hide topic"}
          aria-label={topic.isHidden ? "Unhide topic" : "Hide topic"}
        >
          <EyeOff className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}
