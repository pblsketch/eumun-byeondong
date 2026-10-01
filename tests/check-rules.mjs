// 규칙 점검(브라우저 없이) — 원고 데이터와 규칙 엔진이 서로를 검증한다(기획안 7절).
//   node tests/check-rules.mjs
// 1 음운 데이터 · 2 한글 나누기/합치기 · 3 원고 데이터 모양 · 4 원고마다 엔진 대조(도출 발음 = 표준 발음, 풀이 과정이 규칙 안,
// 음운 수·변동 횟수, 모든 규칙 순서가 같은 발음에 닿음, 송출 신호) · 5 함정과 규칙 밖 교정 · 6 막지 않는 오답과 입력 보존
import { loadScripts, check, done } from './lib/load.mjs';

let ctx;
try {
  ctx = loadScripts(['js/core/util.js', 'js/data/sounds.js', 'js/data/scripts.js', 'js/core/hangul.js', 'js/core/rules.js']);
} catch (e) {
  check(false, '스크립트 불러오기 실패: ' + e.message);
  done('규칙 점검');
}
const R = ctx.G && ctx.G.rules, H = ctx.G && ctx.G.hangul;
const S = ctx.SOUNDS, SC = ctx.SCRIPTS;
if (!R || !H || !S || !SC) { check(false, 'G.rules / G.hangul / SOUNDS / SCRIPTS 없음'); done('규칙 점검'); }

const J = (x) => JSON.stringify(x);
const eq = (a, b, msg) => check(J(a) === J(b), `${msg}: ${J(a)} ≠ ${J(b)}`);
const throws = (fn) => { try { fn(); return false; } catch (e) { return true; } };
const nonzero = (t) => Object.fromEntries(['replace', 'delete', 'insert', 'merge'].filter((k) => t[k]).map((k) => [k, t[k]]));
const script = (text, more = {}) => Object.assign({ id: text, text, pron: text, cuts: Array.from(text.replace(/ /g, '')).slice(1).map(() => null) }, more);
const rep = (at, to) => ({ op: 'replace', at, to });

// ───────────────────────── 1. 음운 데이터 ─────────────────────────
// 음운 해전 js/data/sounds.js와 같은 표(가져온 자질이 바뀌지 않았는지)
const C_TABLE = [
  ['ㅂ', 'bilabial', 'stop', 'plain'], ['ㅃ', 'bilabial', 'stop', 'tense'], ['ㅍ', 'bilabial', 'stop', 'aspirated'],
  ['ㄷ', 'alveolar', 'stop', 'plain'], ['ㄸ', 'alveolar', 'stop', 'tense'], ['ㅌ', 'alveolar', 'stop', 'aspirated'],
  ['ㄱ', 'velar', 'stop', 'plain'], ['ㄲ', 'velar', 'stop', 'tense'], ['ㅋ', 'velar', 'stop', 'aspirated'],
  ['ㅈ', 'palatal', 'affricate', 'plain'], ['ㅉ', 'palatal', 'affricate', 'tense'], ['ㅊ', 'palatal', 'affricate', 'aspirated'],
  ['ㅅ', 'alveolar', 'fricative', 'plain'], ['ㅆ', 'alveolar', 'fricative', 'tense'],
  ['ㅎ', 'glottal', 'fricative', 'none'],
  ['ㅁ', 'bilabial', 'nasal', 'none'], ['ㄴ', 'alveolar', 'nasal', 'none'], ['ㅇ', 'velar', 'nasal', 'none'],
  ['ㄹ', 'alveolar', 'liquid', 'none'],
];
const V_TABLE = [
  ['ㅣ', 'high', 'front', 'unrounded'], ['ㅟ', 'high', 'front', 'rounded'], ['ㅡ', 'high', 'back', 'unrounded'], ['ㅜ', 'high', 'back', 'rounded'],
  ['ㅔ', 'mid', 'front', 'unrounded'], ['ㅚ', 'mid', 'front', 'rounded'], ['ㅓ', 'mid', 'back', 'unrounded'], ['ㅗ', 'mid', 'back', 'rounded'],
  ['ㅐ', 'low', 'front', 'unrounded'], ['ㅏ', 'low', 'back', 'unrounded'],
];
check(S.consonants.length === 19 && S.vowels.length === 10, '자음 19개 · 단모음 10개');
eq(S.consonants.map((c) => [c.id, c.place, c.manner, c.strength].join(',')).sort(), C_TABLE.map((r) => r.join(',')).sort(), '자음 표 = 음운 해전');
eq(S.vowels.map((v) => [v.id, v.height, v.backness, v.lips].join(',')).sort(), V_TABLE.map((r) => r.join(',')).sort(), '모음 표 = 음운 해전');
eq(S.glides.map((g) => g.id), ['j', 'w'], '반모음은 j·w 둘(결정 0004, 지학사 공통국어1 111쪽)');
eq(Object.keys(S.diphthongs).sort(), ['ㅑ', 'ㅒ', 'ㅕ', 'ㅖ', 'ㅛ', 'ㅠ', 'ㅘ', 'ㅙ', 'ㅝ', 'ㅞ'].sort(), '이중 모음 분해표 10개(ㅢ 제외)');
check(Object.values(S.diphthongs).every(([g, v]) => ['j', 'w'].includes(g) && S.vowels.some((x) => x.id === v)), '이중 모음 = 반모음 + 단모음');
eq(S.unsplit, { 'ㅢ': 2 }, 'ㅢ는 나누지 않고 음운 2개로 셈(결정 0009)');
check(!('notes' in S), '음운 해전 전용 알아 두기(notes)는 가져오지 않음');
eq(R.slash('ㄱ'), '/ㄱ/', '빗금 표기');

