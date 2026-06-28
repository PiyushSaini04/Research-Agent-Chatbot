-- 009_company_profile_fields.sql
-- Store the normalized company profile fields used by reports and cache lookups.

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS sector TEXT,
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT;
