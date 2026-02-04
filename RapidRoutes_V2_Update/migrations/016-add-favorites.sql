-- Create user_favorite_prompts table
CREATE TABLE IF NOT EXISTS public.user_favorite_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    prompt_id UUID REFERENCES public.ai_prompts(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, prompt_id)
);

-- Enable RLS
ALTER TABLE public.user_favorite_prompts ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Users can manage their own favorites" ON public.user_favorite_prompts;

CREATE POLICY "Users can manage their own favorites"
    ON public.user_favorite_prompts
    FOR ALL
    USING (auth.uid() = user_id);
