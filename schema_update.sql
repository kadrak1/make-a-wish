-- Run this in your Supabase SQL Editor to add the missing columns

ALTER TABLE user_quests 
ADD COLUMN IF NOT EXISTS main_quests_config JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS world_quests_config JSONB DEFAULT '[]'::jsonb;

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_quests';
