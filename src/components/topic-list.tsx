"use client";

import { useMemo, useState } from "react";
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
import { topicDisplayName } from "@/lib/utils";

type Props = {
  topics: TopicItem[];
  onChange: (topics: TopicItem[]) => void;
};

export function TopicList({ topics, onChange }: Props) {
  const [showCompleted, setShowCompleted] = useState(true);
  const [showHidden, setShowHidden] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const visible = useMemo(() => {
    return topics.filter((topic) => {
      if (!showCompleted && topic.isCompleted) return false;
      if (!showHidden && topic.isHidden) return false;
      if (!showArchived && topic.isArchived) return false;
      return true;
    });
  }, [topics, showCompleted, showHidden, showArchived]);

  const completedCount = topics.filter(
    (t) => t.isCompleted && !t.isArchived,
  ).length;
  const inProgressCount = topics.filter(
    (t) => t.isInProgress && !t.isCompleted && !t.isArchived,
  ).length;
  const readyCount = topics.filter(
    (t) => t.isReadyToPickup && !t.isCompleted && !t.isArchived,
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-600">
          <span className="font-semibold text-zinc-900">
            {completedCount}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-zinc-900">{activeCount}</span>{" "}
          topics completed
          {(inProgressCount > 0 || readyCount > 0) && (
            <span className="mt-1 block text-xs text-zinc-500 sm:mt-0 sm:inline sm:before:content-['·_']">
              {inProgressCount > 0 && (
                <span>{inProgressCount} in progress</span>
              )}
              {inProgressCount > 0 && readyCount > 0 && ", "}
              {readyCount > 0 && <span>{readyCount} ready to pickup</span>}
            </span>
          )}
        </p>

        <div className="flex flex-wrap gap-3 text-sm text-zinc-600">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="rounded border-zinc-300"
            />
            Show completed
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={showHidden}
              onChange={(e) => setShowHidden(e.target.checked)}
              className="rounded border-zinc-300"
            />
            Show hidden
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded border-zinc-300"
            />
            Show missing from Drive
          </label>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center">
          <p className="font-medium text-zinc-900">No topics to show</p>
          <p className="mt-1 text-sm text-zinc-500">
            Click <span className="font-medium">Sync from Drive</span> to pull
            your topic folders, or adjust the filters above.
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={visible.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-2">
              {visible.map((topic) => (
                <TopicRow
                  key={topic.id}
                  topic={topic}
                  busy={busyId === topic.id}
                  onToggleComplete={() =>
                    patchTopic(topic.id, {
                      isCompleted: !topic.isCompleted,
                    })
                  }
                  onToggleInProgress={() =>
                    patchTopic(topic.id, {
                      isInProgress: !topic.isInProgress,
                    })
                  }
                  onToggleReadyToPickup={() =>
                    patchTopic(topic.id, {
                      isReadyToPickup: !topic.isReadyToPickup,
                    })
                  }
                  onRename={async () => {
                    const current = topicDisplayName(topic);
                    const next = window.prompt("Display name", current);
                    if (next === null) return;
                    await patchTopic(topic.id, { displayName: next });
                  }}
                  onToggleHidden={() =>
                    patchTopic(topic.id, { isHidden: !topic.isHidden })
                  }
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
