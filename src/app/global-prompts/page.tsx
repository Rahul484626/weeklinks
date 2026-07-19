import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { GlobalPromptsClient } from "./global-prompts-client";

export default async function GlobalPromptsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return <GlobalPromptsClient user={session.user} />;
}
