import { after, NextResponse } from "next/server";
import { LIMITS } from "@/lib/constants";
import { checkFile } from "@/lib/files";
import { cleanupStalePending, savePendingUpload } from "@/lib/uploads";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > LIMITS.fileMaxBytes + 64 * 1024) {
    return NextResponse.json({ error: "파일당 4MB까지 올릴 수 있습니다." }, { status: 413 });
  }
  let file: FormDataEntryValue | null;
  try {
    file = (await req.formData()).get("file");
  } catch {
    return NextResponse.json({ error: "업로드 형식이 올바르지 않습니다." }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const check = checkFile(file.name, buf);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 422 });

  try {
    const saved = await savePendingUpload(file.name, check.mime, buf);
    after(() => cleanupStalePending().catch((e) => console.error("[upload] 임시파일 정리 실패", e)));
    return NextResponse.json(saved, { status: 201 });
  } catch (e) {
    console.error("[upload] 저장 실패", e);
    return NextResponse.json({ error: "파일 저장 중 오류가 발생했습니다." }, { status: 500 });
  }
}
