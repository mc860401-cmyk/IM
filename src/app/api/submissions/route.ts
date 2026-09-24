import { after, NextResponse } from "next/server";
import { validateSubmission } from "@/lib/validation";
import { createSubmission, SubmissionError } from "@/lib/submissions";
import { notifyNewSubmission } from "@/lib/notify";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }
  const v = validateSubmission(body);
  if (!v.ok) {
    return NextResponse.json({ error: "입력값을 확인해 주세요.", errors: v.errors }, { status: 422 });
  }
  try {
    const created = await createSubmission(v.data);
    const { receiptNo } = created;
    // 알림 실패는 접수 결과에 영향을 주지 않는다. 응답 후 실행.
    const baseUrl = process.env.APP_BASE_URL || new URL(req.url).origin;
    after(() =>
      notifyNewSubmission({
        id: created.id,
        receiptNo,
        createdAt: created.createdAt,
        applicantType: v.data.applicantType,
        displayName: v.data.displayName,
        commentCount: v.data.comments.length,
        fileCount: created.fileCount,
        baseUrl,
      }).catch((e) => console.error("[notify] 메일 발송 실패", e)),
    );
    return NextResponse.json({ receiptNo }, { status: 201 });
  } catch (e) {
    if (e instanceof SubmissionError) {
      return NextResponse.json(
        { error: e.message, errors: e.field ? { [e.field]: e.message } : undefined },
        { status: 422 },
      );
    }
    console.error("[submission] 저장 실패", e);
    return NextResponse.json({ error: "접수 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
