const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...rest] = line.split('=');
  if (k && rest.length) acc[k.trim()] = rest.join('=').trim();
  return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  const { data } = await supabase.from('contents').select('id, body, title').ilike('title', '%불기소이유통지%').order('created_at', { ascending: false }).limit(5);
  for (let i=0; i<data.length; i++) {
    console.log('['+i+'] title:', data[i].title);
    try {
      const p = JSON.parse(data[i].body);
      console.log(' - parsed ok');
      console.log(' - caption prefix:', typeof p.caption, p.caption ? p.caption.substring(0, 30).replace(/\n/g, '\\n') : 'null');
      console.log(' - has hashtags:', Array.isArray(p.hashtags));
      if (typeof p.caption === 'string' && p.caption.includes('{"caption":')) {
        console.log(' - FOUND THE ONE: caption contains JSON string');
      }
    } catch(e) {
      console.log(' - parse error:', e.message);
      console.log(' - body length:', data[i].body.length);
      console.log(' - body prefix:', data[i].body.substring(0, 50));
    }
  }
})();
