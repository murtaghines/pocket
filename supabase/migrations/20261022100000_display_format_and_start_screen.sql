-- Display formats and dashboard start screen.
--   display_format: user overrides for number / currency / date formatting. Keys (all optional,
--     missing = follow the country's locale): decimal, group, currencyPosition, currencySpace,
--     currencyDisplay, dateSeparator, dateStyle, timeFormat. Validated by sanitizeDisplayFormat().
--   default_period: which dashboard view opens by default (month | week | year).
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS display_format jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS default_period text NOT NULL DEFAULT 'month'
    CHECK (default_period IN ('month', 'week', 'year'));
