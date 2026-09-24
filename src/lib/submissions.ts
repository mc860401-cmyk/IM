import "server-only";
import { getDb, type Queryable } from "./db";
import { issueReceiptNo } from "./receipt";
import type { CleanApplicant, CleanSubmission } from "./validation";
import { deleteFiles } from "./storage";
import type { ApplicantType, Status } from "./constants";

export class SubmissionError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
  }
}

async function insertSubmission(q: Queryable, s: CleanSubmission, now: Date) {
  const receiptNo = await issueReceiptNo(q, now);
  const [row] = await q.query<{ id: string }>(
    `INSERT INTO submissions
       (receipt_no, applicant_type, applicant, display_name, phone, email, narrative, consent_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $8)
     RETURNING id`,
    [receiptNo, s.applicantType, JSON.stringify(s.applicant), s.displayName, s.applicant.phone, s.applicant.email, s.narrative, now.toISOString()],
  );
  const submissionId = String(row.id);

  const commentIds: string[] = [];
  for (const [i, c] of s.comments.entries()) {
    const [cr] = await q.query<{ id: string }>(
      `INSERT INTO comments
         (submission_id, position, content, platform, url, posted_date, posted_time,
          offender_nickname, offender_account, offender_real_name, offender_relation,
          harm_types, post_status, first_known_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING id`,
      [submissionId, i + 1, c.content, c.platform, c.url, c.postedDate, c.postedTime,
       c.offenderNickname, c.offenderAccount, c.offenderRealName, c.offenderRelation,
       c.harmTypes, c.postStatus, c.firstKnownDate],
    );
    commentIds.push(String(cr.id));
  }
  return { submissionId, receiptNo, commentIds };
}

/** 업로드해 둔 임시 파일을 악플 항목에 연결한다. 하나라도 유효하지 않으면 접수 전체를 취소. */
async function attachFiles(q: Queryable, s: CleanSubmission, submissionId: string, commentIds: string[]) {
  const seen = new Set<string>();
  for (const [i, c] of s.comments.entries()) {
    const ids = c.fileIds.filter((id) => !seen.has(id) && seen.add(id));
    if (ids.length === 0) continue;
    const rows = await q.query(
      `UPDATE evidence_files SET submission_id = $1, comment_id = $2
        WHERE id = ANY($3::text[]) AND submission_id IS NULL
        RETURNING id`,
      [submissionId, commentIds[i], ids],
    );
    if (rows.length !== ids.length) {
      throw new SubmissionError(
        `악플 ${i + 1}의 첨부파일 중 만료되었거나 확인할 수 없는 파일이 있습니다. 해당 파일을 삭제 후 다시 첨부해 주세요.`,
        `comments.${i}.files`,
      );
    }
  }
}

export async function createSubmission(s: CleanSubmission, now: Date = new Date()) {
  const db = await getDb();
  return db.tx(async (q) => {
    const created = await insertSubmission(q, s, now);
    await attachFiles(q, s, created.submissionId, created.commentIds);
    return {
      id: created.submissionId,
      receiptNo: created.receiptNo,
      createdAt: now,
      fileCount: new Set(s.comments.flatMap((c) => c.fileIds)).size,
    };
  });
}

// ───────── 관리자 조회 ─────────

export interface SubmissionListItem {
  id: string;
  receipt_no: string;
  created_at: string;
  status: Status;
  display_name: string;
  applicant_type: ApplicantType;
  phone: string;
}

export const PAGE_SIZE = 50;

export async function listSubmissions(status: Status | null, page: number) {
  const db = await getDb();
  const where = status ? "WHERE status = $1" : "";
  const params: unknown[] = status ? [status] : [];
  const items = await db.query<SubmissionListItem>(
    `SELECT id::text, receipt_no, created_at, status, display_name, applicant_type, phone
       FROM submissions ${where}
      ORDER BY created_at DESC, id DESC
      LIMIT ${PAGE_SIZE} OFFSET ${Math.max(0, page - 1) * PAGE_SIZE}`,
    params,
  );
  const countRows = await db.query<{ status: Status; n: string }>(
    `SELECT status, count(*)::text AS n FROM submissions GROUP BY status`,
  );
  const counts: Record<Status | "all", number> = { all: 0, new: 0, in_progress: 0, done: 0 };
  for (const r of countRows) {
    counts[r.status] = Number(r.n);
    counts.all += Number(r.n);
  }
  return { items, counts };
}

