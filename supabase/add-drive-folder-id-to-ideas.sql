-- Run in Supabase SQL Editor to support linking topic ideas to created Google Drive folders
ALTER TABLE public.topic_ideas
    ADD COLUMN IF NOT EXISTS drive_folder_id text;
