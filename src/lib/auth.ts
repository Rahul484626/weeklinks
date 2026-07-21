import NextAuth from "next-auth";
import { SupabaseAdapter } from "@auth/supabase-adapter";
import { authConfig } from "@/lib/auth.config";
import { getGoogleAccount, updateGoogleAccountTokens } from "@/lib/accounts";

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
  events: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user?.id) {
        try {
          const dbAccount = await getGoogleAccount(user.id);
          if (dbAccount) {
            await updateGoogleAccountTokens(dbAccount.id, {
              access_token: account.access_token ?? undefined,
              refresh_token: account.refresh_token ?? undefined,
              expires_at: account.expires_at ?? undefined,
            });
          }
        } catch (err) {
          console.error("Failed to update Google tokens on sign in event:", err);
        }
      }
    },
  },
});

