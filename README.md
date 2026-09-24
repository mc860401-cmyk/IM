# 법무법인 우선 — 악플 고소 접수 사이트

악성댓글 피해자가 온라인으로 고소 상담을 접수하고, 변호사가 관리자 화면(전산)에서 확인·관리하는 웹사이트입니다. 요구사항은 [SPEC.md](./SPEC.md)에 있습니다.

| 주소 | 사용자 | 내용 |
|---|---|---|
| `/` | 고객 | 법무법인 우선 소개(우선·업무 원칙·구성원·오시는 길) |
| `/lawyers/cho-sangwoo`, `/lawyers/lee-minchul` | 고객 | 변호사 소개 |
| `/intake` | 고객 | 악플 고소 접수 폼 |
| `/submitted/CB-…` | 고객 | 접수 완료(접수번호) |
| `/admin` | 변호사 | 접수 목록(상태 필터) |
| `/admin/submissions/:id` | 변호사 | 상세·상태 변경·메모·증거파일·삭제 |

---

## 1. Vercel 배포 절차 (처음 한 번)

> 법률사무소 업무용은 상업적 이용이므로 Vercel **Pro 플랜**이 필요합니다(Hobby는 비상업 전용).

1. **프로젝트 가져오기** — vercel.com → *Add New… → Project* → GitHub 저장소 `mc860401-cmyk/IM` 선택 → 배포할 브랜치 확인 → *Deploy*
   (처음 배포는 DB 연결 전이라 접수 시 오류가 납니다. 3단계 후 재배포하면 정상.)
2. **저장소 연결**
   - *Storage → Create Database → Neon (Postgres)* → 프로젝트에 연결 → `DATABASE_URL` 자동 등록
   - *Storage → Create → Blob* → 프로젝트에 연결 → `BLOB_READ_WRITE_TOKEN` 자동 등록
   - 지역은 한국과 가까운 곳 선택 권장(추정: Neon은 서울 리전이 없어 싱가포르·도쿄 등 아시아 리전).
3. **환경변수** — *Settings → Environment Variables* 에 추가 ([.env.example](./.env.example) 참고)

   | 이름 | 값 |
   |---|---|
   | `ADMIN_PASSWORD` | 관리자 공용 비밀번호 (16자 이상 권장) |
   | `SESSION_SECRET` | 32자 이상 무작위 문자열 (`openssl rand -hex 32`) |
   | `APP_BASE_URL` | 사이트 주소 (예: `https://…vercel.app`) — 선택 |
   | `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` `NOTIFY_FROM` `NOTIFY_TO` | 알림 메일 — 선택. Gmail이면 `smtp.gmail.com` / `465` / 앱 비밀번호 |

4. *Deployments → … → Redeploy* 로 재배포
5. 확인: 사이트에서 테스트 접수 → `/admin` 로그인 → 목록에 뜨는지 확인 → 테스트 건 삭제

DB 테이블은 첫 요청 때 자동으로 만들어집니다.

## 2. 로컬 실행

```bash
npm install
cp .env.example .env.local   # ADMIN_PASSWORD 등 입력
npm run dev                  # http://localhost:3000
```

로컬에서는 `DATABASE_URL`·`BLOB_READ_WRITE_TOKEN`이 없으면 내장 DB(PGlite, `./data/pglite`)와 로컬 폴더(`./data/uploads`)를 씁니다. 코드는 운영과 동일합니다.

## 3. 테스트

```bash
npm test            # 단위 테스트
npm run test:e2e    # 종단간: 고객 접수 → 관리자 화면 확인 (빌드 후 실행)
```

## 4. 운영 메모

- 증거파일은 비공개 Blob에 저장되고, 관리자 로그인 후 서버를 거쳐서만 내려받습니다.
- 삭제는 관리자 상세 화면에서 수동으로만 합니다(자동 파기 없음). 개인정보보호법 제21조에 따라 목적 달성 건은 주기적으로 삭제하세요.
- 공용 계정이므로 비밀번호를 정기적으로 바꾸고, 바꾼 뒤 `SESSION_SECRET`도 바꾸면 기존 로그인이 모두 끊깁니다.

## 5. 법인·변호사 정보 수정

법인 정보와 구성원 약력은 `src/lib/firm.ts` 한 파일에 있습니다(usunlaw.com 게시 내용, 2026-09-24 기준). 사진·로고는 `public/brand/`에 있습니다. 구성원이 바뀌면 이 파일의 `LAWYERS` 목록만 고치면 홈 화면과 소개 페이지에 함께 반영됩니다.
