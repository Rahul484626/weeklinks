"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  Copy,
  Check,
  Pencil,
  Trash2,
  ChevronDown,
  Search,
  Sparkles,
  Loader2,
  AlertCircle,
  GripVertical
} from "lucide-react";
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
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AppLayout } from "@/components/app-layout";
import { cn } from "@/lib/utils";

type PromptItem = {
  id: string;
  title: string;
  content: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
};

const DEFAULT_PROMPTS = [
  {
    title: "AI Video Script Polisher",
    content: "You are an expert video producer and scriptwriter. Please review this draft script and polish it for clarity, conversational flow, and high viewer engagement. Keep sentences relatively short, maintain an informative yet approachable tone, and suggest visual cues or slide transitions in square brackets [like this]. Here is the draft:\n\n[Insert draft script here]",
  },
  {
    title: "SEO Title & Meta Generator",
    content: "You are an SEO expert and copywriter. Generate 5 high-converting, click-worthy video titles (under 60 characters) and a compelling YouTube meta description (under 150 characters) targeting the primary keyword: [keyword] and supporting topic: [topic]. Ensure they sound natural, engaging, and maximize CTR.",
  },
  {
    title: "Video Production Asset Spec",
    content: "You are an automation specialist. Design a neat document specification for organizing video production folders in Google Drive. Define standard folder naming conventions (e.g. 01_footage, 02_audio, 03_graphics, 04_final_renders) and create a checklist of pre-production assets that must be uploaded before video editing can begin.",
  },
];

