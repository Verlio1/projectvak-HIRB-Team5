-- Drop table if exists to ensure schema update (User should be careful about data loss but since they requested the change...)
-- Actually, better to ALTER or create if not exists with correct columns. But user said "I do not have a locatie column", so if they have data, it's already in the flat columns.
-- This script aligns the apps expectations with the user's described schema.

-- Cleanup common legacy auth trigger setup that can break signups with:
-- "Database error saving new user" when profile tables/functions are missing.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE TABLE IF NOT EXISTS panden (
  pand_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  pand_naam TEXT,
  straat TEXT,
  plaats TEXT,
  postcode TEXT,
  prijs NUMERIC,
  stijl TEXT,
  aantal_kamers INTEGER,
  laatste_notities TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  longitude FLOAT,
  latitude FLOAT
);

CREATE TABLE IF NOT EXISTS klanten (
  klant_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  klant_naam TEXT,
  telefoon TEXT,
  email TEXT,
  status TEXT,
  notities TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS afspraken (
  afspraken_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  titel TEXT,
  datum TIMESTAMPTZ,
  klant_id UUID REFERENCES klanten(klant_id),
  pand_id UUID REFERENCES panden(pand_id),
  notities TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE panden ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE panden ALTER COLUMN user_id SET DEFAULT auth.uid();
UPDATE panden SET user_id = auth.uid() WHERE user_id IS NULL;
ALTER TABLE panden ALTER COLUMN user_id SET NOT NULL;
DO $$ BEGIN
  ALTER TABLE panden
    ADD CONSTRAINT panden_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE klanten ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE klanten ALTER COLUMN user_id SET DEFAULT auth.uid();
UPDATE klanten SET user_id = auth.uid() WHERE user_id IS NULL;
ALTER TABLE klanten ALTER COLUMN user_id SET NOT NULL;
DO $$ BEGIN
  ALTER TABLE klanten
    ADD CONSTRAINT klanten_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE afspraken ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE afspraken ALTER COLUMN user_id SET DEFAULT auth.uid();
UPDATE afspraken SET user_id = auth.uid() WHERE user_id IS NULL;
ALTER TABLE afspraken ALTER COLUMN user_id SET NOT NULL;
DO $$ BEGIN
  ALTER TABLE afspraken
    ADD CONSTRAINT afspraken_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_panden_user_id ON panden(user_id);
CREATE INDEX IF NOT EXISTS idx_klanten_user_id ON klanten(user_id);
CREATE INDEX IF NOT EXISTS idx_afspraken_user_id ON afspraken(user_id);

-- Strict per-user access (RLS)
ALTER TABLE panden ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Panden" ON panden;
DROP POLICY IF EXISTS "Users can select own panden" ON panden;
DROP POLICY IF EXISTS "Users can insert own panden" ON panden;
DROP POLICY IF EXISTS "Users can update own panden" ON panden;
DROP POLICY IF EXISTS "Users can delete own panden" ON panden;
CREATE POLICY "Users can select own panden" ON panden FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own panden" ON panden FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own panden" ON panden FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own panden" ON panden FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE klanten ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Klanten" ON klanten;
DROP POLICY IF EXISTS "Users can select own klanten" ON klanten;
DROP POLICY IF EXISTS "Users can insert own klanten" ON klanten;
DROP POLICY IF EXISTS "Users can update own klanten" ON klanten;
DROP POLICY IF EXISTS "Users can delete own klanten" ON klanten;
CREATE POLICY "Users can select own klanten" ON klanten FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own klanten" ON klanten FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own klanten" ON klanten FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own klanten" ON klanten FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE afspraken ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Afspraken" ON afspraken;
DROP POLICY IF EXISTS "Users can select own afspraken" ON afspraken;
DROP POLICY IF EXISTS "Users can insert own afspraken" ON afspraken;
DROP POLICY IF EXISTS "Users can update own afspraken" ON afspraken;
DROP POLICY IF EXISTS "Users can delete own afspraken" ON afspraken;
CREATE POLICY "Users can select own afspraken" ON afspraken FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own afspraken" ON afspraken FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own afspraken" ON afspraken FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own afspraken" ON afspraken FOR DELETE USING (auth.uid() = user_id);

-- Dedicated account deletion support (called from client through rpc)
CREATE OR REPLACE FUNCTION public.delete_current_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  target_user_id := auth.uid();

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_current_user_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_current_user_account() TO authenticated;
