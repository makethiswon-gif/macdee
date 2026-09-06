// Mechanical reuse of installed, licensed font subsets. No new dependency.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const sourceDir = path.join(root, 'node_modules/pretendard/dist/web/variable');
const source = fs.readFileSync(path.join(sourceDir, 'pretendardvariable-dynamic-subset.css'), 'utf8');
const critical = '로펌 마케팅에 필요한 모든 것. 메이크디스원 하나로 검색광고 블로그 SEO AI 검색 홈페이지 상담 분석까지 통합 솔루션으로 광고대행사 업체 제작사 운영 네이버 Google 법률 콘텐츠 수임 분석 한 팀에서 함께 운영합니다 맡는 일 진단받기 세 가지 운영안 보기 요청 모션 멈추기 재생 감소 적용 파트너 완료 프로젝트 업력 키네틱 타이포 오비탈 필드 아퍼처 비교';
const codepoints = [...new Set([...critical, ...Array.from({length: 95}, (_, i) => String.fromCharCode(32 + i))].map(c => c.codePointAt(0)))];
const matches = range => range.split(',').some(value => {
  const [a, b = a] = value.trim().replace(/^U\+/i, '').split('-').map(x => parseInt(x, 16));
  return codepoints.some(point => point >= a && point <= b);
});
const faces = [...source.matchAll(/@font-face\s*\{[\s\S]*?\}/g)].map(match => match[0]);
const preload = [];
const targetDir = path.join(root, 'public/renewal/study-fonts');
fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(path.join(sourceDir, '../../LICENSE.txt'), path.join(targetDir, 'LICENSE.txt'));
let bytes = 0;
const generated = faces.map(face => {
  const file = face.match(/url\(\.\/woff2-dynamic-subset\/([^)]*)\)/)[1];
  const range = face.match(/unicode-range:\s*([^;]+);/)[1];
  // Keep all ranges available; the browser requests only ranges used on screen.
  fs.copyFileSync(path.join(sourceDir, 'woff2-dynamic-subset', file), path.join(targetDir, file));
  if (matches(range)) { preload.push(`/renewal/study-fonts/${file}`); bytes += fs.statSync(path.join(targetDir, file)).size; }
  return face.replace("'Pretendard Variable'", "'Renewal Study'").replace('font-display: swap', 'font-display: optional').replace(/url\([^)]*\)/, `url('/renewal/study-fonts/${file}')`);
});
fs.writeFileSync(path.join(root, 'components/renewal/concepts/study-font.css'), '/* Generated from installed Pretendard, SIL OFL 1.1. Do not hand-edit. */\n' + source.slice(0, source.indexOf('/* [0] */')) + '\n' + generated.join('\n'));
fs.writeFileSync(path.join(root, 'components/renewal/concepts/study-font-preload.json'), JSON.stringify(preload, null, 2) + '\n');
console.log(JSON.stringify({ criticalSubsetCount: preload.length, criticalBytes: bytes, totalSubsets: faces.length }));
