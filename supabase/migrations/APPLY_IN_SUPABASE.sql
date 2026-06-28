-- =============================================================
-- APPLY THIS ENTIRE SCRIPT IN THE SUPABASE SQL EDITOR
-- Run migrations 006, 007, and 008 in one go.
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- Migration 006: Remove pause state, add probability columns
-- to research_sessions
-- ─────────────────────────────────────────────────────────────

-- Drop the old status check constraint (which may include 'paused')
ALTER TABLE public.research_sessions 
  DROP CONSTRAINT IF EXISTS research_sessions_status_check;

-- Recreate without 'paused'
ALTER TABLE public.research_sessions
  ADD CONSTRAINT research_sessions_status_check
  CHECK (status IN ('pending', 'running', 'completed', 'failed'));

-- Add probability columns
ALTER TABLE public.research_sessions
  ADD COLUMN IF NOT EXISTS invest_probability INTEGER CHECK (invest_probability >= 0 AND invest_probability <= 100),
  ADD COLUMN IF NOT EXISTS pass_probability INTEGER CHECK (pass_probability >= 0 AND pass_probability <= 100);

-- Migrate existing confidence data
UPDATE public.research_sessions
SET
  invest_probability = CASE WHEN decision = 'INVEST' THEN confidence ELSE GREATEST(0, 100 - COALESCE(confidence, 100)) END,
  pass_probability   = CASE WHEN decision = 'PASS'   THEN confidence ELSE GREATEST(0, 100 - COALESCE(confidence, 100)) END
WHERE confidence IS NOT NULL AND invest_probability IS NULL;

-- Drop old confidence column from research_sessions
ALTER TABLE public.research_sessions DROP COLUMN IF EXISTS confidence;

-- ─────────────────────────────────────────────────────────────
-- Migration 007: Fix saved_reports schema
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.saved_reports
  ADD COLUMN IF NOT EXISTS invest_probability INTEGER CHECK (invest_probability >= 0 AND invest_probability <= 100),
  ADD COLUMN IF NOT EXISTS pass_probability INTEGER CHECK (pass_probability >= 0 AND pass_probability <= 100);

-- Migrate existing data
UPDATE public.saved_reports
SET
  invest_probability = CASE WHEN decision = 'INVEST' THEN confidence ELSE GREATEST(0, 100 - COALESCE(confidence, 100)) END,
  pass_probability   = CASE WHEN decision = 'PASS'   THEN confidence ELSE GREATEST(0, 100 - COALESCE(confidence, 100)) END
WHERE confidence IS NOT NULL AND invest_probability IS NULL;

ALTER TABLE public.saved_reports DROP COLUMN IF EXISTS confidence;

-- ─────────────────────────────────────────────────────────────
-- Migration 008: Add companies table
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.companies (
  ticker               TEXT PRIMARY KEY,
  name                 TEXT NOT NULL,
  exchange             TEXT,
  country              TEXT,
  currency             TEXT DEFAULT 'USD',
  last_researched_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_name ON public.companies(name);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
DROP POLICY IF EXISTS "Authenticated users can read companies" ON public.companies;
CREATE POLICY "Authenticated users can read companies"
  ON public.companies FOR SELECT
  TO authenticated
  USING (true);

-- Allow service role to write (API routes use service role key)
DROP POLICY IF EXISTS "Service role can write companies" ON public.companies;
CREATE POLICY "Service role can write companies"
  ON public.companies FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- Verify the final schema
-- ─────────────────────────────────────────────────────────────
-- Run these SELECT queries to verify after applying:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'research_sessions' ORDER BY ordinal_position;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'saved_reports' ORDER BY ordinal_position;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'companies' ORDER BY ordinal_position;
