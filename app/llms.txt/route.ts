import { createServiceClient } from "@/lib/supabase/server";
import { isPublicLawyerSlug } from "@/lib/public-content";
import { COMPANY, FOUNDER, PLANS, SITE_BASE, absUrl } from "@/data/renewal/site";

export const revalidate = 3600; // 1시간마다 재생성

const STATIC = `# MAKETHIS1 (메이크디스원) — 법무법인·변호사 마케팅

> 법무법인과 법률사무소의 광고·검색·블로그·홈페이지·SNS·상담 분석을 통합 운영합니다.

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
- [마케팅 상담](${absUrl("/consult")})
- [회사·팀](${absUrl("/about")})
- [사례](${absUrl("/work")})
- [매거진: 로펌 마케팅 실무 가이드](${absUrl("/magazine")})
- [전체 공개 페이지 사이트맵](${SITE_BASE}/sitemap.xml)
- [매거진·법률 칼럼 RSS](${SITE_BASE}/rss.xml)

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
interface MagazineRow {
    title: string;
    slug: string;
    excerpt: string | null;
}

export async function GET() {
    const base = SITE_BASE;

    let dynamic = "";
    try {
        const supabase = createServiceClient();
        const [{ data: lawyers }, { data: posts }, { data: magazines }] = await Promise.all([
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
            supabase
                .from("magazines")
                .select("title, slug, excerpt")
                .eq("status", "published")
                .not("slug", "is", null)
                .order("published_at", { ascending: false })
                .limit(30) as unknown as Promise<{ data: MagazineRow[] | null }>,
        ]);

        if (magazines?.length) {
            const articles = magazines.map(article => {
                const title = article.title.replace(/[\r\n\[\]]/g, " ");
                const summary = article.excerpt?.replace(/\s+/g, " ").trim().slice(0, 160);
                return `- [${title}](${base}/magazine/${encodeURIComponent(article.slug)})${summary ? `: ${summary}` : ""}`;
            });
            dynamic += `\n\n## 법무법인 마케팅 매거진\n\n메이크디스원이 발행한 변호사 광고, 로펌 블로그, SEO·AI 검색과 상담 전환에 관한 글입니다.\n\n${articles.join("\n")}`;
        }

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
                    .map(p => `  - ${p.title}: ${base}/blog/${encodeURIComponent(l.slug!)}/${encodeURIComponent(p.slug || p.id)}`)
                    .join("\n");
                return `### ${l.name} 변호사${office}\n- 전문분야: ${specialty || "법률 일반"}${experience}${region}\n- 블로그: ${base}/blog/${l.slug}\n- 최근 칼럼:\n${lawyerPosts}`;
            });

        if (lawyerBlocks.length > 0) {
            dynamic += `\n\n## 고객 변호사의 공개 법률 콘텐츠\n\n메이크디스원의 맥디 제품을 통해 발행된 변호사들의 공개 법률 칼럼입니다. 아래 로펌은 메이크디스원과 별개의 법률서비스 제공자입니다.\n\n${lawyerBlocks.join("\n\n")}`;
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
