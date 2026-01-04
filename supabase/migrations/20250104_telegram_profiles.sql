-- Telegram profiles table for linking Telegram users to LensRoom accounts
CREATE TABLE IF NOT EXISTS telegram_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_id BIGINT UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    username TEXT,
    language_code TEXT DEFAULT 'ru',
    is_premium BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_telegram_profiles_telegram_id ON telegram_profiles(telegram_id);
CREATE INDEX IF NOT EXISTS idx_telegram_profiles_user_id ON telegram_profiles(user_id);

-- Enable RLS
ALTER TABLE telegram_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own telegram profile
CREATE POLICY "Users can view own telegram profile" ON telegram_profiles
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can update their own telegram profile
CREATE POLICY "Users can update own telegram profile" ON telegram_profiles
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Policy: Service role can manage all profiles
CREATE POLICY "Service role full access" ON telegram_profiles
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to link telegram account to user
CREATE OR REPLACE FUNCTION link_telegram_account(
    p_telegram_id BIGINT,
    p_user_id UUID,
    p_first_name TEXT DEFAULT NULL,
    p_last_name TEXT DEFAULT NULL,
    p_username TEXT DEFAULT NULL,
    p_language_code TEXT DEFAULT 'ru',
    p_is_premium BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
    v_profile_id UUID;
BEGIN
    -- Check if telegram profile exists
    SELECT id INTO v_profile_id
    FROM telegram_profiles
    WHERE telegram_id = p_telegram_id;

    IF v_profile_id IS NOT NULL THEN
        -- Update existing profile
        UPDATE telegram_profiles
        SET 
            user_id = p_user_id,
            first_name = COALESCE(p_first_name, first_name),
            last_name = COALESCE(p_last_name, last_name),
            username = COALESCE(p_username, username),
            language_code = COALESCE(p_language_code, language_code),
            is_premium = COALESCE(p_is_premium, is_premium),
            updated_at = NOW()
        WHERE id = v_profile_id;
    ELSE
        -- Create new profile
        INSERT INTO telegram_profiles (
            telegram_id, user_id, first_name, last_name, username, language_code, is_premium
        ) VALUES (
            p_telegram_id, p_user_id, p_first_name, p_last_name, p_username, p_language_code, p_is_premium
        )
        RETURNING id INTO v_profile_id;
    END IF;

    RETURN v_profile_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get or create telegram profile (for bot without user linking)
CREATE OR REPLACE FUNCTION get_or_create_telegram_profile(
    p_telegram_id BIGINT,
    p_first_name TEXT DEFAULT NULL,
    p_last_name TEXT DEFAULT NULL,
    p_username TEXT DEFAULT NULL,
    p_language_code TEXT DEFAULT 'ru',
    p_is_premium BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
    v_profile_id UUID;
BEGIN
    -- Check if telegram profile exists
    SELECT id INTO v_profile_id
    FROM telegram_profiles
    WHERE telegram_id = p_telegram_id;

    IF v_profile_id IS NOT NULL THEN
        -- Update existing profile
        UPDATE telegram_profiles
        SET 
            first_name = COALESCE(p_first_name, first_name),
            last_name = COALESCE(p_last_name, last_name),
            username = COALESCE(p_username, username),
            language_code = COALESCE(p_language_code, language_code),
            is_premium = COALESCE(p_is_premium, is_premium),
            updated_at = NOW()
        WHERE id = v_profile_id;
    ELSE
        -- Create new profile without user_id (will be linked later)
        INSERT INTO telegram_profiles (
            telegram_id, first_name, last_name, username, language_code, is_premium
        ) VALUES (
            p_telegram_id, p_first_name, p_last_name, p_username, p_language_code, p_is_premium
        )
        RETURNING id INTO v_profile_id;

        -- Create credits record for this telegram user
        INSERT INTO credits (user_id, amount, subscription_stars, package_stars)
        VALUES (v_profile_id, 50, 0, 50)
        ON CONFLICT (user_id) DO NOTHING;
    END IF;

    RETURN v_profile_id;
END;
$$ LANGUAGE plpgsql;

