-- 003_saved_reports.sql
-- Stores full Markdown reports linked to research sessions

CREATE TABLE IF NOT EXISTS public.saved_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL UNIQUE REFERENCES public.research_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_markdown TEXT NOT NULL,
  sources JSONB DEFAULT '[]',
  decision TEXT CHECK (decision IN ('INVEST', 'PASS')),
  confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_reports_user_id ON public.saved_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_reports_session_id ON public.saved_reports(session_id);

ALTER TABLE public.saved_reports ENABLE ROW LEVEL SECURITY;
