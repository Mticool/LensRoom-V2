-- Add bot_mode column to telegram_user_settings
-- This tracks what the user is doing in the bot (e.g., generating photo/video)

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'telegram_user_settings' 
    AND column_name = 'bot_mode'
  ) THEN
    ALTER TABLE public.telegram_user_settings 
    ADD COLUMN bot_mode TEXT;
    
    COMMENT ON COLUMN public.telegram_user_settings.bot_mode IS 'Current bot interaction mode (gen_photo, gen_video, etc.)';
  END IF;
END $$;

