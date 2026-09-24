/**
 * 초안(데모) 모드: DEMO_MODE=1 일 때만 켜진다.
 * Vercel에서 DB·Blob 없이 화면을 확인하기 위한 용도로, 접수 내용은 서버 메모리/임시폴더에만
 * 저장되어 서버가 재시작되면 사라진다. 운영에서는 절대 켜지 않는다.
 */
export const isDemoMode = () => process.env.DEMO_MODE === "1";
