"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { usePageTransition, TransitionLink } from "./providers";
import { signOut } from "next-auth/react";
import { Menu, X, LayoutDashboard, Folder, LogOut, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import icon from "@/app/icon.png";
import { ThemeToggle } from "./theme-toggle";

type Props = {
  children: React.ReactNode;
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  onSync?: () => void;
  syncing?: boolean;
};

export function AppLayout({ children, user, onSync, syncing }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { isPending } = usePageTransition();

  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  function handleSignOut() {
    setShowSignOutConfirm(true);
  }

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Topics", href: "/topics", icon: Folder },
  ];

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-white px-4 py-6 border-r border-zinc-200 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="space-y-6">
        {/* Brand logo */}
        <div className="flex items-center justify-between">
          <TransitionLink href="/dashboard" className="flex items-center gap-2">
            <img src={icon.src} alt="Logo" className="h-7 w-7 shrink-0 rounded-md object-contain" />
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
                Weeklinks
              </span>
              <span className="text-base font-extrabold text-zinc-950 dark:text-zinc-50 dark:text-zinc-50">
                Topic Tracker
              </span>
            </div>
          </TransitionLink>
          <button
            type="button"
            className="lg:hidden p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 cursor-pointer"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>



        {/* Nav Links */}
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <TransitionLink
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-xl transition cursor-pointer",
                  isActive
                    ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-400 dark:text-zinc-500")} />
                {item.name}
              </TransitionLink>
            );
          })}
        </nav>
      </div>

      {/* User profile details & Sign out */}
      <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt=""
              className="h-9 w-9 rounded-full ring-2 ring-zinc-100 dark:ring-zinc-800"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-extrabold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
              {(user.name ?? user.email ?? "?").slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-zinc-950 dark:text-zinc-50 dark:text-zinc-50">
              {user.name ?? "User"}
            </p>
            <p className="truncate text-xs font-medium text-zinc-400 dark:text-zinc-500">
              {user.email}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 px-3 py-2 text-sm font-semibold text-zinc-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer dark:text-zinc-400 dark:hover:bg-red-950/30 dark:hover:text-red-400"
        >
          <LogOut className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-50 flex dark:bg-zinc-950">
      {/* Permanent sidebar for Desktop */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 z-20">
        {sidebarContent}
      </div>

      {/* Mobile Drawer (Slide-over) with slide and fade transitions */}
      <div
        className={cn(
          "fixed inset-0 z-40 flex lg:hidden transition-opacity duration-300 ease-in-out",
          sidebarOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
      >
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-zinc-900/40 backdrop-blur-xs dark:bg-zinc-950/80"
          onClick={() => setSidebarOpen(false)}
        />
        {/* Drawer container */}
        <div
          className={cn(
            "relative flex w-full max-w-xs flex-1 flex-col z-50 transform transition-transform duration-300 ease-in-out",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {sidebarContent}
        </div>
      </div>

      {/* Main viewport */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Unified Top Header Bar */}
        <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-4 shrink-0 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="lg:hidden p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 cursor-pointer dark:hover:bg-zinc-900 dark:text-zinc-400"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-1.5">
              <img src={icon.src} alt="Logo" className="h-6 w-6 shrink-0 rounded-md object-contain lg:hidden" />
              <div className="flex flex-col lg:hidden">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-600 leading-none dark:text-indigo-400">
                  Weeklinks
                </span>
                <span className="text-xs font-bold text-zinc-950 dark:text-zinc-50 mt-0.5 dark:text-zinc-50">
                  Topic Tracker
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Sync from Drive Button */}
            {onSync && (
              <button
                type="button"
                onClick={onSync}
                disabled={syncing}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 text-xs font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer dark:bg-indigo-600 dark:hover:bg-indigo-500"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
                <span className="hidden sm:inline">
                  {syncing ? "Syncing…" : "Sync from Drive"}
                </span>
              </button>
            )}

            {/* Profile Avatar/Name (Visible on Desktop only) */}
            <div className="hidden h-9 items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 lg:flex dark:border-zinc-800 dark:bg-zinc-900">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt=""
                  className="h-6 w-6 rounded-full"
                />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                  {(user.name ?? user.email ?? "?").slice(0, 1).toUpperCase()}
                </div>
              )}
              <span className="max-w-[100px] truncate text-xs text-zinc-700 font-medium dark:text-zinc-300 pr-1">
                {user.name ?? user.email}
              </span>
            </div>

            <ThemeToggle />

            {/* Sign Out Button (Visible on both mobile/desktop header) */}
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 cursor-pointer dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
              aria-label="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>

        {/* Content body */}
        <main className="flex-1 overflow-y-auto">
          {isPending ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center animate-pulse">
              <div className="relative flex items-center justify-center">
                <div className="h-12 w-12 rounded-full border-2 border-indigo-100 border-t-indigo-600 animate-spin" />
                <div className="absolute h-6 w-6 rounded-full bg-indigo-50 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-indigo-600 animate-ping" />
                </div>
              </div>
              <p className="text-sm font-bold text-zinc-950 dark:text-zinc-50 mt-4 tracking-tight">
                Loading workspace
              </p>
              <p className="text-xs text-zinc-400 mt-1 max-w-[240px] font-medium leading-normal">
                Preparing your topics and resources, please wait...
              </p>
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      {/* Custom Premium Sign Out Confirmation Modal */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs transition-opacity duration-300 dark:bg-zinc-950/80"
            onClick={() => setShowSignOutConfirm(false)}
          />
          {/* Modal Container */}
          <div className="relative bg-white rounded-2xl border border-zinc-200 p-5 max-w-sm w-full shadow-2xl flex flex-col gap-4 z-50 transform transition-all duration-300 scale-100 dark:border-zinc-800 dark:bg-zinc-950">
            <div>
              <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50 dark:text-zinc-50">Sign Out</h3>
              <p className="text-xs font-medium text-zinc-500 mt-1 dark:text-zinc-400">
                Are you sure you want to sign out of Weeklinks? You will need to log back in to access your topics.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowSignOutConfirm(false)}
                className="px-3.5 py-2 border border-zinc-200 bg-white hover:bg-zinc-50 rounded-xl text-xs font-semibold text-zinc-700 transition cursor-pointer dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSignOutConfirm(false);
                  void signOut({ callbackUrl: "/login" });
                }}
                className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
