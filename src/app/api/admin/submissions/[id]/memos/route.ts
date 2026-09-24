import { NextResponse } from "next/server";
import { adminApiGuard } from "@/lib/auth";
import { addMemo, isValidId } from "@/lib/submissions";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminApiGuard(req);
  if (denied) return denied;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!isValidId(id) || !text) return NextResponse.json({ error: "메모 내용을 입력해 주세요." }, { status: 400 });
  if (text.length > 5000) return NextResponse.json({ error: "메모는 5,000자 이하로 입력해 주세요." }, { status: 400 });
  const memo = await addMemo(id, text);
  if (!memo) return NextResponse.json({ error: "접수 건이 없습니다." }, { status: 404 });
  return NextResponse.json(memo, { status: 201 });
}
