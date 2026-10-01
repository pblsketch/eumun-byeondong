// 글꼴 점검(aside) — 명세 §14 '글꼴' · §18 '발음용 글꼴이 아무 한글 음절이나 그림' · §3-7(동봉 글꼴만, 네트워크 없음).
//   1) 발음용 글꼴 GamsuPron(assets/fonts/pron-700.woff2)이 아무 한글 음절(U+AC00~U+D7A3에서 시드로 고른 60개 + 화면에 나올 수 있는
//      드문 음절 몇 개)과 장음 표시 ː를 기기 글꼴로 넘기지 않고 직접 그린다.
//      판정: 캔버스에 'GamsuPron, serif'와 'GamsuPron, monospace'로 그린 픽셀이 서로 같고(대신 그린 글꼴이 없음),
//      기기 글꼴('serif')만으로 그린 픽셀과는 다르다. 판정법이 맞는지는 반대 사례로 확인한다: 쓰인 글자만 담은 안내용 GamsuUI(500)는
//      게임에 없는 음절(뷁 · 쀍)을 기기 글꼴로 넘긴다(그래야 위 판정이 '대신 그린 것'을 잡아낼 수 있음).
//   2) 화면의 음절 블록 · 프롬프터 · 원고 표기 · 장 결과 발음이 GamsuPron으로 그려진다(계산된 font-family의 맨 앞).
//   3) 글꼴 파일은 assets/fonts/에서만 불러온다(같은 곳 — 바깥 주소 없음). document.fonts에서 GamsuPron · GamsuUI가 'loaded'.
//   4) file://(더블클릭)에서도 1 · 3이 같다.
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { step, frame } from './aside.mjs';
import { DRIVER } from './lib/drive.mjs';
import { RUNS } from './lib/runs.mjs';
import { REVIEW } from './lib/review.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = pathToFileURL(path.join(ROOT, 'index.html')).href;
const J = JSON.stringify;

// 시드로 고른 음절(점검마다 같음) + 드문 음절 몇 개 + 장음 표시
function syllables(n, seed) {
  let s = seed >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const out = new Set(['똠', '뷁', '쀍', '꿻', '햏', '퀭', '읅', '힣']);
  while (out.size < n + 8) out.add(String.fromCharCode(0xAC00 + Math.floor(rnd() * 11172)));
  return [...out, 'ː'];
}
const CHARS = syllables(60, 20261001);

// 한 문서(win)에서 글꼴 판정을 하는 page 쪽 함수 본문(문자열) — 틀 안 게임 창에도, file:// 창에도 쓴다
const PROBE = String.raw`async (win, chars) => {
  const d = win.document, bad = [];
  await d.fonts.ready;
  await d.fonts.load('700 48px GamsuPron', chars.join(''));
  await d.fonts.load('500 48px GamsuUI', '가뷁쀍');
  const cv = d.createElement('canvas'); cv.width = 64; cv.height = 64;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const px = (font, ch) => {
    cx.clearRect(0, 0, 64, 64); cx.font = font; cx.textBaseline = 'middle'; cx.fillStyle = '#000';
    cx.fillText(ch, 4, 32);
    const a = cx.getImageData(0, 0, 64, 64).data; let h = 0, ink = 0;
    for (let i = 3; i < a.length; i += 4) { if (a[i]) { ink++; h = (h * 31 + a[i] + i) >>> 0; } }
    return ink + ':' + h;
  };
  // ownGlyph: 그 글꼴이 직접 그림(뒤 기기 글꼴이 달라도 같고, 기기 글꼴만 쓴 것과 다름)
  const own = (fam, w, ch) => {
    const a = px(w + ' 48px ' + fam + ', serif', ch), b = px(w + ' 48px ' + fam + ', monospace', ch);
    const s = px(w + ' 48px serif', ch), m = px(w + ' 48px monospace', ch);
    return a === b && a !== s && b !== m && a.split(':')[0] !== '0';
  };
  const miss = chars.filter((ch) => !own('GamsuPron', '700', ch));
  if (miss.length) bad.push('발음용 글꼴이 직접 그리지 못한 것: ' + miss.join(' '));
  const ctl = ['뷁', '쀍'].filter((ch) => own('GamsuUI', '500', ch));
  if (ctl.length) bad.push('판정법 확인 실패: 쓰인 글자만 담은 안내용 글꼴도 게임에 없는 음절을 그린다고 나옴(판정이 대신 그린 것을 못 잡음)');
  if (!own('GamsuUI', '500', '가')) bad.push('안내용 글꼴이 게임 글(가)을 그리지 못함');
  const faces = Array.from(d.fonts);
  ['GamsuPron', 'GamsuUI'].forEach((f) => {
    const fs = faces.filter((x) => x.family.replace(/["']/g, '') === f);
    if (!fs.length) bad.push(f + ' 글꼴 선언 없음');
    if (!fs.some((x) => x.status === 'loaded')) bad.push(f + ' 글꼴이 불러와지지 않음: ' + fs.map((x) => x.status).join(','));
  });
  const here = win.location.protocol === 'file:' ? 'file:' : win.location.origin + '/';
  const res = win.performance.getEntriesByType('resource');
  res.forEach((e) => { if (e.name.indexOf(here) !== 0) bad.push('바깥 주소를 불러옴 ' + e.name); });
  const woff = res.filter((e) => /\.woff2?($|\?)/.test(e.name));
  woff.forEach((e) => { if (!/\/assets\/fonts\/(pron-700|ui-500)\.woff2$/.test(e.name.split('?')[0])) bad.push('assets/fonts가 아닌 글꼴 ' + e.name); });
  if (win.location.protocol !== 'file:' && !woff.some((e) => /pron-700\.woff2/.test(e.name))) bad.push('pron-700.woff2를 불러온 기록이 없음');
  return { bad, info: chars.length + '자 중 직접 그림 ' + (chars.length - miss.length) + ', 안내용 글꼴 반대 사례 ' + (2 - ctl.length) + '/2 기기 글꼴로 넘김, 글꼴 파일 ' + woff.map((e) => e.name.split('/').pop()).join(',') };
}`;

