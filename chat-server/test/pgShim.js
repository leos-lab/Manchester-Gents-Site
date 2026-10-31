// Test-only stand-in for pg.Pool that runs queries through psql, so the real SQL
// is exercised against Postgres without installing the pg package.
import { execFileSync } from 'node:child_process';

function literal(v) {
  if (v === null || v === undefined) return 'NULL';
  if (Array.isArray(v)) return `ARRAY[${v.map(literal).join(',')}]::text[]`;
  if (typeof v === 'boolean' || typeof v === 'number') return String(v);
  if (v instanceof Date) return `'${v.toISOString()}'`;
  return `'${String(v).replace(/'/g, "''")}'`;
}

export function createShimPool({ host, port, db }) {
  return {
    async query(sql, args = []) {
      const bound = sql.replace(/\$(\d+)/g, (_, n) => literal(args[Number(n) - 1]));
      const returns = /^\s*SELECT/i.test(bound) || /RETURNING/i.test(bound);
      const q = returns
        ? `WITH t AS (${bound}) SELECT coalesce(json_agg(t), '[]') FROM t`
        : bound;
      const out = execFileSync('psql', ['-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-h', host, '-p', String(port), '-U', 'postgres', db, '-c', q], { encoding: 'utf8' });
      return { rows: returns ? JSON.parse(out.trim() || '[]') : [] };
    }
  };
}
