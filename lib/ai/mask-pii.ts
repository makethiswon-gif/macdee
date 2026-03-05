// ─── 개인정보 비식별화 (PII Masking) ───
// 판결문, 사건 자료에서 실명, 주민번호, 전화번호, 주소 등을 제거/치환

/**
 * 텍스트에서 개인정보를 비식별화합니다.
 * 판결문, 법률 문서에서 실명 등이 AI에 전달되지 않도록 합니다.
 */
export function maskPII(text: string): string {
    let masked = text;

    // 1. 주민등록번호 (000000-0000000 or 000000-0****** etc.)
    masked = masked.replace(
        /\d{6}\s*[-–]\s*\d{7}/g,
        "[주민번호]"
    );
    masked = masked.replace(
        /\d{6}\s*[-–]\s*\d{1}\*{6}/g,
        "[주민번호]"
    );

    // 2. 전화번호 (010-0000-0000, 02-000-0000, etc.)
    masked = masked.replace(
        /0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}/g,
        "[전화번호]"
    );

    // 3. 이메일 주소
    masked = masked.replace(
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
        "[이메일]"
    );

    // 4. 계좌번호 (연속된 숫자 10~16자리, 하이픈 포함)
    masked = masked.replace(
        /\d{3,6}[-]?\d{2,6}[-]?\d{2,6}[-]?\d{0,4}/g,
        (match) => {
            const digitsOnly = match.replace(/[-]/g, "");
            if (digitsOnly.length >= 10 && digitsOnly.length <= 16) return "[계좌번호]";
            return match;
        }
    );

    // 5. 한국 이름 패턴 (판결문 형식)
    // "원고 홍길동", "피고 김철수", "신청인 이영희" 등
    const partyLabels = [
        "원고", "피고", "신청인", "피신청인", "채권자", "채무자",
        "고소인", "피고소인", "피고인", "피의자", "고인",
        "소외", "참가인", "보조참가인", "상고인", "피상고인",
        "항소인", "피항소인", "청구인", "피청구인",
    ];

    for (const label of partyLabels) {
        // "원고 홍길동" → "원고 [이름]"
        const regex1 = new RegExp(`(${label})\\s+([가-힣]{2,4})(?=[\\s,.)\\]\\n])`, "g");
        masked = masked.replace(regex1, `$1 [이름]`);

        // "원고(홍길동)" → "원고([이름])"
        const regex2 = new RegExp(`(${label})\\s*\\(\\s*([가-힣]{2,4})\\s*\\)`, "g");
        masked = masked.replace(regex2, `$1([이름])`);
    }

    // 6. 단독 한국 이름 (가나다 2-4자, 맥락적으로 이름인 경우)
    // "위 홍길동은" "A(홍길동)" 패턴
    masked = masked.replace(
        /([A-Z])\s*\(\s*([가-힣]{2,4})\s*\)/g,
        "$1([이름])"
    );

    // 7. 법인/회사명은 유지하되 대표자명 제거
    // "대표이사 홍길동" → "대표이사 [이름]"
    masked = masked.replace(
        /(대표이사|대표자|이사|감사|사내이사)\s+([가-힣]{2,4})(?=[\s,.)\\n])/g,
        "$1 [이름]"
    );

    // 8. 주소 패턴 (상세주소 비식별화)
    // "서울특별시 강남구 역삼동 123-45번지 ..." → keep district, mask details
    masked = masked.replace(
        /([가-힣]+(시|도)\s+[가-힣]+(시|군|구))\s+[가-힣]+(동|읍|면|리|로|길)\s+[\d\-]+[가-힣]*/g,
        "$1 [주소]"
    );

    // 9. 구체적 날짜의 인물 정보
    // "1990. 5. 3.생" 같은 생년월일
    masked = masked.replace(
        /\d{4}\s*\.\s*\d{1,2}\s*\.\s*\d{1,2}\s*\.\s*생/g,
        "[생년월일]"
    );

    // 10. 사건번호의 이름 부분은 유지 (2024가합12345 같은 건 유지)
    // but 판결문 서두의 당사자 이름 목록 제거
    // "성   명: 홍길동" → "성   명: [이름]"
    masked = masked.replace(
        /(성\s*명|이\s*름)\s*[:：]\s*([가-힣]{2,4})/g,
        "$1: [이름]"
    );

    return masked;
}
