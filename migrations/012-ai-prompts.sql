-- 1. Create the ai_prompts table
CREATE TABLE IF NOT EXISTS public.ai_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    html_content TEXT NOT NULL,
    category TEXT,
    created_by_user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Enable RLS on ai_prompts
ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;

-- 3. Create policies for ai_prompts
-- Drop existing policies to avoid conflicts if you run this multiple times
DROP POLICY IF EXISTS "Admins can manage all prompts" ON public.ai_prompts;
DROP POLICY IF EXISTS "Authenticated users can read all prompts" ON public.ai_prompts;

CREATE POLICY "Admins can manage all prompts"
    ON public.ai_prompts
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'Admin'
        )
    );

CREATE POLICY "Authenticated users can read all prompts"
    ON public.ai_prompts
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- 4. Create prompt_suggestions table
CREATE TABLE IF NOT EXISTS public.prompt_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suggestion_title TEXT NOT NULL,
    suggestion_text TEXT,
    user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Enable RLS on prompt_suggestions
ALTER TABLE public.prompt_suggestions ENABLE ROW LEVEL SECURITY;

-- 6. Create policies for prompt_suggestions
DROP POLICY IF EXISTS "Authenticated users can create suggestions" ON public.prompt_suggestions;
DROP POLICY IF EXISTS "Users can read their own suggestions" ON public.prompt_suggestions;
DROP POLICY IF EXISTS "Admins can read all suggestions" ON public.prompt_suggestions;

CREATE POLICY "Authenticated users can create suggestions"
    ON public.prompt_suggestions
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can read their own suggestions"
    ON public.prompt_suggestions
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all suggestions"
    ON public.prompt_suggestions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'Admin'
        )
    );
