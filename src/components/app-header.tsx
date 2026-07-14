"use client";

import { signOut } from "next-auth/react";
import { LogOut, RefreshCw } from "lucide-react";

type Props = {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  onSync: () => void;
  syncing: boolean;
};

export function AppHeader({ user, onSync, syncing }: Props) {
  return (
    <header className="border-b border-zinc-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
            Weeklinks
          </p>
          <h1 className="text-lg font-semibold text-zinc-900">
            Topic Tracker
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">
              {syncing ? "Syncing…" : "Sync from Drive"}
            </span>
          </button>

          <div className="hidden items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 sm:flex">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt=""
                className="h-7 w-7 rounded-full"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                {(user.name ?? user.email ?? "?").slice(0, 1).toUpperCase()}
              </div>
            )}
            <span className="max-w-[140px] truncate text-sm text-zinc-700">
              {user.name ?? user.email}
            </span>
          </div>

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
