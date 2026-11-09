// 서버 전용: 전용 결제 페이지 주소 코드 → 전용 조건 id(lib/makethisone/offers.ts).
// 코드가 곧 열쇠다. 이 주소를 받은 고객만 전용 조건으로 계약할 수 있다(계약 저장 API가 코드를 확인).
// 브라우저 코드(client component)에서 import 하지 않는다.
const OFFER_CODES: Record<string, string> = {
    "junil-q7m4x2": "junil",
};

export function offerIdByCode(code: string | null | undefined): string | null {
    const c = String(code || "").trim().toLowerCase();
    return Object.prototype.hasOwnProperty.call(OFFER_CODES, c) ? OFFER_CODES[c] : null;
}
