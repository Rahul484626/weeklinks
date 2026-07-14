import { createAuthAdminClient } from "@/lib/supabase/admin";

export type GoogleAccount = {
  id: string;
  userId: string;
  refresh_token: string | null;
  access_token: string | null;
  expires_at: number | null;
};

export async function getGoogleAccount(
  userId: string,
): Promise<GoogleAccount | null> {
  const supabase = createAuthAdminClient();
  const { data, error } = await supabase
    .from("accounts")
    .select("id, userId, refresh_token, access_token, expires_at")
    .eq("userId", userId)
    .eq("provider", "google")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) return null;

  return {
    id: data.id,
    userId: data.userId,
    refresh_token: data.refresh_token,
    access_token: data.access_token,
    expires_at: data.expires_at,
  };
}

export async function updateGoogleAccountTokens(
  accountId: string,
  tokens: {
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
  },
) {
  const supabase = createAuthAdminClient();
  const { error } = await supabase
    .from("accounts")
    .update(tokens)
    .eq("id", accountId);

  if (error) {
    throw new Error(error.message);
  }
}
