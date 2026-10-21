// 메이크디스원 광고업무대행 전자계약서(2026-10-21). 결제 화면(미리보기)과 서버(PDF·메일)가 같은 문구를 쓴다.
// 문구 뼈대는 대표가 준 「광고업무대행계약서(법무법인 정음)」를 따른다: 목적·대행범위·전제조건·상세품목·비용·기간·손해배상·기타.
// 상품(정기 요금제 / 횟수권 / 기간 일시결제)에 따라 제4~7조가 달라진다. 서버 코드를 import 하지 않는다(브라우저에서도 쓴다).
import { getCreditPack } from "@/lib/billing/one-time";
import { getPlan } from "@/lib/makethisone/products";

export const COMPANY = {
    name: "메이크디스원",
    ceo: "김정환",
    bizNo: "431-11-01233",
    address: "서울특별시 동대문구 왕산로5길 13",
};

export type ProductKind = "plan" | "pack";
export interface ContractProduct {
    kind: ProductKind;
    id: string;
    /** 계약서·결제창에 쓰는 이름 */
    name: string;
    price: number;
    perMonth?: number;
    credits?: number;
    months?: number;
    monthlyPrice?: number;
    /** 부가세 별도 상품: 공급가와 부가세(price = supplyPrice + vat) */
    supplyPrice?: number;
    vat?: number;
}
export interface ContractParty { name: string; email: string; phone?: string }
export interface ContractArticle { heading: string; lines: string[] }
export interface ContractPaper {
    title: string;
    preamble: string;
    articles: ContractArticle[];
    dateLine: string;
    gap: [string, string][];
    eul: [string, string][];
    payment: [string, string][];
}

/** 결제 화면에서 고를 수 있는 상품만(숨긴 횟수권 제외). 서버가 금액을 정할 때도 이것을 쓴다. */
export function resolveProduct(kind: string, id: string): ContractProduct | null {
    if (kind === "plan") {
        const p = getPlan(id);
        return p ? { kind: "plan", id: p.id, name: `메이크디스원 ${p.name}`, price: p.price, perMonth: p.perMonth, supplyPrice: p.supplyPrice, vat: p.vat } : null;
    }
    if (kind === "pack") {
        const p = getCreditPack(id);
        if (!p || p.hidden) return null;
        return { kind: "pack", id: p.id, name: p.name, price: p.price, credits: p.credits, months: p.months, monthlyPrice: p.monthlyPrice, supplyPrice: p.supplyPrice, vat: p.vat };
    }
    return null;
}

export const won = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;

/** 한국 시간 기준 'YYYY년 M월 D일' */
export function kstDate(d: Date): string {
    const k = new Date(d.getTime() + 9 * 3600e3);
    return `${k.getUTCFullYear()}년 ${k.getUTCMonth() + 1}월 ${k.getUTCDate()}일`;
}
export function kstDateTime(d: Date): string {
    const k = new Date(d.getTime() + 9 * 3600e3);
    const hh = String(k.getUTCHours()).padStart(2, "0"), mm = String(k.getUTCMinutes()).padStart(2, "0");
    return `${kstDate(d)} ${hh}:${mm}`;
}
/** 시작일(포함)부터 n개월 계약의 마지막 날(한국 시간). */
export function kstEndAfterMonths(start: Date, months: number): string {
    const k = new Date(start.getTime() + 9 * 3600e3);
    const end = new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth() + months, k.getUTCDate() - 1));
    return `${end.getUTCFullYear()}년 ${end.getUTCMonth() + 1}월 ${end.getUTCDate()}일`;
}

export function isValidEmail(v: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((v || "").trim());
}

