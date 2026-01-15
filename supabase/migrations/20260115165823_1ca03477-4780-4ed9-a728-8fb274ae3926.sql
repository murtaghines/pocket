-- Create table for account deletion confirmations
CREATE TABLE public.deletion_confirmations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deletion_confirmations ENABLE ROW LEVEL SECURITY;

-- Users can view their own confirmations
CREATE POLICY "Users can view their own deletion confirmations"
ON public.deletion_confirmations
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own confirmations
CREATE POLICY "Users can create their own deletion confirmations"
ON public.deletion_confirmations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own confirmations
CREATE POLICY "Users can delete their own deletion confirmations"
ON public.deletion_confirmations
FOR DELETE
USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX idx_deletion_confirmations_user_id ON public.deletion_confirmations(user_id);
CREATE INDEX idx_deletion_confirmations_expires_at ON public.deletion_confirmations(expires_at);