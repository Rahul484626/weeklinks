--
-- Auth.js / NextAuth tables (next_auth schema)
-- Run in Supabase SQL Editor, then expose next_auth in API Settings → Exposed schemas
--

CREATE SCHEMA IF NOT EXISTS next_auth;

GRANT USAGE ON SCHEMA next_auth TO service_role;
GRANT ALL ON SCHEMA next_auth TO postgres;

CREATE TABLE IF NOT EXISTS next_auth.users
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text,
    email text,
    "emailVerified" timestamptz,
    image text,
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT email_unique UNIQUE (email)
);

GRANT ALL ON TABLE next_auth.users TO postgres;
GRANT ALL ON TABLE next_auth.users TO service_role;

CREATE TABLE IF NOT EXISTS next_auth.sessions
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    expires timestamptz NOT NULL,
    "sessionToken" text NOT NULL,
    "userId" uuid,
    CONSTRAINT sessions_pkey PRIMARY KEY (id),
    CONSTRAINT sessionToken_unique UNIQUE ("sessionToken"),
    CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES next_auth.users (id) ON DELETE CASCADE
);

GRANT ALL ON TABLE next_auth.sessions TO postgres;
GRANT ALL ON TABLE next_auth.sessions TO service_role;

CREATE TABLE IF NOT EXISTS next_auth.accounts
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    type text NOT NULL,
    provider text NOT NULL,
    "providerAccountId" text NOT NULL,
    refresh_token text,
    access_token text,
    expires_at bigint,
    token_type text,
    scope text,
    id_token text,
    session_state text,
    oauth_token_secret text,
    oauth_token text,
    "userId" uuid,
    CONSTRAINT accounts_pkey PRIMARY KEY (id),
    CONSTRAINT provider_unique UNIQUE (provider, "providerAccountId"),
    CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES next_auth.users (id) ON DELETE CASCADE
);

GRANT ALL ON TABLE next_auth.accounts TO postgres;
GRANT ALL ON TABLE next_auth.accounts TO service_role;

CREATE TABLE IF NOT EXISTS next_auth.verification_tokens
(
    identifier text,
    token text,
    expires timestamptz NOT NULL,
    CONSTRAINT verification_tokens_pkey PRIMARY KEY (token),
    CONSTRAINT token_unique UNIQUE (token),
    CONSTRAINT token_identifier_unique UNIQUE (token, identifier)
);

GRANT ALL ON TABLE next_auth.verification_tokens TO postgres;
GRANT ALL ON TABLE next_auth.verification_tokens TO service_role;

--
-- Weeklinks app data (public schema)
--

CREATE TABLE IF NOT EXISTS public.topics
(
    id text PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES next_auth.users (id) ON DELETE CASCADE,
    drive_folder_id text NOT NULL,
    drive_folder_name text NOT NULL,
    display_name text,
    sort_order integer NOT NULL DEFAULT 0,
    is_hidden boolean NOT NULL DEFAULT false,
    is_completed boolean NOT NULL DEFAULT false,
    is_archived boolean NOT NULL DEFAULT false,
    completed_at timestamptz,
    last_synced_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT topics_user_drive_folder_unique UNIQUE (user_id, drive_folder_id)
);

CREATE INDEX IF NOT EXISTS topics_user_id_sort_order_idx
    ON public.topics (user_id, sort_order);

GRANT ALL ON TABLE public.topics TO postgres;
GRANT ALL ON TABLE public.topics TO service_role;

-- After running this file, also run supabase/expose-next-auth.sql
-- (or add next_auth in Dashboard → Data API → Exposed schemas).
