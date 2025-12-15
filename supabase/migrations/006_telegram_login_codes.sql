-- =============================================
-- TELEGRAM LOGIN CODES TABLE
-- Stores temporary login codes for bot-based authentication
-- =============================================

CREATE TABLE IF NOT EXISTS public.telegram_login_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    telegram_id BIGINT,
    profile_id UUID REFERENCES public.telegram_profiles(id) ON DELETE CASCADE,
    used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_telegram_login_codes_code ON public.telegram_login_codes(code);
CREATE INDEX IF NOT EXISTS idx_telegram_login_codes_telegram_id ON public.telegram_login_codes(telegram_id);
CREATE INDEX IF NOT EXISTS idx_telegram_login_codes_expires_at ON public.telegram_login_codes(expires_at);

-- Enable RLS
ALTER TABLE public.telegram_login_codes ENABLE ROW LEVEL SECURITY;

-- No policies = server-only access (service_role bypasses RLS)

-- Auto-cleanup old codes (optional trigger)
CREATE OR REPLACE FUNCTION cleanup_expired_login_codes()
RETURNS void AS $$
BEGIN
    DELETE FROM public.telegram_login_codes
    WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE public.telegram_login_codes IS 'Temporary login codes for Telegram bot authentication flow';
COMMENT ON COLUMN public.telegram_login_codes.code IS 'Unique login code shown to user';
COMMENT ON COLUMN public.telegram_login_codes.used IS 'Whether the code has been used for login';
COMMENT ON COLUMN public.telegram_login_codes.telegram_id IS 'Telegram user ID after successful auth';
COMMENT ON COLUMN public.telegram_login_codes.profile_id IS 'Profile ID after successful auth';
