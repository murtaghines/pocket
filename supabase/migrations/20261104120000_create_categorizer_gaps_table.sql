CREATE TABLE IF NOT EXISTS categorizer_gaps (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description   text NOT NULL,
  description_norm text,
  movement      text NOT NULL,
  final_category text NOT NULL,
  categorized_by text NOT NULL,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categorizer_gaps_category ON categorizer_gaps (final_category);
CREATE INDEX IF NOT EXISTS idx_categorizer_gaps_created ON categorizer_gaps (created_at);

COMMENT ON TABLE categorizer_gaps IS 'Tracks descriptions that fell to other_* or were only categorized by AI — candidates for new categorizer patterns';
