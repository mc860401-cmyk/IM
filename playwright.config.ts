import { defineConfig } from "@playwright/test";
import fs from "node:fs";

const PORT = 3200;
const chromium = process.env.PW_CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
    launchOptions: {
      ...(fs.existsSync(chromium) ? { executablePath: chromium } : {}),
      // 로케일이 없는 컨테이너에서는 크롬이 한글 다운로드 파일명을 "download"로 바꾼다.
      env: { ...process.env, LANG: "C.UTF-8", LC_ALL: "C.UTF-8" } as Record<string, string>,
    },
  },
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/admin/login`,
    timeout: 240_000,
    reuseExistingServer: false,
    env: {
      DB_PATH: "memory",
      UPLOAD_DIR: ".e2e-uploads",
      ADMIN_PASSWORD: "e2e-admin-password",
      SESSION_SECRET: "e2e-session-secret-0123456789abcdef-xyz",
    },
  },
});
