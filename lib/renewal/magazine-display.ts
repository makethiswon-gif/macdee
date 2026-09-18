// 매거진 표시 정리 — DB 원문은 건드리지 않고, 화면·피드에 내보낼 때만 다듬는다.
//
// 2026-09-18 점검에서 확인한 문제:
//  1) 92편 중 76편의 작성자가 "macdee 에디터"/"MACDEE 에디터"로 표시됐다.
//     마케팅 브랜드는 MAKETHIS1 하나로 통일했으므로(HANDOFF §1) 화면에는 편집팀 이름을 쓴다.
//  2) 아임웹에서 옮겨 온 옛 칼럼 16편의 본문 끝에 "원문 : https://blog.naver.com/…" 링크와
//     옛 서명 블록("전문직마케팅의 스페셜리스트 맥디 macdee. … 전화상담 TEL.")이 그대로 나왔다.
//  3) 같은 글들의 excerpt 가 "\n\t\t\t\t\tmakethis1.com한국에서…"처럼 들여쓰기·도메인 찌꺼기로 시작해
//     목록·메타 설명·RSS 에 그대로 실렸다.
// slug·본문 내용·발행일은 바꾸지 않는다(§20 매거진 slug 변경 금지).

export const EDITORIAL_TEAM = "MAKETHIS1 편집팀";

/** 옛 제품명(macdee) 명의의 작성자 표기를 현재 브랜드의 편집팀으로 바꾼다. 사람 이름은 그대로 둔다. */
export function displayAuthor(author: string | null | undefined): string {
    const name = (author || "").trim();
    if (!name || /macdee|맥디/i.test(name) || /^(메이크디스원|makethis1)$/i.test(name)) return EDITORIAL_TEAM;
    return name;
}

/** 목록·메타 설명·RSS 에 쓰는 요약. 공백을 정리하고 앞머리의 도메인 찌꺼기를 걷어낸다. */
export function cleanExcerpt(excerpt: string | null | undefined): string {
    return (excerpt || "")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/^(?:https?:\/\/)?(?:www\.)?makethis1\.com\s*/i, "")
        .trim();
}

const isLegacyHtml = (body: string) => /^\s*<div[\s>]/i.test(body) && /_comment_body_|cdn\.imweb\.me|class="file_area"/.test(body);

/**
 * 아임웹에서 옮겨 온 옛 HTML 본문의 꼬리를 정리한다.
 * 글의 내용(문단·이미지)은 그대로 두고, 글이 아닌 것만 걷어낸다.
 */
