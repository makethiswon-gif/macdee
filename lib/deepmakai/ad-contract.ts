// 딥마카이 유튜브 광고(PPL) 전자계약서(2026-10-29 대표 지시: 헤임타 강경호 회차 170만 원 계약을 makethis1.com 에서 전자서명으로).
// 계약 건(deal)은 코드에 둔다 — 광고주마다 조건이 달라 결제 상품처럼 고를 수 있게 하지 않는다.
// 서명 주소의 코드는 저장소(공개)에 적지 않고 서버 비밀값으로 만든다(lib/deepmakai/ad-contract-codes.ts). 관리자 화면 /deepmakai/contract 에서 링크를 본다.
// 계약 화면(미리보기)과 서버(PDF·메일)가 같은 문구를 쓴다. 서버 코드를 import 하지 않는다(브라우저에서도 쓴다).
// 을은 계약 건마다 정한다(헤임타 건은 메이크디스원 — 대표 결정 2026-10-29, 이후 딥마카이 사업자 예정). 을 전용 링크에서 먼저 서명해야 광고주(갑)가 서명할 수 있다.
import { COMPANY, kstDate, kstDateTime, won } from "@/lib/makethisone/contract";

export interface AdDeal {
    /** 보관 파일 이름이자 서명 주소 코드의 재료 */
    id: string;
    brand: string;
    /** 서명 화면에 미리 채우는 광고주 정보(서명자가 고칠 수 있다) */
    prefill: { company?: string; ceo?: string; address?: string; manager?: string; email?: string };
    /** 을 서명 화면에 미리 채우는 값 */
    eulPrefill: { company?: string; ceo?: string; bizNo?: string; address?: string; email?: string };
    episode: string;
    /** 화면 요약 칸에 쓰는 짧은 이름 */
    episodeShort?: string;
    adFormat: string;
    product: string;
    shootDate: string;
    release: string;
    /** 광고비(부가세 별도) */
    supplyPrice: number;
    listPrice?: number;
    /** 광고비에 포함한 2차 활용: 기간·범위, 기간 뒤 연장 대가 */
    secondUse?: { months: number; scope: string; extensionPrice: number };
}

const DEALS: AdDeal[] = [
    {
        id: "2026-10-heimta-kangkyungho",
        brand: "헤임타",
        prefill: { company: "주식회사 보딩패스", address: "서울특별시 동대문구 장한로 53, 제이빌딩 401호", manager: "권혜지", email: "khj@boardingpass.kr" },
        eulPrefill: { company: COMPANY.name, ceo: COMPANY.ceo, bizNo: COMPANY.bizNo, address: COMPANY.address, email: "ceo@lawnald.com" },
        episode: "‘딥캐스트’ UFC 출신 강경호 선수 출연 회차(1부·2부로 나누어 공개하며, 두 편 모두에 광고를 노출한다)",
        episodeShort: "딥캐스트 강경호 선수 회차 1부·2부",
        adFormat: "1부·2부 각 편 본편 중간 미드롤 PPL(60~90초) — 진행자가 헤임타 제품을 직접 사용하며 소개하는 ‘근육통 상담’ 코너, 각 편 설명란 구매 링크와 고정 댓글. 두 편 노출은 한 회차 가격에 포함한다",
        product: "헤임타 EMS 이지샷 스팟 마사지기, 헤임타 리커버리 마사지스틱(진행자 4인분 현물 제공)",
        shootDate: "2026년 10월 30일",
        release: "2026년 11월 첫째 주 공개 예정이며, 정확한 공개일은 을이 갑에게 미리 알린다.",
        supplyPrice: 1_700_000,
        listPrice: 2_000_000,
        // 2026-10-29 헤임타와 카톡 합의: 170만 원에 2차 활용 3개월 포함, 이후 연장 시 50만 원
        secondUse: { months: 3, scope: "자사 상품 상세페이지와 SNS 광고(주 채널: 메타 — 페이스북·인스타그램)", extensionPrice: 500_000 },
    },
];

export function listDeals(): AdDeal[] {
    return DEALS;
}

export interface AdParty {
    company: string;
    ceo: string;
    bizNo: string;
    address: string;
    manager?: string;
    email: string;
    phone?: string;
    /** 서명한 사람(대표자 또는 위임받은 담당자) */
    signer: string;
}

/** 을(딥마카이 사업자) — 을 서명 때 입력한다. */
export interface EulParty { company: string; ceo: string; bizNo: string; address: string; email?: string; signer: string }

export interface AdArticle { heading: string; lines: string[] }
export interface AdContractPaper {
    title: string;
    preamble: string;
    articles: AdArticle[];
    dateLine: string;
    gap: [string, string][];
    eul: [string, string][];
    money: [string, string][];
}

