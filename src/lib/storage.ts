import "server-only";
import path from "node:path";
import fs from "node:fs/promises";

/**
 * 증거파일 저장소.
 * - 운영: BLOB_READ_WRITE_TOKEN 이 있으면 Vercel Blob(비공개, access: 'private').
 * - 로컬·테스트: UPLOAD_DIR(기본 ./data/uploads).
 * 파일은 항상 관리자 인증을 거친 서버 경로로만 내려받는다.
 */

export interface StoredFile {
  body: ReadableStream<Uint8Array>;
  contentType: string;
}

const useBlob = () => {
  if (process.env.BLOB_READ_WRITE_TOKEN) return true;
  if (process.env.VERCEL) throw new Error("BLOB_READ_WRITE_TOKEN이 없습니다. Vercel 프로젝트에 Blob 저장소를 연결하세요.");
  return false;
};
const localDir = () => process.env.UPLOAD_DIR ?? path.join(/* turbopackIgnore: true */ process.cwd(), "data", "uploads");

function safeLocalPath(key: string): string {
  const base = path.resolve(localDir());
  const full = path.resolve(base, key);
  if (!full.startsWith(base + path.sep)) throw new Error("invalid storage key");
  return full;
}

/** 저장 후 이후 조회·삭제에 쓸 storage key를 돌려준다. */
export async function putFile(key: string, data: Buffer, contentType: string): Promise<string> {
  if (useBlob()) {
    const { put } = await import("@vercel/blob");
    const res = await put(`evidence/${key}`, data, {
      access: "private",
      contentType,
      addRandomSuffix: true,
    });
    return res.pathname;
  }
  const full = safeLocalPath(key);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, data);
  return key;
}

export async function getFile(storageKey: string, contentType: string): Promise<StoredFile | null> {
  if (useBlob()) {
    const { get } = await import("@vercel/blob");
    const res = await get(storageKey, { access: "private", useCache: false });
    if (!res || res.statusCode !== 200) return null;
    return { body: res.stream, contentType: res.blob.contentType || contentType };
  }
  try {
    const buf = await fs.readFile(safeLocalPath(storageKey));
    return {
      body: new ReadableStream({
        start(c) { c.enqueue(new Uint8Array(buf)); c.close(); },
      }),
      contentType,
    };
  } catch {
    return null;
  }
}

export async function deleteFiles(storageKeys: string[]): Promise<void> {
  if (storageKeys.length === 0) return;
  if (useBlob()) {
    const { del } = await import("@vercel/blob");
    await del(storageKeys);
    return;
  }
  await Promise.all(storageKeys.map((k) => fs.rm(safeLocalPath(k), { force: true })));
}
