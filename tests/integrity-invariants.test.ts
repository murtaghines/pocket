import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Static guards for the transaction-integrity invariant (see docs/epics/uploads.md
 * "Modelo de integridad"). These lock down, at CI time, the single load-bearing rule
 * that makes re-upload dedup survive user edits:
 *
 *   The `fingerprint` is frozen at import and must NEVER be recomputed on UPDATE.
 *
 * If a future change either (a) adds a BEFORE/AFTER UPDATE trigger on `transactions`
 * that regenerates the fingerprint, or (b) includes `fingerprint` in an edit's
 * `.update()` payload, re-uploading the same statement would stop matching the original
 * row and silently duplicate it. Both are caught here.
 */

const REPO = resolve(__dirname, '..');

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

describe('integrity invariant: fingerprint is frozen at import', () => {
  it('no migration defines a BEFORE/AFTER UPDATE trigger on the transactions table', () => {
    const sqlFiles = walk(join(REPO, 'supabase', 'migrations'), ['.sql']);
    const offenders: string[] = [];
    // CREATE TRIGGER ... [BEFORE|AFTER] ... UPDATE ... ON [public.]transactions
    const re =
      /create\s+trigger[\s\S]{0,300}?\bupdate\b[\s\S]{0,120}?\bon\s+(?:public\.)?transactions\b/i;
    for (const f of sqlFiles) {
      if (re.test(readFileSync(f, 'utf8'))) offenders.push(f.replace(REPO + '/', ''));
    }
    expect(
      offenders,
      `UPDATE trigger(s) on transactions would risk recomputing the frozen fingerprint:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  it('no .update() on transactions writes the fingerprint column (edits must not touch it)', () => {
    // Scan application + edge-function source. Import INSERT/upsert legitimately SETS the
    // fingerprint (that is the frozen value); only UPDATE payloads are forbidden from it.
    const files = [
      ...walk(join(REPO, 'src'), ['.ts', '.tsx']),
      ...walk(join(REPO, 'supabase', 'functions'), ['.ts']),
    ];
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      // Only transaction-table updates matter. Anchor on `.from("transactions").update(`
      // so updates to other tables (imports status, audit_log, etc.) don't false-positive.
      // Payloads here are small — `.update({...}).eq/.in(...)` — so inspect a forward window.
      const re = /\.from\((['"])transactions\1\)\s*\.update\(/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src)) !== null) {
        const window = src.slice(m.index, m.index + 400);
        if (/fingerprint/i.test(window)) {
          offenders.push(f.replace(REPO + '/', ''));
          break;
        }
      }
    }
    expect(
      offenders,
      `.update() payload including 'fingerprint' would break re-upload dedup:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });
});
