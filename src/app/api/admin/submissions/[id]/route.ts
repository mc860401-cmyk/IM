import { NextResponse } from "next/server";
import { adminApiGuard } from "@/lib/auth";
import { STATUSES, type Status } from "@/lib/constants";
import { deleteSubmission, isValidId, updateStatus } from "@/lib/submissions";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const denied = await adminApiGuard(req);
  if (denied) return denied;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const status = body.status as Status;
  if (!isValidId(id) || !(status in STATUSES)) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  if (!(await updateStatus(id, status))) return NextResponse.json({ error: "접수 건이 없습니다." }, { status: 404 });
  return NextResponse.json({ ok: true, status });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const denied = await adminApiGuard(req);
  if (denied) return denied;
  const { id } = await params;
  if (!isValidId(id)) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  if (!(await deleteSubmission(id))) return NextResponse.json({ error: "접수 건이 없습니다." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
