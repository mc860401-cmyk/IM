import { describe, expect, it } from "vitest";
import { checkFile, sniffMime } from "@/lib/files";

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const JPG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const PDF = new TextEncoder().encode("%PDF-1.7\n...");
const WEBP = new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ");

describe("증거파일 형식 검사", () => {
  it("매직바이트로 판별", () => {
    expect(sniffMime(PNG)).toBe("image/png");
    expect(sniffMime(JPG)).toBe("image/jpeg");
    expect(sniffMime(PDF)).toBe("application/pdf");
    expect(sniffMime(WEBP)).toBe("image/webp");
    expect(sniffMime(new TextEncoder().encode("<html>"))).toBeNull();
  });
  it("정상 파일 통과(.jpeg 확장자 포함)", () => {
    expect(checkFile("캡처.png", PNG)).toEqual({ ok: true, mime: "image/png" });
    expect(checkFile("a.JPEG", JPG)).toEqual({ ok: true, mime: "image/jpeg" });
  });
  it("허용 외 확장자·위장 파일·용량 초과 거부", () => {
    expect(checkFile("a.exe", PNG).ok).toBe(false);
    expect(checkFile("fake.png", PDF).ok).toBe(false);
    expect(checkFile("a.png", new TextEncoder().encode("hello")).ok).toBe(false);
    const big = new Uint8Array(4 * 1024 * 1024 + 1); big.set(PNG);
    expect(checkFile("big.png", big).ok).toBe(false);
  });
});
