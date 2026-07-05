# Pocket

Pocket is a personal finance app for understanding and controlling your money
without manually logging every expense. You upload your bank statements
(Excel/CSV) month by month, and Pocket turns that chaos of transactions into
a clear picture of your financial life.

## What it does

- **Automatic transaction ingestion** — upload your bank statement (from one
  or several banks / joint accounts) and Pocket parses it, cleans it, and
  deduplicates it so no expense is ever counted twice.
- **Smart categorization** — every transaction is classified through a
  cascading engine: first your personal rules, then pattern matching (regex),
  and AI as a last-resort fallback. It learns from your corrections: if you
  recategorize a transaction, it gets it right on its own next time.
- **Transfer detection** between your own accounts, so they don't inflate
  either your income or your expenses.
- **Multi-account, multi-currency, and joint accounts** — several accounts,
  conversion to your base currency, and percentage splitting of shared
  expenses (e.g. 50/50 with your partner).
- **Investments** — a separate section for your portfolio, with performance
  by platform and asset type.

## Main sections

| Section | What it shows |
|---|---|
| **Dashboard** | The current month's snapshot: income, expenses, balance, savings rate, daily flow, spending by category, top expenses, accounts |
| **History** | Historical view combining all months, to spot trends over time |
| **Investments** | Tracking of invested net worth |
| **Planning** | *(in progress)* Planned payments and category budgets |

## Why it beats a spreadsheet

- Zero manual entry: you work with the statements your bank already gives you
- Learns from you: the more you use it, the more accurate the categorization gets
- Unified view: all your accounts, currencies, and investments in one place
- Your data is yours: edit categories and rules, or delete your account, whenever you want

## Tech stack

Vite · TypeScript · React · shadcn/ui · Tailwind CSS · Supabase (auth,
database, and edge functions) · TanStack Query · react-i18next (ES/EN)

## Running it locally

Requirement: Node.js and npm ([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)).

\`\`\`sh
git clone <REPO_URL>
cd pocket
npm i
npm run dev
\`\`\`

Other useful commands:

\`\`\`sh
npm run lint      # linting check
npm run build     # production build
\`\`\`

## Deploy

Every push to `main` deploys automatically via Vercel.

## Working on the project

The design system, architecture, and conventions are documented in
`CLAUDE.md` (repo root). The state of each module lives in `docs/epics/`. If
you're using Claude Code, `.claude/rules/` and `.claude/skills/` already have
per-module context loaded automatically.