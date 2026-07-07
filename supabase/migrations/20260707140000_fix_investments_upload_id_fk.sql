-- investments.upload_id has always been written/read as an `imports.id` value
-- (process-investment-file, useInvestments, UploadedFilesHistoryList all treat it
-- that way), but its FK still pointed at the legacy `uploads` table. Real investment
-- uploads were failing the insert with a FK violation. Retarget the FK to `imports(id)`.
-- See docs/epics/uploads.md "Fase 4 progress" for how this was found.
ALTER TABLE public.investments
  DROP CONSTRAINT investments_upload_id_fkey;

ALTER TABLE public.investments
  ADD CONSTRAINT investments_upload_id_fkey
  FOREIGN KEY (upload_id) REFERENCES public.imports(id) ON DELETE CASCADE;
