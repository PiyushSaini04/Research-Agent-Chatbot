-- 008_add_companies_table.sql
-- Add a normalized companies table so every resolved company is persisted.

CREATE TABLE IF NOT EXISTS public.companies (
  ticker       TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  exchange     TEXT,
  country      TEXT,
  currency     TEXT DEFAULT 'USD',
  last_researched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast name lookups
CREATE INDEX IF NOT EXISTS idx_companies_name ON public.companies(name);

-- Enable Row Level Security (companies are globally readable but only written by the service)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
CREATE POLICY "Authenticated users can read companies"
  ON public.companies FOR SELECT
  TO authenticated
  USING (true);

-- Allow service role to insert/update (done from API routes)
CREATE POLICY "Service role can write companies"
  ON public.companies FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
