-- Add target_month column to uploads table
ALTER TABLE public.uploads ADD COLUMN target_month DATE;

-- Migrate existing uploads: set target_month to first day of the month based on created_at
UPDATE public.uploads SET target_month = date_trunc('month', created_at)::date;

-- Make the column required
ALTER TABLE public.uploads ALTER COLUMN target_month SET NOT NULL;

-- Add index for efficient querying by user and month
CREATE INDEX idx_uploads_target_month ON public.uploads(user_id, target_month);