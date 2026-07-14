"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { TopicList } from "@/components/topic-list";
import type { TopicItem } from "@/components/topic-row";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;

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
      <div className="flex min-h-screen items-center justify-center text-sm text-zinc-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <AppHeader
        user={session.user}
        onSync={() => void handleSync()}
        syncing={syncing}
      />

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-zinc-900">Your topics</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Check off finished videos, rename or hide topics in the app, and open
            a folder to manage Drive files.
          </p>
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
      </main>
    </div>
  );
}
