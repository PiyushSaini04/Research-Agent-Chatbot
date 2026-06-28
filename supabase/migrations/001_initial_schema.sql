-- 001_initial_schema.sql
-- Creates core tables: research_sessions

CREATE TABLE IF NOT EXISTS public.research_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_query TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  decision TEXT CHECK (decision IN ('INVEST', 'PASS')),
  confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
  total_duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Index for fast user-based lookups
CREATE INDEX IF NOT EXISTS idx_research_sessions_user_id ON public.research_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_research_sessions_created_at ON public.research_sessions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.research_sessions ENABLE ROW LEVEL SECURITY;
