-- Storage: UPDATE policy scoped to file owner
DROP POLICY IF EXISTS "Users can update their own financial files" ON storage.objects;
CREATE POLICY "Users can update their own financial files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'financial-files' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'financial-files' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- email_otps: explicitly block all client access (service role bypasses RLS)
DROP POLICY IF EXISTS "Deny all client access to email_otps" ON public.email_otps;
CREATE POLICY "Deny all client access to email_otps"
ON public.email_otps
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);