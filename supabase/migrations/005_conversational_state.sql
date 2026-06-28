-- 005_conversational_state.sql
-- Add state and chat_history to research_sessions

ALTER TABLE public.research_sessions
ADD COLUMN IF NOT EXISTS state JSONB,
ADD COLUMN IF NOT EXISTS chat_history JSONB DEFAULT '[]'::jsonb;

-- Also update the status check constraint to include 'paused' if it doesn't already
-- Supabase requires dropping and recreating check constraints
ALTER TABLE public.research_sessions
DROP CONSTRAINT IF EXISTS research_sessions_status_check;

ALTER TABLE public.research_sessions
ADD CONSTRAINT research_sessions_status_check 
CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed'));

-- Create storage bucket for financial_docs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('financial_docs', 'financial_docs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for financial_docs
CREATE POLICY "Users can view their own financial docs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'financial_docs' AND auth.uid() = owner);

CREATE POLICY "Users can upload their own financial docs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'financial_docs' AND auth.uid() = owner);

CREATE POLICY "Users can delete their own financial docs"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'financial_docs' AND auth.uid() = owner);
