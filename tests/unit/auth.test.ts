import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("next/navigation", () => ({ redirect: () => { throw new Error("redirect"); } }));

let auth: typeof import("@/lib/auth");
beforeAll(async () => {
  process.env.SESSION_SECRET = "x".repeat(40);
  process.env.ADMIN_PASSWORD = "correct horse";
  auth = await import("@/lib/auth");
});

describe("관리자 인증", () => {
  it("비밀번호 확인", () => {
    expect(auth.checkPassword("correct horse")).toBe(true);
    expect(auth.checkPassword("wrong")).toBe(false);
  });
  it("세션 토큰: 정상·위조·만료", () => {
    const now = Date.now();
    const t = auth.createSessionToken(now);
    expect(auth.verifySessionToken(t, now + 1000)).toBe(true);
    expect(auth.verifySessionToken(t + "x", now)).toBe(false);
    const [p] = t.split(".");
    expect(auth.verifySessionToken(`${p}.AAAA`, now)).toBe(false);
    expect(auth.verifySessionToken(t, now + 13 * 3600_000)).toBe(false);
    expect(auth.verifySessionToken(undefined)).toBe(false);
  });
});