// ───────────────────────── 2. 한글 나누기·합치기 ─────────────────────────
eq(H.split('닭'), { on: 'ㄷ', v: 'ㅏ', co: ['ㄹ', 'ㄱ'] }, '겹받침은 두 자음');
eq(H.split('아'), { on: null, v: 'ㅏ', co: [] }, '초성 ㅇ은 빈 자리');
eq(H.split('밖'), { on: 'ㅂ', v: 'ㅏ', co: ['ㄲ'] }, '쌍받침은 한 음운');
check(H.split('a') === null && H.split('ㄱ') === null, '음절이 아니면 null');
{
  let bad = 0;
  for (let c = 0xac00; c <= 0xd7a3; c++) {
    const ch = String.fromCharCode(c), p = H.split(ch);
    if (H.join(p.on, p.v, p.co) !== ch) bad++;
  }
  check(bad === 0, `모든 한글 음절 11,172개 나누기→합치기 그대로 (어긋남 ${bad})`);
}
eq(H.join('ㄹ', 'ㅏ', ['ㄴ', 'ㄹ']), 'ㄹㅏㄴㄹ', '음절로 적을 수 없는 조합은 자모 그대로');

// ───────────────────────── 3. 원고 데이터 모양 ─────────────────────────
const RULE_IDS = Object.keys(R.RULES);
const TRAPS = [undefined, 'link', 'exception', 'nonstandard'];
const SRC = /^(표준|지공1|지공1지도|지화언) \d+$/;
check(SC.length > 0, '원고가 있음');
eq(SC.length, new Set(SC.map((s) => s.id)).size, '원고 id가 모두 다름');
for (const s of SC) {
  const n = `[${s.id}]`;
  check([1, 2].includes(s.ch), `${n} 장은 1·2`);
  check(typeof s.text === 'string' && typeof s.pron === 'string' && Array.isArray(s.steps) && Array.isArray(s.count) && s.count.length === 2, `${n} 필수 필드`);
  check(Array.isArray(s.articles) && s.articles.length > 0, `${n} 근거 조항이 있음`);
  check(Array.isArray(s.src) && s.src.length > 0 && s.src.every((x) => SRC.test(x)), `${n} 출처가 대조본 형식(${J(s.src)})`);
  check(TRAPS.includes(s.trap), `${n} 함정 종류`);
  check(s.steps.every((st) => RULE_IDS.includes(st[0])), `${n} 풀이 과정의 규칙 id를 엔진이 앎`);
  // 형태소 분석과 칼집이 맞음
  const syl = Array.from(s.text.replace(/ /g, ''));
  check(s.morphs.replace(/[-+ ]/g, '') === syl.join(''), `${n} 형태소 분석의 음절 = 표기`);
  const gaps = new Set();
  let i = -1;
  for (const ch of s.morphs) { if (ch === '+' || ch === ' ') gaps.add(i); else if (ch !== '-') i++; }
  eq(s.cuts.map((c, k) => (c !== null ? k : -1)).filter((k) => k >= 0), [...gaps].sort((a, b) => a - b), `${n} 형태소 경계 = 칼집 자리`);
  (s.nonstandard || []).forEach(([p]) => check(R.strip(p) !== R.strip(s.pron), `${n} 비표준 발음 ${p}은 표준 발음과 다름`));
  if (s.trap === 'link' || s.trap === 'nonstandard') check(s.steps.length === 0, `${n} ${s.trap} 함정은 교정 0회`);
  if (s.trap === 'nonstandard') check((s.nonstandard || []).length > 0, `${n} 비표준 함정에 비표준 발음이 있음`);
  if (s.trap === 'exception') check(((s.marks || {}).lateralExc || []).length > 0, `${n} 예외 함정에 예외 표시가 있음`);
}

