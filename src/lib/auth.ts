import NextAuth from "next-auth";
import { SupabaseAdapter } from "@auth/supabase-adapter";
import { authConfig } from "@/lib/auth.config";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter:
    supabaseUrl && supabaseServiceKey
      ? SupabaseAdapter({
          url: supabaseUrl,
          secret: supabaseServiceKey,
        })
      : undefined,
  session: { strategy: "jwt" },
});
