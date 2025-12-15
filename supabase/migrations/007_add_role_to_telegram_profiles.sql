-- =============================================
-- ADD ROLE COLUMN TO TELEGRAM_PROFILES
-- =============================================

-- Add role column with default 'user'
ALTER TABLE public.telegram_profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'manager', 'admin'));

-- Set role='admin' for users where is_admin=true
UPDATE public.telegram_profiles 
SET role = 'admin' 
WHERE is_admin = true AND (role IS NULL OR role = 'user');

-- Create index for role lookups
CREATE INDEX IF NOT EXISTS idx_telegram_profiles_role ON public.telegram_profiles(role);

COMMENT ON COLUMN public.telegram_profiles.role IS 'User role: user, manager, or admin';
