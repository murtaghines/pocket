-- Global learning merchant→category dictionary (categorization "Phase 2").
--
-- A shared, cross-user table that grows from every import's categorizations and (heavily) from
-- user corrections, and is consulted deterministically at import so a known merchant always gets
-- the same, correct category. It stores ONLY merchant names + categories — no user_id, no amounts,
-- no PII. The import pipeline guards against ever writing a person's name here (see
-- supabase/functions/_shared/merchantKey.ts).
--
-- Consensus uses a single weighted score per category (user correction = 100, so it always wins;
-- ai/categorizer = 1). A category becomes the resolved answer once its score reaches 3 (i.e. one
-- user correction, or three independent AI/categorizer agreements).

CREATE TABLE IF NOT EXISTS public.merchant_categories (
  merchant_key         text PRIMARY KEY,
  movement             text,
  category_votes       jsonb       NOT NULL DEFAULT '{}'::jsonb,   -- { "restaurants": 4, "groceries": 100 }
  resolved_category    text,                                       -- null until a category reaches the threshold
  resolved_confidence  real,
  hit_count            integer     NOT NULL DEFAULT 0,
  sample_description   text,
  is_locked            boolean     NOT NULL DEFAULT false,         -- curated seed rows: never re-resolved
  first_seen           timestamptz NOT NULL DEFAULT now(),
  last_seen            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS merchant_categories_resolved_idx
  ON public.merchant_categories (merchant_key) WHERE resolved_category IS NOT NULL;

-- Global reference data with no PII: lock it down to the service role only (edge functions use
-- the service key, which bypasses RLS). No policies for anon/authenticated → they cannot read it.
ALTER TABLE public.merchant_categories ENABLE ROW LEVEL SECURITY;

-- Batch upsert + consensus recompute, called once per import with an array of votes:
--   [{ "k": "MERCADONA", "cat": "groceries", "mov": "EXPENSE", "w": 1, "sample": "Mercadona" }, ...]
-- w = 100 for a user correction, 1 for ai/categorizer.
CREATE OR REPLACE FUNCTION public.apply_merchant_votes(votes jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v          jsonb;
  cur        public.merchant_categories%ROWTYPE;
  best_cat   text;
  best_score numeric;
BEGIN
  FOR v IN SELECT * FROM jsonb_array_elements(votes) LOOP
    CONTINUE WHEN (v->>'k') IS NULL OR (v->>'cat') IS NULL;

    INSERT INTO public.merchant_categories (merchant_key, movement, category_votes, hit_count, sample_description)
    VALUES (
      v->>'k', v->>'mov',
      jsonb_build_object(v->>'cat', COALESCE((v->>'w')::numeric, 1)),
      1, v->>'sample'
    )
    ON CONFLICT (merchant_key) DO UPDATE SET
      category_votes = jsonb_set(
        public.merchant_categories.category_votes,
        ARRAY[v->>'cat'],
        to_jsonb(
          COALESCE((public.merchant_categories.category_votes->>(v->>'cat'))::numeric, 0)
          + COALESCE((v->>'w')::numeric, 1)
        )
      ),
      hit_count          = public.merchant_categories.hit_count + 1,
      last_seen          = now(),
      movement           = COALESCE(public.merchant_categories.movement, EXCLUDED.movement),
      sample_description = COALESCE(public.merchant_categories.sample_description, EXCLUDED.sample_description);

    SELECT * INTO cur FROM public.merchant_categories WHERE merchant_key = v->>'k';
    IF NOT cur.is_locked THEN
      SELECT e.key, e.value::numeric
        INTO best_cat, best_score
        FROM jsonb_each_text(cur.category_votes) AS e(key, value)
        ORDER BY e.value::numeric DESC
        LIMIT 1;
      IF best_score >= 3 THEN
        UPDATE public.merchant_categories
          SET resolved_category   = best_cat,
              resolved_confidence  = CASE WHEN best_score >= 100 THEN 0.95 ELSE 0.90 END
          WHERE merchant_key = v->>'k';
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Curated seed rows for a couple of clear demo misses (locked so learning never downgrades them).
INSERT INTO public.merchant_categories (merchant_key, movement, category_votes, resolved_category, resolved_confidence, is_locked)
VALUES
  ('STAYFORLONG HOTEL', 'EXPENSE', '{"travel":100}'::jsonb,   'travel',    0.95, true),
  ('BOUNCE',            'EXPENSE', '{"transport":100}'::jsonb,'transport', 0.95, true)
ON CONFLICT (merchant_key) DO NOTHING;