export function GlobalPromptsClient({ user }: Props) {
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Accordion state - stores IDs of expanded prompts
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Modal / action state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState<PromptItem | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState<PromptItem | null>(null);

  // Form input state
  const [promptTitle, setPromptTitle] = useState("");
  const [promptContent, setPromptContent] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Copy success state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // DnD Sensors config
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch prompts on mount
  useEffect(() => {
    let active = true;

    async function loadPrompts() {
      try {
        const res = await fetch("/api/prompts");
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || "Failed to load prompts");
        }

        if (!active) return;

        // Auto-seed defaults if database is empty
        if (data.prompts && data.prompts.length === 0) {
          const seeded = await seedDefaultPrompts();
          if (active) {
            setPrompts(seeded);
          }
        } else {
          setPrompts(data.prompts || []);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load prompts from database");
        }
      } finally {
        if (active) {
          setLoaded(true);
        }
      }
    }

    void loadPrompts();

    return () => {
      active = false;
    };
  }, []);

  // Helper to seed defaults to the database
  const seedDefaultPrompts = async (): Promise<PromptItem[]> => {
    try {
      const promises = DEFAULT_PROMPTS.map(async (dp) => {
        const res = await fetch("/api/prompts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: dp.title, content: dp.content }),
        });
        if (res.ok) {
          const data = await res.json();
          return data.prompt as PromptItem;
        }
        return null;
      });
      const results = await Promise.all(promises);
      return results.filter((p): p is PromptItem => p !== null);
    } catch (err) {
      console.error("Failed to seed default prompts", err);
      return [];
    }
  };

  // Toggle accordion collapse/expand
  const toggleAccordion = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Add prompt handler
  const handleAddPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptTitle.trim() || !promptContent.trim()) return;

    setActionBusy(true);
    setActionError(null);

    try {
      const res = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: promptTitle, content: promptContent }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to create prompt");
      }

      setPrompts([...prompts, data.prompt]); // Add to the end (since it has higher sortOrder)
      setAddModalOpen(false);
      setPromptTitle("");
      setPromptContent("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to create prompt");
    } finally {
      setActionBusy(false);
    }
  };

  // Edit prompt handler
  const handleEditPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalOpen || !promptTitle.trim() || !promptContent.trim()) return;

    setActionBusy(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/prompts/${editModalOpen.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: promptTitle, content: promptContent }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update prompt");
      }

      setPrompts(prompts.map((item) => (item.id === editModalOpen.id ? data.prompt : item)));
      setEditModalOpen(null);
      setPromptTitle("");
      setPromptContent("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update prompt");
    } finally {
      setActionBusy(false);
    }
  };

  // Delete prompt handler
  const handleDeletePrompt = async () => {
    if (!deleteModalOpen) return;

    setActionBusy(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/prompts/${deleteModalOpen.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete prompt");
      }

      setPrompts(prompts.filter((item) => item.id !== deleteModalOpen.id));
      setDeleteModalOpen(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete prompt");
    } finally {
      setActionBusy(false);
    }
  };

  // Drag reorder handler
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = prompts.findIndex((p) => p.id === active.id);
    const newIndex = prompts.findIndex((p) => p.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(prompts, oldIndex, newIndex);
    // Instant state update for tactile feedback
    setPrompts(reordered);

    try {
      const res = await fetch(`/api/prompts/${active.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: reordered.map((p) => p.id) }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save order");
      }

      const data = await res.json();
      if (data.prompts) {
        setPrompts(data.prompts);
      }
    } catch (err) {
      console.error("Reorder saving failed", err);
      // Fallback display error or reload
    }
  };

  // Copy content to clipboard
  const handleCopyPrompt = async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => {
        setCopiedId(null);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  // Open Add modal
  const openAddModal = () => {
    setPromptTitle("");
    setPromptContent("");
    setActionError(null);
    setAddModalOpen(true);
  };

  // Open Edit modal
  const openEditModal = (item: PromptItem) => {
    setPromptTitle(item.title);
    setPromptContent(item.content);
    setActionError(null);
    setEditModalOpen(item);
  };

  // Filter prompts based on search query
  const filteredPrompts = prompts.filter((p) => {
    const q = searchQuery.toLowerCase();
    return p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q);
  });

  const isDbMissing = error && (
    error.toLowerCase().includes("relation") || 
    error.toLowerCase().includes("table") || 
    error.toLowerCase().includes("column") ||
    error.toLowerCase().includes("does not exist")
  );

  return (
    <AppLayout user={user}>
      <div className="mx-auto max-w-4xl px-4 py-5 sm:py-6 space-y-4">
        {/* Title, Add Button & Search Row */}
        <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div className="min-w-0">
            <div className="flex items-center justify-between sm:justify-start gap-4">
              <h1 className="text-lg sm:text-xl font-extrabold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>Global prompts</span>
              </h1>
              {/* Add Prompt Button (Mobile Only) */}
              <button
                type="button"
                onClick={openAddModal}
                disabled={!!isDbMissing}
                className="inline-flex sm:hidden h-8.5 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 text-[11px] font-semibold text-white shadow-xs transition hover:bg-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed dark:bg-indigo-600 dark:hover:bg-indigo-500 shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add prompt</span>
              </button>
            </div>
            <p className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 mt-1 hidden sm:block">
              Store and copy your frequently used system prompts, directives, and specifications.
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* Search Input */}
            {!isDbMissing && (
              <div className="relative flex-1 sm:w-60">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search prompts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={!loaded}
                  className="w-full rounded-xl border border-zinc-200 bg-white pl-8 pr-3 py-1.5 text-xs font-medium text-zinc-800 placeholder-zinc-400 shadow-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:placeholder-zinc-500"
                />
              </div>
            )}

            {/* Add Prompt Button (Desktop/Tablet) */}
            <button
              type="button"
              onClick={openAddModal}
              disabled={!!isDbMissing}
              className="hidden sm:inline-flex h-8.5 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 text-[11px] font-semibold text-white shadow-xs transition hover:bg-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed dark:bg-indigo-600 dark:hover:bg-indigo-500 shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add prompt</span>
            </button>
          </div>
        </div>

        {/* SQL Setup Migration Required Warning Banner */}
        {isDbMissing && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 dark:bg-amber-950/20 dark:border-amber-900/40">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  Database Setup Required
                </h4>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 leading-relaxed">
                  The DB table or the required <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono text-[11px] dark:bg-amber-950/60">sort_order</code> column is missing. Please open your **Supabase Dashboard SQL Editor**:
                  <br />
                  <span className="block mt-1">• **First Setup**: Copy and run the query script from <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono text-[11px] dark:bg-amber-950/60">supabase/add-global-prompts.sql</code>.</span>
                  <span className="block mt-1">• **Update existing table**: Run <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono text-[11px] dark:bg-amber-950/60">ALTER TABLE public.global_prompts ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;</code> to add the sort column.</span>
                </p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-2 font-medium">
                  Technical error: {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* General non-schema Error Banner */}
        {error && !isDbMissing && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-4 dark:bg-red-950/20 dark:border-red-900/40">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-red-900 dark:text-red-200">
                  Failed to fetch prompts
                </h4>
                <p className="text-xs text-red-700 dark:text-red-300 mt-1 leading-relaxed">
                  An error occurred while loading your global prompts from Supabase: {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Loader or Content */}
        {!loaded && !error ? (
          <div className="flex flex-col items-center justify-center py-16 animate-pulse">
            <Loader2 className="h-8 w-8 text-indigo-600 animate-spin dark:text-indigo-400" />
            <p className="text-xs text-zinc-400 mt-2 font-semibold">Loading prompts from database...</p>
          </div>
        ) : filteredPrompts.length === 0 && !error ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-950">
            <div className="rounded-full bg-indigo-50 p-3 dark:bg-indigo-900/30">
              <Sparkles className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="mt-4 text-sm font-bold text-zinc-950 dark:text-zinc-50">
              {searchQuery ? "No matches found" : "No prompts configured"}
            </h3>
            <p className="mt-1 text-xs text-zinc-500 max-w-xs leading-normal dark:text-zinc-400">
              {searchQuery
                ? "Try searching for a different keyword or view the full list."
                : "Create your first global prompt card to speed up your content writing and system workflows."}
            </p>
            {!searchQuery && (
              <button
                type="button"
                onClick={openAddModal}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 transition cursor-pointer dark:bg-indigo-600 dark:hover:bg-indigo-500"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Your First Prompt
              </button>
            )}
          </div>
        ) : (
          !isDbMissing && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={filteredPrompts.map((p) => p.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {filteredPrompts.map((item) => (
                    <SortablePromptRow
                      key={item.id}
                      item={item}
                      isExpanded={expandedIds.has(item.id)}
                      isCopied={copiedId === item.id}
                      toggleAccordion={toggleAccordion}
                      handleCopyPrompt={handleCopyPrompt}
                      openEditModal={openEditModal}
                      setDeleteModalOpen={setDeleteModalOpen}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )
        )}
      </div>

      {/* Add Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs transition-opacity"
            onClick={() => !actionBusy && setAddModalOpen(false)}
          />
          <form
            onSubmit={handleAddPrompt}
            className="relative bg-white rounded-2xl border border-zinc-200 p-5 max-w-lg w-full shadow-2xl flex flex-col gap-4 z-50 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div>
              <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                Add Global Prompt
              </h3>
              <p className="text-xs font-medium text-zinc-500 mt-1 dark:text-zinc-400">
                Create a reusable prompt template. Make templates user-friendly by using bracketed wildcards like [topic].
              </p>
            </div>

            {actionError && (
              <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-xs text-red-700 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{actionError}</span>
              </div>
            )}

            <div className="space-y-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  Prompt Title
                </label>
                <input
                  type="text"
                  required
                  disabled={actionBusy}
                  placeholder="e.g. Code Review Assistant"
                  value={promptTitle}
                  onChange={(e) => setPromptTitle(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-800 placeholder-zinc-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  Actual Prompt Content
                </label>
                <textarea
                  required
                  disabled={actionBusy}
                  placeholder="Paste or write the detailed prompt guidelines here..."
                  value={promptContent}
                  onChange={(e) => setPromptContent(e.target.value)}
                  rows={6}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-800 placeholder-zinc-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y min-h-[120px] dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => setAddModalOpen(false)}
                className="px-4 py-2 border border-zinc-200 bg-white hover:bg-zinc-50 rounded-xl text-xs font-semibold text-zinc-700 transition cursor-pointer disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionBusy || !promptTitle.trim() || !promptContent.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {actionBusy && <Loader2 className="h-3 w-3 animate-spin text-white" />}
                <span>{actionBusy ? "Saving..." : "Save Prompt"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs transition-opacity"
            onClick={() => !actionBusy && setEditModalOpen(null)}
          />
          <form
            onSubmit={handleEditPrompt}
            className="relative bg-white rounded-2xl border border-zinc-200 p-5 max-w-lg w-full shadow-2xl flex flex-col gap-4 z-50 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div>
              <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-1.5">
                <Pencil className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                Edit Prompt
              </h3>
              <p className="text-xs font-medium text-zinc-500 mt-1 dark:text-zinc-400">
                Modify your saved prompt configuration details.
              </p>
            </div>

            {actionError && (
              <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-xs text-red-700 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{actionError}</span>
              </div>
            )}

            <div className="space-y-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  Prompt Title
                </label>
                <input
                  type="text"
                  required
                  disabled={actionBusy}
                  placeholder="e.g. Code Review Assistant"
                  value={promptTitle}
                  onChange={(e) => setPromptTitle(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-800 placeholder-zinc-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  Actual Prompt Content
                </label>
                <textarea
                  required
                  disabled={actionBusy}
                  placeholder="Paste or write the detailed prompt guidelines here..."
                  value={promptContent}
                  onChange={(e) => setPromptContent(e.target.value)}
                  rows={6}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-800 placeholder-zinc-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y min-h-[120px] dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => setEditModalOpen(null)}
                className="px-4 py-2 border border-zinc-200 bg-white hover:bg-zinc-50 rounded-xl text-xs font-semibold text-zinc-700 transition cursor-pointer disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionBusy || !promptTitle.trim() || !promptContent.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {actionBusy && <Loader2 className="h-3 w-3 animate-spin text-white" />}
                <span>{actionBusy ? "Saving..." : "Save Changes"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs transition-opacity"
            onClick={() => !actionBusy && setDeleteModalOpen(null)}
          />
          <div className="relative bg-white rounded-2xl border border-zinc-200 p-5 max-w-sm w-full shadow-2xl flex flex-col gap-4 z-50 dark:border-zinc-800 dark:bg-zinc-950">
            <div>
              <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50">Delete Prompt</h3>
              <p className="text-xs font-medium text-zinc-500 mt-1 dark:text-zinc-400">
                Are you sure you want to permanently delete the prompt <span className="font-semibold text-zinc-900 dark:text-zinc-100">&quot;{deleteModalOpen.title}&quot;</span>? This cannot be undone.
              </p>
            </div>

            {actionError && (
              <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-xs text-red-700 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{actionError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => setDeleteModalOpen(null)}
                className="px-4 py-2 border border-zinc-200 bg-white hover:bg-zinc-50 rounded-xl text-xs font-semibold text-zinc-700 transition cursor-pointer disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionBusy}
                onClick={handleDeletePrompt}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                {actionBusy && <Loader2 className="h-3 w-3 animate-spin text-white" />}
                <span>{actionBusy ? "Deleting..." : "Delete Permanent"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function SortablePromptRow({
  item,
  isExpanded,
  isCopied,
  toggleAccordion,
  handleCopyPrompt,
  openEditModal,
  setDeleteModalOpen,
}: {
  item: PromptItem;
  isExpanded: boolean;
  isCopied: boolean;
  toggleAccordion: (id: string) => void;
  handleCopyPrompt: (id: string, content: string) => void;
  openEditModal: (item: PromptItem) => void;
  setDeleteModalOpen: (item: PromptItem) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "overflow-hidden rounded-xl border border-zinc-200 bg-white transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 shadow-xs",
        isDragging && "z-10 shadow-lg ring-2 ring-indigo-200 dark:ring-indigo-900"
      )}
    >
      {/* Accordion Header */}
      <div
        onClick={() => toggleAccordion(item.id)}
        className="flex cursor-pointer items-center justify-between p-4 select-none hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0 pr-4">
          {/* Drag Handle */}
          <button
            type="button"
            className="cursor-grab touch-none rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 active:cursor-grabbing dark:hover:bg-zinc-900 dark:hover:text-zinc-300 shrink-0"
            aria-label="Drag to reorder"
            onClick={(e) => e.stopPropagation()} // Prevent toggling accordion when clicking drag handle
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 break-words whitespace-normal">
            {item.title}
          </h3>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Copy Action */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCopyPrompt(item.id, item.content);
            }}
            className={cn(
              "inline-flex items-center justify-center rounded-lg p-1.5 transition border cursor-pointer",
              isCopied
                ? "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50"
                : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900 border-transparent"
            )}
            title="Copy prompt text"
          >
            {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {isCopied && <span className="text-[10px] font-bold ml-1 hidden sm:inline">Copied!</span>}
          </button>

          {/* Edit Action */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(item);
            }}
            className="inline-flex items-center justify-center rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition cursor-pointer dark:hover:bg-zinc-900 dark:hover:text-zinc-300 border border-transparent"
            title="Edit prompt"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>

          {/* Delete Action */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteModalOpen(item);
            }}
            className="inline-flex items-center justify-center rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-red-600 transition cursor-pointer dark:hover:bg-zinc-900 dark:hover:text-red-400 border border-transparent"
            title="Delete prompt"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>

          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />

          {/* Accordion Chevron */}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-zinc-400 transition-transform duration-200",
              isExpanded && "transform rotate-180 text-indigo-600 dark:text-indigo-400"
            )}
          />
        </div>
      </div>

      {/* Accordion Content */}
      {isExpanded && (
        <div className="border-t border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/10 flex flex-col gap-3">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => handleCopyPrompt(item.id, item.content)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition border cursor-pointer",
                isCopied
                  ? "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50"
                  : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-950 dark:text-zinc-300 dark:border-zinc-800 dark:hover:bg-zinc-900"
              )}
            >
              {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{isCopied ? "Copied Prompt" : "Copy Prompt Content"}</span>
            </button>
          </div>

          <pre className="whitespace-pre-wrap font-mono text-xs p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl dark:bg-zinc-900/50 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 select-text overflow-x-auto shadow-inner leading-relaxed">
            {item.content}
          </pre>
        </div>
      )}
    </div>
  );
}
