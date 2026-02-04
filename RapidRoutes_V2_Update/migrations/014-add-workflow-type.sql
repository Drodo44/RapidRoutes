-- Add workflow_type column to ai_prompts table
ALTER TABLE public.ai_prompts 
ADD COLUMN IF NOT EXISTS workflow_type TEXT DEFAULT 'Copy Prompt';
