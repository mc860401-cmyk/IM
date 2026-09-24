import "server-only";
import { getDb, type Queryable } from "./db";
import { issueReceiptNo } from "./receipt";
import type { CleanSubmission } from "./validation";
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
    return { id: created.submissionId, receiptNo: created.receiptNo };
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
