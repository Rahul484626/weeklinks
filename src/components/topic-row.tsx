"use client";

import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { EyeOff, GripVertical, Pencil } from "lucide-react";
import { cn, topicDisplayName } from "@/lib/utils";

export type TopicItem = {
  id: string;
  driveFolderId: string;
  driveFolderName: string;
  displayName: string | null;
  sortOrder: number;
  isHidden: boolean;
  isCompleted: boolean;
  isArchived: boolean;
  completedAt: string | Date | null;
};

type Props = {
  topic: TopicItem;
  busy?: boolean;
  onToggleComplete: () => void;
  onRename: () => void;
  onToggleHidden: () => void;
};

export function TopicRow({
  topic,
  busy,
  onToggleComplete,
  onRename,
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

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-3 shadow-sm",
        isDragging && "z-10 shadow-lg ring-2 ring-indigo-200",
        topic.isCompleted && "bg-zinc-50",
        topic.isArchived && "border-amber-200 bg-amber-50/50",
        busy && "opacity-70",
      )}
    >
      <button
        type="button"
        className="cursor-grab touch-none rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 active:cursor-grabbing"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <input
        type="checkbox"
        checked={topic.isCompleted}
        onChange={onToggleComplete}
        disabled={busy}
        className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
        aria-label={`Mark ${name} complete`}
      />

      <Link
        href={`/topics/${topic.id}`}
        className={cn(
          "min-w-0 flex-1 truncate text-sm font-medium text-zinc-900 hover:text-indigo-700",
          topic.isCompleted && "text-zinc-500 line-through",
        )}
      >
        {name}
      </Link>

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
        {topic.displayName && (
          <span
            className="hidden max-w-[120px] truncate text-[11px] text-zinc-400 sm:inline"
            title={`Drive: ${topic.driveFolderName}`}
          >
            Drive: {topic.driveFolderName}
          </span>
        )}

        <button
          type="button"
          onClick={onRename}
          disabled={busy}
          className="rounded-lg p-1.5 text-zinc-400 opacity-100 transition hover:bg-zinc-100 hover:text-zinc-700 sm:opacity-0 sm:group-hover:opacity-100"
          title="Rename in app"
          aria-label="Rename topic"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onToggleHidden}
          disabled={busy}
          className="rounded-lg p-1.5 text-zinc-400 opacity-100 transition hover:bg-zinc-100 hover:text-zinc-700 sm:opacity-0 sm:group-hover:opacity-100"
          title={topic.isHidden ? "Unhide topic" : "Hide topic"}
          aria-label={topic.isHidden ? "Unhide topic" : "Hide topic"}
        >
          <EyeOff className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}