// ───────────────────────── 4. 원고마다 엔진 대조 ─────────────────────────
// 규칙만 쓰는 모든 적용 순서의 끝 발음(같은 상태는 한 번만)
function terminals(st0) {
  const seen = new Set(), ends = new Set();
  const walk = (st, depth) => {
    const key = J(st);
    if (seen.has(key) || depth > 20) return;
    seen.add(key);
    const cs = R.applicable(st);
    if (!cs.length) { ends.add(R.reading(st)); return; }
    cs.forEach((c) => walk(R.apply(st, c), depth + 1));
  };
  walk(st0, 0);
  return [...ends].sort();
}
let engineOk = 0;
for (const s of SC) {
  const n = `[${s.id}]`;
  const failsBefore = [];
  const c0 = (cond, msg) => { check(cond, msg); if (!cond) failsBefore.push(msg); };
  let st0;
  try { st0 = R.start(s); } catch (e) { c0(false, `${n} 처음 상태 만들기: ${e.message}`); continue; }
  c0(R.phonemes(st0) === s.count[0], `${n} 표기의 음운 수 ${R.phonemes(st0)} = ${s.count[0]}`);
  // ① 풀이 과정의 단계마다 규칙 안, 규칙 이름·조항이 데이터와 같음
  let st = st0;
  const parsed = s.steps.map((a) => R.parseStep(a));
  parsed.forEach((c, i) => {
    const r = R.check(st, c);
    c0(r.ok, `${n} 풀이 ${i + 1}(${s.steps[i].join(' ')})이 규칙 안`);
    c0(r.rule === c.rule, `${n} 풀이 ${i + 1}의 규칙 ${c.rule} = 엔진 ${r.rule}`);
    if (r.article) c0(s.articles.includes(r.article), `${n} 풀이 ${i + 1}의 조항 ${r.article}이 articles에 있음`);
    st = r.state;
  });
  c0(R.reading(st) === R.strip(s.pron), `${n} 풀이 과정 끝 발음 [${R.reading(st)}] = [${s.pron}]`);
  c0(R.phonemes(st) === s.count[1], `${n} 발음의 음운 수 ${R.phonemes(st)} = ${s.count[1]}`);
  c0(J(nonzero(R.tally(parsed))) === J(s.change), `${n} 풀이 과정의 변동 횟수 = change`);
  const t = Object.assign({ replace: 0, delete: 0, insert: 0, merge: 0 }, s.change);
  c0(s.count[1] - s.count[0] === t.insert - t.delete - t.merge, `${n} 음운 수 변화 = 첨가 − 탈락 − 축약`);
  // ② 엔진이 스스로 도출한 발음 = 표준 발음
  let d;
  try { d = R.derive(s); } catch (e) { c0(false, `${n} 도출 실패: ${e.message}`); continue; }
  c0(d.pron === R.strip(s.pron), `${n} 엔진 도출 [${d.pron}] = 표준 [${s.pron}]`);
  c0(d.before === s.count[0] && d.after === s.count[1], `${n} 엔진 음운 수 ${d.before}→${d.after} = ${s.count.join('→')}`);
  c0(J(nonzero(d.change)) === J(s.change), `${n} 엔진 변동 횟수 ${J(nonzero(d.change))} = ${J(s.change)}`);
  // ③ 규칙만 쓰는 모든 순서가 같은 발음에 닿음
  const ends = terminals(st0);
  c0(J(ends) === J([R.strip(s.pron)]), `${n} 모든 규칙 순서의 끝 발음 ${J(ends)} = [${s.pron}]`);
  // ④ 송출 신호: 풀이 과정대로 → 온에어 성공, 교정 없이 → (교정이 필요하면) n곳이 다름
  const b = R.broadcast(s, parsed);
  c0(b.kind === 'onair' && b.outOfRule.length === 0, `${n} 풀이 과정대로 송출하면 온에어 성공 (${b.kind})`);
  c0(b.before === s.count[0] && b.after === s.count[1] && J(nonzero(b.change)) === J(s.change), `${n} 송출 결과의 음운 수·변동 횟수`);
  const b0 = R.broadcast(s, []);
  c0(b0.kind === (s.steps.length ? 'diff' : 'onair'), `${n} 교정 없이 송출: ${b0.kind}`);
  if (!failsBefore.length) engineOk++;
}
console.log(`  원고 ${SC.length}개 중 엔진 대조 통과 ${engineOk}개 (1장 ${SC.filter((s) => s.ch === 1).length} · 2장 ${SC.filter((s) => s.ch === 2).length})`);

