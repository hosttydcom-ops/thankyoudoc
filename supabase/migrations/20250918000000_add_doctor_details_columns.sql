-- Add new columns to doctors table for enhanced scraping data
ALTER TABLE doctors 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS success_rate TEXT,
ADD COLUMN IF NOT EXISTS timings_json JSONB,
ADD COLUMN IF NOT EXISTS qualifications TEXT,
ADD COLUMN IF NOT EXISTS experience_years INTEGER,
ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;

-- Add index for verification status
CREATE INDEX IF NOT EXISTS idx_doctors_is_verified ON doctors(is_verified);

-- Add index for success rate
CREATE INDEX IF NOT EXISTS idx_doctors_success_rate ON doctors(success_rate);

-- Update existing records to set default values
UPDATE doctors 
SET 
  is_verified = FALSE,
  success_rate = NULL,
  timings_json = NULL,
  qualifications = NULL,
  experience_years = NULL,
  total_reviews = 0
WHERE 
  is_verified IS NULL 
  OR success_rate IS NULL 
  OR timings_json IS NULL 
  OR qualifications IS NULL 
  OR experience_years IS NULL 
  OR total_reviews IS NULL;
