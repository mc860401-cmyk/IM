import { describe, expect, it } from "vitest";
import { emptyApplicant, emptyComment, validateSubmission } from "@/lib/validation";

const base = () => ({
  applicantType: "individual",
  applicant: { ...emptyApplicant(), name: "홍길동", phone: "01012345678", email: "a@b.kr" },
  comments: [{ ...emptyComment(), content: "악플 원문" }],
  narrative: "",
  consent: true,
});

describe("접수 검증", () => {
  it("최소 필수값(이름·휴대폰·이메일·악플 원문·동의)만으로 통과, 휴대폰 정규화", () => {
    const v = validateSubmission(base());
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.data.applicant.phone).toBe("010-1234-5678");
      expect(v.data.displayName).toBe("홍길동");
      expect(v.data.comments[0].url).toBeNull();
    }
  });

  it("필수 누락 시 필드별 오류", () => {
    const input = base();
    input.applicant = emptyApplicant();
    input.comments = [emptyComment()];
    input.consent = false;
    const v = validateSubmission(input);
    expect(v.ok).toBe(false);
    if (!v.ok) {
      expect(Object.keys(v.errors).sort()).toEqual(
        ["applicant.email", "applicant.name", "applicant.phone", "comments.0.content", "consent"].sort(),
      );
    }
  });

  it("악플 0건 불가", () => {
    const v = validateSubmission({ ...base(), comments: [] });
    expect(!v.ok && v.errors.comments).toBeTruthy();
  });

  it("법정대리인은 피해자 이름 필수, 표시명에 피해자 병기", () => {
    const input = { ...base(), applicantType: "guardian" };
    expect(validateSubmission(input).ok).toBe(false);
    input.applicant = { ...input.applicant, victimName: "홍어린", relation: "모" };
    const v = validateSubmission(input);
    expect(v.ok && v.data.displayName).toBe("홍길동 (피해자 홍어린)");
  });

  it("법인은 담당자 이름 필수, 사업자번호 형식 검사", () => {
    const input = { ...base(), applicantType: "corporation" };
    input.applicant = { ...input.applicant, name: "(주)테스트", bizNo: "12-34" };
    const v = validateSubmission(input);
    expect(!v.ok && Object.keys(v.errors).sort()).toEqual(["applicant.bizNo", "applicant.contactName"]);
  });

  it("선택 항목 형식 오류: URL·날짜·시각", () => {
    const input = base();
    input.comments = [{ ...emptyComment(), content: "x", url: "javascript:alert(1)", postedDate: "2026-02-30", postedTime: "25:00" }];
    const v = validateSubmission(input);
    expect(!v.ok && Object.keys(v.errors).sort()).toEqual(
      ["comments.0.postedDate", "comments.0.postedTime", "comments.0.url"],
    );
  });

  it("허용되지 않은 피해유형 값은 버림", () => {
    const input = base();
    input.comments = [{ ...emptyComment(), content: "x", harmTypes: ["모욕", "해킹"] }];
    const v = validateSubmission(input);
    expect(v.ok && v.data.comments[0].harmTypes).toEqual(["모욕"]);
  });

  it("증거파일 접수당 20개 초과 불가", () => {
    const input = base();
    input.comments = [{ ...emptyComment(), content: "x", fileIds: Array.from({ length: 21 }, (_, i) => `f${i}`) }];
    const v = validateSubmission(input);
    expect(!v.ok && v.errors.files).toBeTruthy();
  });
});
