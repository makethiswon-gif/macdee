// Simple smoke monitor: fetch key public URLs and fail fast on slow/broken responses.
const DEFAULT_URLS = [
  { url: "https://www.makethis1.com/", expect: /<title[^>]*>[^<]+<\/title>/i },
  { url: "https://www.makethis1.com/magazine", expect: /<title[^>]*>[^<]+<\/title>/i },
  { url: "https://www.makethis1.com/robots.txt", expect: /sitemap:/i },
  { url: "https://www.makethis1.com/sitemap.xml", expect: /<urlset[\s>]/i },
  { url: "https://www.makethis1.com/rss.xml", expect: /<rss[\s>]/i },
];

const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 10000);
const urls = process.env.SMOKE_URLS
  ? process.env.SMOKE_URLS.split(",").map((url) => ({ url: url.trim(), expect: /[\s\S]+/ })).filter((item) => item.url)
  : DEFAULT_URLS;

async function check({ url, expect }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { cache: "no-store", signal: controller.signal });
    const text = await res.text();
    const ok = res.ok && expect.test(text);
    return { url, status: res.status, ok, bytes: text.length };
  } catch (err) {
    return { url, status: 0, ok: false, error: String(err) };
  } finally {
    clearTimeout(timeout);
  }
}

(async () => {
  const results = [];
  for (const item of urls) {
    const r = await check(item);
    results.push(r);
    console.log(`${r.ok ? "OK  " : "FAIL"} ${r.status} ${r.url}` + (r.bytes ? ` (${r.bytes} bytes)` : "") + (r.error ? ` (${r.error})` : ""));
  }
  const failed = results.filter(r => !r.ok);
  if (failed.length > 0) {
    console.error(`Smoke monitor: ${failed.length}/${results.length} failed`);
    process.exitCode = 2;
  } else {
    console.log(`Smoke monitor: all ${results.length} OK`);
  }
})();
