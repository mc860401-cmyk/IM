import {
  APPLICANT_TYPES, GUARDIAN_RELATIONS, HARM_TYPES, LIMITS, OFFENDER_RELATIONS, POST_STATUSES,
  type ApplicantType,
} from "./constants";

/** 고객 폼 → API 로 전송되는 원본 형태(모든 값은 문자열, 빈칸은 ""). */
export interface ApplicantInput {
  name: string;            // 개인 이름 / 대리인 이름 / 상호
  phone: string;
  email: string;
  birthDate: string;       // 개인·대리인: 생년월일(개인만 사용)
  address: string;
  // 법정대리인
  relation: string;
  victimName: string;
  victimBirthDate: string;
  // 법인
  bizNo: string;
  representative: string;
  contactName: string;
}

export interface CommentInput {
  content: string;
  platform: string;
  url: string;
  postedDate: string;
  postedTime: string;
  offenderNickname: string;
  offenderAccount: string;
  offenderRealName: string;
  offenderRelation: string;
  harmTypes: string[];
  postStatus: string;
  firstKnownDate: string;
  fileIds: string[];
}

export interface SubmissionInput {
  applicantType: string;
  applicant: ApplicantInput;
  comments: CommentInput[];
  narrative: string;
  consent: boolean;
}

export type Errors = Record<string, string>;

export interface CleanApplicant {
  name: string;
  phone: string;
  email: string;
  birthDate?: string;
  address?: string;
  relation?: string;
  victimName?: string;
  victimBirthDate?: string;
  bizNo?: string;
  representative?: string;
  contactName?: string;
}

export interface CleanComment {
  content: string;
  platform: string | null;
  url: string | null;
  postedDate: string | null;
  postedTime: string | null;
  offenderNickname: string | null;
  offenderAccount: string | null;
  offenderRealName: string | null;
  offenderRelation: string | null;
  harmTypes: string[];
  postStatus: string | null;
  firstKnownDate: string | null;
  fileIds: string[];
}

export interface CleanSubmission {
  applicantType: ApplicantType;
  applicant: CleanApplicant;
  displayName: string;
  comments: CleanComment[];
  narrative: string | null;
}

export const emptyApplicant = (): ApplicantInput => ({
  name: "", phone: "", email: "", birthDate: "", address: "",
  relation: "", victimName: "", victimBirthDate: "",
  bizNo: "", representative: "", contactName: "",
});

export const emptyComment = (): CommentInput => ({
  content: "", platform: "", url: "", postedDate: "", postedTime: "",
  offenderNickname: "", offenderAccount: "", offenderRealName: "", offenderRelation: "",
  harmTypes: [], postStatus: "", firstKnownDate: "", fileIds: [],
});

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const opt = (v: unknown): string | null => str(v) || null;

const PHONE_RE = /^010-?\d{3,4}-?\d{4}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const BIZNO_RE = /^\d{3}-?\d{2}-?\d{5}$/;

function isValidDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function isHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizePhone(s: string): string {
  const d = s.replace(/\D/g, "");
  return d.length === 11 ? `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}` : `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
}

export function displayNameOf(type: ApplicantType, a: CleanApplicant): string {
  if (type === "guardian") return `${a.name} (피해자 ${a.victimName})`;
  return a.name;
}

/**
 * 클라이언트·서버 공용 검증. 서버는 반드시 이 결과로만 저장한다.
 * 오류 키 예: "applicant.phone", "comments.2.content", "consent"
 */
export function validateSubmission(raw: unknown): { ok: true; data: CleanSubmission } | { ok: false; errors: Errors } {
  const errors: Errors = {};
  const input = (raw ?? {}) as Partial<SubmissionInput>;
  const a = (input.applicant ?? {}) as Partial<ApplicantInput>;

  const type = str(input.applicantType) as ApplicantType;
  if (!(type in APPLICANT_TYPES)) errors.applicantType = "접수자 유형을 선택해 주세요.";

  const tooLong = (key: string, v: string, max: number = LIMITS.shortText) => {
    if (v.length > max) errors[key] = `${max}자 이하로 입력해 주세요.`;
  };

  // 공통 필수: 이름(상호)·휴대폰·이메일
  const name = str(a.name);
  const phone = str(a.phone);
  const email = str(a.email);
  if (!name) errors["applicant.name"] = type === "corporation" ? "상호를 입력해 주세요." : "이름을 입력해 주세요.";
  tooLong("applicant.name", name);
  if (!phone) errors["applicant.phone"] = "휴대폰 번호를 입력해 주세요.";
  else if (!PHONE_RE.test(phone)) errors["applicant.phone"] = "010으로 시작하는 휴대폰 번호를 입력해 주세요.";
  if (!email) errors["applicant.email"] = "이메일을 입력해 주세요.";
  else if (!EMAIL_RE.test(email) || email.length > LIMITS.shortText) errors["applicant.email"] = "이메일 형식이 올바르지 않습니다.";

  const applicant: CleanApplicant = { name, phone: PHONE_RE.test(phone) ? normalizePhone(phone) : phone, email };
  const address = str(a.address);
  tooLong("applicant.address", address);
  if (address) applicant.address = address;

  const optDate = (key: string, v: string) => {
    if (v && !isValidDate(v)) errors[key] = "날짜 형식이 올바르지 않습니다.";
  };

  if (type === "individual") {
    const birth = str(a.birthDate);
    optDate("applicant.birthDate", birth);
    if (birth) applicant.birthDate = birth;
  } else if (type === "guardian") {
    const victimName = str(a.victimName);
    const relation = str(a.relation);
    const victimBirth = str(a.victimBirthDate);
    if (!victimName) errors["applicant.victimName"] = "피해자(미성년자) 이름을 입력해 주세요.";
    tooLong("applicant.victimName", victimName);
    if (relation && !(GUARDIAN_RELATIONS as readonly string[]).includes(relation)) errors["applicant.relation"] = "관계를 다시 선택해 주세요.";
    optDate("applicant.victimBirthDate", victimBirth);
    applicant.victimName = victimName;
    if (relation) applicant.relation = relation;
    if (victimBirth) applicant.victimBirthDate = victimBirth;
  } else if (type === "corporation") {
    const contactName = str(a.contactName);
    const bizNo = str(a.bizNo);
    const rep = str(a.representative);
    if (!contactName) errors["applicant.contactName"] = "담당자 이름을 입력해 주세요.";
    tooLong("applicant.contactName", contactName);
    if (bizNo && !BIZNO_RE.test(bizNo)) errors["applicant.bizNo"] = "사업자등록번호 10자리를 입력해 주세요.";
    tooLong("applicant.representative", rep);
    applicant.contactName = contactName;
    if (bizNo) applicant.bizNo = bizNo;
    if (rep) applicant.representative = rep;
  }

  // 악플 목록
  const rawComments = Array.isArray(input.comments) ? input.comments : [];
  if (rawComments.length === 0) errors.comments = "악플을 1건 이상 입력해 주세요.";
  if (rawComments.length > LIMITS.commentsMax) errors.comments = `한 번에 ${LIMITS.commentsMax}건까지 접수할 수 있습니다.`;

  const comments: CleanComment[] = [];
  const allFileIds = new Set<string>();
  rawComments.slice(0, LIMITS.commentsMax).forEach((rc, i) => {
    const c = (rc ?? {}) as Partial<CommentInput>;
    const p = `comments.${i}`;
    const content = str(c.content);
    if (!content) errors[`${p}.content`] = "악플 내용(원문)을 입력해 주세요.";
    tooLong(`${p}.content`, content, LIMITS.contentMax);

    const url = str(c.url);
    if (url && (!isHttpUrl(url) || url.length > LIMITS.urlMax)) errors[`${p}.url`] = "http:// 또는 https:// 로 시작하는 주소를 입력해 주세요.";

    const postedDate = str(c.postedDate);
    optDate(`${p}.postedDate`, postedDate);
    const postedTime = str(c.postedTime);
    if (postedTime && !TIME_RE.test(postedTime)) errors[`${p}.postedTime`] = "시각 형식이 올바르지 않습니다.";
    const firstKnown = str(c.firstKnownDate);
    optDate(`${p}.firstKnownDate`, firstKnown);

    const relation = str(c.offenderRelation);
    if (relation && !(OFFENDER_RELATIONS as readonly string[]).includes(relation)) errors[`${p}.offenderRelation`] = "관계를 다시 선택해 주세요.";
    const postStatus = str(c.postStatus);
    if (postStatus && !(POST_STATUSES as readonly string[]).includes(postStatus)) errors[`${p}.postStatus`] = "게시 상태를 다시 선택해 주세요.";

    const harm = Array.isArray(c.harmTypes) ? c.harmTypes.map(str) : [];
    const harmTypes = (HARM_TYPES as readonly string[]).filter((h) => harm.includes(h));

    for (const key of ["platform", "offenderNickname", "offenderAccount", "offenderRealName"] as const) {
      tooLong(`${p}.${key}`, str(c[key]), key === "offenderAccount" ? LIMITS.urlMax : LIMITS.shortText);
    }

    const fileIds = (Array.isArray(c.fileIds) ? c.fileIds : []).map(str).filter(Boolean);
    fileIds.forEach((f) => allFileIds.add(f));

    comments.push({
      content,
      platform: opt(c.platform),
      url: url || null,
      postedDate: postedDate || null,
      postedTime: postedTime || null,
      offenderNickname: opt(c.offenderNickname),
      offenderAccount: opt(c.offenderAccount),
      offenderRealName: opt(c.offenderRealName),
      offenderRelation: relation || null,
      harmTypes,
      postStatus: postStatus || null,
      firstKnownDate: firstKnown || null,
      fileIds,
    });
  });
  if (allFileIds.size > LIMITS.filesPerSubmission) errors.files = `증거파일은 접수당 ${LIMITS.filesPerSubmission}개까지 첨부할 수 있습니다.`;

  const narrative = str(input.narrative);
  tooLong("narrative", narrative, LIMITS.narrativeMax);

  if (input.consent !== true) errors.consent = "개인정보 수집·이용에 동의해야 접수할 수 있습니다.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    data: {
      applicantType: type,
      applicant,
      displayName: displayNameOf(type, applicant),
      comments,
      narrative: narrative || null,
    },
  };
}
