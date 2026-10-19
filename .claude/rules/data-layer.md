---
paths:
  - "src/hooks/**"
  - "src/integrations/supabase/**"
  - "supabase/**"
---
# Data layer (cross-cutting, all modules)
- Never edit `src/integrations/supabase/types.ts` by hand — it's regenerated from the schema
- Never edit an already-applied migration — always create a new one in `supabase/migrations/`
- All data logic lives in a custom hook (`useX.tsx`); components never fetch directly
- Edge functions are kebab-case, one folder per function, shared logic in `_shared/`
- Migrations ship automatically: merging to `main` runs `.github/workflows/deploy-migrations.yml`
  (`scripts/sync-migrations.sh` → `supabase db push`). Don't apply migrations by hand through the
  Supabase dashboard/MCP — the history would drift from the repo again. Always add a file under
  `supabase/migrations/`. `DRY_RUN=1 scripts/sync-migrations.sh` previews a run (needs `supabase link`)
