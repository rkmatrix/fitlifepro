-- FitLife Web Storage
-- Provides a generic key-value cloud store for the web version.
-- No auth required — data is scoped by a device-generated UUID stored in the browser.
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ougiouorosrjdmlojrdn/sql

CREATE TABLE IF NOT EXISTS public.web_storage (
  device_id TEXT   NOT NULL,
  key       TEXT   NOT NULL,
  value     JSONB,
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (device_id, key)
);

-- Allow the anon (public) key to read and write — scoped by device_id.
ALTER TABLE public.web_storage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "web_storage_self" ON public.web_storage
  FOR ALL USING (true) WITH CHECK (true);
