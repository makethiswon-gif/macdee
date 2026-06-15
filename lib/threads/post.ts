// ─── Meta Threads 자동 포스팅 ───
// 2단계: 컨테이너 생성(POST /{user}/threads) → 발행(POST /{user}/threads_publish)
// link_attachment를 쓰면 URL이 본문 500자 제한에 포함되지 않고 별도 미리보기 카드로 노출됨.
// 필요한 환경변수: THREADS_ACCESS_TOKEN, THREADS_USER_ID

const GRAPH = "https://graph.threads.net/v1.0";

export interface ThreadsResult {
    ok: boolean;
    id?: string;
    skipped?: boolean;
    error?: string;
}

export async function postToThreads(opts: { text: string; linkUrl?: string }): Promise<ThreadsResult> {
    const token = process.env.THREADS_ACCESS_TOKEN;
    const userId = process.env.THREADS_USER_ID;
    if (!token || !userId) {
        return { ok: false, skipped: true, error: "THREADS 환경변수 미설정" };
    }

    // 본문은 500자 한도. 안전하게 자름.
    const text = opts.text.slice(0, 490);

    try {
        // 1) 컨테이너 생성
        const createParams = new URLSearchParams({
            media_type: "TEXT",
            text,
            access_token: token,
        });
        if (opts.linkUrl) createParams.set("link_attachment", opts.linkUrl);

        const createRes = await fetch(`${GRAPH}/${userId}/threads?${createParams.toString()}`, {
            method: "POST",
        });
        const createJson = await createRes.json();
        if (!createRes.ok || !createJson.id) {
            return { ok: false, error: `컨테이너 생성 실패: ${JSON.stringify(createJson)}` };
        }

        // Meta가 컨테이너를 비동기 처리하므로 잠시 대기 (권장)
        await new Promise((r) => setTimeout(r, 5000));

        // 2) 발행
        const pubParams = new URLSearchParams({
            creation_id: createJson.id,
            access_token: token,
        });
        const pubRes = await fetch(`${GRAPH}/${userId}/threads_publish?${pubParams.toString()}`, {
            method: "POST",
        });
        const pubJson = await pubRes.json();
        if (!pubRes.ok || !pubJson.id) {
            return { ok: false, error: `발행 실패: ${JSON.stringify(pubJson)}` };
        }

        return { ok: true, id: pubJson.id };
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : "unknown" };
    }
}
