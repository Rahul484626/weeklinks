import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TopicsClient } from "./topics-client";

export default async function TopicsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return <TopicsClient user={session.user} />;
}
