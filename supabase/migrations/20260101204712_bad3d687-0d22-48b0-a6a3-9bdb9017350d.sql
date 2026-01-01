-- Add country and selected_categories to user_preferences
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS selected_categories TEXT[] DEFAULT ARRAY['food', 'transport', 'shopping', 'entertainment', 'bills', 'health', 'others'],
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_onboarding ON user_preferences(user_id, onboarding_completed);