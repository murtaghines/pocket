-- Add domain column to uploads table
ALTER TABLE public.uploads 
ADD COLUMN domain public.app_domain NOT NULL DEFAULT 'CASHFLOW'::public.app_domain;

-- Update existing investment uploads based on file_path
UPDATE public.uploads 
SET domain = 'INVESTING'::public.app_domain 
WHERE file_path LIKE '%/investments/%';

-- Create index for better filtering
CREATE INDEX idx_uploads_domain ON public.uploads(domain);
CREATE INDEX idx_uploads_user_domain ON public.uploads(user_id, domain);