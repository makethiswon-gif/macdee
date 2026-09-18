import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// 리뉴얼 공용 OG 이미지 (Phase 11 — §6.2 "OG 재제작").
//
// opengraph-image.tsx 파일 컨벤션을 쓰지 않는다 — 자식 페이지가 openGraph 를
// 선언하는 순간 부모 세그먼트의 파일 기반 이미지가 통째로 대체되어 사라진다
// (Next 메타데이터 병합이 openGraph 를 얕은 교체로 처리). 대신 명시적 라우트로
// 두고 각 페이지가 OG_IMAGE_PATH 를 images 에 직접 선언한다.
// 정적 PNG 대신 코드로 만든다 — 문구·톤 수정이 곧 코드 리뷰가 되도록.
//
// 디자인은 승인된 D 키네틱 방향을 따른다: 명함의 브랜드 블루(#004AAD) 바탕에 흰 글씨.
// (2026-09-18 이전에는 폐기된 네이비(#07111d) 톤이 남아 있어 사이트와 공유 이미지의 색이 달랐다.)
//
// 페이지별 문구: /og.png?p=<키>. 키는 아래 OG_COPY 에 있는 것만 받는다 — 임의의 문자열을
// 이미지에 찍을 수 없게 한다. 문구는 각 페이지의 승인된 H1 을 그대로 쓴다. 키가 없거나 모르면 기본 문구.

export const revalidate = 86400;

const SIZE = { width: 1200, height: 630 };

const FONT_DIR = join(process.cwd(), "node_modules/pretendard/dist/public/static");
const WORDMARK = join(process.cwd(), "public/brand/makethis1-white-v1.png");

const OG_COPY: Record<string, { kicker?: string; lines: [string, string?] }> = {
    "lawfirm-marketing": { kicker: "서비스", lines: ["법무법인 마케팅,", "한 팀에서."] },
    "naver-ads": { kicker: "광고 운영", lines: ["상담을 기준으로", "광고합니다."] },
    "lawfirm-seo": { kicker: "검색 노출", lines: ["검색에서", "찾기 쉽게."] },
    geo: { kicker: "AI 검색", lines: ["AI가", "읽기 쉽게."] },
    "lawfirm-blog": { kicker: "블로그·콘텐츠", lines: ["사건 경험을", "글로."] },
    "lawfirm-website": { kicker: "홈페이지", lines: ["상담하기 쉬운", "홈페이지."] },
    conversion: { kicker: "상담·수임 분석", lines: ["어디서 상담이", "오는지."] },
    about: { kicker: "회사 소개", lines: ["로펌 마케팅을", "맡는 사람들."] },
    work: { kicker: "운영 사례", lines: ["함께한", "로펌과 기업."] },
    consult: { kicker: "마케팅 상담", lines: ["우리 로펌에", "필요한 마케팅은?"] },
    upgrade: { kicker: "기존 고객 안내", lines: ["블로그는 이어가고.", "마케팅은 넓히고."] },
    magazine: { kicker: "매거진", lines: ["로펌 마케팅,", "지금 알아둘 것."] },
    contact: { kicker: "문의", lines: ["편하게", "문의하세요."] },
};

export async function GET(request: Request) {
    const key = new URL(request.url).searchParams.get("p") || "";
    const copy = Object.prototype.hasOwnProperty.call(OG_COPY, key) ? OG_COPY[key] : { lines: ["로펌에 필요한", "모든 마케팅, 하나로."] as [string, string] };

    const [bold, medium, wordmark] = await Promise.all([
        readFile(join(FONT_DIR, "Pretendard-Bold.otf")),
        readFile(join(FONT_DIR, "Pretendard-Medium.otf")),
        readFile(WORDMARK),
    ]);

    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    padding: "72px 84px",
                    backgroundColor: "#004aad",
                    color: "#ffffff",
                    fontFamily: "Pretendard",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    {/* Use the exact approved artwork, not a font approximation. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={`data:image/png;base64,${wordmark.toString("base64")}`}
                        width={160}
                        height={82.5}
                        alt="메이크디스원 MAKETHIS1"
                    />
                    <div
                        style={{
                            fontSize: 17,
                            fontWeight: 500,
                            letterSpacing: "0.22em",
                            color: "#dbe7f8",
                        }}
                    >
                        {copy.kicker || "LAW FIRM MARKETING"}
                    </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column" }}>
                    <div
                        style={{
                            width: 56,
                            height: 3,
                            backgroundColor: "#ffffff",
                            marginBottom: 40,
                        }}
                    />
                    <div
                        style={{
                            fontSize: 76,
                            fontWeight: 700,
                            lineHeight: 1.18,
                            letterSpacing: "-0.02em",
                        }}
                    >
                        {copy.lines[0]}
                    </div>
                    <div
                        style={{
                            fontSize: 76,
                            fontWeight: 700,
                            lineHeight: 1.18,
                            letterSpacing: "-0.02em",
                        }}
                    >
                        {copy.lines[1] || ""}
                    </div>
                    <div
                        style={{
                            marginTop: 36,
                            fontSize: 24,
                            fontWeight: 500,
                            color: "#dbe7f8",
                            letterSpacing: "-0.01em",
                        }}
                    >
                        검색광고 · 블로그 · SEO · AI 검색 · 홈페이지 · 상담 분석 — 메이크디스원 한 팀
                    </div>
                </div>
            </div>
        ),
        {
            ...SIZE,
            fonts: [
                { name: "Pretendard", data: bold, weight: 700, style: "normal" },
                { name: "Pretendard", data: medium, weight: 500, style: "normal" },
            ],
        }
    );
}
