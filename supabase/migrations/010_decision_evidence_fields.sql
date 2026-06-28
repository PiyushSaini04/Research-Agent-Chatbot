-- Add evidence-based decision fields for research sessions and saved reports

ALTER TABLE research_sessions
  ADD COLUMN IF NOT EXISTS recommendation TEXT,
  ADD COLUMN IF NOT EXISTS evidence_score INTEGER,
  ADD COLUMN IF NOT EXISTS confidence INTEGER;

ALTER TABLE saved_reports
  ADD COLUMN IF NOT EXISTS recommendation TEXT,
  ADD COLUMN IF NOT EXISTS evidence_score INTEGER,
  ADD COLUMN IF NOT EXISTS confidence INTEGER,
  ADD COLUMN IF NOT EXISTS data_quality JSONB;