// ───────────────────────── 5. 함정과 규칙 밖 교정 ─────────────────────────
const byId = Object.fromEntries(SC.map((s) => [s.id, s]));
{
  // 연음은 변동이 아니다: 옷이의 /ㅅ/을 /ㄷ/으로 고치면 규칙 밖, 발음도 틀림
  const s = byId['옷이'];
  eq(R.reading(R.start(s)), '오시', '옷이: 교정 없이 읽으면 연음 [오시]');
  check(!R.check(R.start(s), rep('0.co', 'ㄷ')).ok, '옷이: /ㅅ/→/ㄷ/은 규칙 밖(형식 형태소 앞은 연음)');
  const b = R.broadcast(s, [rep('0.co', 'ㄷ')]);
  check(b.kind === 'diff' && b.diff === 1 && b.reading === '오디' && J(b.outOfRule) === '[0]', `옷이: /ㅅ/→/ㄷ/ 송출 → 1곳이 다름 [${b.reading}]`);
}
{
  // 실질 형태소 앞은 끝소리 규칙이 먼저(제15항)
  const s = byId['겉옷'];
  const b = R.broadcast(s, []);
  check(b.kind === 'diff' && b.reading === '거톳' && b.diff === 1 && J(b.at) === '[1]', `겉옷: 교정 없이 → [거톳], 1곳(둘째 음절) (${J(b)})`);
  check(R.applicable(R.start(s)).some((c) => c.rule === 'coda' && c.article === '15'), '겉옷: 실질 형태소 앞 끝소리 규칙은 제15항');
  check(R.applicable(R.start(byId['옷 위'])).some((c) => c.article === '15'), '옷 위: 다음 단어 앞 끝소리 규칙도 제15항');
}
{
  // 위치 동화는 표준이 아님(제21항)
  const s = byId['감기'];
  check(!R.check(R.start(s), rep('0.co', 'ㅇ')).ok, '감기: /ㅁ/→/ㅇ/은 규칙 밖');
  eq(R.broadcast(s, [rep('0.co', 'ㅇ')]).kind, 'nonstandard', '감기: [강기]로 송출하면 표준 아님');
  eq(R.applicable(R.start(s)), [], '감기: 걸리는 규칙 없음');
}
{
  // 교정 하나 = 규칙 하나(결정 0009): 짓는 /ㅅ/→/ㄴ/ 한 번에 고치면 결과는 맞지만 규칙 밖
  const s = byId['짓는'];
  check(!R.check(R.start(s), rep('0.co', 'ㄴ')).ok, '짓는: /ㅅ/→/ㄴ/ 한 번에는 규칙 밖');
  const b = R.broadcast(s, [rep('0.co', 'ㄴ')]);
  check(b.kind === 'offrule' && b.reading === '진는', `짓는: /ㅅ/→/ㄴ/ 송출 → 결과는 맞지만 규칙 밖 (${b.kind})`);
  const half = R.broadcast(s, [rep('0.co', 'ㄷ')]);
  check(half.kind === 'diff' && half.diff === 1, '짓는: /ㅅ/→/ㄷ/만 하고 송출 → 1곳이 다름');
}
{
  // 막론: ㄹ→ㄴ이 먼저. ㄱ→ㅇ을 먼저 하면 그 순간에는 규칙 밖(교과서 108쪽 순서)
  const s = byId['막론'];
  check(!R.check(R.start(s), rep('0.co', 'ㅇ')).ok, '막론: /ㄱ/→/ㅇ/ 먼저는 규칙 밖(뒤가 아직 /ㄹ/)');
  const b = R.broadcast(s, [rep('0.co', 'ㅇ'), rep('1.on', 'ㄴ')]);
  check(b.kind === 'offrule' && J(b.outOfRule) === '[0]', `막론: 순서를 바꾸면 결과는 맞지만 규칙 밖 (${b.kind} ${J(b.outOfRule)})`);
  eq(R.derive(s).steps.map((c) => c.rule), ['r-nasal', 'nasal'], '막론: 엔진 순서 ㄹ의 비음화 → 비음화');
}
{
  // 제20항 다만: 의견란은 유음화가 규칙 밖, 진로는 ㄹ→ㄴ이 규칙 밖
  const s = byId['의견란'];
  check(!R.check(R.start(s), rep('1.co', 'ㄹ')).ok, '의견란: /ㄴ/→/ㄹ/(유음화)는 규칙 밖');
  const b = R.broadcast(s, [rep('1.co', 'ㄹ')]);
  check(b.kind === 'diff' && b.reading === '의결란', `의견란: 유음화로 송출 → [의결란] 다름 (${b.reading})`);
  const j = byId['진로'];
  check(!R.check(R.start(j), rep('1.on', 'ㄴ')).ok, '진로: /ㄹ/→/ㄴ/은 규칙 밖(예외 표시 없음)');
  eq(R.broadcast(j, [rep('1.on', 'ㄴ')]).kind, 'nonstandard', '진로: [진노]로 송출하면 표준 아님');
  check(R.phonemes(R.start(s)) === 9, '의견란: ㅢ를 음운 2개로 세어 9개');
}
{
  // 겹받침 연음: 앞 자음을 빼면 비표준(지학사 화법과 언어 29쪽)
  const s = byId['닭이'];
  eq(R.reading(R.start(s)), '달기', '닭이: 교정 없이 읽으면 [달기]');
  const b = R.broadcast(s, [{ op: 'delete', at: '0.co' }]);
  check(b.kind === 'nonstandard' && b.reading === '다기' && b.change.delete === 1 && b.after === b.before - 1, `닭이: /ㄹ/을 빼고 송출 → 표준 아님, 음운 −1 (${J(b)})`);
}
{
  // 놓는: ㅎ→ㄷ→ㄴ 교체 2회(결정 0010). ㅎ→ㄴ 한 번에는 규칙 밖
  const s = byId['놓는'];
  check(!R.check(R.start(s), rep('0.co', 'ㄴ')).ok, '놓는: /ㅎ/→/ㄴ/ 한 번에는 규칙 밖');
  eq(R.applicable(R.start(script('놓고', { cuts: ['formal'] }))), [], '받침 ㅎ의 끝소리 규칙은 /ㄴ/ 앞에서만 열림(축약·탈락은 뒤 장)');
}
eq(R.reading(R.start(script('강아지'))), '강아지', '종성 /ㅇ/은 연음하지 않음');

