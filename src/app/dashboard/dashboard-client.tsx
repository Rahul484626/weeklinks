"use client";

import { useEffect, useState, useRef } from "react";
import { AppLayout } from "@/components/app-layout";
import { TopicList } from "@/components/topic-list";
import type { TopicItem } from "@/components/topic-row";

type Props = {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
};

export function DashboardClient({ user }: Props) {
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCalled = useRef(false);

  useEffect(() => {
    if (loadCalled.current) return;
    loadCalled.current = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/topics/sync", { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to sync topics");
        setTopics(data.topics ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load topics");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  async function handleSync() {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/topics/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");
      setTopics(data.topics ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <AppLayout
      user={user}
      onSync={() => void handleSync()}
      syncing={syncing}
    >
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
            Overview
          </p>
          <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-50 mt-0.5 dark:text-zinc-50">
            Dashboard
          </h1>
        </div>
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-12 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
            Loading topics…
          </div>
        ) : (
          <TopicList topics={topics} onChange={setTopics} />
        )}
      </div>
    </AppLayout>
  );
}
