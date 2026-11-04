ALTER TABLE imports
  ADD COLUMN IF NOT EXISTS processing_strategy text;

COMMENT ON COLUMN imports.processing_strategy IS 'How the import was processed: deterministic_csv, ai_haiku, ai_chunked_sonnet, ai_vision';