export interface SubmissionDetail {
  id: string;
  receipt_no: string;
  status: Status;
  applicant_type: ApplicantType;
  applicant: CleanApplicant;
  display_name: string;
  narrative: string | null;
  consent_at: string;
  created_at: string;
  updated_at: string;
  comments: CommentDetail[];
  memos: { id: string; body: string; created_at: string }[];
}

export interface EvidenceMeta {
  id: string;
  comment_id: string;
  original_name: string;
  mime: string;
  size: number;
}

export interface CommentDetail {
  id: string;
  position: number;
  content: string;
  platform: string | null;
  url: string | null;
  posted_date: string | null;
  posted_time: string | null;
  offender_nickname: string | null;
  offender_account: string | null;
  offender_real_name: string | null;
  offender_relation: string | null;
  harm_types: string[];
  post_status: string | null;
  first_known_date: string | null;
  files: EvidenceMeta[];
}

const ID_RE = /^\d{1,18}$/;
export const isValidId = (id: string) => ID_RE.test(id);

export async function getSubmission(id: string): Promise<SubmissionDetail | null> {
  if (!isValidId(id)) return null;
  const db = await getDb();
  const [s] = await db.query<Omit<SubmissionDetail, "comments" | "memos">>(
    `SELECT id::text, receipt_no, status, applicant_type, applicant, display_name, narrative,
            consent_at, created_at, updated_at
       FROM submissions WHERE id = $1`,
    [id],
  );
  if (!s) return null;
  // DATE 는 문자열로 받아 시간대 변환 오류를 막는다.
  const comments = await db.query<Omit<CommentDetail, "files">>(
    `SELECT id::text, position, content, platform, url, posted_date::text, posted_time,
            offender_nickname, offender_account, offender_real_name, offender_relation,
            harm_types, post_status, first_known_date::text
       FROM comments WHERE submission_id = $1 ORDER BY position`,
    [id],
  );
  const files = await db.query<EvidenceMeta>(
    `SELECT id, comment_id::text, original_name, mime, size
       FROM evidence_files WHERE submission_id = $1 ORDER BY created_at, id`,
    [id],
  );
  const memos = await db.query<{ id: string; body: string; created_at: string }>(
    `SELECT id::text, body, created_at FROM memos WHERE submission_id = $1 ORDER BY created_at, id`,
    [id],
  );
  const applicant = typeof s.applicant === "string" ? JSON.parse(s.applicant) : s.applicant;
  return {
    ...s,
    applicant,
    comments: comments.map((c) => ({ ...c, files: files.filter((f) => f.comment_id === c.id) })),
    memos,
  };
}

export async function updateStatus(id: string, status: Status): Promise<boolean> {
  const db = await getDb();
  const rows = await db.query(
    `UPDATE submissions SET status = $2, updated_at = now() WHERE id = $1 RETURNING id`,
    [id, status],
  );
  return rows.length === 1;
}

export async function addMemo(id: string, body: string) {
  const db = await getDb();
  return db.tx(async (q) => {
    const exists = await q.query(`SELECT 1 FROM submissions WHERE id = $1`, [id]);
    if (exists.length === 0) return null;
    const [m] = await q.query<{ id: string; body: string; created_at: string }>(
      `INSERT INTO memos (submission_id, body) VALUES ($1, $2) RETURNING id::text, body, created_at`,
      [id, body],
    );
    await q.query(`UPDATE submissions SET updated_at = now() WHERE id = $1`, [id]);
    return m;
  });
}

/** 접수 1건과 증거파일을 완전히 삭제한다. */
export async function deleteSubmission(id: string): Promise<boolean> {
  const db = await getDb();
  const keys = await db.tx(async (q) => {
    const files = await q.query<{ storage_key: string }>(
      `SELECT storage_key FROM evidence_files WHERE submission_id = $1`,
      [id],
    );
    const del = await q.query(`DELETE FROM submissions WHERE id = $1 RETURNING id`, [id]);
    return del.length === 1 ? files.map((f) => f.storage_key) : null;
  });
  if (keys === null) return false;
  await deleteFiles(keys);
  return true;
}

export async function getAttachedFile(fileId: string) {
  const db = await getDb();
  const [f] = await db.query<{ original_name: string; mime: string; size: number; storage_key: string }>(
    `SELECT original_name, mime, size, storage_key FROM evidence_files
      WHERE id = $1 AND submission_id IS NOT NULL`,
    [fileId],
  );
  return f ?? null;
}
