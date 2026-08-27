// 리뉴얼 데모 플래그
//
// ⚠️ 색인 차단은 여기 한 곳에서만 켠다.
//
// 배경 — 두 번 막았다가 두 번 다 외부 AI 리더가 본문을 못 읽었다.
//   1차: X-Robots-Tag: noindex     → OpenAI 계열이 noindex 를 존중해 읽기 거부
//   2차: robots.txt 에서 색인 봇만 Disallow
//        → robots 파서가 보수적으로 동작해 역시 차단. / 는 읽히고 데모만 실패.
//
// 즉 "외부 AI에게 검수받기"와 "검색 색인 차단"은 동시에 성립하지 않는다.
//
// 지금은 외부 검수가 목적이므로 false(= 크롤 허용).
// 검수가 끝나면 이 값을 true 로 바꾼다. 그러면 데모 하위 전 페이지에
// noindex 가 걸린다. 그 시점부터 ChatGPT 등에서는 다시 못 읽는다.
//
// 색인 노출은 이 플래그와 무관하게 아래로 관리한다.
//   - sitemap.xml 에 넣지 않는다
//   - 어디에서도 데모 경로로 링크하지 않는다
//   - 홈페이지 교체 시 데모 경로 → / 301 을 반드시 건다
export const RENEWAL_NOINDEX = false;

import type { Metadata } from "next";

/** 플래그가 켜져 있을 때만 noindex 를 반환한다. 꺼져 있으면 undefined(= 상속). */
export function renewalRobots(): Metadata["robots"] {
    return RENEWAL_NOINDEX ? { index: false, follow: false, nocache: true } : undefined;
}

/** 화면 배지에 실제 상태를 그대로 쓴다. 배지가 거짓말하지 않도록. */
export const DEMO_BADGE = RENEWAL_NOINDEX ? "DEMO · NOINDEX" : "DEMO · 크롤 허용";
