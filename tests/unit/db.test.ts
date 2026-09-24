import { describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { issueReceiptNo } from "@/lib/receipt";

describe("DB·접수번호 발급", () => {
  it("스키마 생성 후 같은 날 일련번호가 1씩 증가하고 날짜가 바뀌면 1부터", async () => {
    const db = await getDb();
    const t = new Date("2026-09-24T03:00:00Z");
    const a = await db.tx((q) => issueReceiptNo(q, t));
    const b = await db.tx((q) => issueReceiptNo(q, t));
    const c = await issueReceiptNo(db, new Date("2026-09-25T03:00:00Z"));
    expect([a, b, c]).toEqual(["CB-20260924-0001", "CB-20260924-0002", "CB-20260925-0001"]);
  });
  it("트랜잭션 실패 시 롤백", async () => {
    const db = await getDb();
    const t = new Date("2026-10-01T03:00:00Z");
    await expect(
      db.tx(async (q) => { await issueReceiptNo(q, t); throw new Error("boom"); }),
    ).rejects.toThrow("boom");
    expect(await issueReceiptNo(db, t)).toBe("CB-20261001-0001");
  });
});
