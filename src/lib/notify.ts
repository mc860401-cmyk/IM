import "server-only";
import { APPLICANT_TYPES, type ApplicantType } from "./constants";
import { formatKst } from "./time";

export interface NewSubmissionNotice {
  id: string;
  receiptNo: string;
  createdAt: Date;
  applicantType: ApplicantType;
  displayName: string;
  commentCount: number;
  fileCount: number;
  baseUrl: string;
}

/** 악플 원문·증거파일·연락처는 넣지 않는다(메일 유출 시 노출 최소화). */
export function buildNoticeMail(n: NewSubmissionNotice) {
  const link = `${n.baseUrl.replace(/\/$/, "")}/admin/submissions/${n.id}`;
  const subject = `[악플 고소 접수] ${n.receiptNo} 신규 접수`;
  const text = [
    "새 접수가 들어왔습니다.",
    "",
    `접수번호: ${n.receiptNo}`,
    `접수일시: ${formatKst(n.createdAt)} (KST)`,
    `유형: ${APPLICANT_TYPES[n.applicantType]}`,
    `접수자: ${n.displayName}`,
    `악플: ${n.commentCount}건 / 증거파일: ${n.fileCount}개`,
    "",
    `상세 보기(관리자 로그인 필요): ${link}`,
  ].join("\n");
  return { subject, text };
}

export async function notifyNewSubmission(n: NewSubmissionNotice): Promise<"sent" | "logged"> {
  const { subject, text } = buildNoticeMail(n);
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, NOTIFY_FROM, NOTIFY_TO } = process.env;
  if (!SMTP_HOST || !NOTIFY_TO) {
    console.log(`[notify] 메일 설정 없음 — 로그로 대체\n${subject}\n${text}`);
    return "logged";
  }
  const nodemailer = await import("nodemailer");
  const port = Number(SMTP_PORT ?? 587);
  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
  await transport.sendMail({
    from: NOTIFY_FROM || SMTP_USER,
    to: NOTIFY_TO.split(",").map((s) => s.trim()).filter(Boolean),
    subject,
    text,
  });
  console.log(`[notify] 메일 발송 완료: ${n.receiptNo}`);
  return "sent";
}
