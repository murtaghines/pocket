import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Static guards for the data-integrity invariant shared by both import pipelines (bank
 * statements and investments) — see docs/epics/uploads.md "Modelo de integridad" and
 * docs/epics/investments.md. These lock down, at CI time, the single load-bearing rule
 * that makes re-upload dedup survive user edits:
 *
 *   The dedup hash is frozen at import and must NEVER be recomputed on UPDATE.
 *
 * If a future change either (a) adds a BEFORE/AFTER UPDATE trigger on the table that
 * regenerates the hash, or (b) includes the hash column in an edit's `.update()` payload,
 * re-uploading the same file would stop matching the original row and silently duplicate it.
 * Both are caught here, for each { table, hashColumn } pair below.
 */

const REPO = resolve(__dirname, '..');

const DEDUP_TABLES: { table: string; hashColumn: string }[] = [
  { table: 'transactions', hashColumn: 'fingerprint' },
  { table: 'investments', hashColumn: 'transaction_hash' },
];

function walk(dir: string, exts: string[]): string[] {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (name === 'node_modules' || name === '.git' || name === 'dist') continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full, exts));
    else if (exts.some((e) => name.endsWith(e))) out.push(full);
  }
  return out;
}

describe.each(DEDUP_TABLES)(
  'integrity invariant: $table.$hashColumn is frozen at import',
  ({ table, hashColumn }) => {
    it(`no migration defines a BEFORE/AFTER UPDATE trigger on the ${table} table`, () => {
      const sqlFiles = walk(join(REPO, 'supabase', 'migrations'), ['.sql']);
      const offenders: string[] = [];
      // CREATE TRIGGER ... [BEFORE|AFTER] ... UPDATE ... ON [public.]<table>
      const re = new RegExp(
        `create\\s+trigger[\\s\\S]{0,300}?\\bupdate\\b[\\s\\S]{0,120}?\\bon\\s+(?:public\\.)?${table}\\b`,
        'i',
      );
      for (const f of sqlFiles) {
        if (re.test(readFileSync(f, 'utf8'))) offenders.push(f.replace(REPO + '/', ''));
      }
      expect(
        offenders,
        `UPDATE trigger(s) on ${table} would risk recomputing the frozen ${hashColumn}:\n${offenders.join('\n')}`,
      ).toEqual([]);
    });

    it(`no .update() on ${table} writes the ${hashColumn} column (edits must not touch it)`, () => {
      // Scan application + edge-function source. Import INSERT/upsert legitimately SETS the
      // hash (that is the frozen value); only UPDATE payloads are forbidden from it.
      const files = [
        ...walk(join(REPO, 'src'), ['.ts', '.tsx']),
        ...walk(join(REPO, 'supabase', 'functions'), ['.ts']),
      ];
      const offenders: string[] = [];
      // Only updates to this specific table matter. Anchor on `.from("<table>").update(`
      // so updates to other tables (imports status, audit_log, etc.) don't false-positive.
      // Payloads here are small — `.update({...}).eq/.in(...)` — so inspect a forward window.
      const re = new RegExp(`\\.from\\((['"])${table}\\1\\)\\s*\\.update\\(`, 'g');
      for (const f of files) {
        const src = readFileSync(f, 'utf8');
        let m: RegExpExecArray | null;
        while ((m = re.exec(src)) !== null) {
          const window = src.slice(m.index, m.index + 400);
          if (new RegExp(hashColumn, 'i').test(window)) {
            offenders.push(f.replace(REPO + '/', ''));
            break;
          }
        }
      }
      expect(
        offenders,
        `.update() payload including '${hashColumn}' would break re-upload dedup:\n${offenders.join('\n')}`,
      ).toEqual([]);
    });
  },
);
