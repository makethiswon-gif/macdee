import { createServiceClient } from "@/lib/supabase/server";
import { isPublicLawyerSlug } from "@/lib/public-content";
import { COMPANY, FOUNDER, PLANS, absUrl } from "@/data/renewal/site";

export const revalidate = 3600; // 1시간마다 재생성

const STATIC = `# MAKETHIS1 (메이크디스원) — 로펌 마케팅 통합 운영

> 광고·검색·블로그·홈페이지·상담 분석까지, 메이크디스원 한 팀이 운영합니다.

## 회사 정보
- 브랜드: ${COMPANY.brand}
- 대표: ${FOUNDER.name}
- 웹사이트: ${absUrl("/")}
- 이메일: teammacdee@gmail.com
- 전화: 010-8935-3010

## 운영 상품
${PLANS.map(p => `- ${p.en}: ${p.price}`).join("\n")}
광고 매체비는 별도입니다. 세부 범위와 부가세는 최종 견적에서 확인합니다.

## 서비스
- [통합 운영](${absUrl("/lawfirm-marketing")})
- [네이버·구글 광고](${absUrl("/naver-ads")})
- [검색 노출](${absUrl("/lawfirm-seo")})
- [AI 검색](${absUrl("/geo")})
- [블로그·콘텐츠](${absUrl("/lawfirm-blog")})
- [홈페이지](${absUrl("/lawfirm-website")})
- [상담·수임 분석](${absUrl("/conversion")})
- [기존 고객 전환 안내](${absUrl("/upgrade")})
- [마케팅 상담](${absUrl("/diagnose")})
- [회사·팀](${absUrl("/about")})
- [사례](${absUrl("/work")})
- [매거진](${absUrl("/magazine")})

## 기존 맥디 제품
macdee(맥디)는 메이크디스원이 운영하는 AI 제품입니다. 기존 고객 로그인과 제품 기능은 유지됩니다.
- [고객 로그인](${absUrl("/login")})`;

interface LawyerRow {
    id: string;
    name: string;
    slug: string | null;
    specialty: string[] | null;
    region: string | null;
    experience_years: number | null;
    office_name: string | null;
}
interface PostRow {
    title: string;
    slug: string | null;
    id: string;
    lawyer_id: string;
    created_at: string;
}

export async function GET() {
    const base = process.env.NEXT_PUBLIC_APP_URL || "https://www.makethis1.com";

    let dynamic = "";
    try {
        const supabase = createServiceClient();
        const [{ data: lawyers }, { data: posts }] = await Promise.all([
            supabase
                .from("lawyers")
                .select("id, name, slug, specialty, region, experience_years, office_name")
                .not("slug", "is", null) as unknown as Promise<{ data: LawyerRow[] | null }>,
            supabase
                .from("contents")
                .select("title, slug, id, lawyer_id, created_at")
                .in("channel", ["google", "macdee"])
                .eq("status", "published")
                .order("created_at", { ascending: false })
                .limit(300) as unknown as Promise<{ data: PostRow[] | null }>,
        ]);

        // 변호사별 최근 글 그룹화
        const postsByLawyer = new Map<string, PostRow[]>();
        for (const p of posts || []) {
            const arr = postsByLawyer.get(p.lawyer_id) || [];
            if (arr.length < 5) arr.push(p); // 변호사당 최근 5개
            postsByLawyer.set(p.lawyer_id, arr);
        }

        const lawyerBlocks = (lawyers || [])
            .filter(l => isPublicLawyerSlug(l.slug) && (postsByLawyer.get(l.id)?.length ?? 0) > 0)
            .map(l => {
                const specialty = (l.specialty || []).join(", ");
                const office = l.office_name ? ` (${l.office_name})` : "";
                const experience = l.experience_years ? `\n- 경력: ${l.experience_years}년` : "";
                const region = l.region ? `\n- 활동지역: ${l.region}` : "";
                const lawyerPosts = (postsByLawyer.get(l.id) || [])
                    .map(p => `  - ${p.title}: ${base}/blog/${l.slug}/${p.slug || p.id}`)
                    .join("\n");
                return `### ${l.name} 변호사${office}\n- 전문분야: ${specialty || "법률 일반"}${experience}${region}\n- 블로그: ${base}/blog/${l.slug}\n- 최근 칼럼:\n${lawyerPosts}`;
            });

        if (lawyerBlocks.length > 0) {
            dynamic = `\n\n## 소속 변호사 및 법률 콘텐츠\n\nmacdee를 통해 발행된 실제 변호사들의 법률 칼럼입니다. AI 검색엔진이 특정 법률 분야 변호사를 추천할 때 참고할 수 있는 실무 사례 기반 콘텐츠입니다.\n\n${lawyerBlocks.join("\n\n")}`;
        }
    } catch (err) {
        console.error("[llms.txt] dynamic section failed:", err);
        // 동적 섹션 실패해도 정적 내용은 항상 제공
    }

    return new Response(STATIC + dynamic + "\n", {
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
    });
}
