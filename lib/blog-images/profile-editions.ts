import type { LayoutRecipe } from "./layout-recipes";
import type { EditorialProfile } from "./card-types";
import { eligibleStrengths, type StrengthLibrary } from "../blog-strengths";

export interface CredentialFact { text: string; sourceUrl: string; sourceQuote: string }
export interface CredentialProof { owner: string; revision: string; facts: CredentialFact[] }
export interface ProfileEdition {
    id: string;
    owner: string;
    cover: LayoutRecipe;
    proof: "portrait-index" | "nameplate" | "folio" | "column";
    accent: string;
    label: string;
    facts: CredentialFact[];
}
const fact = (text: string, sourceUrl: string, sourceQuote = text): CredentialFact => ({ text, sourceUrl, sourceQuote });
const axis = "https://axislaw.co.kr/portfolio/seungjun_oh/";
const saerok = "https://saerok.co.kr/chaewoori";
const calla = "https://www.calla-law.com/";
const il = "https://www.innovatelaw.kr/72";
const oleun = "http://oleunlawyer.com/";

// Art-directed editions. These are not a hash pool or a calendar rotation.
// Review after a month; change an edition only deliberately, never at midnight.
export const PROFILE_EDITIONS: readonly ProfileEdition[] = [
    { id: "axis-202609-v1", owner: "오승준", cover: "column-pair", proof: "column", accent: "#2755C9", label: "AXIS / 의료법률 저널", facts: [
        fact("의료광고의 이해 · 변호사가 병원을 말하다 저자", axis, "의료광고의 이해 (2012), 변호사가 병원을 말하다 (2024)"),
        fact("보건복지부·식품의약품안전처 소송대리 및 자문 경력", axis),
    ] },
    { id: "saerok-202609-v1", owner: "채우리", cover: "caption-rail", proof: "folio", accent: "#92283E", label: "새록 / 패밀리 에디션", facts: [
        fact("서울가정법원 선정 전문가후견인 경력", saerok, "서울가정법원 선정 전문가후견인"),
        fact("대한변협 성년후견법률지원특별위원회 위원 경력", saerok, "대한변호사협회 성년후견법률지원특별위원회 위원"),
    ] },
    { id: "calla-202609-v1", owner: "유지은", cover: "photo-open", proof: "nameplate", accent: "#326357", label: "카라 / 포트레이트 저널", facts: [
        fact("변호사·변리사·세무사 자격 취득", calla, "변호사, 변리사, 세무사 자격 취득"),
        fact("가족상담사 1급·심리상담사 1급 자격 취득", calla, "가족상담사 1급, 심리분석사 1급, 심리상담사 1급"),
    ] },
    { id: "il-202609-v1", owner: "이정도", cover: "split-footer", proof: "portrait-index", accent: "#306B7D", label: "아이엘 / 프랙티스 리뷰", facts: [
        fact("대한변호사협회 제22회 우수변호사상 수상", il, "제22회 우수변호사상 수상(대한변호사협회)"),
        fact("전 국민권익위원회 전문위원", il),
    ] },
    { id: "oleun-202609-v1", owner: "백창협", cover: "title-band", proof: "column", accent: "#9B3139", label: "오른 / 케이스 저널", facts: [
        fact("전 대구지방검찰청 검사직무대리", oleun),
        fact("전 의정부지방법원 고양지원 조정위원", oleun),
    ] },
    { id: "knal-202609-v1", owner: "이지은", cover: "headline", proof: "folio", accent: "#315B88", label: "그날 / 리걸 포트레이트", facts: [
        fact("법무법인 그날 부대표변호사", "https://knal.kr/sub/index/partner.html", "이지은 부대표 변호사"),
    ] },
    { id: "jeongung-202609-v1", owner: "김정웅", cover: "title-band", proof: "nameplate", accent: "#B54832", label: "양영&정훈 / 리스타트 리뷰", facts: [
        fact("2010년 광주지방법원 민사조정위원 경력", "https://lawfirmjunghoon.kr/sub4.php", "2010. 광주지방법원 민사조정위원"),
        fact("제49회 사법시험 합격 · 사법연수원 제40기 수료", "https://lawfirmjunghoon.kr/sub4.php"),
    ] },
    { id: "younghui-202609-v1", owner: "양영희", cover: "column-pair", proof: "portrait-index", accent: "#263F51", label: "양영&정훈 / 인사이트", facts: [
        fact("전 광주고등법원 수석부장판사", "https://junghoonlaw.com/news", "광주고등법원 수석부장판사를 지낸 양영희 변호사"),
        fact("사법연수원 제26기", "https://junghoonlaw.com/news", "양영희 변호사(사법연수원 26기)"),
    ] },
    { id: "youon-202609-v1", owner: "법무법인 유온", cover: "photo-open", proof: "column", accent: "#456B68", label: "유온 / 스튜디오 저널", facts: [
        fact("대표·파트너변호사가 직접 상담", "https://lawfirmyouon.com/FAQ", "모든 상담은 대표 변호사 및 파트너변호사가 직접 진행합니다."),
        fact("서로 다른 업무 영역을 맡은 변호사들의 협력적 검토", "https://lawfirmyouon.com/ABOUT"),
    ] },
    { id: "jeongeum-202609-v1", owner: "법무법인 정음 천안사무소", cover: "caption-rail", proof: "nameplate", accent: "#374B8A", label: "정음 / 로컬 저널", facts: [
        fact("강윤석 변호사 · 제5회 변호사시험", "https://daejeonbar.or.kr/sub06/s0601.php?code=&mode=view&page=1&seq=617&xml=", "강윤석 / 법무법인 정음 천안분사무소 / 변호사시험 5회"),
        fact("강윤석 변호사 · 서울시립대학교·충북대학교 법학전문대학원", "https://daejeonbar.or.kr/sub06/s0601.php?code=&mode=view&page=1&seq=617&xml="),
    ] },
];
const assignments: Record<string, string> = {
    mmlhi2x25zu2h: "axis", mmswe2dmpr95z: "saerok", mmlmhtx361r67: "saerok", mmlk8qh6gqq9l: "calla",
    mmkfnvun052ja: "il", mmkfuvwrvg64o: "il", mmkc1ylfhv1t6: "oleun", mmlg8fcm9bdgl: "knal",
    mqaaoypk621p6: "jeongung", mse8rx0bkl9f0: "younghui", mpatjgph1tnl5: "youon", mrvn35u3cxprq: "jeongeum",
};
const normalized = (s: string) => s.replace(/[\s|]/g, "");
export function profileEdition(profile: Pick<EditorialProfile, "id" | "lawyerName" | "officeName">): ProfileEdition | undefined {
    const prefix = assignments[profile.id];
    const edition = PROFILE_EDITIONS.find((e) => e.id === `${prefix}-202609-v1`);
    if (!edition) return undefined;
    const owner = edition.owner.startsWith("법무법인") ? profile.officeName : profile.lawyerName;
    return normalized(owner) === normalized(edition.owner) ? edition : undefined;
}
export function fixedCredentialProof(profile: EditorialProfile): CredentialProof | undefined {
    const edition = profileEdition(profile);
    return edition ? { owner: edition.owner, revision: edition.id + ":public-20260911", facts: edition.facts } : undefined;
}

export function withFixedCredentials(profile: EditorialProfile, library?: StrengthLibrary): EditorialProfile {
    const proof = fixedCredentialProof(profile);
    if (!proof) return profile;
    // Once an administrator manages this library, its approval/removal/expiry is
    // authoritative. Never resurrect revoked facts from the initial research seed.
    const managed = library && (library.revision > 0 || library.claims.length > 0);
    const facts = managed ? eligibleStrengths(library).slice(0, 2).map((c) => ({ text: c.imageText, sourceUrl: c.sourceUrl, sourceQuote: c.sourceQuote })) : proof.facts;
    return { ...profile, credentialProof: { ...proof, revision: proof.revision + `:library-${library?.revision || 0}`, facts } };
}
