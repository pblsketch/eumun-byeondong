// 첫 화면이 페이지 오류 없이 열리는지(aside) — 점검 서버(http)와 더블클릭(file://) 둘 다(명세 §3-7, §18).
//   출처: 「음운 해전」 pblsketch/sori-haejeon tests/check-00-smoke.mjs 를 가져와 file:// 조각을 더했다.
//   페이지 오류 = js/core/util.js가 모으는 window.__gamsuErrors(error · unhandledrejection · console.error).
//   음원 파일이 없어서 생기는 404는 네트워크 기록일 뿐 페이지 오류가 아니다(G.audio는 console.warn 한 번만 씀).
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { step, url } from './aside.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = pathToFileURL(path.join(ROOT, 'index.html')).href;

const probe = (v) => `
await sleep(800);
const ${v} = await ${v}t.evaluate(() => ({
  errs: window.__gamsuErrors || null,
  G: typeof window.G,
  screen: window.G && G.app && G.app.current ? G.app.current() : null,
  start: !!document.querySelector('#app .screen-start'),
}));
if (!${v}.errs) throw new Error('오류 모음이 없음(js/core/util.js가 안 불림)');
if (${v}.errs.length) throw new Error('페이지 오류: ' + ${v}.errs.join(' | '));
if (${v}.screen !== 'start' || !${v}.start) throw new Error('시작 화면이 아님: ' + ${v}.screen);
console.log('PASS');
`;

step('첫 화면 열기(점검 서버)', `
const s0t = await openTab(${JSON.stringify(url('index.html'))});
try {
${probe('s0')}
} finally { await closeTab(s0t); }
`);

// aside는 openTab(file://…)을 거절한다("Cannot navigate to a file URL without local file access").
// 빈 탭을 연 뒤 goto로 file 주소를 여는 것은 된다(2026-10 aside CLI 1.26에서 확인).
step('첫 화면 열기(file:// 더블클릭)', `
const s1t = await openTab('about:blank');
try {
  await s1t.goto(${JSON.stringify(FILE)});
  const s1p = await s1t.evaluate(() => location.protocol);
  if (s1p !== 'file:') throw new Error('file 주소로 열리지 않음: ' + s1p);
${probe('s1')}
} finally { await closeTab(s1t); }
`);
