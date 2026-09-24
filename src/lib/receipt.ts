import type { Queryable } from "./db";
import { kstDayKey } from "./time";

/** 접수번호 CB-YYYYMMDD-NNNN (KST 일자별 일련번호) */
export function formatReceiptNo(day: string, no: number): string {
  return `CB-${day}-${String(no).padStart(4, "0")}`;
}

export async function issueReceiptNo(q: Queryable, now: Date = new Date()): Promise<string> {
  const day = kstDayKey(now);
  const rows = await q.query<{ last_no: number }>(
    `INSERT INTO receipt_counters (day, last_no) VALUES ($1, 1)
     ON CONFLICT (day) DO UPDATE SET last_no = receipt_counters.last_no + 1
     RETURNING last_no`,
    [day],
  );
  return formatReceiptNo(day, Number(rows[0].last_no));
}