export function cleanLegacyBody(body: string): string {
    if (!isLegacyHtml(body)) return body;
    let html = body;
    // 옛 서명 블록: 마지막 <hr> 뒤에 오는 "스페셜리스트 맥디 … 전화상담 TEL" 묶음
    html = html.replace(/<hr\s*\/?>(?:(?!<hr)[\s\S])*?스페셜리스트\s*맥디[\s\S]*$/i, "</div>");
    // 구분선 없이 가운데 정렬 문단으로 끝나는 서명 변형 ("유능하고 실력있는 전문직마케팅 맥디 macdee. … 전화상담")
    html = html.replace(/(?:<p[^>]*>\s*(?:<br[^>]*>)?\s*<\/p>\s*)*<p style="text-align:\s*center;?">(?:(?!<p style="text-align:\s*center)[\s\S])*?맥디\s*macdee[\s\S]*$/i, "</div>");
    // 네이버 블로그 원문 링크만 있는 문단 ("원문 : URL" 또는 URL 단독)
    html = html.replace(/<p[^>]*>\s*(?:원문\s*[:：]\s*)?<a\s+href="https?:\/\/(?:m\.)?blog\.naver\.com\/[^"]*"[^>]*>\s*https?:\/\/(?:m\.)?blog\.naver\.com\/[^<]*<\/a>\s*<\/p>/gi, "");
    // 첨부 영역 껍데기
    html = html.replace(/<div class="file_area">\s*<\/div>/gi, "");
    // 파일명이 그대로 들어간 대체 텍스트는 읽어 줄 가치가 없다 → 장식 이미지로 처리
    html = html.replace(/(<img\b[^>]*?\balt=")[^"]*\.(?:png|jpe?g|gif|webp)(")/gi, "$1$2");
    // 본문 이미지는 지연 로딩
    html = html.replace(/<img\b(?![^>]*\bloading=)/gi, '<img loading="lazy" decoding="async"');
    // 글머리의 옛 제품명 배너: 16편 모두 본문이 시작되기 전에 "macdee." 로고 배너(또는 네이버 링크 카드의
    // 미리보기 이미지와 "makethis1.com" 캡션)가 놓여 있다. 첫 글자가 나오기 전의 이미지·빈 문단만 걷어낸다.
    const lead = /^(\s*<div class="[^"]*_comment_body_[^"]*">)\s*(?:<p[^>]*>\s*(?:<br[^>]*>|&nbsp;|\s)*<\/p>|<(p|h2|h3)\b[^>]*>\s*(?:<br[^>]*>\s*)*(?:<(?:strong|span)\b[^>]*>\s*)*<img\b[^>]*>\s*(?:<\/(?:strong|span)>\s*)*<\/\2>|<div\b[^>]*>\s*<div\b[^>]*>\s*<div\b[^>]*>\s*(?:<img\b[^>]*>|<p[^>]*>\s*makethis1\.com\s*<\/p>)\s*<\/div>\s*<\/div>\s*<\/div>)/i;
    for (let i = 0; i < 12 && lead.test(html); i++) html = html.replace(lead, "$1");
    // 배너가 첫 문단 안에서 글과 붙어 있는 변형(<p><img …>본문…): 문단은 두고 이미지와 바로 뒤 줄바꿈만 뺀다
    html = html.replace(/^(\s*<div class="[^"]*_comment_body_[^"]*">\s*<(?:p|h2|h3)\b[^>]*>)\s*<img\b[^>]*>(?:\s*<br[^>]*>)*/i, "$1");
    for (let i = 0; i < 4 && lead.test(html); i++) html = html.replace(lead, "$1");
    // 본문 중간·끝에 끼어 있는 옛 "macdee." 배너(직접 확인한 4장). 도표·표 같은 내용 이미지는 남긴다.
    html = html.replace(/<img\b[^>]*\/(?:03abbcb71b945|07949070288df|bcb109a6af778|582ce17d69683)\.png"[^>]*>/gi, "");
    // 옛 편집기가 소제목을 <h5> 로 넣었다. 글 제목(h1) 바로 아래에서 h5 가 나오면 제목 단계가 건너뛰어
    // 스크린리더의 문서 개요가 깨진다(Lighthouse heading-order). 본문 소제목은 h2 로 맞춘다.
    html = html.replace(/<(\/?)h[1456]\b/gi, "<$1h2");
    // 빈 문단이 두세 개씩 겹쳐 문단 사이가 과하게 벌어진다 → 하나로
    html = html.replace(/(?:<p[^>]*>\s*(?:<br[^>]*>|&nbsp;|\s)*<\/p>\s*){2,}/gi, "<p><br></p>");
    // 꼬리에 남은 빈 문단·구분선
    html = html.replace(/(?:\s*<p[^>]*>\s*(?:<br[^>]*>|&nbsp;|\s)*<\/p>\s*|\s*<hr\s*\/?>\s*)+(<\/div>\s*)$/i, "$1");
    return html;
}

/** 발행일을 한국 시간 기준 YYYY.MM.DD 로. 서버가 UTC 여도 KST 새벽 발행분이 전날로 찍히지 않게 한다. */
export function formatKstDate(iso: string | null | undefined): string {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
    return `${kst.getUTCFullYear()}.${String(kst.getUTCMonth() + 1).padStart(2, "0")}.${String(kst.getUTCDate()).padStart(2, "0")}`;
}
