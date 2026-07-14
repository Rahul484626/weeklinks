import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { updateSession } from "@/lib/supabase/middleware";

const { auth } = NextAuth(authConfig);

export default auth(async (request) => {
  return updateSession(request);
});

export const config = {
  matcher: ["/dashboard/:path*", "/topics/:path*", "/login"],
};
