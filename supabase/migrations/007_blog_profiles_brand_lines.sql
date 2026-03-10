-- Add brand_lines column to blog_profiles table
ALTER TABLE blog_profiles ADD COLUMN IF NOT EXISTS brand_lines JSONB DEFAULT '[]'::jsonb;
