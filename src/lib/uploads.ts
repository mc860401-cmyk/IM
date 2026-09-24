import "server-only";
import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import { deleteFiles, putFile } from "./storage";
import { ALLOWED_MIME, type AllowedMime } from "./constants";

const PENDING_TTL_HOURS = 24;

export async function savePendingUpload(originalName: string, mime: AllowedMime, data: Buffer) {
  const id = randomUUID();
  const ext = ALLOWED_MIME[mime][0];
  const storageKey = await putFile(`${id}${ext}`, data, mime);
  const db = await getDb();
  await db.query(
    `INSERT INTO evidence_files (id, original_name, mime, size, storage_key) VALUES ($1, $2, $3, $4, $5)`,
    [id, originalName.slice(0, 255), mime, data.length, storageKey],
  );
  return { id, name: originalName, size: data.length, mime };
}

/** 제출되지 않고 24시간 지난 임시 파일 정리(업로드 시점에 조금씩). */
export async function cleanupStalePending(limit = 50): Promise<number> {
  const db = await getDb();
  const rows = await db.query<{ id: string; storage_key: string }>(
    `DELETE FROM evidence_files
      WHERE id IN (
        SELECT id FROM evidence_files
         WHERE submission_id IS NULL AND created_at < now() - ($1 || ' hours')::interval
         LIMIT $2)
      RETURNING id, storage_key`,
    [String(PENDING_TTL_HOURS), limit],
  );
  await deleteFiles(rows.map((r) => r.storage_key));
  return rows.length;
}
