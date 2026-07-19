import { TransitionLink } from "@/components/providers";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { getTopicForUser } from "@/lib/topics";
import { topicDisplayName } from "@/lib/utils";
import { FileManager } from "@/components/file-manager";
import { AppLayout } from "@/components/app-layout";

type Props = {
  params: Promise<{ topicId: string }>;
};

export default async function TopicPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { topicId } = await params;
  const topic = await getTopicForUser(session.user.id, topicId);

  if (!topic) {
    notFound();
  }

  const name = topicDisplayName(topic);

  return (
    <AppLayout user={session.user}>
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <TransitionLink
              href="/dashboard"
              className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to topics
            </TransitionLink>
            <h1 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">{name}</h1>
          </div>
          {topic.isArchived && (
            <span className="w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800">
              Folder missing in Drive
            </span>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <FileManager topicId={topic.id} />
      </div>
    </AppLayout>
  );
}
