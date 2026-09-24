import { NextResponse } from "next/server";
import {
  checkPassword, createSessionToken, isPasswordConfigured, isSameOrigin,
  SESSION_COOKIE, sessionCookieOptions,
} from "@/lib/auth";

export const runtime = "nodejs";

// 무차별 대입 완화(인스턴스 단위, 최선 노력): IP별 10분에 10회
const attempts = new Map<string, { n: number; since: number }>();
const WINDOW = 10 * 60_000;
const MAX = 10;

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "허용되지 않은 요청입니다." }, { status: 403 });
  if (!isPasswordConfigured()) {
    return NextResponse.json({ error: "서버에 ADMIN_PASSWORD가 설정되지 않았습니다." }, { status: 503 });
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  const now = Date.now();
  const rec = attempts.get(ip);
  if (rec && now - rec.since < WINDOW && rec.n >= MAX) {
    return NextResponse.json({ error: "로그인 시도가 너무 많습니다. 10분 후 다시 시도해 주세요." }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";
  if (!checkPassword(password)) {
    const cur = rec && now - rec.since < WINDOW ? rec : { n: 0, since: now };
    attempts.set(ip, { n: cur.n + 1, since: cur.since });
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }
  attempts.delete(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, createSessionToken(), sessionCookieOptions);
  return res;
}
