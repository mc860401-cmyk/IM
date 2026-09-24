import { expect, test } from "@playwright/test";
import zlib from "node:zlib";
import fs from "node:fs";

const SHOTS = process.env.E2E_SHOTS_DIR;
const shot = async (page: import("@playwright/test").Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
};

/** 8x8 빨간 PNG (증거 캡처 대용) */
function makePng(): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (b: Buffer) => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(8, 0); ihdr.writeUInt32BE(8, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.concat(Array.from({ length: 8 }, () => Buffer.concat([Buffer.from([0]), Buffer.alloc(24, 0).fill(Buffer.from([255, 0, 0]))])));
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

test.describe.configure({ mode: "serial" });

let receiptNo = "";
const png = makePng();

test("필수값 누락 시 접수되지 않고 오류가 표시된다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "접수하기" }).click();
  await expect(page.getByText("접수자 유형을 선택해 주세요.")).toBeVisible();
  await expect(page.getByText("악플 내용(원문)을 입력해 주세요.")).toBeVisible();
  await expect(page.getByText("개인정보 수집·이용에 동의해야 접수할 수 있습니다.")).toBeVisible();
  await expect(page).toHaveURL("/");
});

test("고객: 법정대리인이 악플 2건과 증거파일을 접수한다", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("법정대리인(미성년 피해자)").check();
  await page.getByLabel("법정대리인 이름").fill("테스트부모");
  await page.getByLabel("피해자와의 관계").selectOption("모");
  await page.getByLabel("휴대폰").fill("010-1234-5678");
  await page.getByLabel("이메일").fill("parent@example.com");
  await page.getByLabel("피해자 이름").fill("테스트자녀");
  await page.getByLabel("피해자 생년월일").fill("2012-05-06");

  const c1 = page.getByTestId("comment-0");
  await c1.getByLabel("내용(원문 그대로)").fill("[테스트] 너 같은 건 학교 나오지 마라");
  await c1.getByLabel("플랫폼").fill("인스타그램 DM");
  await c1.getByLabel("게시물 주소(URL)").fill("https://www.instagram.com/p/TEST123/");
  await c1.getByLabel("작성일").fill("2026-09-10");
  await c1.getByLabel("작성시각(아는 경우)").fill("21:30");
  await c1.getByLabel("가해자 닉네임").fill("anon_troll");
  await c1.getByLabel("모욕", { exact: true }).check();
  await c1.getByLabel("협박", { exact: true }).check();
  await c1.getByLabel("현재 게시 상태").selectOption("게시 중");
  await c1.getByLabel("처음 알게 된 날").fill("2026-09-11");
  await c1.getByLabel(/증거파일/).setInputFiles({ name: "캡처_DM.png", mimeType: "image/png", buffer: png });
  // 로컬 내장 DB는 첫 요청 때 초기화(수 초)가 걸리므로 여유 있게 대기
  await expect(c1.getByText("캡처_DM.png")).toBeVisible({ timeout: 20_000 });

  await page.getByRole("button", { name: "+ 악플 항목 추가" }).click();
  const c2 = page.getByTestId("comment-1");
  await c2.getByLabel("내용(원문 그대로)").fill("[테스트] 두 번째 악플 원문");
  await c2.getByLabel("플랫폼").fill("유튜브 댓글");

  await page.getByLabel("가해자와의 관계, 악플이 시작된 계기, 피해 상황 등을 자유롭게 적어 주세요.").fill("[테스트] 같은 반 학생으로 추정");
  await page.getByLabel("위 내용에 동의합니다").check();
  await shot(page, "1-customer-form");

  await page.getByRole("button", { name: "접수하기" }).click();
  await expect(page).toHaveURL(/\/submitted\/CB-\d{8}-\d{4}$/);
  receiptNo = (await page.getByTestId("receipt-no").textContent())!.trim();
  expect(receiptNo).toMatch(/^CB-\d{8}-0001$/);
  await shot(page, "2-customer-done");
});

test("변호사: 전산(관리자 화면)에 접수 건이 뜨고 처리할 수 있다", async ({ page }) => {
  expect(receiptNo).not.toBe("");

  // 미로그인 차단
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.getByLabel("비밀번호").fill("wrong-password");
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page.getByText("비밀번호가 올바르지 않습니다.")).toBeVisible();
  await page.getByLabel("비밀번호").fill("e2e-admin-password");
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  // 목록: 접수번호·접수일시·상태·접수자명·유형·연락처
  const row = page.locator("tbody tr", { hasText: receiptNo });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("신규");
  await expect(row).toContainText("테스트부모 (피해자 테스트자녀)");
  await expect(row).toContainText("법정대리인(미성년 피해자)");
  await expect(row).toContainText("010-1234-5678");
  await expect(row.locator("td").nth(1)).toHaveText(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  await expect(page.getByRole("link", { name: "신규 1" })).toBeVisible();
  await shot(page, "3-admin-list");

  // 상세
  await row.click();
  await expect(page.getByTestId("detail-receipt-no")).toHaveText(receiptNo);
  await expect(page.getByText("[테스트] 같은 반 학생으로 추정")).toBeVisible();
  const d1 = page.getByTestId("detail-comment-1");
  await expect(d1).toContainText("[테스트] 너 같은 건 학교 나오지 마라");
  await expect(d1).toContainText("인스타그램 DM");
  await expect(d1).toContainText("2026-09-10 21:30");
  await expect(d1).toContainText("모욕, 협박");
  await expect(d1).toContainText("2026-09-11");
  await expect(page.getByTestId("detail-comment-2")).toContainText("[테스트] 두 번째 악플 원문");

  // 증거파일 다운로드 = 업로드한 바이트와 동일
  const [download] = await Promise.all([page.waitForEvent("download"), d1.getByRole("link", { name: "캡처_DM.png" }).click()]);
  expect(download.suggestedFilename()).toBe("캡처_DM.png");
  expect(fs.readFileSync((await download.path())!).equals(png)).toBe(true);

  // 상태 변경 + 메모
  await page.getByLabel("상태").selectOption("in_progress");
  await expect(page.getByRole("status")).toHaveText("저장됨");
  await page.getByLabel("새 메모").fill("[테스트] 9/25(목) 보호자 전화상담 예정");
  await page.getByRole("button", { name: "메모 추가" }).click();
  await expect(page.getByText("[테스트] 9/25(목) 보호자 전화상담 예정")).toBeVisible();
  await shot(page, "4-admin-detail");

  // 새로고침 후에도 유지 + 필터
  await page.goto("/admin?status=in_progress");
  await expect(page.locator("tbody tr", { hasText: receiptNo })).toContainText("처리중");
  await page.goto("/admin?status=new");
  await expect(page.locator("tbody tr", { hasText: receiptNo })).toHaveCount(0);
});

test("변호사: 접수 건 삭제 시 목록과 파일에서 사라진다", async ({ page, request }) => {
  await page.goto("/admin/login");
  await page.getByLabel("비밀번호").fill("e2e-admin-password");
  await page.getByRole("button", { name: "로그인" }).click();
  await page.locator("tbody tr", { hasText: receiptNo }).click();
  const fileHref = await page.getByRole("link", { name: "캡처_DM.png" }).getAttribute("href");
  page.once("dialog", (d) => d.accept(receiptNo));
  await page.getByRole("button", { name: "접수 삭제" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.locator("tbody tr", { hasText: receiptNo })).toHaveCount(0);
  const res = await page.request.get(fileHref!);
  expect(res.status()).toBe(404);
  // 비로그인 파일 접근 차단
  expect((await request.get(fileHref!)).status()).toBe(401);
});
