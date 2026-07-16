-- Run in Supabase SQL Editor to add workflow status columns to existing databases.

ALTER TABLE public.topics
    ADD COLUMN IF NOT EXISTS is_in_progress boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_ready_to_pickup boolean NOT NULL DEFAULT false;
