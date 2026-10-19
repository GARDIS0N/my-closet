-- ============================================================================
-- MyCloset Database Schema & Security Policies
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. PROFILES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  preferred_style TEXT[] DEFAULT '{}',
  occasions TEXT[] DEFAULT '{}',
  preferred_colors TEXT[] DEFAULT '{}',
  budget_preference TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- 2. CLOTHING ITEMS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clothing_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  color TEXT NOT NULL,
  secondary_color TEXT,
  brand TEXT,
  size TEXT,
  season TEXT[] NOT NULL DEFAULT '{"All-Season"}',
  occasion TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'clean' CHECK (status IN ('clean', 'in_laundry', 'unavailable')),
  image_url TEXT NOT NULL,
  notes TEXT,
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  times_worn INTEGER NOT NULL DEFAULT 0,
  last_worn DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_clothing_items_user_id ON public.clothing_items(user_id);
CREATE INDEX IF NOT EXISTS idx_clothing_items_category ON public.clothing_items(category);
CREATE INDEX IF NOT EXISTS idx_clothing_items_status ON public.clothing_items(status);
CREATE INDEX IF NOT EXISTS idx_clothing_items_is_favorite ON public.clothing_items(is_favorite);

-- Enable RLS on clothing_items
ALTER TABLE public.clothing_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view only their own clothing items"
  ON public.clothing_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own clothing items"
  ON public.clothing_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update only their own clothing items"
  ON public.clothing_items FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete only their own clothing items"
  ON public.clothing_items FOR DELETE
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 3. CUSTOM CATEGORIES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.custom_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_user_category UNIQUE (user_id, name)
);

ALTER TABLE public.custom_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their custom categories"
  ON public.custom_categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their custom categories"
  ON public.custom_categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their custom categories"
  ON public.custom_categories FOR DELETE
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4. SAVED OUTFITS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.saved_outfits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  occasion TEXT NOT NULL DEFAULT 'Casual Outings',
  style TEXT NOT NULL DEFAULT 'Casual',
  season TEXT NOT NULL DEFAULT 'All-Season',
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_saved_outfits_user_id ON public.saved_outfits(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_outfits_favorite ON public.saved_outfits(is_favorite);

ALTER TABLE public.saved_outfits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved outfits"
  ON public.saved_outfits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved outfits"
  ON public.saved_outfits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved outfits"
  ON public.saved_outfits FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved outfits"
  ON public.saved_outfits FOR DELETE
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 5. OUTFIT ITEMS JUNCTION TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.outfit_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outfit_id UUID NOT NULL REFERENCES public.saved_outfits(id) ON DELETE CASCADE,
  clothing_item_id UUID NOT NULL REFERENCES public.clothing_items(id) ON DELETE CASCADE,
  slot TEXT NOT NULL CHECK (slot IN ('top', 'bottom', 'shoes', 'outerwear', 'accessory', 'other')),
  position_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_outfit_items_outfit_id ON public.outfit_items(outfit_id);
CREATE INDEX IF NOT EXISTS idx_outfit_items_clothing_id ON public.outfit_items(clothing_item_id);

ALTER TABLE public.outfit_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view outfit items belonging to their outfits"
  ON public.outfit_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.saved_outfits
      WHERE saved_outfits.id = outfit_items.outfit_id
        AND saved_outfits.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert outfit items for their outfits"
  ON public.outfit_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.saved_outfits
      WHERE saved_outfits.id = outfit_items.outfit_id
        AND saved_outfits.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete outfit items for their outfits"
  ON public.outfit_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.saved_outfits
      WHERE saved_outfits.id = outfit_items.outfit_id
        AND saved_outfits.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 6. CALENDAR ENTRIES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.calendar_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  outfit_id UUID NOT NULL REFERENCES public.saved_outfits(id) ON DELETE CASCADE,
  notes TEXT,
  is_worn BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_user_date_outfit UNIQUE (user_id, date, outfit_id)
);

CREATE INDEX IF NOT EXISTS idx_calendar_user_date ON public.calendar_entries(user_id, date);

ALTER TABLE public.calendar_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own calendar entries"
  ON public.calendar_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calendar entries"
  ON public.calendar_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar entries"
  ON public.calendar_entries FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar entries"
  ON public.calendar_entries FOR DELETE
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 7. STORAGE BUCKET CONFIGURATION (closet-photos)
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('closet-photos', 'closet-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS
CREATE POLICY "Authenticated users can upload photos to closet-photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'closet-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their photos in closet-photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'closet-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their photos in closet-photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'closet-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view closet-photos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'closet-photos');

-- ----------------------------------------------------------------------------
-- 8. AUTOMATIC PROFILE CREATION TRIGGER
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, onboarding_completed)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    FALSE
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
