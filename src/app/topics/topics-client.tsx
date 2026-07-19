"use client";

import React, { useEffect, useState, useRef } from "react";
import { Plus, Pencil, Trash2, Calendar, Loader2, FolderPlus, Search } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { TopicIdea } from "@/lib/ideas";
import { ChevronDown, Filter } from "lucide-react";

type FilterType = "all" | "created" | "pending";

const FILTER_OPTIONS = [
  { value: "all", label: "All topics" },
  { value: "created", label: "Folders created in drive" },
  { value: "pending", label: "Topics added in list" },
] as const;

function TopicsFilterSelect({
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
        className="flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 hover:border-zinc-300 cursor-pointer dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
      >
        <Filter className="h-3.5 w-3.5 text-zinc-400" />
        <span className="hidden sm:inline">Filter: {current.label}</span>
        <span className="sm:hidden">{current.label}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-zinc-400 transition", open && "rotate-180")} />
      </button>

      {open && (
        <ul className="absolute right-0 top-[calc(100%+0.25rem)] z-20 w-56 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
          {FILTER_OPTIONS.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center px-3 py-2.5 text-left text-xs font-medium transition hover:bg-zinc-50 cursor-pointer dark:hover:bg-zinc-900",
                  option.value === value ? "bg-indigo-50 text-indigo-700 font-semibold dark:bg-indigo-900/30 dark:text-indigo-400" : "text-zinc-700 dark:text-zinc-300"
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
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
};

export function TopicsClient({ user }: Props) {
  const [ideas, setIdeas] = useState<TopicIdea[]>([]);
  const [topicsCount, setTopicsCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const syncCalled = useRef(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "created" | "pending">("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Modals / Actions states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [renameModalOpen, setRenameModalOpen] = useState<{ id: string; title: string } | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState<{ id: string; title: string } | null>(null);
  const [convertModalOpen, setConvertModalOpen] = useState<{ id: string; title: string } | null>(null);

  // Input states
  const [newTitle, setNewTitle] = useState("");
  const [renameTitle, setRenameTitle] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (syncCalled.current) return;
    syncCalled.current = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Trigger folder sync automatically on mount
        const syncRes = await fetch("/api/topics/sync", { method: "POST" });
        const syncData = await syncRes.json();
        
        // Fetch ideas list after sync finishes
        const ideasRes = await fetch("/api/topics/ideas");
        const ideasData = await ideasRes.json();
        
        if (!syncRes.ok) throw new Error(syncData.error || "Failed to sync folders");
        if (!ideasRes.ok) throw new Error(ideasData.error || "Failed to load ideas");
        
        setIdeas(ideasData.ideas ?? []);
        setTopicsCount(syncData.topics ? syncData.topics.length : 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load workspace");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  async function handleAdd() {
    if (!newTitle.trim()) return;
    setActionBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/topics/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add idea");
      setIdeas((prev) => [data.idea, ...prev]);
      setNewTitle("");
      setAddModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add idea");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleRename() {
    if (!renameModalOpen || !renameTitle.trim()) return;
    setActionBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/topics/ideas/${renameModalOpen.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: renameTitle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to rename idea");
      setIdeas((prev) =>
        prev.map((idea) => (idea.id === renameModalOpen.id ? data.idea : idea))
      );
      setRenameTitle("");
      setRenameModalOpen(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename idea");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleDelete() {
    if (!deleteModalOpen) return;
    setActionBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/topics/ideas/${deleteModalOpen.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete idea");
      setIdeas((prev) => prev.filter((idea) => idea.id !== deleteModalOpen.id));
      setDeleteModalOpen(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete idea");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleConvert() {
    if (!convertModalOpen) return;
    setActionBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/topics/ideas/${convertModalOpen.id}/convert`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create folder");

      // Update the converted idea with the newly created drive folder ID
      setIdeas((prev) =>
        prev.map((idea) =>
          idea.id === convertModalOpen.id ? { ...idea, driveFolderId: data.folderId } : idea
        )
      );
      setTopicsCount((prev) => (prev !== null ? prev + 1 : 1));
      setConvertModalOpen(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create folder");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/topics/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");
      
      // Reload ideas since syncing might have updated drive_folder_id in public.topic_ideas
      const ideasRes = await fetch("/api/topics/ideas");
      const ideasData = await ideasRes.json();
      if (!ideasRes.ok) throw new Error(ideasData.error || "Failed to load ideas");
      
      setIdeas(ideasData.ideas ?? []);
      setTopicsCount(data.topics ? data.topics.length : 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  // Filter logic
  const filteredIdeas = ideas.filter((idea) => {
    const matchesSearch = idea.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "created" && idea.driveFolderId !== null) ||
      (filterStatus === "pending" && idea.driveFolderId === null);
    return matchesSearch && matchesFilter;
  });

  // Pagination logic
  const itemsPerPage = 50;
  const totalPages = Math.ceil(filteredIdeas.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedIdeas = filteredIdeas.slice(startIndex, startIndex + itemsPerPage);

  return (
    <AppLayout
      user={user}
      onSync={() => void handleSync()}
      syncing={syncing}
    >
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        {/* Folder Count Pill (Above Topic list header) */}
        {topicsCount !== null && (
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-500 bg-white border border-zinc-200/80 rounded-xl px-3 py-1.5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
            <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
            <span>Total Folders in Drive:</span>
            <span className="font-extrabold text-zinc-950 dark:text-zinc-50">{topicsCount}</span>
          </div>
        )}

        {/* Top Header Bar */}
        <div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-zinc-50 truncate">
                Topics List
              </h1>
              <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                {ideas.length} Total
              </span>
            </div>

            <button
              type="button"
              onClick={() => setAddModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-500 cursor-pointer shadow-sm shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Add Topic</span>
              <span className="sm:hidden">Add Topic</span>
            </button>
          </div>
          <p className="text-[11px] sm:text-xs font-medium text-zinc-400 mt-1.5 leading-normal">
            Brainstorm and document your topic ideas before syncing them to Google Drive folders.
          </p>
        </div>

        {/* Search & Filters */}
        <div className="flex justify-end pt-2">
          <div className="flex items-center gap-2 max-w-md w-full sm:justify-end">
            {/* Search Input */}
            <div className="relative w-full max-w-[200px] sm:max-w-[240px]">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search topics..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-lg border border-zinc-200 bg-white py-1.5 pl-8 pr-3 text-xs font-medium text-zinc-800 placeholder-zinc-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
              />
            </div>

            {/* Status Select */}
            <TopicsFilterSelect
              value={filterStatus}
              onChange={(val) => {
                setFilterStatus(val);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {/* Content list */}
        {loading ? (
          <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-16 text-center text-sm text-zinc-400 font-medium flex items-center justify-center gap-2 dark:border-zinc-800 dark:bg-zinc-950">
            <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
            <span>Loading workspace…</span>
          </div>
        ) : filteredIdeas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
            <p className="font-semibold text-zinc-900 dark:text-zinc-100">No topics found</p>
            <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">
              Try adjusting your search query or filter status, or click the button above to add a new topic idea.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {paginatedIdeas.map((idea) => (
                <div
                  key={idea.id}
                  className="group relative rounded-2xl border border-zinc-200 bg-white p-3 sm:p-4 shadow-xs transition hover:shadow-sm hover:border-zinc-300 flex flex-col justify-between gap-2 sm:gap-4 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
                >
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-zinc-950 dark:text-zinc-50 break-words pr-12 dark:text-zinc-50">
                      {idea.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-medium mt-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Added {formatRelativeTime(idea.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between w-full mt-1 sm:mt-0">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setRenameModalOpen({ id: idea.id, title: idea.title });
                          setRenameTitle(idea.title);
                        }}
                        className="inline-flex items-center justify-center rounded-lg p-1.5 sm:p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition cursor-pointer dark:hover:bg-zinc-900 dark:hover:text-zinc-300"
                        title="Rename"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteModalOpen({ id: idea.id, title: idea.title })}
                        className="inline-flex items-center justify-center rounded-lg p-1.5 sm:p-2 text-zinc-400 hover:bg-zinc-100 hover:text-red-600 transition cursor-pointer dark:hover:bg-zinc-900"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {idea.driveFolderId ? (
                      <span className="inline-flex items-center gap-1 rounded-lg px-2 py-1 sm:px-2.5 sm:py-1 text-[10px] sm:text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400">
                        <FolderPlus className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Folder created in drive</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConvertModalOpen({ id: idea.id, title: idea.title })}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 sm:px-2.5 sm:py-1 text-[10px] sm:text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition cursor-pointer dark:text-indigo-400 dark:hover:bg-indigo-950/50"
                        title="Create Folder in Drive"
                      >
                        <FolderPlus className="h-3.5 w-3.5" />
                        <span>Create folder in Drive</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-zinc-200 pt-4">
                <div className="text-xs text-zinc-500 font-medium">
                  Showing <span className="font-semibold text-zinc-900 dark:text-zinc-100">{startIndex + 1}</span> to{" "}
                  Showing <span className="font-semibold text-zinc-900 dark:text-zinc-100">{startIndex + 1}</span> to{" "}
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {Math.min(startIndex + itemsPerPage, filteredIdeas.length)}
                  </span>{" "}
                  of <span className="font-semibold text-zinc-900 dark:text-zinc-100">{filteredIdeas.length}</span> ideas
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 border border-zinc-200 bg-white rounded-xl text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
                  >
                    Previous
                  </button>
                  <span className="text-xs font-semibold text-zinc-700 px-1 dark:text-zinc-300">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 border border-zinc-200 bg-white rounded-xl text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Add Modal */}
        {addModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs transition-opacity"
              onClick={() => setAddModalOpen(false)}
            />
            <div className="relative bg-white rounded-2xl border border-zinc-200 p-5 max-w-sm w-full shadow-2xl flex flex-col gap-4 z-50 dark:border-zinc-800 dark:bg-zinc-950">
              <div>
                <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50">Add Topic Idea</h3>
                <p className="text-xs font-medium text-zinc-500 mt-1">
                  Enter a brainstorming concept or title for this topic.
                </p>
              </div>

              <textarea
                placeholder="Topic idea..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                disabled={actionBusy}
                rows={3}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 placeholder-zinc-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
              />

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => {
                    setAddModalOpen(false);
                    setNewTitle("");
                  }}
                  className="px-3.5 py-2 border border-zinc-200 bg-white hover:bg-zinc-50 rounded-xl text-xs font-semibold text-zinc-700 transition cursor-pointer disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionBusy || !newTitle.trim()}
                  onClick={handleAdd}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {actionBusy ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rename Modal */}
        {renameModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs transition-opacity"
              onClick={() => setRenameModalOpen(null)}
            />
            <div className="relative bg-white rounded-2xl border border-zinc-200 p-5 max-w-sm w-full shadow-2xl flex flex-col gap-4 z-50 dark:border-zinc-800 dark:bg-zinc-950">
              <div>
                <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50">Rename Topic Idea</h3>
                <p className="text-xs font-medium text-zinc-500 mt-1">
                  Enter the new title for this topic.
                </p>
              </div>

              <textarea
                placeholder="New title..."
                value={renameTitle}
                onChange={(e) => setRenameTitle(e.target.value)}
                disabled={actionBusy}
                rows={3}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 placeholder-zinc-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
              />

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => setRenameModalOpen(null)}
                  className="px-3.5 py-2 border border-zinc-200 bg-white hover:bg-zinc-50 rounded-xl text-xs font-semibold text-zinc-700 transition cursor-pointer disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionBusy || !renameTitle.trim()}
                  onClick={handleRename}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {actionBusy ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {deleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs transition-opacity"
              onClick={() => setDeleteModalOpen(null)}
            />
            <div className="relative bg-white rounded-2xl border border-zinc-200 p-5 max-w-sm w-full shadow-2xl flex flex-col gap-4 z-50 dark:border-zinc-800 dark:bg-zinc-950">
              <div>
                <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50">Delete Topic Idea</h3>
                <p className="text-xs font-medium text-zinc-500 mt-1">
                  Are you sure you want to delete <span className="font-semibold text-zinc-900 dark:text-zinc-100">&quot;{deleteModalOpen.title}&quot;</span>? This action is permanent.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => setDeleteModalOpen(null)}
                  className="px-3.5 py-2 border border-zinc-200 bg-white hover:bg-zinc-50 rounded-xl text-xs font-semibold text-zinc-700 transition cursor-pointer disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={handleDelete}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {actionBusy ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Convert to Drive Folder Modal */}
        {convertModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs transition-opacity"
              onClick={() => setConvertModalOpen(null)}
            />
            <div className="relative bg-white rounded-2xl border border-zinc-200 p-5 max-w-sm w-full shadow-2xl flex flex-col gap-4 z-50 dark:border-zinc-800 dark:bg-zinc-950">
              <div>
                <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50">Create Drive Folder</h3>
                <p className="text-xs font-medium text-zinc-500 mt-1">
                  This will create a new folder named <span className="font-semibold text-zinc-900 dark:text-zinc-100">&quot;{convertModalOpen.title}&quot;</span> inside your root topics directory in Google Drive. Confirm?
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => setConvertModalOpen(null)}
                  className="px-3.5 py-2 border border-zinc-200 bg-white hover:bg-zinc-50 rounded-xl text-xs font-semibold text-zinc-700 transition cursor-pointer disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={handleConvert}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  {actionBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {actionBusy ? "Creating…" : "Create"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
