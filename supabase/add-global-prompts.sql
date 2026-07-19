--
-- Table: public.global_prompts
--
CREATE TABLE IF NOT EXISTS public.global_prompts
(
    id text PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES next_auth.users (id) ON DELETE CASCADE,
    title text NOT NULL,
    content text NOT NULL,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for ordering
CREATE INDEX IF NOT EXISTS global_prompts_user_id_sort_order_idx
    ON public.global_prompts (user_id, sort_order ASC);

GRANT ALL ON TABLE public.global_prompts TO postgres;
GRANT ALL ON TABLE public.global_prompts TO service_role;
