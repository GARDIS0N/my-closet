-- ============================================================================
-- MyCloset Migration: Automatic AI Product Photo Cleanup & Attribute Detection
-- ============================================================================

-- Safe extension of public.clothing_items
ALTER TABLE public.clothing_items 
  ADD COLUMN IF NOT EXISTS subcategory TEXT,
  ADD COLUMN IF NOT EXISTS original_image_url TEXT,
  ADD COLUMN IF NOT EXISTS processed_image_url TEXT,
  ADD COLUMN IF NOT EXISTS processing_status TEXT NOT NULL DEFAULT 'completed' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed', 'original')),
  ADD COLUMN IF NOT EXISTS processing_error TEXT,
  ADD COLUMN IF NOT EXISTS detected_attributes JSONB DEFAULT '{}'::jsonb;

-- Safe extension of public.profiles for auto-enhancement user preference
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS auto_enhance_photos BOOLEAN NOT NULL DEFAULT TRUE;

-- Create index on processing_status for efficient status filtering and retry queues
CREATE INDEX IF NOT EXISTS idx_clothing_items_processing_status ON public.clothing_items(processing_status);
CREATE INDEX IF NOT EXISTS idx_clothing_items_subcategory ON public.clothing_items(subcategory);
