import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { getTopicForUser } from "@/lib/topics";
import { topicDisplayName } from "@/lib/utils";
import { FileManager } from "@/components/file-manager";

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
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to topics
            </Link>
            <h1 className="mt-2 text-xl font-semibold text-zinc-900">{name}</h1>
            {topic.displayName && (
              <p className="text-xs text-zinc-500">
                Drive folder: {topic.driveFolderName}
              </p>
            )}
          </div>
          {topic.isArchived && (
            <span className="w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800">
              Folder missing in Drive
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <FileManager topicId={topic.id} />
      </main>
    </div>
  );
}
