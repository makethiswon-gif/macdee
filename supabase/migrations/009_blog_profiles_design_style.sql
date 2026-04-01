-- ============================================================
-- Add design_style column to blog_profiles
-- ============================================================

ALTER TABLE blog_profiles
ADD COLUMN IF NOT EXISTS design_style TEXT DEFAULT 'classic';
