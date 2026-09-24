import { adminApiGuard } from "@/lib/auth";
import { getAttachedFile } from "@/lib/submissions";
import { getFile } from "@/lib/storage";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f-]{36}$/;

export async function GET(req: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const denied = await adminApiGuard(req);
  if (denied) return denied;
  const { fileId } = await params;
  if (!UUID_RE.test(fileId)) return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  const meta = await getAttachedFile(fileId);
  if (!meta) return Response.json({ error: "파일이 없습니다." }, { status: 404 });
  const stored = await getFile(meta.storage_key, meta.mime);
  if (!stored) return Response.json({ error: "저장소에서 파일을 찾을 수 없습니다." }, { status: 404 });
  const inline = new URL(req.url).searchParams.get("inline") === "1";
  const ascii = meta.original_name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return new Response(stored.body, {
    headers: {
      "Content-Type": meta.mime,
      "Content-Length": String(meta.size),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(meta.original_name)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
      // 이미지는 샌드박스로 격리(PDF는 샌드박스 시 브라우저 뷰어가 막혀 제외)
      "Content-Security-Policy": meta.mime === "application/pdf"
        ? "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'"
        : "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
