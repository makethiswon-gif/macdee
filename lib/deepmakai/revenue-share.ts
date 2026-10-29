// 딥마카이 광고 수익 배분 약정서(2026-10-29 대표 지시): 광고 수입(부가세 별도)에서 메이크디스원 15%, 나머지 85%를
// 김승연 29.75%, 손진수·이윤준·서진수 각 18.4167%(55.25%의 3분의 1)로 나눈다. 다섯 명이 각자 자기 링크에서 서명하고,
// 다섯 명이 모두 서명하면 PDF 를 만들어 보낸다. 링크 코드는 서버 비밀값으로 만든다(lib/deepmakai/ad-contract-codes.ts).
// 화면(미리보기)과 서버(PDF)가 같은 문구를 쓴다. 서버 코드를 import 하지 않는다(브라우저에서도 쓴다).
import { COMPANY, kstDate, kstDateTime, won } from "@/lib/makethisone/contract";

export type ShareRole = "mto" | "kim" | "son" | "lee" | "seo";

export interface ShareMember {
    role: ShareRole;
    /** 계약서에 쓰는 이름(메이크디스원은 상호) */
    name: string;
    /** 계약서에 쓰는 비율 표기 */
    rate: string;
}

export const SHARE = {
    /** 보관 폴더 이름이자 서명 주소 코드의 재료 */
    id: "2026-10-deepmakai-revenue-share",
    members: [
        { role: "mto", name: COMPANY.name, rate: "15%" },
        { role: "kim", name: "김승연", rate: "29.75%" },
        { role: "son", name: "손진수", rate: "18.4167%" },
        { role: "lee", name: "이윤준", rate: "18.4167%" },
        { role: "seo", name: "서진수", rate: "18.4167%" },
    ] as ShareMember[],
};

export const memberOf = (role: ShareRole) => SHARE.members.find((m) => m.role === role)!;

/** 공급가액을 나눈다. 출연자 몫은 원 미만을 버리고, 버려서 남는 금액은 메이크디스원 몫이 된다. */
export function splitAmount(supply: number): Record<ShareRole, number> {
    const kim = Math.floor((supply * 2975) / 10000);
    const each = Math.floor((supply * 5525) / 30000); // 55.25%를 셋이 똑같이
    return { mto: supply - kim - each * 3, kim, son: each, lee: each, seo: each };
}

/** 메이크디스원 서명 때 입력 */
export interface ShareCompany { company: string; ceo: string; bizNo: string; address: string; email?: string; signer: string }
/** 출연자 서명 때 입력. 정산 계좌는 계약서(PDF)에 넣지 않고 관리자 화면에서만 본다. */
export interface SharePerson { name: string; birth: string; phone: string; email?: string; address?: string; account: string }
export type ShareParty = ShareCompany | SharePerson;

export interface ShareSignView { role: ShareRole; party: Partial<ShareParty>; signedAt: Date | null }

export interface ShareArticle { heading: string; lines: string[] }
export interface ShareContractPaper {
    title: string;
    preamble: string;
    articles: ShareArticle[];
    dateLine: string;
    example: [string, string][];
    parties: { role: ShareRole; title: string; rows: [string, string][] }[];
}

export const BIRTH_RE = /^(19|20)\d{2}[.\-/]?(0[1-9]|1[0-2])[.\-/]?(0[1-9]|[12]\d|3[01])$/;
export const PHONE_RE = /^01[016789]-?\d{3,4}-?\d{4}$/;

const EXAMPLE = 1_700_000;