export const vatOf = (supply: number) => Math.round(supply * 0.1);

/** extra.account: 입금 계좌 — 공개 저장소에 두지 않고 비공개 보관함의 계약 건 설정(<deal.id>.config.json)에서 읽는다. */
export function buildAdContract(deal: AdDeal, party: Partial<AdParty>, signedAt: Date | null, eulIn?: { party: Partial<EulParty>; signedAt: Date | null } | null, extra?: { account?: string }): AdContractPaper {
    const account = extra?.account?.trim() || "";
    const eul = eulIn?.party || {}, eulAt = eulIn?.signedAt || null;
    const 갑 = "“갑”", 을 = "“을”";
    const vat = vatOf(deal.supplyPrice), total = deal.supplyPrice + vat;
    const half = Math.round(total / 2);
    const company = party.company?.trim() || "○○○";

    const articles: AdArticle[] = [
        { heading: "제1조 (목적)", lines: [`본 계약은 ${갑}이 ${을}에게 유튜브 채널 ‘딥마카이(DEEP MAKAI)’ 콘텐츠 안의 간접광고(PPL) 제작과 게재를 맡기고 ${을}이 이를 수행하는 데 필요한 사항을 정한다.`] },
        { heading: "제2조 (광고 내용)", lines: [
            "채널: 유튜브 ‘딥마카이(DEEP MAKAI)’(youtube.com/@DEEP_MAKAI)",
            `게재 콘텐츠: ${deal.episode}`,
            `광고 형태: ${deal.adFormat}`,
            `광고 제품: ${deal.product}`,
        ] },
        { heading: "제3조 (일정과 자료 제공)", lines: [
            `촬영: ${deal.shootDate}`,
            `공개: ${deal.release}`,
            `${갑}은 촬영 전까지 광고 제품과 광고 문구(제품 특징, 쓰면 안 되는 표현 등)를 ${을}에게 제공한다.`,
        ] },
        { heading: "제4조 (광고비와 지급)", lines: [
            `광고비는 ${won(deal.supplyPrice)}(부가가치세 별도)${deal.listPrice ? `으로 한다(정가 ${won(deal.listPrice)}에서 할인한 금액)` : "으로 한다"}.${deal.secondUse ? ` 이 금액에는 제9조의 2차 활용(${deal.secondUse.months}개월)이 포함된다.` : ""} 부가가치세 ${won(vat)}을 더한 합계는 ${won(total)}이다.`,
            `${갑}은 계약 체결일부터 7일 안에 선금 ${won(half)}(합계의 50%)을, 영상 공개일부터 7일 안에 잔금 ${won(total - half)}을 ${account ? `아래 계좌(${account})` : `${을}이 지정한 계좌`}로 지급한다.`,
            `${을}은 각 금액에 대한 세금계산서를 발행한다.`,
        ] },
        { heading: "제5조 (기획과 검수)", lines: [
            `${을}은 촬영 전에 광고 부분 기획안을, 공개 전에 광고 부분 편집본을 ${갑}에게 공유한다.`,
            "수정 요청은 기획안 1회, 최종 편집본 1회로 한다. 자막 오탈자 같은 가벼운 수정은 횟수와 관계없이 반영한다.",
            `진행자의 말투와 유머 등 채널 고유의 진행 방식은 ${을}이 정하되, ${갑}이 제공한 문구와 사실에 어긋나지 않게 한다.`,
        ] },
        { heading: "제6조 (광고 표시와 게재 유지)", lines: [
            "광고 영상에는 유튜브 ‘유료 광고 포함’ 표시를 붙인다.",
            `${을}은 영상을 공개일부터 12개월 동안 유지하며, 정당한 사유 없이 삭제하거나 비공개로 바꾸지 않는다.`,
        ] },
        { heading: "제7조 (광고 문구의 책임)", lines: [
            `제품의 효능·성능에 관한 문구는 ${갑}이 제공하며, 의료기기 등 관계 법령에 따른 광고 심의와 표시 책임은 ${갑}에게 있다.`,
            `${을}은 ${갑}이 제공하거나 승인한 범위를 넘는 효능 표현을 하지 않는다.`,
        ] },
        { heading: "제8조 (성과와 결과 보고)", lines: [
            "조회수·판매 같은 광고 성과는 보장하지 않는다.",
            `${을}은 공개일부터 2주 뒤 조회수와 설명란 링크 클릭 수를 ${갑}에게 알린다.`,
        ] },
        { heading: "제9조 (2차 활용)", lines: deal.secondUse
            ? [
                `${갑}은 광고 부분 영상을 공개일부터 ${deal.secondUse.months}개월 동안 ${deal.secondUse.scope}에 활용할 수 있으며, 그 대가는 제4조 광고비에 포함된다.`,
                `${deal.secondUse.months}개월이 지난 뒤에도 활용하려면 ${갑}은 ${을}에게 연장 대가 ${won(deal.secondUse.extensionPrice)}(부가가치세 별도)을 지급한다. 연장 기간 등 세부 조건은 양측이 협의하여 정한다.`,
                `위 범위를 벗어나 활용하려면(다른 매체, 광고 부분 외의 영상 등) ${갑}은 ${을}과 미리 협의한다.`,
            ]
            : [`${갑}이 광고 영상을 자사 채널·SNS·광고에 다시 쓰려면 ${을}과 미리 협의하며, 3개월 기준 ${won(500_000)}(부가가치세 별도)을 따로 정한다.`] },
        { heading: "제10조 (계약 해지와 회차 변경)", lines: [
            `촬영 전에 ${갑}이 계약을 해지하면 ${을}은 받은 금액을 모두 돌려준다.`,
            `촬영 뒤 ${갑}의 사정으로 해지하면 선금은 돌려주지 않는다.`,
            `${을}의 사정으로 영상을 공개하지 못하면 ${을}은 받은 금액을 모두 돌려준다.`,
            "출연자 사정이나 천재지변 등으로 회차가 바뀌어야 하면, 양측이 협의하여 같은 조건으로 다른 회차에 게재한다.",
        ] },
        { heading: "제11조 (비밀유지)", lines: [`${갑}과 ${을}은 본 계약으로 알게 된 상대방의 업무상 비밀과 공개 전 영상 내용을 제3자에게 누설하지 않으며, 계약이 끝난 뒤에도 같다.`] },
        { heading: "제12조 (기타)", lines: [
            "본 계약에 없는 사항이나 해석이 다른 부분은 양측이 협의하여 정한다.",
            `본 계약은 ${갑}이 전자적 방법으로 계약 내용에 동의하고 서명한 때 성립한다. ${을}은 계약서를 PDF로 만들어 ${갑}이 입력한 이메일로 보내며, ${갑}과 ${을}은 이를 각자 보관한다.`,
            "본 계약에 관한 분쟁은 민사소송법에 따른 관할 법원에서 해결한다.",
        ] },
    ];

    return {
        title: "유튜브 광고(PPL) 계약서",
        preamble: `광고주 ${company}(이하 ${갑}이라 한다)과 ${eul.company?.trim() || deal.eulPrefill.company || "○○○"}(이하 ${을}이라 한다)은 ${갑}의 브랜드 ‘${deal.brand}’ 광고를 유튜브 채널 ‘딥마카이’에 게재하는 일에 관하여 다음과 같이 계약을 체결한다.`,
        articles,
        dateLine: `계약 체결일: ${kstDate(signedAt || new Date())}`,
        gap: [
            ["상호", party.company || "-"],
            ["대표자", party.ceo || "-"],
            ["사업자등록번호", party.bizNo || "-"],
            ["주소", party.address || "-"],
            ...(party.manager ? [["담당자", party.manager] as [string, string]] : []),
            ["이메일", party.email || "-"],
            ...(party.phone ? [["연락처", party.phone] as [string, string]] : []),
            ["서명자", party.signer || "-"],
            ["전자서명", signedAt ? `${kstDateTime(signedAt)} 계약 내용에 동의하고 서명` : "서명 전"],
        ],
        eul: [
            ["상호", eul.company || "-"],
            ["대표자", eul.ceo || "-"],
            ["사업자등록번호", eul.bizNo || "-"],
            ["주소", eul.address || "-"],
            ["채널", "유튜브 ‘딥마카이(DEEP MAKAI)’"],
            ["서명자", eul.signer || "-"],
            ["전자서명", eulAt ? `${kstDateTime(eulAt)} 서명` : "서명 전"],
        ],
        money: [
            ["광고비", `${won(deal.supplyPrice)} (부가가치세 별도)`],
            ...(deal.secondUse ? [["2차 활용", `공개일부터 ${deal.secondUse.months}개월 포함, 이후 연장 시 ${won(deal.secondUse.extensionPrice)}(부가가치세 별도)`] as [string, string]] : []),
            ["부가가치세", won(vat)],
            ["합계", won(total)],
            ["선금", `${won(half)} — 계약 체결일부터 7일 안`],
            ["잔금", `${won(total - half)} — 영상 공개일부터 7일 안`],
            ...(account ? [["입금 계좌", account] as [string, string]] : []),
        ],
    };
}

export const BIZNO_RE = /^\d{3}-?\d{2}-?\d{5}$/;
