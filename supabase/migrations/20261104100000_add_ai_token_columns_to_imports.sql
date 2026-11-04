ALTER TABLE imports
  ADD COLUMN IF NOT EXISTS ai_input_tokens  integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_output_tokens integer DEFAULT 0;

COMMENT ON COLUMN imports.ai_input_tokens  IS 'Anthropic API input tokens consumed for this import';
COMMENT ON COLUMN imports.ai_output_tokens IS 'Anthropic API output tokens consumed for this import';
