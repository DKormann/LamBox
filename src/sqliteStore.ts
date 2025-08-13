import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '../data.db');
const db = new Database(dbPath);

db.prepare(`
  CREATE TABLE IF NOT EXISTS lambdas (
    hash TEXT PRIMARY KEY,
    code TEXT NOT NULL
  )
`).run();

export function saveLambda(hash: string, code: string) {
  db.prepare(`
    INSERT INTO lambdas (hash, code) VALUES (?, ?)
    ON CONFLICT(hash) DO UPDATE SET code = excluded.code
  `).run(hash, code);
}

export function getLambda(hash: string): string | null {
  const row = db
    .prepare('SELECT code FROM lambdas WHERE hash = ?')
    .get(hash) as { code: string } | undefined;
  return row ? row.code : null;
}

// export function getAllLambdas(): { hash: string; code: string }[] {
//   return db.prepare('SELECT hash, code FROM lambdas').all();
// }

export function deleteLambda(hash: string) {
  db.prepare('DELETE FROM lambdas WHERE hash = ?').run(hash);
}