export function buildShareContract(signs: ShareSignView[]): ShareContractPaper {
    const by = (role: ShareRole) => signs.find((s) => s.role === role);
    const m = "“메이크디스원”", p = "“출연자”";
    const last = signs.map((s) => s.signedAt).filter((d): d is Date => !!d).sort((a, b) => b.getTime() - a.getTime())[0];
    const ex = splitAmount(EXAMPLE);

    const articles: ShareArticle[] = [
        { heading: "제1조 (목적)", lines: [`본 약정은 유튜브 채널 ‘딥마카이(DEEP MAKAI)’의 광고 수입을 당사자들이 나누는 기준과 정산 방법을 정한다.`] },
        { heading: "제2조 (배분 대상 수입)", lines: [
            `배분 대상은 ${m}이 ‘딥마카이’ 채널과 그 콘텐츠(딥캐스트 등)에 게재하는 광고·협찬(PPL, 브랜디드 콘텐츠, 광고 영상의 2차 활용 대가와 그 연장 대가를 포함한다)으로 광고주에게서 실제로 받은 광고비 중 부가가치세를 뺀 공급가액으로 한다. 결제대행 수수료가 빠진 채 입금되면 그 수수료를 뺀 금액으로 한다.`,
            "광고주에게서 받은 부가가치세는 나누지 않는다.",
            "유튜브가 지급하는 채널 수익(애드센스 등)과 멤버십·후원 수익은 본 약정의 대상이 아니다.",
            "광고주가 현물로 제공한 제품은 나누지 않으며, 광고 계약에서 정한 대로 쓰거나 나누어 받는다.",
            `광고를 이행하는 데 따로 드는 비용(외부 촬영·제작비 등)을 빼고 나눌지는 해당 광고 계약 전에 당사자 전원이 협의하여 정한다.`,
        ] },
        { heading: "제3조 (배분 비율)", lines: [
            `${m}: 15% — 광고 영업, 광고주와의 계약 체결, 수금, 세금 신고와 정산 업무의 대가`,
            `나머지 85%는 ${p}에게 김승연 29.75%, 손진수 18.4167%, 이윤준 18.4167%, 서진수 18.4167%로 나눈다(손진수·이윤준·서진수의 몫은 각각 55.25%의 3분의 1이다).`,
            `${p}의 몫은 원 단위 미만을 버리고 계산하며, 버려서 남는 금액은 ${m}의 몫에 더한다.`,
            `비율은 광고가 들어간 회차의 출연 여부와 관계없이 적용한다. 특정 광고에 다른 비율을 적용하려면 그 광고 계약 전에 당사자 전원이 서면(메신저 포함)으로 합의한다.`,
        ] },
        { heading: "제4조 (적용 범위와 광고 계약)", lines: [
            "본 약정은 2026년 10월에 체결한 헤임타(주식회사 보딩패스) 광고 계약부터 적용한다.",
            `‘딥마카이’ 채널에 게재하는 광고 계약은 ${m}이 광고주와 체결하고, 광고비를 받는다. ${p}이 광고 문의를 받으면 ${m}에 전달한다.`,
            `${p}은 광고 계약에서 정한 촬영, 제품 사용 장면, 설명란·고정 댓글 등 광고 이행에 협조한다.`,
        ] },
        { heading: "제5조 (정산과 지급)", lines: [
            `${m}은 광고비를 받은 날(선금·잔금 등 나누어 받으면 각각 받은 날)부터 14일 안에 각 ${p}의 몫을 ${p}이 전자서명 때 적은 본인 명의 계좌로 지급한다.`,
            `${m}은 지급할 때 광고주, 계약 금액, 입금일과 입금액, 각자의 몫과 원천징수 세액을 ${p}에게 알린다. ${p}이 요청하면 광고 계약서와 세금계산서 사본을 보여 준다.`,
            `${p}이 계좌를 바꾸려면 ${m}에 서면(메신저 포함)으로 알린다.`,
        ] },
        { heading: "제6조 (세금)", lines: [
            `${m}은 광고주에게 세금계산서를 발행하고 부가가치세를 신고·납부한다.`,
            `${p}의 몫은 사업소득으로 보아 3.3%(소득세 3%, 지방소득세 0.3%)를 원천징수한 뒤 지급하며, ${m}이 원천세 신고·납부와 지급명세서 제출을 한다. ${p}은 이에 필요한 인적사항(주민등록번호 등)을 ${m}에 따로 알린다.`,
            `${p}이 사업자등록을 하고 세금계산서를 발행하는 경우에는 원천징수 대신 부가가치세를 더하여 지급한다.`,
        ] },
        { heading: "제7조 (비밀유지)", lines: ["당사자들은 광고 단가와 광고 계약 조건 등 본 약정으로 알게 된 내용을 당사자가 아닌 사람에게 알리지 않으며, 약정이 끝난 뒤에도 같다."] },
        { heading: "제8조 (기간과 탈퇴)", lines: [
            "본 약정의 기간은 당사자 전원이 서명한 날부터 1년으로 하며, 끝나기 30일 전까지 아무도 이의를 밝히지 않으면 같은 조건으로 1년씩 연장된다.",
            "당사자는 30일 전에 다른 당사자 전원에게 서면(메신저 포함)으로 알리고 본 약정에서 빠질 수 있다.",
            "약정이 끝나거나 당사자가 빠지더라도, 그 전에 체결된 광고 계약의 수입은 본 약정의 비율대로 나눈다.",
        ] },
        { heading: "제9조 (변경과 기타)", lines: [
            "배분 비율과 당사자를 바꾸거나 새 출연자를 더하려면 당사자 전원이 서면(메신저 포함)으로 합의한다.",
            "본 약정에 없는 사항이나 해석이 다른 부분은 당사자들이 협의하여 정한다.",
            `본 약정은 당사자 전원이 전자적 방법으로 내용에 동의하고 서명한 때 성립한다. ${m}은 약정서를 PDF로 만들어 당사자들이 적은 이메일로 보내며, 당사자들은 이를 각자 보관한다.`,
            "본 약정에 관한 분쟁은 민사소송법에 따른 관할 법원에서 해결한다.",
        ] },
    ];

    const parties = SHARE.members.map((mem) => {
        const s = by(mem.role);
        const at = s?.signedAt || null;
        const signed: [string, string] = ["전자서명", at ? `${kstDateTime(at)} 약정 내용에 동의하고 서명` : "서명 전"];
        if (mem.role === "mto") {
            const c = (s?.party || {}) as Partial<ShareCompany>;
            return { role: mem.role, title: `${m} (${mem.rate})`, rows: [
                ["상호", c.company || COMPANY.name], ["대표자", c.ceo || "-"], ["사업자등록번호", c.bizNo || "-"], ["주소", c.address || "-"],
                ...(c.email ? [["이메일", c.email] as [string, string]] : []), ["서명자", c.signer || "-"], signed,
            ] as [string, string][] };
        }
        const q = (s?.party || {}) as Partial<SharePerson>;
        return { role: mem.role, title: `${p} ${mem.name} (${mem.rate})`, rows: [
            ["성명", q.name || mem.name], ["생년월일", q.birth || "-"], ["연락처", q.phone || "-"],
            ...(q.email ? [["이메일", q.email] as [string, string]] : []), ...(q.address ? [["주소", q.address] as [string, string]] : []), signed,
        ] as [string, string][] };
    });

    return {
        title: "딥마카이 광고 수익 배분 약정서",
        preamble: `${COMPANY.name}(이하 ${m}이라 한다)과 ‘딥마카이’ 출연자 김승연, 손진수, 이윤준, 서진수(이하 각각 또는 함께 ${p}이라 한다)는 ‘딥마카이’ 채널 광고 수입의 배분에 관하여 다음과 같이 약정한다.`,
        articles,
        dateLine: `약정일: ${last && signs.length === SHARE.members.length && signs.every((s) => s.signedAt) ? kstDate(last) : "당사자 전원 서명일"}`,
        example: [
            ["광고비(공급가액)", `${won(EXAMPLE)} (부가가치세 별도)`],
            ...SHARE.members.map((mem) => [`${mem.name} ${mem.rate}`, `${won(ex[mem.role])}${mem.role === "mto" ? (ex.mto !== Math.round(EXAMPLE * 0.15) ? " (끝수 포함)" : "") : " (3.3% 원천징수 전)"}`] as [string, string]),
        ],
        parties,
    };
}
