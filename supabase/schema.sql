-- ============================================================
-- Echo Mail — Supabase Schema
-- Run this in the Supabase SQL Editor (project dashboard → SQL)
-- Safe to re-run — all statements are idempotent
-- ============================================================

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  destination_email TEXT,
  confirm_before_delete BOOLEAN NOT NULL DEFAULT FALSE,
  keep_screen_awake BOOLEAN NOT NULL DEFAULT TRUE,
  max_recording_length INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Recordings
CREATE TABLE IF NOT EXISTS recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  duration NUMERIC NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  sent_to_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own recordings" ON recordings;
CREATE POLICY "Users can read own recordings" ON recordings
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own recordings" ON recordings;
CREATE POLICY "Users can insert own recordings" ON recordings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own recordings" ON recordings;
CREATE POLICY "Users can delete own recordings" ON recordings
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public can read recording by id" ON recordings;
CREATE POLICY "Public can read recording by id" ON recordings
  FOR SELECT USING (true);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- Storage bucket — if this fails, create manually:
-- Storage → New bucket → name: recordings, Public: on
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('recordings', 'recordings', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'recordings'
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Public read recordings bucket" ON storage.objects;
CREATE POLICY "Public read recordings bucket" ON storage.objects
  FOR SELECT USING (bucket_id = 'recordings');

DROP POLICY IF EXISTS "Users can delete own recordings objects" ON storage.objects;
CREATE POLICY "Users can delete own recordings objects" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'recordings'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
