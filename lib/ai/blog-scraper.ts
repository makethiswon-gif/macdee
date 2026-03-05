import * as cheerio from "cheerio";

export interface ScrapedContent {
    title: string;
    text: string;
    source: "naver_blog" | "generic";
}

/**
 * Detect if a URL is a Naver blog URL and convert to mobile version for easier parsing.
 */
function toNaverMobileUrl(url: string): string | null {
    // Match blog.naver.com/username/postId or m.blog.naver.com/username/postId
    const match = url.match(
        /^https?:\/\/(?:m\.)?blog\.naver\.com\/([^/?#]+)\/(\d+)/
    );
    if (match) {
        return `https://m.blog.naver.com/${match[1]}/${match[2]}`;
    }

    // Match blog.naver.com/PostView.naver?blogId=...&logNo=...
    const legacyMatch = url.match(
        /^https?:\/\/(?:m\.)?blog\.naver\.com\/PostView\.naver/
    );
    if (legacyMatch) {
        const urlObj = new URL(url);
        const blogId = urlObj.searchParams.get("blogId");
        const logNo = urlObj.searchParams.get("logNo");
        if (blogId && logNo) {
            return `https://m.blog.naver.com/${blogId}/${logNo}`;
        }
    }

    return null;
}

/**
 * Scrape a Naver blog post and extract title + body text.
 */
async function scrapeNaverBlog(url: string): Promise<ScrapedContent> {
    const mobileUrl = toNaverMobileUrl(url)!;

    const res = await fetch(mobileUrl, {
        headers: {
            "User-Agent":
                "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
            Accept: "text/html,application/xhtml+xml",
            "Accept-Language": "ko-KR,ko;q=0.9",
        },
    });

    if (!res.ok) {
        throw new Error(`네이버 블로그 접근 실패: HTTP ${res.status}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // Extract title
    let title = "";

    // Mobile blog title selectors
    const titleSelectors = [
        ".se-title-text",         // SmartEditor 3
        ".post_title",            // Mobile blog
        "#viewTypeSelector .se-fs-",  // SE3 title
        "h3.se_textarea",         // SE2
        ".pcol1 h3",              // Older format
        "title",                  // fallback
    ];

    for (const sel of titleSelectors) {
        const el = $(sel).first();
        if (el.length && el.text().trim()) {
            title = el.text().trim();
            // Clean up title tag that includes blog name
            if (sel === "title") {
                title = title.replace(/\s*[:：\-–—|]\s*네이버\s*블로그.*$/i, "").trim();
            }
            break;
        }
    }

    // Extract body text
    let bodyText = "";

    // SmartEditor 3 (most common modern format)
    const se3Container = $(".se-main-container");
    if (se3Container.length) {
        // Remove unnecessary elements
        se3Container.find(".se-oglink-container, .se-map-container, script, style, .se-sticker-container").remove();

        // Get text from paragraphs
        const paragraphs: string[] = [];
        se3Container.find(".se-text-paragraph").each((_, el) => {
            const text = $(el).text().trim();
            if (text) paragraphs.push(text);
        });

        if (paragraphs.length > 0) {
            bodyText = paragraphs.join("\n\n");
        } else {
            // Fallback: get all text from container
            bodyText = se3Container.text().replace(/\s+/g, " ").trim();
        }
    }

    // Fallback: try older blog formats
    if (!bodyText.trim()) {
        const oldSelectors = [
            "#postViewArea",       // Classic blog
            ".post_ct",            // Mobile classic
            "#post-view",          // Another variant
            ".se_component_wrap",  // SE2
            "#content-area",       // Generic
        ];

        for (const sel of oldSelectors) {
            const el = $(sel).first();
            if (el.length) {
                el.find("script, style, .btn_area, .post_footer").remove();
                bodyText = el.text().replace(/\s+/g, " ").trim();
                if (bodyText.length > 50) break;
            }
        }
    }

    // Last resort: get og:description
    if (!bodyText.trim()) {
        bodyText = $('meta[property="og:description"]').attr("content") || "";
    }

    if (!title) {
        title = $('meta[property="og:title"]').attr("content") || "네이버 블로그";
    }

    return { title, text: bodyText, source: "naver_blog" };
}

/**
 * Scrape a generic web page (non-Naver) for main content.
 */
async function scrapeGenericUrl(url: string): Promise<ScrapedContent> {
    const res = await fetch(url, {
        headers: {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml",
            "Accept-Language": "ko-KR,ko;q=0.9",
        },
    });

    if (!res.ok) {
        throw new Error(`페이지 접근 실패: HTTP ${res.status}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // Remove noise
    $("script, style, nav, header, footer, .sidebar, .advertisement, .comments, iframe").remove();

    // Extract title
    const title =
        $('meta[property="og:title"]').attr("content") ||
        $("h1").first().text().trim() ||
        $("title").text().trim() ||
        "웹 페이지";

    // Extract body — try semantic elements first
    let bodyText = "";
    const bodySelectors = ["article", "main", '[role="main"]', ".post-content", ".article-body", ".entry-content"];

    for (const sel of bodySelectors) {
        const el = $(sel).first();
        if (el.length) {
            bodyText = el.text().replace(/\s+/g, " ").trim();
            if (bodyText.length > 100) break;
        }
    }

    // Fallback to body
    if (bodyText.length < 100) {
        bodyText = $("body").text().replace(/\s+/g, " ").trim();
    }

    return { title, text: bodyText, source: "generic" };
}

/**
 * Main entry point: scrape any URL. Detects Naver blog URLs automatically.
 */
export async function scrapeUrl(url: string): Promise<ScrapedContent> {
    const isNaverBlog = toNaverMobileUrl(url) !== null;

    if (isNaverBlog) {
        return scrapeNaverBlog(url);
    }

    return scrapeGenericUrl(url);
}
