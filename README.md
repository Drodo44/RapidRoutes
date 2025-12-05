
# TEMPORARY FILE

This file contains the SQL migration script that you requested. You can copy and paste this into the Supabase SQL editor to run the migration.

To restore the original README.md content, run the following command:
`git checkout README.md`

```sql
-- Create ai_prompts table
CREATE TABLE IF NOT EXISTS ai_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    html_content TEXT NOT NULL,
    category TEXT,
    created_by_user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ai_prompts ENABLE ROW LEVEL SECURITY;

-- Create policies for ai_prompts
CREATE POLICY "Admins can manage all prompts"
    ON ai_prompts FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'Admin'
        )
    );

CREATE POLICY "Authenticated users can read all prompts"
    ON ai_prompts FOR SELECT
    USING (auth.role() = 'authenticated');

-- Create prompt_suggestions table
CREATE TABLE IF NOT EXISTS prompt_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suggestion_title TEXT NOT NULL,
    suggestion_text TEXT,
    user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE prompt_suggestions ENABLE ROW LEVEL SECURITY;

-- Create policies for prompt_suggestions
CREATE POLICY "Authenticated users can create suggestions"
    ON prompt_suggestions FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can read their own suggestions"
    ON prompt_suggestions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all suggestions"
    ON prompt_suggestions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'Admin'
        )
    );
```
