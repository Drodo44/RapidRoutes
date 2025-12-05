-- Add use_case and target_audience columns to ai_prompts table
ALTER TABLE ai_prompts 
ADD COLUMN IF NOT EXISTS use_case TEXT,
ADD COLUMN IF NOT EXISTS target_audience TEXT;

COMMENT ON COLUMN ai_prompts.use_case IS 'Specific scenario or problem this prompt solves';
COMMENT ON COLUMN ai_prompts.target_audience IS 'Who this prompt is intended for (e.g. Prospects, Customers, Carriers)';
