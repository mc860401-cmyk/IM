import { describe, expect, it } from "vitest";
import { buildNoticeMail } from "@/lib/notify";

describe("신규 접수 알림 메일", () => {
  const mail = buildNoticeMail({
    id: "7", receiptNo: "CB-20260924-0007", createdAt: new Date("2026-09-24T01:00:00Z"),
    applicantType: "individual", displayName: "홍길동", commentCount: 3, fileCount: 2,
    baseUrl: "https://example.vercel.app/",
  });
  it("제목·본문·링크", () => {
    expect(mail.subject).toBe("[악플 고소 접수] CB-20260924-0007 신규 접수");
    expect(mail.text).toContain("2026-09-24 10:00 (KST)");
    expect(mail.text).toContain("악플: 3건 / 증거파일: 2개");
    expect(mail.text).toContain("https://example.vercel.app/admin/submissions/7");
  });
});
