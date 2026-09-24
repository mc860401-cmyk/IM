export const APPLICANT_TYPES = {
  individual: "피해자 본인(개인)",
  guardian: "법정대리인(미성년 피해자)",
  corporation: "법인·단체",
} as const;
export type ApplicantType = keyof typeof APPLICANT_TYPES;

export const GUARDIAN_RELATIONS = ["부", "모", "후견인", "기타"] as const;

export const HARM_TYPES = [
  "모욕",
  "허위사실 명예훼손",
  "사실적시 명예훼손",
  "성적 모욕·성희롱",
  "협박",
  "개인정보 노출",
  "기타",
] as const;

export const OFFENDER_RELATIONS = ["모름", "아는 사람", "모르는 사람"] as const;
export const POST_STATUSES = ["게시 중", "삭제됨", "모름"] as const;

export const STATUSES = {
  new: "신규",
  in_progress: "처리중",
  done: "완료",
} as const;
export type Status = keyof typeof STATUSES;

export const LIMITS = {
  contentMax: 5000,
  narrativeMax: 5000,
  shortText: 200,
  urlMax: 2000,
  fileMaxBytes: 4 * 1024 * 1024,
  filesPerSubmission: 20,
  commentsMax: 500,
} as const;

export const ALLOWED_MIME = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "application/pdf": [".pdf"],
} as const;
export type AllowedMime = keyof typeof ALLOWED_MIME;
