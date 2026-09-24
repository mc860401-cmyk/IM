import "server-only";
import path from "node:path";
import fs from "node:fs";

/**
 * DB 접근 계층.
 * - 운영(Vercel): DATABASE_URL이 있으면 Neon Postgres.
 * - 로컬·테스트: PGlite(내장 Postgres). DB_PATH=memory 이면 메모리, 아니면 ./data/pglite.
 * 두 경우 모두 같은 Postgres SQL을 쓴다.
 */

export type Row = Record<string, unknown>;

export interface Queryable {
  query<T extends Row = Row>(sql: string, params?: unknown[]): Promise<T[]>;
}

export interface Db extends Queryable {
  tx<T>(fn: (q: Queryable) => Promise<T>): Promise<T>;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS submissions (
  id            BIGSERIAL PRIMARY KEY,
  receipt_no    TEXT NOT NULL UNIQUE,
  status        TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_progress','done')),
  applicant_type TEXT NOT NULL CHECK (applicant_type IN ('individual','guardian','corporation')),
  applicant     JSONB NOT NULL,
  display_name  TEXT NOT NULL,
  phone         TEXT NOT NULL,
  email         TEXT NOT NULL,
  narrative     TEXT,
  consent_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS submissions_created_idx ON submissions (created_at DESC);

CREATE TABLE IF NOT EXISTS comments (
  id                 BIGSERIAL PRIMARY KEY,
  submission_id      BIGINT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  position           INT NOT NULL,
  content            TEXT NOT NULL,
  platform           TEXT,
  url                TEXT,
  posted_date        DATE,
  posted_time        TEXT,
  offender_nickname  TEXT,
  offender_account   TEXT,
  offender_real_name TEXT,
  offender_relation  TEXT,
  harm_types         TEXT[] NOT NULL DEFAULT '{}',
  post_status        TEXT,
  first_known_date   DATE
);
CREATE INDEX IF NOT EXISTS comments_submission_idx ON comments (submission_id, position);

CREATE TABLE IF NOT EXISTS evidence_files (
  id            TEXT PRIMARY KEY,
  submission_id BIGINT REFERENCES submissions(id) ON DELETE CASCADE,
  comment_id    BIGINT REFERENCES comments(id) ON DELETE CASCADE,
  original_name TEXT NOT NULL,
  mime          TEXT NOT NULL,
  size          INT NOT NULL,
  storage_key   TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS evidence_submission_idx ON evidence_files (submission_id);

CREATE TABLE IF NOT EXISTS memos (
  id            BIGSERIAL PRIMARY KEY,
  submission_id BIGINT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  body          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS receipt_counters (
  day     TEXT PRIMARY KEY,
  last_no INT NOT NULL
);
`;

async function createNeonDb(url: string): Promise<Db> {
  const { Pool } = await import("@neondatabase/serverless");
  const pool = new Pool({ connectionString: url });
  return {
    async query(sql, params = []) {
      const res = await pool.query(sql, params as unknown[]);
      return res.rows;
    },
    async tx(fn) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await fn({
          async query(sql, params = []) {
            const res = await client.query(sql, params as unknown[]);
            return res.rows;
          },
        });
        await client.query("COMMIT");
        return result;
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },
  };
}

async function createPgliteDb(): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const target = process.env.DB_PATH ?? path.join(process.cwd(), "data", "pglite");
  let pg;
  if (target === "memory") {
    pg = new PGlite();
  } else {
    fs.mkdirSync(target, { recursive: true });
    pg = new PGlite(target);
  }
  // PGlite는 단일 연결이므로 트랜잭션이 끝날 때까지 다른 쿼리를 줄 세운다.
  let chain: Promise<unknown> = Promise.resolve();
  const serial = <T>(job: () => Promise<T>): Promise<T> => {
    const next = chain.then(job, job);
    chain = next.catch(() => undefined);
    return next;
  };
  return {
    query: (sql, params = []) =>
      serial(async () => (await pg.query(sql, params as unknown[])).rows as never),
    tx: (fn) =>
      serial(() =>
        pg.transaction((t) =>
          fn({ query: async (sql, params = []) => (await t.query(sql, params as unknown[])).rows as never }),
        ),
      ),
  };
}

const globalForDb = globalThis as unknown as { __cbDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  if (!globalForDb.__cbDb) {
    globalForDb.__cbDb = (async () => {
      const db = process.env.DATABASE_URL
        ? await createNeonDb(process.env.DATABASE_URL)
        : await createPgliteDb();
      for (const stmt of SCHEMA.split(";").map((s) => s.trim()).filter(Boolean)) {
        await db.query(stmt);
      }
      return db;
    })().catch((e) => {
      globalForDb.__cbDb = undefined;
      throw e;
    });
  }
  return globalForDb.__cbDb;
}
