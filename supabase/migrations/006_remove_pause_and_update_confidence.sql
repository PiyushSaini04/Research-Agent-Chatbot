-- Migration to remove pause functionality, drop financial_docs bucket, and update confidence to probabilities

-- 1. Remove the "paused" status constraint from research_sessions
ALTER TABLE research_sessions DROP CONSTRAINT IF EXISTS research_sessions_status_check;

-- Add back the constraint with only valid states
ALTER TABLE research_sessions ADD CONSTRAINT research_sessions_status_check 
  CHECK (status IN ('running', 'completed', 'failed'));

-- 2. Drop the financial_docs bucket
DELETE FROM storage.objects WHERE bucket_id = 'financial_docs';
DELETE FROM storage.buckets WHERE id = 'financial_docs';

-- 3. Add invest_probability and pass_probability to research_sessions
ALTER TABLE research_sessions ADD COLUMN IF NOT EXISTS invest_probability integer;
ALTER TABLE research_sessions ADD COLUMN IF NOT EXISTS pass_probability integer;

-- Migrate existing confidence values (assuming decision is either INVEST or PASS)
UPDATE research_sessions
SET
  invest_probability = CASE
      WHEN decision = 'INVEST' THEN confidence
      ELSE 100 - COALESCE(confidence, 100)
  END,
  pass_probability = CASE
      WHEN decision = 'PASS' THEN confidence
      ELSE 100 - COALESCE(confidence, 100)
  END
WHERE confidence IS NOT NULL
  AND invest_probability IS NULL;


-- 4. Drop the old confidence column
ALTER TABLE research_sessions DROP COLUMN IF EXISTS confidence;
