-- Expose next_auth to Supabase Data API (PostgREST) and refresh the schema cache.
-- Run this in Supabase SQL Editor AFTER supabase/schema.sql.
--
-- On hosted Supabase you can instead use:
-- Project Settings → Data API → Exposed schemas → add "next_auth" → Save
-- (Do not mix dashboard + ALTER ROLE unless you know which one is active.)

-- 1. Ensure roles can see the schema and tables
GRANT USAGE ON SCHEMA next_auth TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA next_auth TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA next_auth TO postgres, service_role;

-- 2. Tell PostgREST which schemas to serve (skip if you already set this via dashboard)
ALTER ROLE authenticator SET pgrst.db_schemas = 'public, graphql_public, next_auth';

-- 3. Reload PostgREST — "reload schema" picks up new tables; "reload config" alone is not enough
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- 4. If tables still 404, nudge the notification queue (Supabase troubleshooting)
SELECT pg_notification_queue_usage();
