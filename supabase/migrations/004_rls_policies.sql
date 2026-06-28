-- 004_rls_policies.sql
-- Row Level Security policies — users can only access their own data

-- ── research_sessions ─────────────────────────────────────────────────────
CREATE POLICY "Users can view own sessions"
  ON public.research_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON public.research_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.research_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all sessions"
  ON public.research_sessions FOR ALL
  USING (auth.role() = 'service_role');

-- ── agent_execution_logs ──────────────────────────────────────────────────
CREATE POLICY "Users can view logs for own sessions"
  ON public.agent_execution_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.research_sessions s
      WHERE s.id = session_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage all logs"
  ON public.agent_execution_logs FOR ALL
  USING (auth.role() = 'service_role');

-- ── saved_reports ─────────────────────────────────────────────────────────
CREATE POLICY "Users can view own reports"
  ON public.saved_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reports"
  ON public.saved_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all reports"
  ON public.saved_reports FOR ALL
  USING (auth.role() = 'service_role');
