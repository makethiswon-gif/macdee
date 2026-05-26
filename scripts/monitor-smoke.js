// Simple smoke monitor: fetch list of URLs and verify HTTP 200 and presence of <title>
const urls = [
  "https://www.makethis1.com/blog/whileaway-w32s/0c02ed33-5421-4908-b86b-69df33f86f89",
  // add more sample posts here as needed
];

async function check(url) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();
    const ok = res.ok && /<title[^>]*>[^<]+<\/title>/i.test(text);
    return { url, status: res.status, ok };
  } catch (err) {
    return { url, status: 0, ok: false, error: String(err) };
  }
}

(async () => {
  const results = [];
  for (const u of urls) {
    const r = await check(u);
    results.push(r);
    console.log(`${r.ok ? "OK  " : "FAIL"} ${r.status} ${r.url}` + (r.error ? ` (${r.error})` : ""));
  }
  const failed = results.filter(r => !r.ok);
  if (failed.length > 0) {
    console.error(`Smoke monitor: ${failed.length}/${results.length} failed`);
    process.exitCode = 2;
  } else {
    console.log(`Smoke monitor: all ${results.length} OK`);
  }
})();
