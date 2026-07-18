"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import { TopicList } from "@/components/topic-list";
import type { TopicItem } from "@/components/topic-row";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCalled = useRef(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated" || loadCalled.current) return;
    loadCalled.current = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/topics");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load topics");
        setTopics(data.topics ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load topics");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [status]);

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

  if (status === "loading" || !session?.user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="relative flex items-center justify-center">
            <div className="h-12 w-12 rounded-full border-2 border-indigo-100 border-t-indigo-600 animate-spin" />
            <div className="absolute h-6 w-6 rounded-full bg-indigo-50 flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-indigo-600 animate-ping" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-zinc-950 tracking-tight">Verifying session…</p>
            <p className="text-xs font-medium text-zinc-400 mt-0.5">Please wait a moment</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppLayout
      user={session.user}
      onSync={() => void handleSync()}
      syncing={syncing}
    >
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
            Overview
          </p>
          <h1 className="text-2xl font-bold text-zinc-950 mt-0.5">
            Dashboard
          </h1>
        </div>
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-12 text-center text-sm text-zinc-500">
            Loading topics…
          </div>
        ) : (
          <TopicList topics={topics} onChange={setTopics} />
        )}
      </div>
    </AppLayout>
  );
}
