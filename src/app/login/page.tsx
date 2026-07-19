import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginButton } from "@/components/login-button";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const error = params.error;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-zinc-100 px-4 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-8 shadow-xl shadow-indigo-100/60 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-600 dark:text-indigo-400">
            Weeklinks
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            AI video topic tracker
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Track completed topics, sync folders from Google Drive, and manage
            scripts and videos in one place.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
            {error === "AccessDenied" ? (
              "Access denied. Your Google account is not allowed for this app."
            ) : error === "Configuration" ? (
              <>
                Sign-in failed: Supabase is not configured for NextAuth. In
                Supabase Dashboard → Project Settings → Data API → Exposed
                schemas, add <strong>next_auth</strong> alongside{" "}
                <strong>public</strong>, then restart the dev server.
              </>
            ) : (
              "Sign-in failed. Please try again."
            )}
          </div>
        )}

        <LoginButton />

        <p className="mt-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
          Continues with Google and requests Drive access so you can sync your
          topic folders.
        </p>
      </div>
    </main>
  );
}
