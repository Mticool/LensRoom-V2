-- Remove English system voices from all users
DELETE FROM public.voices
WHERE minimax_voice_id IN (
  'English_Graceful_Lady',
  'English_Persuasive_Man',
  'English_radiant_girl',
  'English_Insightful_Speaker'
)
AND is_cloned = false;

-- Add comment
COMMENT ON TABLE public.voices IS 'User voices - both cloned and system presets';
