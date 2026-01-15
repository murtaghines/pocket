-- Add categorized_by column to track categorization source
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS categorized_by TEXT;

-- Add comment explaining values
COMMENT ON COLUMN transactions.categorized_by IS 'Tracks how transaction was categorized: user_rule, local_pattern, ai, or manual';