const open = (v, w, h) => `
const ${v} = await openTab(${J(frame(w, h, 'index.html'))});
await ${v}.evaluate(() => frameReady);
await ${v}.evaluate(() => { ${DRIVER} });
await ${v}.evaluate(() => { ${RUNS} });
await ${v}.evaluate(() => { ${REVIEW} });
`;
const fin = (v) => `
if (${v}.length) console.log('FAIL ' + ${v}.join('\\nFAIL '));
else console.log('PASS');
`;

step('발음용 글꼴 — 아무 한글 음절 · 장음 표시를 직접 그림, 화면 자리, 동봉 파일만(점검 서버)', `
${open('a1', 1280, 800)}
try {
  const ea = [];
  ea.push(...await a1.evaluate(async () => { await D.fresh(); D.G().save.setSettings({ reduceMotion: true }); return D.take(); }));
  const ra = await a1.evaluate(async () => {
    const probe = ${PROBE};
    const r = await probe(D.w(), ${J(CHARS)});
    // 화면 자리: 원고 표기 · 음절 블록 · 프롬프터 · 장 결과 발음이 GamsuPron 맨 앞
    const first = (n) => (n ? D.w().getComputedStyle(n).fontFamily.split(',')[0].replace(/["']/g, '').trim() : null);
    await D.toReview(2, { seed: 5 });
    await D.send('글꼴');
    [['.rw-script-text', '원고 표기'], ['.rw-blocks .bk-slot:not(.is-empty)', '음절 블록'], ['.rw-psyl', '프롬프터'], ['.app-h1', '제목']].forEach(([sel, nm]) => {
      const f = first(D.$(sel));
      if (f !== 'GamsuPron') r.bad.push(nm + ' 글꼴이 GamsuPron이 아님: ' + f);
    });
    D.finishRun(2, { seed: 5 });
    D.G().app.resume();
    await D.until(() => D.cur() === 'reveal', 3000, '조항 공개');
    D.tapSel('[data-act="reveal-next"]', '장 결과 보기');
    await D.until(() => D.$('.rs-c-pron'), 3000, '장 결과');
    if (first(D.$('.rs-c-pron')) !== 'GamsuPron') r.bad.push('장 결과 발음 글꼴이 GamsuPron이 아님: ' + first(D.$('.rs-c-pron')));
    if (first(D.$('.rs-note')) !== 'GamsuUI') r.bad.push('안내 글 글꼴이 GamsuUI가 아님: ' + first(D.$('.rs-note')));
    return { bad: r.bad.concat(D.take()), info: r.info };
  });
  console.log('INFO ' + ra.info);
  ea.push(...ra.bad);
  ${fin('ea')}
} finally { await closeTab(a1); }
`);

step('발음용 글꼴 — file:// 더블클릭', `
const b1 = await openTab('about:blank');
try {
  await b1.goto(${J(FILE)});
  await sleep(800);
  const rb = await b1.evaluate(async () => {
    const probe = ${PROBE};
    const r = await probe(window, ${J(CHARS)});
    if (location.protocol !== 'file:') r.bad.push('file 주소가 아님');
    if ((window.__gamsuErrors || ['오류 모음 없음']).length) r.bad.push('페이지 오류: ' + (window.__gamsuErrors || ['오류 모음 없음']).join(' | '));
    return r;
  });
  console.log('INFO file:// ' + rb.info);
  ${fin('rb.bad')}
} finally { await closeTab(b1); }
`);