export function buildContract(args: {
    product: ContractProduct;
    party: ContractParty;
    /** 계약 체결(동의) 시각. 미리보기에서는 지금. */
    agreedAt: Date;
    payment?: { orderId: string; amount: number; paidAt: Date } | null;
}): ContractPaper {
    const { product: p, party, agreedAt, payment } = args;
    const 갑 = "“갑”", 을 = "“을”";
    const isTerm = p.kind === "pack" && !!p.months;
    const isPlan = p.kind === "plan";

    const items: string[] = isPlan
        ? [`월 ${p.perMonth}회 법률 콘텐츠 기획·작성 및 블로그 포스팅`, "브랜드 블로그 활성화와 최적화 관리", "월간 성과 리포트 제공"]
        : isTerm
            ? [`월 ${Math.round((p.credits || 0) / (p.months || 1))}회 법률 콘텐츠 기획·작성 및 블로그 포스팅 (${p.months}개월 총 ${p.credits}회)`, "브랜드 블로그 활성화와 최적화 관리"]
            : [`법률 콘텐츠 ${p.credits}회 기획·작성 및 블로그 포스팅`];

    const vatNote = p.vat ? "(부가세 별도)" : "";
    const cost: string[] = isPlan
        ? (p.vat
            ? [`광고비는 월 ${won(p.supplyPrice || 0)}${vatNote}으로 하며, 부가가치세 ${won(p.vat)}을 더한 월 ${won(p.price)}을 결제한다.`, `광고비는 계약 체결일에 첫 달분을 결제하고, 이후 매월 같은 날 ${갑}이 등록한 카드로 자동 결제한다.`]
            : [`광고비는 월 ${won(p.price)}으로 한다.`, `광고비는 계약 체결일에 첫 달분을 결제하고, 이후 매월 같은 날 ${갑}이 등록한 카드로 자동 결제한다.`])
        : isTerm
            ? [
                `광고비는 월 ${won(p.monthlyPrice || 0)}${vatNote}으로 한다.`,
                p.vat
                    ? `${p.months}개월분 광고비 ${won(p.supplyPrice || 0)}에 부가가치세 ${won(p.vat)}을 더한 ${won(p.price)}을 계약 체결일에 선불로 한 번에 결제한다.`
                    : `${p.months}개월분 광고비 합계 ${won(p.price)}을 계약 체결일에 선불로 한 번에 결제한다.`,
            ]
            : p.vat
                ? [`광고비는 ${won(p.supplyPrice || 0)}${vatNote}으로 하며, 부가가치세 ${won(p.vat)}을 더한 ${won(p.price)}을 계약 체결일에 선불로 한 번에 결제한다.`]
                : [`광고비는 ${won(p.price)}으로 하며, 계약 체결일에 선불로 한 번에 결제한다.`];

    const term: string[] = isPlan
        ? ["계약 기간은 결제일부터 1개월로 하며, 어느 한쪽이 해지하지 않으면 1개월 단위로 자동 연장된다.", `${갑}은 다음 결제일 7일 전까지 해지를 통보할 수 있다.`]
        : isTerm
            ? [`계약 기간은 결제일부터 ${p.months}개월(${kstDate(agreedAt)}부터 ${kstEndAfterMonths(agreedAt, p.months || 0)}까지)로 하며, 자동 갱신되지 않는다.`]
            : ["본 계약은 결제일부터 결제한 콘텐츠 횟수를 모두 제공할 때까지 유효하며, 자동 갱신되지 않는다."];

    const refund = isPlan
        ? "서비스 착수 후 해지하는 경우 실제 서비스를 진행한 일수에 비례하여 차감한 금액을 환불한다."
        : "서비스 착수 후 해지하는 경우 이미 제공한 횟수를 제외한 잔여분에 해당하는 금액을 환불한다.";

    const articles: ContractArticle[] = [
        { heading: "제1조 (계약의 목적)", lines: [`본 계약은 ${갑}이 ${을}에게 광고업무 대행을 위임함에 있어 상호 신뢰로써 업무를 진행하고, ${을}은 ${갑}의 업무를 성실히 수행·대행하기로 하여 상호 합의하에 체결한다.`] },
        { heading: "제2조 (대행 범위 및 광고 품목)", lines: ["대행 범위: 블로그를 중심으로 한 온라인 광고의 집행과 관리로서, 그 지역은 온라인 전국으로 한다.", "광고 품목: 브랜드 블로그 활성화와 최적화 관리, 법률 콘텐츠의 기획과 작성"] },
        { heading: "제3조 (전제 조건 및 비밀유지)", lines: [
            `광고 업무를 효과적으로 수행하기 위하여 ${갑}은 ${을}이 요청하는 정보와 자료를 제공한다.`,
            `${을}은 본 계약과 관련하여 알게 된 ${갑}의 업무상 비밀과 개인정보를 제3자에게 누설하지 아니하며, 계약이 끝난 뒤에도 같다.`,
            `${을}은 변호사법과 변호사업무광고규정 등 관계 법령에 어긋나지 않도록 콘텐츠를 작성하고, ${갑}은 게시 전에 내용 확인과 수정을 요청할 수 있다.`,
            `${을}은 광고 업무 외에 ${갑}의 기업 PR·홍보 활동이나 각종 조사 자료의 수집·분석 등 일반적인 서비스 업무에 협조한다. 다만 이 경우 드는 비용은 ${갑}이 부담한다.`,
        ] },
        { heading: `제4조 (광고 상세 품목 — ${p.name})`, lines: items },
        { heading: "제5조 (비용 및 지불)", lines: cost },
        { heading: "제6조 (계약 기간)", lines: term },
        { heading: "제7조 (환불 및 손해배상)", lines: [
            `서비스 착수 전에 ${갑}이 계약을 해지하면 결제 금액 전액을 환불한다.`,
            refund,
            `${을}의 작업 포기 등 귀책사유로 ${갑}에게 시간적·경제적 손해가 발생한 경우 ${을}이 이를 배상한다. 작업 기한 불이행이나 중도 포기 시에는 선불로 받은 금액 중 남은 계약 기간 또는 남은 횟수에 해당하는 금액을 배상한다.`,
            `작업 결과물이 ${갑}의 요구 사항대로 지켜지지 않았거나 불만족 사항이 있는 경우 ${갑}은 기간 내에 재작업을 요구하거나 상호 협의하여 처리한다.`,
        ] },
        { heading: "제8조 (기타)", lines: [
            "본 계약에 명시되지 않은 사항이나 해석상 이견은 상호 협의하여 정하고, 협의가 되지 않으면 관례에 따른다.",
            `본 계약은 ${갑}이 전자적 방법으로 계약 내용에 동의하고 결제를 마친 때 성립한다. ${을}은 계약서를 PDF로 작성하여 ${갑}이 입력한 이메일로 보내며, ${갑}과 ${을}은 이를 각자 보관한다.`,
            `본 계약에 관하여 ${갑}과 ${을} 사이에 일어나는 분쟁의 재판 관할은 ${갑}의 소재지를 관할하는 지방법원으로 한다.`,
        ] },
    ];

    return {
        title: "광고업무대행계약서",
        preamble: `광고주 ${party.name || "○○○"}(이하 ${갑}이라 한다)과 광고회사 ${COMPANY.name}(이하 ${을}이라 한다)은 다음과 같이 광고업무대행에 관하여 계약을 체결한다.`,
        articles,
        dateLine: `계약 체결일: ${kstDate(agreedAt)}`,
        gap: [
            ["상호·성명", party.name || "-"],
            ["이메일", party.email || "-"],
            ...(party.phone ? [["연락처", party.phone] as [string, string]] : []),
            ["전자서명", `${kstDateTime(agreedAt)} 계약 내용에 동의`],
        ],
        eul: [
            ["상호", COMPANY.name],
            ["대표자", COMPANY.ceo],
            ["사업자등록번호", COMPANY.bizNo],
            ["주소", COMPANY.address],
        ],
        payment: payment
            ? [["결제 상품", p.name], ["결제 금액", p.vat ? `${won(payment.amount)} (공급가 ${won(p.supplyPrice || 0)} + 부가세 ${won(p.vat)})` : won(payment.amount)], ["결제 일시", kstDateTime(payment.paidAt)], ["주문번호", payment.orderId]]
            : [],
    };
}
