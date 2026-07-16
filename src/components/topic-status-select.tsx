"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Circle,
  Package,
  PlayCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type TopicStatus = "none" | "completed" | "in_progress" | "ready_to_pickup";

type StatusOption = {
  value: TopicStatus;
  label: string;
  icon: LucideIcon;
  triggerClassName: string;
  optionClassName: string;
};

const STATUS_OPTIONS: StatusOption[] = [
  {
    value: "none",
    label: "Not started",
    icon: Circle,
    triggerClassName: "text-zinc-600",
    optionClassName: "text-zinc-700",
  },
  {
    value: "in_progress",
    label: "In progress",
    icon: PlayCircle,
    triggerClassName: "text-sky-700",
    optionClassName: "text-sky-700",
  },
  {
    value: "ready_to_pickup",
    label: "Ready to pickup",
    icon: Package,
    triggerClassName: "text-emerald-700",
    optionClassName: "text-emerald-700",
  },
  {
    value: "completed",
    label: "Completed",
    icon: Check,
    triggerClassName: "text-indigo-700",
    optionClassName: "text-indigo-700",
  },
];

function getStatusOption(status: TopicStatus) {
  return STATUS_OPTIONS.find((option) => option.value === status) ?? STATUS_OPTIONS[0];
}

type Props = {
  value: TopicStatus;
  busy?: boolean;
  onChange: (status: TopicStatus) => void;
};

export function TopicStatusSelect({ value, busy, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = getStatusOption(value);
  const CurrentIcon = current.icon;

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [open]);

  function handleSelect(next: TopicStatus) {
    setOpen(false);
    if (next !== value) onChange(next);
  }

  return (
    <div
      ref={rootRef}
      className="relative shrink-0"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        disabled={busy}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Status: ${current.label}`}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex min-h-11 min-w-[9.5rem] items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-left text-xs font-medium shadow-sm transition sm:min-h-9 sm:min-w-[10.5rem] sm:text-sm",
          "hover:border-zinc-300 hover:bg-zinc-50 active:bg-zinc-50",
          current.triggerClassName,
          busy && "pointer-events-none opacity-70",
        )}
      >
        <CurrentIcon className="h-4 w-4 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1 truncate">{current.label}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-zinc-400 transition",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Topic status"
          className="absolute left-0 top-[calc(100%+0.25rem)] z-20 w-full min-w-[11rem] overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
        >
          {STATUS_OPTIONS.map((option) => {
            const Icon = option.icon;
            const selected = option.value === value;

            return (
              <li key={option.value} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    "flex w-full min-h-11 items-center gap-2 px-3 py-2.5 text-left text-sm transition sm:min-h-9 sm:py-2",
                    "hover:bg-zinc-50 active:bg-zinc-100",
                    selected && "bg-zinc-50 font-medium",
                    option.optionClassName,
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span>{option.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function topicStatusFromItem(topic: {
  isCompleted: boolean;
  isInProgress: boolean;
  isReadyToPickup: boolean;
}): TopicStatus {
  if (topic.isCompleted) return "completed";
  if (topic.isInProgress) return "in_progress";
  if (topic.isReadyToPickup) return "ready_to_pickup";
  return "none";
}

export function topicStatusToPatch(status: TopicStatus) {
  return {
    isCompleted: status === "completed",
    isInProgress: status === "in_progress",
    isReadyToPickup: status === "ready_to_pickup",
  };
}
