import { ALLOWED_MIME, LIMITS, type AllowedMime } from "./constants";

/** 파일 앞부분(매직바이트)으로 실제 형식을 판별한다. */
export function sniffMime(buf: Uint8Array): AllowedMime | null {
  const b = (i: number) => buf[i];
  if (buf.length >= 3 && b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return "image/jpeg";
  if (buf.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b(i) === v)) return "image/png";
  if (buf.length >= 12 && ascii(buf, 0, 4) === "RIFF" && ascii(buf, 8, 12) === "WEBP") return "image/webp";
  if (buf.length >= 5 && ascii(buf, 0, 5) === "%PDF-") return "application/pdf";
  return null;
}

function ascii(buf: Uint8Array, from: number, to: number): string {
  return String.fromCharCode(...buf.subarray(from, to));
}

export function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

export const ACCEPT_ATTR = Object.values(ALLOWED_MIME).flat().join(",");

/** 업로드 전 클라이언트용 1차 검사(이름·크기). */
export function precheckFile(name: string, size: number): string | null {
  const ext = extOf(name);
  const allowed = Object.values(ALLOWED_MIME).flat() as string[];
  if (!allowed.includes(ext)) return "JPG·PNG·WEBP·PDF 파일만 올릴 수 있습니다.";
  if (size > LIMITS.fileMaxBytes) return "파일당 4MB까지 올릴 수 있습니다.";
  if (size === 0) return "빈 파일입니다.";
  return null;
}

/** 서버 최종 검사: 확장자·크기·실제 형식이 모두 맞아야 통과. */
export function checkFile(name: string, buf: Uint8Array): { ok: true; mime: AllowedMime } | { ok: false; error: string } {
  const pre = precheckFile(name, buf.length);
  if (pre) return { ok: false, error: pre };
  const mime = sniffMime(buf);
  if (!mime) return { ok: false, error: "파일 내용이 JPG·PNG·WEBP·PDF 형식이 아닙니다." };
  if (!(ALLOWED_MIME[mime] as readonly string[]).includes(extOf(name))) {
    return { ok: false, error: "파일 확장자와 실제 형식이 일치하지 않습니다." };
  }
  return { ok: true, mime };
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)}KB`;
  return `${(n / 1024 / 1024).toFixed(1)}MB`;
}
