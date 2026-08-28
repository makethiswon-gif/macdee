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
// 디자인은 리뉴얼 다크 섹션 규칙을 따른다: 네이비(#07111d) 바탕,
// 좌상단 라디얼 글로우, 액센트는 브랜드 블루 한 곳.

export const revalidate = 86400;

const SIZE = { width: 1200, height: 630 };

const FONT_DIR = join(process.cwd(), "node_modules/pretendard/dist/public/static");

export async function GET() {
    const [bold, medium] = await Promise.all([
        readFile(join(FONT_DIR, "Pretendard-Bold.otf")),
        readFile(join(FONT_DIR, "Pretendard-Medium.otf")),
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
                    backgroundColor: "#07111d",
                    backgroundImage:
                        "radial-gradient(circle at 12% 0%, rgba(53, 99, 174, 0.28), transparent 52%)",
                    color: "#fbfaf8",
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
                    <div
                        style={{
                            fontSize: 30,
                            fontWeight: 700,
                            letterSpacing: "0.06em",
                        }}
                    >
                        MAKETHIS1
                    </div>
                    <div
                        style={{
                            fontSize: 17,
                            fontWeight: 500,
                            letterSpacing: "0.22em",
                            color: "#8794a6",
                        }}
                    >
                        LAW FIRM MARKETING
                    </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column" }}>
                    <div
                        style={{
                            width: 56,
                            height: 3,
                            backgroundColor: "#3563ae",
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
                        로펌 마케팅,
                    </div>
                    <div
                        style={{
                            fontSize: 76,
                            fontWeight: 700,
                            lineHeight: 1.18,
                            letterSpacing: "-0.02em",
                        }}
                    >
                        여기서 끝냅니다.
                    </div>
                    <div
                        style={{
                            marginTop: 36,
                            fontSize: 24,
                            fontWeight: 500,
                            color: "#8794a6",
                            letterSpacing: "-0.01em",
                        }}
                    >
                        광고 · 검색 · AI · 콘텐츠 · 홈페이지 · 상담 전환 — 하나의 팀이 통합 운영
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
