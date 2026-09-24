import { describe, expect, it } from "vitest";
import { formatReceiptNo } from "@/lib/receipt";
import { kstDayKey, formatKst } from "@/lib/time";

describe("접수번호", () => {
  it("CB-YYYYMMDD-NNNN 형식", () => {
    expect(formatReceiptNo("20260924", 1)).toBe("CB-20260924-0001");
    expect(formatReceiptNo("20260924", 1234)).toBe("CB-20260924-1234");
  });
  it("KST 기준 날짜 경계: UTC 15:00 = KST 다음날 00:00", () => {
    expect(kstDayKey(new Date("2026-09-24T14:59:59Z"))).toBe("20260924");
    expect(kstDayKey(new Date("2026-09-24T15:00:00Z"))).toBe("20260925");
  });
  it("KST 표시", () => {
    expect(formatKst("2026-09-24T05:07:00Z")).toBe("2026-09-24 14:07");
  });
});