// ───────────────────────── 6. 막지 않는 오답, 입력 보존, 모양 ─────────────────────────
{
  const s = byId['옷'];
  const st = R.start(s);
  const r = R.check(st, { op: 'delete', at: '0.co1' });
  check(!r.ok && !r.applied && r.state === st, '할 수 없는 교정(빈 자리 빼기)은 오류 없이 규칙 밖, 상태 그대로');
  const b = R.broadcast(s, [{ op: 'replace', at: '0.nu', to: 'ㄱ' }, { op: 'insert', at: '0.on', to: 'j' }]);
  check(b.kind === 'diff' && b.outOfRule.length === 2, '자리에 맞지 않는 음운도 오류 없이 규칙 밖');
  check(throws(() => R.check(st, { op: 'cut', at: '0.co' })), '모르는 교정 부호는 오류');
  check(throws(() => R.check(st, rep('zz', 'ㄱ'))), '자리 모양이 틀리면 오류');
  check(throws(() => R.check(st, rep('0.co', 'Q'))), '모르는 음운은 오류');
  check(throws(() => R.start(script('옷이', { cuts: [] }))), '칼집 수가 틀리면 오류');
  check(throws(() => R.start(script('옷 위', { cuts: [null] }))), '띄어쓰기와 space 칼집이 어긋나면 오류');
}
{
  // 넣음표·합침표·음절 지우기도 막지 않는다(규칙은 뒤 장에서)
  const s = byId['옷이'];
  const ins = R.broadcast(s, [{ op: 'insert', at: '1.on', to: 'ㄴ' }]);
  check(ins.reading === '옷니' && ins.change.insert === 1 && ins.after === ins.before + 1 && ins.kind === 'diff', `넣음표: [옷니], 음운 +1 (${J(ins)})`);
  const m = R.broadcast(script('각하'), [{ op: 'merge', at: ['0.co', '1.on'], to: 'ㅋ' }]);
  check(m.reading === '가카' && m.after === m.before - 1 && m.change.merge === 1, `합침표: 각하 → [가카], 음운 −1 (${J(m)})`);
  check(throws(() => R.check(R.start(script('각하')), { op: 'merge', at: '0.co', to: 'ㅋ' })), '합침표는 자리 두 개');
  check(!R.check(R.start(script('각하')), { op: 'merge', at: ['0.on', '1.on'], to: 'ㅋ' }).applied, '이웃하지 않은 두 음운은 합칠 수 없음');
  const del = R.apply(R.start(script('아이')), { op: 'delete', at: '1.nu' });
  check(R.reading(del) === '아' && del.syl.length === 1 && del.cuts.length === 0, '음운이 하나도 없는 음절은 지움');
}
{
  const s = byId['막론'];
  const before = J(s);
  const st = R.start(s), stJ = J(st);
  R.broadcast(s, [rep('1.on', 'ㄴ'), rep('0.co', 'ㅇ')]);
  R.apply(st, rep('1.on', 'ㄴ'));
  R.derive(s);
  check(J(s) === before && J(st) === stJ, '원고와 상태를 바꾸지 않음');
  const plain = (x) => x === null || ['string', 'boolean'].includes(typeof x) || (typeof x === 'number' && isFinite(x)) ||
    (Array.isArray(x) && x.every(plain)) || (typeof x === 'object' && !Array.isArray(x) && Object.values(x).every((v) => v !== undefined && plain(v)));
  check(plain(st) && plain(R.broadcast(s, [])), '상태·송출 결과는 JSON으로 옮길 수 있는 평범한 값');
  eq(R.start(script('여')).syl[0], { on: null, gl: 'j', nu: 'ㅓ', co: [] }, '이중 모음은 반모음 + 단모음');
  eq(R.reading(R.start(script('입원'))), '이붠', '반모음이 있는 음절 앞에서도 연음');
}

done('규칙 점검');
