-- 002_agent_logs.sql
-- Creates agent_execution_logs table for full pipeline auditability

CREATE TABLE IF NOT EXISTS public.agent_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.research_sessions(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  input_payload JSONB,
  output_payload JSONB,
  api_calls_made TEXT[] DEFAULT '{}',
  llm_calls INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_logs_session_id ON public.agent_execution_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created_at ON public.agent_execution_logs(created_at DESC);

ALTER TABLE public.agent_execution_logs ENABLE ROW LEVEL SECURITY;
