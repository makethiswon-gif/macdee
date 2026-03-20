const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...rest] = line.split('=');
  if (k && rest.length) acc[k.trim()] = rest.join('=').trim();
  return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function extractBodyFromJson(rawBody) {
    let body = rawBody;
    if (body.trimStart().startsWith('{')) {
        try {
            let jsonStr = body.trim();
            const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (codeBlockMatch) jsonStr = codeBlockMatch[1];
            const parsed = JSON.parse(jsonStr);
            if (parsed.caption !== undefined || parsed.hashtags !== undefined) {
                return rawBody;
            }
            if (parsed.body) body = parsed.body;
        } catch {
            const bodyMatch = body.match(/"body"\s*:\s*"((?:[^"\\]|\\.)*)"/);
            if (bodyMatch) {
                body = bodyMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');
            }
        }
    }
    return body.replace(/\\n/g, "\n");
}

(async () => {
  const { data } = await supabase.from('contents').select('*').eq('id', 'ef9ad75f-4cdf-45ce-99c5-afa8bcf45068').single();
  
  const editBody = extractBodyFromJson(data.body);
  console.log('editBody length:', editBody.length);
  
  let caption = '';
  let hashtags = [];
  try {
      const parsed = JSON.parse(editBody);
      console.log('eval: JSON.parse SUCCESS');
      if (parsed.caption) caption = parsed.caption;
      if (parsed.hashtags) hashtags = parsed.hashtags;
      if (!caption && parsed.slides) {
          caption = parsed.slides.map(s => s.text).join(' ').substring(0, 150);
      }
  } catch (e) {
      console.log('eval: JSON.parse FAILED', e.message);
      if (editBody && editBody.length < 500 && !editBody.startsWith('[')) {
          caption = editBody;
      }
  }
  
  if (!caption) {
      caption = '⚖️ ' + data.title + '\n\n자세한 사례가 궁금하다면 프로필 링크를 확인하세요.';
  }
  
  console.log('FINAL caption length:', caption.length);
  console.log('FINAL caption snippet:', caption.substring(0, 100).replace(/\n/g, '\\n'));
})();
