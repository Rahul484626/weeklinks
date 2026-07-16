"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, EyeOff, GripVertical, Package, Pencil, PlayCircle } from "lucide-react";
import { cn, topicDisplayName } from "@/lib/utils";

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
};

type Props = {
  topic: TopicItem;
  busy?: boolean;
  onToggleComplete: () => void;
  onToggleInProgress: () => void;
  onToggleReadyToPickup: () => void;
  onRename: () => void;
  onToggleHidden: () => void;
};

function StatusButton({
  active,
  busy,
  label,
  onClick,
  activeClassName,
  children,
}: {
  active: boolean;
  busy?: boolean;
  label: string;
  onClick: () => void;
  activeClassName: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "flex min-h-11 min-w-11 items-center justify-center rounded-md transition sm:min-h-9 sm:min-w-9",
        active
          ? activeClassName
          : "text-zinc-400 hover:bg-white hover:text-zinc-600 active:bg-white",
        busy && "pointer-events-none",
      )}
    >
      {children}
    </button>
  );
}

export function TopicRow({
  topic,
  busy,
  onToggleComplete,
  onToggleInProgress,
  onToggleReadyToPickup,
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

      <div
        className="flex shrink-0 items-center gap-0.5 rounded-lg border border-zinc-200 bg-zinc-50 p-0.5"
        role="group"
        aria-label="Topic status"
      >
        <StatusButton
          active={topic.isCompleted}
          busy={busy}
          label={topic.isCompleted ? "Mark not complete" : "Mark complete"}
          onClick={onToggleComplete}
          activeClassName="bg-indigo-100 text-indigo-700"
        >
          <Check className="h-4 w-4" strokeWidth={topic.isCompleted ? 2.5 : 2} />
        </StatusButton>

        <StatusButton
          active={topic.isInProgress}
          busy={busy}
          label={topic.isInProgress ? "Clear in progress" : "Mark in progress"}
          onClick={onToggleInProgress}
          activeClassName="bg-sky-100 text-sky-700"
        >
          <PlayCircle className="h-4 w-4" />
        </StatusButton>

        <StatusButton
          active={topic.isReadyToPickup}
          busy={busy}
          label={
            topic.isReadyToPickup ? "Clear ready to pickup" : "Mark ready to pickup"
          }
          onClick={onToggleReadyToPickup}
          activeClassName="bg-emerald-100 text-emerald-700"
        >
          <Package className="h-4 w-4" />
        </StatusButton>
      </div>

      <Link
        href={`/topics/${topic.id}`}
        className={cn(
          "min-w-0 flex-1 truncate text-sm font-medium text-zinc-900 hover:text-indigo-700",
          topic.isCompleted && "text-zinc-500 line-through",
          topic.isInProgress && !topic.isCompleted && "text-sky-900",
          topic.isReadyToPickup && !topic.isCompleted && "text-emerald-900",
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
        {topic.isInProgress && !topic.isCompleted && (
          <span className="hidden rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-800 sm:inline">
            In progress
          </span>
        )}
        {topic.isReadyToPickup && !topic.isCompleted && (
          <span className="hidden rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 sm:inline">
            Ready
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
          className="rounded-lg p-2 text-zinc-400 opacity-100 transition hover:bg-zinc-100 hover:text-zinc-700 sm:p-1.5 sm:opacity-0 sm:group-hover:opacity-100"
          title="Rename in app"
          aria-label="Rename topic"
        >
          <Pencil className="h-4 w-4" />
        </button>
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
