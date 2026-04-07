import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import * as cheerio from "cheerio";

// Extracted legacy IDs via browser subagent
const ARTICLES = [
  "165932254", "165931831", "125402524", "125402348", "123899855",
  "26244298", "26244130", "26243995", "26243875", "26243801",
  "13583389", "13583323", "13583313", "13583186", "13069827"
];

// Map titles explicitly for reliability since Cheerio selectors might miss on SPA dynamic elements
const TITLES_MAP: Record<string, string> = {
  "165932254": "AI시대에도 변호사 블로그는 왜 멈추면 안 되는가",
  "165931831": "네이버 블로그 지수, 정말 중요한 걸까?",
  "125402524": "법무법인 마케팅 블로그가 필수인 이유",
  "125402348": "연차 적은 변호사와 로펌 마케팅 시작하기",
  "123899855": "로펌 마케팅의 필수이자 현재와 미래, SEO",
  "26244298": "천만원 넘게 주고 구입한 최적화 블로그가 저품질?",
  "26244130": "가끔 드라마틱 하게 효과를 보는 변호사 광고를 상상한다",
  "26243995": "변호사 블로그 상위노출 보장? 그래서 그게 뭐 어쨌다는 거죠",
  "26243875": "변호사 콘텐츠 마케팅에 관련한 한 논문",
  "26243801": "변호사 개업 시 숙지해야 할 브랜딩과 마케팅의 차이",
  "13583389": "잘나가던 변호사 블로그, 갑자기 조회수 반토막?",
  "13583323": "결국 마케팅의 해답은 AI와 ROAS에 있지만, 로펌 마케팅은...",
  "13583313": "데카르트 마케팅이란?",
  "13583186": "마케팅이 아이스크림이라면",
  "13069827": "클릭 이후 넘어야 할 벽, 마케팅 전환율"
};

export async function GET(request: Request) {
    const supabase = await createAdminClient();
    const results = [];

    for (const idx of ARTICLES) {
        try {
            const url = `https://macdee.imweb.me/COLUMN/?bmode=view&idx=${idx}`;
            // Use Chrome User-Agent to avoid generic blocks
            const res = await fetch(url, { 
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' 
                } 
            });
            
            let contentHtml = '<p>마이그레이션 중인 문서입니다.</p>';
            let excerpt = '';
            
            if (res.ok) {
                const html = await res.text();
                const $ = cheerio.load(html);
                
                // Imweb viewer structures
                const extractedHtml = $('.fr-view, .board_txt_area, .post-content').html();
                if (extractedHtml) {
                    contentHtml = extractedHtml;
                    excerpt = $(extractedHtml).text().substring(0, 150) + '...';
                }
            }

            const title = TITLES_MAP[idx] || `복원된 칼럼 (${idx})`;

            // Insert into Supabase
            const { data, error } = await supabase.from('magazines').upsert({
                slug: idx, // Crucial for 301 match
                title: title,
                body: contentHtml,
                excerpt: excerpt || title,
                category: '칼럼',
                status: 'published',
                author: '메이크디스원'
                // not updating published_at purposefully to default to now, or avoid overriding if exist
            }, { onConflict: 'slug' });

            results.push({ idx, title, success: !error, error: error?.message });
        } catch (err) {
            results.push({ idx, success: false, error: String(err) });
        }
        
        // Rate limiting prevent IP ban
        await new Promise(r => setTimeout(r, 1000));
    }
    
    return NextResponse.json({ success: true, results });
}
