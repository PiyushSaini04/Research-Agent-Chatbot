-- 007_fix_saved_reports_schema.sql
-- Fix saved_reports: replace confidence with invest_probability + pass_probability
-- to match the current application code.

-- Add new columns if they don't exist
ALTER TABLE public.saved_reports 
  ADD COLUMN IF NOT EXISTS invest_probability INTEGER CHECK (invest_probability >= 0 AND invest_probability <= 100),
  ADD COLUMN IF NOT EXISTS pass_probability INTEGER CHECK (pass_probability >= 0 AND pass_probability <= 100);

-- Migrate existing data from confidence column
UPDATE public.saved_reports
SET
  invest_probability = CASE WHEN decision = 'INVEST' THEN confidence ELSE GREATEST(0, 100 - COALESCE(confidence, 100)) END,
  pass_probability   = CASE WHEN decision = 'PASS'   THEN confidence ELSE GREATEST(0, 100 - COALESCE(confidence, 100)) END
WHERE confidence IS NOT NULL AND invest_probability IS NULL;

-- Drop old confidence column
ALTER TABLE public.saved_reports DROP COLUMN IF EXISTS confidence;
