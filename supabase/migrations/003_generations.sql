-- =============================================
-- GENERATIONS TABLE
-- Stores all user generations (photos, videos, products)
-- =============================================

-- Create generations table
CREATE TABLE IF NOT EXISTS public.generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Generation type
    type TEXT NOT NULL CHECK (type IN ('photo', 'video', 'product')),
    
    -- Model info
    model_id TEXT NOT NULL,
    model_name TEXT NOT NULL,
    
    -- Input parameters
    prompt TEXT NOT NULL,
    negative_prompt TEXT,
    aspect_ratio TEXT DEFAULT '1:1',
    
    -- For photos
    variants INTEGER DEFAULT 1,
    cfg_scale DECIMAL(4,2),
    steps INTEGER,
    
    -- For videos
    duration INTEGER,
    fps INTEGER,
    
    -- Results
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    task_id TEXT, -- External API task ID
    results JSONB DEFAULT '[]'::jsonb, -- Array of result URLs
    thumbnail_url TEXT,
    
    -- Credits
    credits_used INTEGER DEFAULT 0,
    
    -- Metadata
    is_favorite BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false,
    tags TEXT[] DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_generations_user_id ON public.generations(user_id);
CREATE INDEX IF NOT EXISTS idx_generations_type ON public.generations(type);
CREATE INDEX IF NOT EXISTS idx_generations_status ON public.generations(status);
CREATE INDEX IF NOT EXISTS idx_generations_created_at ON public.generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generations_is_favorite ON public.generations(is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_generations_is_public ON public.generations(is_public) WHERE is_public = true;

-- Enable RLS
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own generations
DROP POLICY IF EXISTS "Users can view own generations" ON public.generations;
CREATE POLICY "Users can view own generations" ON public.generations
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own generations
DROP POLICY IF EXISTS "Users can insert own generations" ON public.generations;
CREATE POLICY "Users can insert own generations" ON public.generations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own generations
DROP POLICY IF EXISTS "Users can update own generations" ON public.generations;
CREATE POLICY "Users can update own generations" ON public.generations
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own generations
DROP POLICY IF EXISTS "Users can delete own generations" ON public.generations;
CREATE POLICY "Users can delete own generations" ON public.generations
    FOR DELETE USING (auth.uid() = user_id);

-- Anyone can view public generations
DROP POLICY IF EXISTS "Anyone can view public generations" ON public.generations;
CREATE POLICY "Anyone can view public generations" ON public.generations
    FOR SELECT USING (is_public = true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_generations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_generations_updated_at ON public.generations;
CREATE TRIGGER trigger_update_generations_updated_at
    BEFORE UPDATE ON public.generations
    FOR EACH ROW
    EXECUTE FUNCTION update_generations_updated_at();

-- =============================================
-- GENERATION RESULTS VIEW
-- Convenient view for fetching generations with results
-- =============================================

CREATE OR REPLACE VIEW public.generation_history AS
SELECT 
    g.id,
    g.user_id,
    g.type,
    g.model_id,
    g.model_name,
    g.prompt,
    g.aspect_ratio,
    g.status,
    g.results,
    g.thumbnail_url,
    COALESCE(g.thumbnail_url, (g.results->0->>'url')::text) as preview_url,
    g.credits_used,
    g.is_favorite,
    g.is_public,
    g.tags,
    g.created_at,
    g.completed_at
FROM public.generations g
ORDER BY g.created_at DESC;

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to get user's generation stats
CREATE OR REPLACE FUNCTION get_user_generation_stats(p_user_id UUID)
RETURNS TABLE (
    total_generations BIGINT,
    total_photos BIGINT,
    total_videos BIGINT,
    total_products BIGINT,
    total_credits_used BIGINT,
    favorites_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_generations,
        COUNT(*) FILTER (WHERE type = 'photo')::BIGINT as total_photos,
        COUNT(*) FILTER (WHERE type = 'video')::BIGINT as total_videos,
        COUNT(*) FILTER (WHERE type = 'product')::BIGINT as total_products,
        COALESCE(SUM(credits_used), 0)::BIGINT as total_credits_used,
        COUNT(*) FILTER (WHERE is_favorite = true)::BIGINT as favorites_count
    FROM public.generations
    WHERE user_id = p_user_id AND status = 'completed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.generations TO authenticated;
GRANT SELECT ON public.generation_history TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_generation_stats(UUID) TO authenticated;

