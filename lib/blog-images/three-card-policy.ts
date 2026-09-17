import type { EditorialProfile } from "./card-types";
import type { LayoutRecipe } from "./layout-recipes";
import { getMagazineIdentity } from "./magazine-identity";
import { profileEdition } from "./profile-editions";

export function contactCopy(title: string) {
    const topic = ["상간", "보증금 반환", "전세사기", "재산분할", "양육비", "상속", "개인회생", "법인회생", "파산", "학교폭력", "성폭력", "가정폭력", "의료", "이혼", "부동산", "건설", "형사"]
        .find(word => title.replace(/\s/g, "").includes(word.replace(/\s/g, "")));
    if (topic === "상간") return { heading: "상간 소송,\n지금 가진 자료로 가능할까요?", deck: "보유한 자료와 현재 상황을 정리해 상담을 문의하세요." };
    return { heading: topic ? `${topic},\n내 상황부터 확인하고 싶다면` : "어디서부터 설명해야 할지\n막막하신가요?",
        deck: "현재 상황과 궁금한 점을 정리해 상담을 문의하세요." };
}

export function editorialCoverLayout(profile: EditorialProfile, _recent: { layoutRecipe?: LayoutRecipe }[] = []): LayoutRecipe {
    const primary = profileEdition(profile)?.cover || ({ journal: "photo-open", poster: "title-band", column: "column-pair", atlas: "split-footer", ledger: "caption-rail", dossier: "headline" } as const)[getMagazineIdentity(profile).family];
    return primary;
}
