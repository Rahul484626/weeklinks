"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { TopicRow, type TopicItem } from "@/components/topic-row";
import { topicStatusToPatch } from "@/components/topic-status-select";
import { cn } from "@/lib/utils";
import { FileText, CheckCircle, Clock, Circle, Filter, ChevronDown, Package, Search } from "lucide-react";

export type FilterType = "all" | "completed" | "in_progress" | "ready_to_pickup" | "none" | "hidden";

const FILTER_OPTIONS = [
  { value: "all", label: "Show All" },
  { value: "completed", label: "Completed" },
  { value: "in_progress", label: "In Progress" },
  { value: "ready_to_pickup", label: "Ready to Pickup" },
  { value: "none", label: "Not Started" },
  { value: "hidden", label: "Hidden" },
] as const;

function TopicFilterSelect({
  value,
  onChange,
}: {
  value: FilterType;
  onChange: (val: FilterType) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleDown(e: MouseEvent | TouchEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleDown);
    document.addEventListener("touchstart", handleDown);
    return () => {
      document.removeEventListener("mousedown", handleDown);
      document.removeEventListener("touchstart", handleDown);
    };
  }, [open]);

  const current = FILTER_OPTIONS.find((o) => o.value === value) || FILTER_OPTIONS[0];

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 hover:border-zinc-300 cursor-pointer"
      >
        <Filter className="h-3.5 w-3.5 text-zinc-400" />
        <span>Filter: {current.label}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-zinc-400 transition", open && "rotate-180")} />
      </button>

      {open && (
        <ul className="absolute right-0 top-[calc(100%+0.25rem)] z-20 w-48 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
          {FILTER_OPTIONS.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center px-3 py-2.5 text-left text-xs font-medium transition hover:bg-zinc-50 cursor-pointer",
                  option.value === value ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-zinc-700"
                )}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type Props = {
  topics: TopicItem[];
  onChange: (topics: TopicItem[]) => void;
  enableLongPressSelection?: boolean;
};

export function TopicList({ topics, onChange, enableLongPressSelection = false }: Props) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const selectionMode = selectedIds.size > 0;

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const visible = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return topics.filter((topic) => {
      if (query.length > 0) {
        const name = (topic.displayName || topic.driveFolderName).toLowerCase();
        if (!name.includes(query)) {
          return false;
        }
      }
      if (filter === "hidden") {
        return topic.isHidden;
      }
      if (topic.isHidden) {
        return false;
      }
      if (filter === "all") {
        return true;
      }
      if (filter === "completed") {
        return topic.isCompleted;
      }
      if (filter === "in_progress") {
        return topic.isInProgress;
      }
      if (filter === "ready_to_pickup") {
        return topic.isReadyToPickup;
      }
      if (filter === "none") {
        return !topic.isCompleted && !topic.isInProgress && !topic.isReadyToPickup;
      }
      return true;
    });
  }, [topics, filter, searchQuery]);

  const totalPages = Math.ceil(visible.length / itemsPerPage);

  const paginatedVisible = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return visible.slice(start, start + itemsPerPage);
  }, [visible, currentPage]);

  const completedCount = topics.filter(
    (t) => t.isCompleted && !t.isArchived,
  ).length;
  const inProgressCount = topics.filter(
    (t) => t.isInProgress && !t.isCompleted && !t.isArchived,
  ).length;
  const readyCount = topics.filter(
    (t) => t.isReadyToPickup && !t.isCompleted && !t.isArchived,
  ).length;
  const notStartedCount = topics.filter(
    (t) => !t.isCompleted && !t.isInProgress && !t.isReadyToPickup && !t.isArchived,
  ).length;
  const activeCount = topics.filter((t) => !t.isArchived).length;

  async function patchTopic(
    id: string,
    body: Record<string, unknown>,
  ): Promise<TopicItem | null> {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/topics/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Update failed");
      }
      if (data.topics) {
        onChange(data.topics);
        return null;
      }
      const updated = data.topic as TopicItem;
      onChange(topics.map((t) => (t.id === updated.id ? updated : t)));
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
      return null;
    } finally {
      setBusyId(null);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = topics.findIndex((t) => t.id === active.id);
    const newIndex = topics.findIndex((t) => t.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(topics, oldIndex, newIndex).map(
      (topic, index) => ({ ...topic, sortOrder: index }),
    );
    onChange(reordered);

    const res = await fetch(`/api/topics/${active.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: reordered.map((t) => t.id) }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to save order");
    } else {
      const data = await res.json();
      if (data.topics) onChange(data.topics);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(visible.map((t) => t.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function bulkAction(action: "delete" | "createFolder") {
    if (selectedIds.size === 0) return;
    setError(null);
    try {
      const res = await fetch(`/api/topics/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids: Array.from(selectedIds) }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bulk action failed");
      // refresh topics
      const getRes = await fetch(`/api/topics`);
      const getData = await getRes.json();
      if (getRes.ok && getData.topics) {
        onChange(getData.topics);
      }
      clearSelection();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk action failed");
    }
  }

  return (
    <div className="space-y-6">
      {/* Progress Tracking Card with Gauge */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-zinc-900 sm:text-3xl">{completedCount}</span>
              <span className="text-sm font-semibold text-zinc-400">/</span>
              <span className="text-sm font-semibold text-zinc-500">{activeCount}</span>
            </div>
            <p className="mt-0.5 text-xs font-semibold text-zinc-400 uppercase tracking-wide">
              Topics Completed
            </p>
            <div className="mt-3.5 h-2 w-full max-w-[160px] overflow-hidden rounded-full bg-zinc-100 sm:max-w-xs">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-700 ease-out"
                style={{ width: `${Math.round((completedCount / (activeCount || 1)) * 100)}%` }}
              />
            </div>
          </div>

          {/* Circular Progress Gauge */}
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center sm:h-16 sm:w-16">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 64 64">
              <circle
                cx="32"
                cy="32"
                r="26"
                className="stroke-zinc-100 fill-none"
                strokeWidth="4"
              />
              <circle
                cx="32"
                cy="32"
                r="26"
                className="stroke-indigo-600 fill-none transition-all duration-700 ease-out"
                strokeWidth="4.5"
                strokeDasharray="163.3"
                strokeDashoffset={163.3 - (163.3 * Math.round((completedCount / (activeCount || 1)) * 100)) / 100}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-[11px] font-bold text-zinc-950 sm:text-xs">
              {Math.round((completedCount / (activeCount || 1)) * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Stats Cards Grid - Responsive layout matching filters */}
      <div className="grid grid-cols-5 gap-1 sm:gap-3">
        {/* Total Topics */}
        <div className="rounded-lg border border-zinc-200 bg-white p-1.5 shadow-sm flex flex-col items-center text-center sm:flex-row sm:justify-between sm:text-left sm:p-4 sm:rounded-xl">
          <div className="flex flex-col items-center sm:items-start order-2 sm:order-1 mt-1 sm:mt-0">
            <p className="text-xs font-bold text-zinc-950 sm:text-2xl sm:font-extrabold">{activeCount}</p>
            <p className="text-[9px] font-semibold text-zinc-400 uppercase tracking-wider sm:text-xs sm:mt-0.5">Total</p>
          </div>
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-50 text-indigo-600 order-1 sm:order-2 sm:h-10 sm:w-10 sm:rounded-xl">
            <FileText className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
          </div>
        </div>

        {/* Completed */}
        <div className="rounded-lg border border-zinc-200 bg-white p-1.5 shadow-sm flex flex-col items-center text-center sm:flex-row sm:justify-between sm:text-left sm:p-4 sm:rounded-xl">
          <div className="flex flex-col items-center sm:items-start order-2 sm:order-1 mt-1 sm:mt-0">
            <p className="text-xs font-bold text-zinc-950 sm:text-2xl sm:font-extrabold">{completedCount}</p>
            <p className="text-[9px] font-semibold text-zinc-400 uppercase tracking-wider sm:text-xs sm:mt-0.5">
              <span className="hidden sm:inline">Completed</span>
              <span className="inline sm:hidden">Done</span>
            </p>
          </div>
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 order-1 sm:order-2 sm:h-10 sm:w-10 sm:rounded-xl">
            <CheckCircle className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
          </div>
        </div>

        {/* In Progress */}
        <div className="rounded-lg border border-zinc-200 bg-white p-1.5 shadow-sm flex flex-col items-center text-center sm:flex-row sm:justify-between sm:text-left sm:p-4 sm:rounded-xl">
          <div className="flex flex-col items-center sm:items-start order-2 sm:order-1 mt-1 sm:mt-0">
            <p className="text-xs font-bold text-zinc-950 sm:text-2xl sm:font-extrabold">{inProgressCount}</p>
            <p className="text-[9px] font-semibold text-zinc-400 uppercase tracking-wider sm:text-xs sm:mt-0.5">
              <span className="hidden sm:inline">In Progress</span>
              <span className="inline sm:hidden">Active</span>
            </p>
          </div>
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-50 text-sky-600 order-1 sm:order-2 sm:h-10 sm:w-10 sm:rounded-xl">
            <Clock className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
          </div>
        </div>

        {/* Ready to Pickup */}
        <div className="rounded-lg border border-zinc-200 bg-white p-1.5 shadow-sm flex flex-col items-center text-center sm:flex-row sm:justify-between sm:text-left sm:p-4 sm:rounded-xl">
          <div className="flex flex-col items-center sm:items-start order-2 sm:order-1 mt-1 sm:mt-0">
            <p className="text-xs font-bold text-zinc-950 sm:text-2xl sm:font-extrabold">{readyCount}</p>
            <p className="text-[9px] font-semibold text-zinc-400 uppercase tracking-wider sm:text-xs sm:mt-0.5">
              <span className="hidden sm:inline">Ready to Pickup</span>
              <span className="inline sm:hidden">Ready</span>
            </p>
          </div>
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-50 text-amber-600 order-1 sm:order-2 sm:h-10 sm:w-10 sm:rounded-xl">
            <Package className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
          </div>
        </div>

        {/* Not Started */}
        <div className="rounded-lg border border-zinc-200 bg-white p-1.5 shadow-sm flex flex-col items-center text-center sm:flex-row sm:justify-between sm:text-left sm:p-4 sm:rounded-xl">
          <div className="flex flex-col items-center sm:items-start order-2 sm:order-1 mt-1 sm:mt-0">
            <p className="text-xs font-bold text-zinc-950 sm:text-2xl sm:font-extrabold">{notStartedCount}</p>
            <p className="text-[9px] font-semibold text-zinc-400 uppercase tracking-wider sm:text-xs sm:mt-0.5">
              <span className="hidden sm:inline">Not Started</span>
              <span className="inline sm:hidden">Pending</span>
            </p>
          </div>
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-50 text-zinc-500 order-1 sm:order-2 sm:h-10 sm:w-10 sm:rounded-xl">
            <Circle className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-zinc-800 shrink-0">
          Topics List
        </p>

        <div className="flex flex-1 items-center gap-2 max-w-md sm:justify-end">
          {/* Search Input */}
          <div className="relative w-full max-w-[200px] sm:max-w-[240px]">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white py-1.5 pl-8 pr-3 text-xs font-medium text-zinc-800 placeholder-zinc-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <TopicFilterSelect value={filter} onChange={setFilter} />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {paginatedVisible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center">
          <p className="font-medium text-zinc-900">No topics to show</p>
          <p className="mt-1 text-sm text-zinc-500">
            Click <span className="font-medium">Sync from Drive</span> to pull
            your topic folders, or adjust the filters above.
          </p>
        </div>
      ) : (
        <>
          {selectionMode && (
            <div className="mb-3 flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-zinc-900">{selectedIds.size} selected</span>
                <button type="button" onClick={selectAll} className="text-xs text-zinc-700 hover:underline">Select all</button>
                <button type="button" onClick={clearSelection} className="text-xs text-zinc-700 hover:underline">Clear</button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm(`Delete ${selectedIds.size} selected topics? This cannot be undone.`)) return;
                    await bulkAction("delete");
                  }}
                  className="rounded bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={async () => await bulkAction("createFolder")}
                  className="rounded bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  Add folder to Drive
                </button>
              </div>
            </div>
          )}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={paginatedVisible.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-2">
                {paginatedVisible.map((topic) => (
                  <TopicRow
                    key={topic.id}
                    topic={topic}
                    busy={busyId === topic.id}
                    onStatusChange={(status) =>
                      patchTopic(topic.id, topicStatusToPatch(status))
                    }
                    onToggleHidden={() =>
                      patchTopic(topic.id, { isHidden: !topic.isHidden })
                    }
                    // selection props
                    selectable={selectionMode}
                    selected={selectedIds.has(topic.id)}
                    onSelectToggle={() => toggleSelect(topic.id)}
                    enableLongPressSelection={enableLongPressSelection}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-zinc-200 bg-white px-4 py-3 sm:px-6 rounded-2xl shadow-sm mt-4">
              <div className="flex flex-1 items-center justify-between sm:hidden">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 cursor-pointer"
                >
                  Previous
                </button>
                <span className="text-xs font-semibold text-zinc-500">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 cursor-pointer"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-zinc-700">
                    Showing <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                    <span className="font-semibold">{Math.min(currentPage * itemsPerPage, visible.length)}</span> of{" "}
                    <span className="font-semibold">{visible.length}</span> results
                  </p>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center rounded-l-md px-2 py-2 text-zinc-400 ring-1 ring-inset ring-zinc-300 hover:bg-zinc-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 cursor-pointer"
                    >
                      <span className="sr-only">Previous</span>
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                      </svg>
                    </button>
                    {Array.from({ length: totalPages }).map((_, i) => {
                      const p = i + 1;
                      const active = p === currentPage;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setCurrentPage(p)}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-zinc-300 focus:z-20 focus:outline-offset-0 cursor-pointer",
                            active
                              ? "z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ring-indigo-600"
                              : "text-zinc-950 hover:bg-zinc-50"
                          )}
                        >
                          {p}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center rounded-r-md px-2 py-2 text-zinc-400 ring-1 ring-inset ring-zinc-300 hover:bg-zinc-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 cursor-pointer"
                    >
                      <span className="sr-only">Next</span>
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
