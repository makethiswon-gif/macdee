// IndexNow — 새 글 주소를 Bing·네이버 등 참여 검색엔진에 바로 알린다(2026-10-11, 맥디 블로그 자동 발행).
// ChatGPT 검색은 Bing 색인을 쓰므로, 색인이 빨라지면 AI 답변에 잡히는 시점도 앞당겨진다.
// 키는 비밀이 아니다(규격상 공개 파일로 둔다): public/{INDEXNOW_KEY}.txt. 키를 바꾸면 그 파일 이름·내용도 같이 바꾼다.
// 실패해도 예외를 던지지 않는다 — 사이트맵으로도 결국 발견된다.

export const INDEXNOW_KEY = "7299a755facc8afdf05e7997bef5f38c";

export async function submitIndexNow(urls: string[], baseUrl: string): Promise<{ ok: boolean; status?: number; error?: string }> {
    if (!urls.length) return { ok: true };
    try {
        const base = new URL(baseUrl);
        const res = await fetch("https://api.indexnow.org/indexnow", {
            method: "POST",
            signal: AbortSignal.timeout(10_000),
            headers: { "Content-Type": "application/json; charset=utf-8" },
            body: JSON.stringify({
                host: base.host,
                key: INDEXNOW_KEY,
                keyLocation: `${base.origin}/${INDEXNOW_KEY}.txt`,
                urlList: urls,
            }),
        });
        // 200 접수, 202 키 확인 대기 — 둘 다 정상이다.
        return { ok: res.status === 200 || res.status === 202, status: res.status };
    } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
}
