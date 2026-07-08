-- Add PARTIAL to import_status. Previously, a partially-successful import (some rows
-- inserted, some failed) was left as NORMALIZED with only error_message set to flag the
-- problem -- indistinguishable from a fully-successful import if you only look at status.
-- process-import now sets PARTIAL explicitly in that case. See docs/epics/uploads.md.

ALTER TYPE import_status ADD VALUE IF NOT EXISTS 'PARTIAL';
