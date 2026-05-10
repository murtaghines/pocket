CREATE TABLE public.email_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_otps_email ON public.email_otps (email, created_at DESC);

ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;

-- No policies = no client access. Only service role (edge functions) can read/write.
