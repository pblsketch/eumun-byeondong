// 데이터 점검(브라우저 없이) — 조항 원문 데이터(js/data/articles.js)
//   node tests/check-data.mjs
// 1 필요한 조항이 다 있음(명세 §12: 제8·9항, 제12항 3, 제13·14·15·18·19·20항(다만 포함)·21항
//   + 3~8장: 제10·11항(다만), 제12항 1~4, 제17항, 제22~30항(제24·26·29항 다만) — 결정 D0-4)
// 2 모양: 화면에 보일 조항 이름, 원문 문장, 원문 예시 낱말([표기, 발음] 또는 [표기, 발음, 틀린 발음]), 대조 출처
// 3 문구 규칙: 금지 낱말 없음, 한자 없음(명세 §3-6 · §13 — 조항 원문은 원문 그대로이므로 빗금 표기만 예외)
// 4 제15항 원고(src '표준 15')는 제15항 원문 예시에 그대로 있음(표기·발음) — 원문에 없는 낱말을 원고로 지어내지 않았는지
import { loadScripts, check, done } from './lib/load.mjs';

let ctx;
try {
  ctx = loadScripts(['js/data/articles.js', 'js/data/scripts.js']);
} catch (e) {
  check(false, '스크립트 불러오기 실패: ' + e.message);
  done('데이터 점검');
}
const A = ctx.ARTICLES, SC = ctx.SCRIPTS;
if (!A || typeof A !== 'object') { check(false, 'window.ARTICLES 없음'); done('데이터 점검'); }

const J = (x) => JSON.stringify(x);
const strip = (p) => String(p).replace(/[ː\s]/g, '');

// ───────────────────────── 1. 필요한 조항 ─────────────────────────
const KEYS = ['8', '9', '12', '13', '14', '15', '18', '19', '20', '20-다만', '21',
  // 3~8장
  '10', '10-다만', '11', '11-다만', '12-1', '12-2', '12-3', '12-4', '17',
  '22', '23', '24', '24-다만', '25', '26', '26-다만', '27', '28', '29', '29-다만', '30'];
const NAMES = { '8': '제8항', '9': '제9항', '12': '제12항 3', '13': '제13항', '14': '제14항', '15': '제15항',
  '18': '제18항', '19': '제19항', '20': '제20항', '20-다만': '제20항 다만', '21': '제21항' };
// 3~8장 조항 이름은 키에서 바로 나온다: '17' → '제17항', '10-다만' → '제10항 다만', '12-1' → '제12항 1'
for (const k of KEYS) if (!(k in NAMES)) { const m = /^(\d+)(?:-(.+))?$/.exec(k); NAMES[k] = '제' + m[1] + '항' + (m[2] ? ' ' + m[2] : ''); }
for (const k of KEYS) check(k in A, `조항 '${k}'이 있음`);
check(Object.keys(A).every((k) => KEYS.includes(k)), `모르는 조항 키가 없음(${J(Object.keys(A))})`);

// ───────────────────────── 2. 모양 ─────────────────────────
for (const k of KEYS) {
  const a = A[k];
  if (!a) continue;
  const n = `[${k}]`;
  check(a.name === NAMES[k], `${n} 화면에 보일 이름 '${NAMES[k]}' (${J(a.name)})`);
  check(Array.isArray(a.parts) && a.parts.length > 0, `${n} 원문 단락이 있음`);
  check(Array.isArray(a.src) && a.src.length > 0 && a.src.every((s) => typeof s === 'string' && s), `${n} 대조 출처가 있음`);
  (a.parts || []).forEach((p, i) => {
    const m = `${n} 단락 ${i}`;
    check(typeof p.text === 'string' || typeof p.label === 'string', `${m} 문장이나 묶음 표시가 있음`);
    if ('text' in p) check(typeof p.text === 'string' && p.text.trim() === p.text && p.text.length > 0, `${m} 문장이 빈칸·앞뒤 공백 없음`);
    if ('examples' in p) {
      check(Array.isArray(p.examples) && p.examples.length > 0, `${m} 예시 목록`);
      (p.examples || []).forEach((e) => check(Array.isArray(e) && (e.length === 2 || e.length === 3) && e.every((x) => typeof x === 'string' && x && x.trim() === x),
        `${m} 예시는 [표기, 발음] 또는 [표기, 발음, 틀린 발음] (${J(e)})`));
    }
  });
}
// 예시가 있어야 하는 조항(원문에 예시가 있음) — 제8항·제24항 다만(발음 없는 낱말 줄)만 예시 꼴이 없다
for (const k of KEYS) if (A[k] && !['8', '24-다만'].includes(k))
  check((A[k].parts || []).some((p) => Array.isArray(p.examples) && p.examples.length > 0), `[${k}] 원문 예시가 있음`);
// 발음 칸 모양: 장음 ː(U+02D0)·단계 화살표 →(띄우지 않음)·빗금(원칙/허용)만 한글 밖 글자로 쓴다. 대괄호·쌍점은 넣지 않는다.
for (const k of KEYS) for (const p of (A[k] && A[k].parts) || []) for (const e of p.examples || []) {
  if (!Array.isArray(e)) continue;
  for (const x of e.slice(1)) check(typeof x === 'string' && /^[가-힣ː→\/]+$/.test(x) && !/^[→\/]|[→\/]$/.test(x), `[${k}] 발음 칸 모양 (${J(e)})`);
  check(typeof e[0] === 'string' && !/[\[\]:：]/.test(e[0]), `[${k}] 표기 칸에 대괄호·쌍점 없음 (${J(e)})`);
}
// 제12항: 1·2장이 쓰는 '12'(= 3)는 '12-3'의 앞부분과 같다(같은 원문을 두 벌로 고치지 않았는지)
if (A['12'] && A['12-3']) check(J(A['12'].parts) === J(A['12-3'].parts.slice(0, A['12'].parts.length)), `'12'는 '12-3'의 앞부분과 같음`);
// 제12항 하위 번호 넷은 머리 문장이 같다
for (const k of ['12-1', '12-2', '12-3', '12-4']) if (A[k]) check(A[k].parts[0].text === '받침 ‘ㅎ’의 발음은 다음과 같다.', `[${k}] 제12항 머리 문장`);
// 조항 본문의 첫 단락은 원문 문장이다(공개 화면이 '제N항 + 첫 문장'으로 그림)
for (const k of KEYS) if (A[k] && A[k].parts) check(typeof A[k].parts[0].text === 'string', `[${k}] 첫 단락이 원문 문장`);

// ───────────────────────── 3. 문구 규칙 ─────────────────────────
// 금지 낱말: 명세 §3-6(음운 해전과 같음)
const FORBIDDEN = ['글자', '훈민정음', '해례', '제자 원리', '상형', '가획', '중세', '조선 수군', '판옥선', '협선', '척후선', '게임오버'];
const HANJA = /[⺀-⿟㐀-䶿一-鿿豈-﫿]/;
function strings(x, out = []) {
  if (typeof x === 'string') out.push(x);
  else if (Array.isArray(x)) x.forEach((y) => strings(y, out));
  else if (x && typeof x === 'object') Object.keys(x).forEach((k) => { out.push(k); strings(x[k], out); });
  return out;
}
const all = strings(A);
for (const w of FORBIDDEN) check(!all.some((s) => s.includes(w)), `금지 낱말 '${w}' 없음`);
const han = all.filter((s) => HANJA.test(s));
check(han.length === 0, `한자 없음 (${J(han)})`);

// ───────────────────────── 4. 제15항 원고는 원문 예시 그대로 ─────────────────────────
const ex15 = (A['15'] && A['15'].parts || []).flatMap((p) => p.examples || []);
const s15 = (SC || []).filter((s) => (s.src || []).includes('표준 15'));
check(s15.length > 0, '제15항 원문 예시로 만든 원고가 있음');
for (const s of s15) {
  const hit = ex15.find((e) => e[0] === s.text);
  check(!!hit, `[${s.id}] 표기가 제15항 원문 예시에 있음`);
  if (hit) check(strip(hit[1]) === strip(s.pron), `[${s.id}] 발음이 원문과 같음 (${hit[1]} / ${s.pron})`);
  check((s.articles || []).includes('15'), `[${s.id}] 근거 조항에 제15항(3~8장은 [붙임]처럼 다른 규칙과 함께 걸림)`);
}
console.log(`  조항 ${Object.keys(A).length}개 · 제15항 원고 ${s15.length}개 (${s15.map((s) => s.id).join(', ')})`);

// 참고(실패 아님): 'src: 표준 N' 원고 가운데 지금 조항 원문(현행 고시) 예시에 없는 것 — 선생님 확인용
const exOf = (n) => Object.keys(A).filter((k) => k === n || k.startsWith(n + '-'))
  .flatMap((k) => A[k].parts || []).flatMap((p) => p.examples || []);
const off = [];
for (const s of SC || []) for (const src of s.src || []) {
  const m = /^표준 (\d+)$/.exec(src);
  if (!m || !(m[1] in A)) continue;
  const hit = exOf(m[1]).find((e) => e[0] === s.text);
  if (!hit) off.push(`${s.id}(제${m[1]}항 예시에 없음)`);
  else if (hit[1] !== s.pron && !hit[1].endsWith('→' + s.pron)) off.push(`${s.id}(원문 [${hit[1]}] · 원고 [${s.pron}])`);
}
if (off.length) console.log('  참고: 현행 원문과 다른 원고 —', off.join(', '));

done('데이터 점검');
