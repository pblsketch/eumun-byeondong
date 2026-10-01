// 규칙 점검(브라우저 없이) — 원고 데이터와 규칙 엔진이 서로를 검증한다(기획안 7절).
//   node tests/check-rules.mjs
// 1 음운 데이터 · 2 한글 나누기/합치기 · 3 원고 데이터 모양 · 4 원고마다 엔진 대조(도출 발음 = 표준 발음, 풀이 과정이 규칙 안,
// 음운 수·변동 횟수, 모든 규칙 순서가 같은 발음에 닿음, 송출 신호) · 5 함정과 규칙 밖 교정 · 6 막지 않는 오답과 입력 보존
// · 7 판 진행 함수(원고 갈래·뽑기·쌍둥이·지침 채점과 예시 검증(가짜 지침)·공개 조항·연음 자리·닮은 칸·원고 결과·장 합계)
// · 8 실제 감수 지침(js/data/guides.js): 예시 검증·채점·예시를 뺀 뽑기·지침 문구 규칙
import fs from 'node:fs';
import path from 'node:path';
import { loadScripts, check, done, ROOT } from './lib/load.mjs';

let ctx;
try {
  ctx = loadScripts(['js/core/util.js', 'js/data/sounds.js', 'js/data/scripts.js', 'js/data/articles.js', 'js/data/guides.js',
    'js/core/hangul.js', 'js/core/rules.js']);
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
// 함정 종류: 1·2장 셋 + 3~8장 둘(blocked: 조건이 맞지 않아 변동 없음 · contrast: 이 장 부호가 아닌 다른 부호가 정답 — 결정 D0-2)
const TRAPS = [undefined, 'link', 'exception', 'nonstandard', 'blocked', 'contrast'];
const SRC = /^(표준|지공1|지공1지도|지화언) \d+$/;
check(SC.length > 0, '원고가 있음');
eq(SC.length, new Set(SC.map((s) => s.id)).size, '원고 id가 모두 다름');
for (const s of SC) {
  const n = `[${s.id}]`;
  check([1, 2, 3, 4, 5, 6, 7, 8].includes(s.ch), `${n} 장은 1~8`);
  check(typeof s.text === 'string' && typeof s.pron === 'string' && Array.isArray(s.steps) && Array.isArray(s.count) && s.count.length === 2, `${n} 필수 필드`);
  check(Array.isArray(s.articles) && s.articles.length > 0, `${n} 근거 조항이 있음`);
  check(Array.isArray(s.src) && s.src.length > 0 && s.src.every((x) => SRC.test(x)), `${n} 출처가 대조본 형식(${J(s.src)})`);
  check(TRAPS.includes(s.trap), `${n} 함정 종류`);
  check(s.steps.every((st) => RULE_IDS.includes(st[0])), `${n} 풀이 과정의 규칙 id를 엔진이 앎`);
  // 형태소 분석과 형태소 경계가 맞음
  const syl = Array.from(s.text.replace(/ /g, ''));
  check(s.morphs.replace(/[-+ ]/g, '') === syl.join(''), `${n} 형태소 분석의 음절 = 표기`);
  const gaps = new Set();
  let i = -1;
  for (const ch of s.morphs) { if (ch === '+' || ch === ' ') gaps.add(i); else if (ch !== '-') i++; }
  eq(s.cuts.map((c, k) => (c !== null ? k : -1)).filter((k) => k >= 0), [...gaps].sort((a, b) => a - b), `${n} 형태소 분석의 경계 = cuts 자리`);
  (s.nonstandard || []).forEach(([p]) => check(R.strip(p) !== R.strip(s.pron), `${n} 비표준 발음 ${p}은 표준 발음과 다름`));
  // 연음·변동 없음 함정은 교정 0회. 표준 아님 함정은 1·2장(감기)에서는 0회였지만 7장 넓히고처럼 교정이 정답인 것도 있다.
  if (s.trap === 'link' || s.trap === 'blocked') check(s.steps.length === 0, `${n} ${s.trap} 함정은 교정 0회`);
  if (s.trap === 'nonstandard' && s.ch <= 2) check(s.steps.length === 0, `${n} 1·2장 표준 아님 함정은 교정 0회`);
  if (s.trap === 'contrast') check(s.steps.length > 0, `${n} contrast 함정은 다른 부호의 교정이 정답`);
  if (s.trap === 'nonstandard') check((s.nonstandard || []).length > 0, `${n} 비표준 함정에 비표준 발음이 있음`);
  // 예외 함정은 다만 조항을 근거로 둔다(2장 제20항 다만은 낱말 예외 표시 lateralExc까지)
  if (s.trap === 'exception') check((s.articles || []).some((a) => /-다만$/.test(a)), `${n} 예외 함정의 근거에 다만 조항이 있음`);
  if (s.trap === 'exception' && (s.articles || []).includes('20-다만')) check(((s.marks || {}).lateralExc || []).length > 0, `${n} 제20항 다만 함정에 예외 표시가 있음`);
  // 한자어 구성 경계 'sino'는 제20항 다만 낱말의 예외 자리(결정 0007)와 제26항 자리(받침 /ㄹ/ + /ㄷ·ㅅ·ㅈ/, 결정 D4-3)에만
  const exc = (s.marks || {}).lateralExc || [];
  let sylS = [];
  try { sylS = R.start(s).syl; } catch (e) { /* 처음 상태 오류는 4절에서 알림 */ }
  const is26 = (k) => !!sylS[k + 1] && J(sylS[k].co) === '["ㄹ"]' && ['ㄷ', 'ㅅ', 'ㅈ'].includes(sylS[k + 1].on);
  s.cuts.forEach((c, k) => { if (c === 'sino') check(exc.includes(k) || is26(k), `${n} sino 경계는 다만 예외 자리나 제26항 자리에만`); });
  exc.forEach((k) => check(s.cuts[k] === 'sino', `${n} 예외 표시 자리는 sino 경계로 보임(의견+란)`));
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
  // 교정 없이 송출: 교정이 필요하면 n곳이 다름. 다만 허용 발음이 표기대로 읽은 것과 같으면(제29항 다만 야금야금[야그먀금]) 온에어
  const b0 = R.broadcast(s, []);
  const plainOk = [s.pron].concat(s.allowed || []).map(R.strip).includes(R.reading(st0));
  c0(b0.kind === (s.steps.length && !plainOk ? 'diff' : 'onair'), `${n} 교정 없이 송출: ${b0.kind}`);
  // ⑤ 허용 규칙(제22항 반모음 첨가 등)만 쓰는 길: 닿는 발음은 모두 표준이나 허용 발음
  const seenA = new Set(), endsA = new Set();
  const walkA = (x, depth) => {
    const key = J(x);
    if (seenA.has(key) || depth > 20) return;
    seenA.add(key);
    const cs = R.applicable(x).concat(R.allowable ? R.allowable(x) : []);
    if (!R.applicable(x).length) endsA.add(R.reading(x));
    cs.forEach((c) => walkA(R.apply(x, c), depth + 1));
  };
  walkA(st0, 0);
  const okEnds = [s.pron].concat(s.allowed || []).map(R.strip);
  c0([...endsA].every((e) => okEnds.includes(e)), `${n} 허용 규칙까지 쓴 모든 길의 끝 발음 ${J([...endsA])}이 표준·허용 안`);
  if (!failsBefore.length) engineOk++;
}
console.log(`  원고 ${SC.length}개 중 엔진 대조 통과 ${engineOk}개 (${[1, 2, 3, 4, 5, 6, 7, 8].map((c) => c + '장 ' + SC.filter((s) => s.ch === c).length).join(' · ')})`);

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
  // 받침 ㅎ의 끝소리 규칙은 /ㄴ/ 앞에서만 열림. 3단계에서 7장 거센소리되기(합침)가 들어와 놓고에는 합침 후보 하나만 있다(findings F4).
  eq(R.applicable(R.start(script('놓고', { cuts: ['formal'] }))).map((c) => c.rule + ' ' + c.op), ['aspirate merge'], '놓고: 받침 ㅎ 끝소리 규칙 없이 합침만(F4)');
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
  check(throws(() => R.start(script('옷이', { cuts: [] }))), '형태소 경계 수가 틀리면 오류');
  check(throws(() => R.start(script('옷 위', { cuts: [null] }))), '띄어쓰기와 space 경계가 어긋나면 오류');
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

// ───────────────────────── 7. 판 진행 함수(구현 2단계, 명세 §17) ─────────────────────────
// 원고 풀은 scripts.js 전체를 그대로 쓴다(원고가 더해져도 통과하도록 원고 수를 박지 않는다).
const NEW_FNS = ['kindOf', 'draw', 'exampleIds', 'twin', 'twins', 'gradeGuides', 'hasCondition', 'checkGuide', 'checkGuides',
  'revealArticles', 'linkSites', 'touchedLink', 'similarCell', 'scriptResult', 'chapterTotals'];
NEW_FNS.forEach((f) => check(typeof R[f] === 'function', `G.rules.${f} 있음`));
if (NEW_FNS.some((f) => typeof R[f] !== 'function')) done('규칙 점검');
const plainV = (x) => x === null || ['string', 'boolean'].includes(typeof x) || (typeof x === 'number' && isFinite(x)) ||
  (Array.isArray(x) && x.every(plainV)) || (typeof x === 'object' && !Array.isArray(x) && Object.values(x).every((v) => v !== undefined && plainV(v)));
const poolJ = J(SC);

// 7-1 원고 갈래(§6): 끝소리가 아닌 첫 규칙 / 끝소리 / 함정 종류
{
  const k = (id) => R.kindOf(byId[id]);
  eq(['짓는', '놓는', '책 넣는다', '막론', '협력', '물난리', '옷', '겉옷', '먹는'].map(k),
    ['nasal', 'nasal', 'nasal', 'r-nasal', 'r-nasal', 'lateral', 'coda', 'coda', 'nasal'], '원고 갈래: 끝소리가 아닌 첫 규칙, 끝소리만이면 coda');
  eq(['옷이', '닭이', '의견란', '감기'].map(k), ['link', 'link', 'exception', 'nonstandard'], '원고 갈래: 함정은 함정 종류');
  check(SC.every((s) => typeof R.kindOf(s) === 'string'), '모든 원고에 갈래가 있음');
}

// 7-2 원고 뽑기(§6): 시드 결정적, 조건, 뺄 원고
{
  const ids = (ch) => SC.filter((s) => s.ch === ch).map((s) => s.id);
  eq(R.draw(1, SC, [], 7), R.draw(1, SC, [], 7), '같은 시드 → 같은 뽑기(1장)');
  eq(R.draw(2, SC, [], 123), R.draw(2, SC, [], 123), '같은 시드 → 같은 뽑기(2장)');
  check(new Set([1, 2, 3, 4, 5, 6].map((sd) => J(R.draw(2, SC, [], sd)))).size > 1, '시드가 다르면 뽑기가 달라짐');
  {
    let k = 0;
    const seqRand = () => ((k = (k * 37 + 11) % 101) / 101);
    const a = R.draw(1, SC, [], seqRand);
    check(a.length === 7, '난수 함수를 줘도 뽑힘');
  }
  // 1장: 연음 함정 2 + 끝소리 일반 5, 일반에 제15항 원고 ≥1(남아 있으면)
  const is15 = (s) => (s.articles || []).includes('15');
  const check1 = (out, ex, label) => {
    const ss = out.map((id) => byId[id]);
    return out.length === 7 && new Set(out).size === 7 && ss.every((s) => s && s.ch === 1) &&
      ss.filter((s) => s.trap === 'link').length === 2 && ss.filter((s) => !s.trap && R.kindOf(s) === 'coda').length === 5 &&
      ss.every((s) => !ex.includes(s.id)) &&
      (!SC.some((s) => s.ch === 1 && !s.trap && is15(s) && !ex.includes(s.id)) || ss.some((s) => !s.trap && is15(s)));
  };
  // 2장: 다만 1 + 감기 1 + 일반 5(비음화·ㄹ의 비음화·유음화 각 ≥1)
  const check2 = (out, ex) => {
    const ss = out.map((id) => byId[id]);
    const kinds = ss.filter((s) => !s.trap).map((s) => R.kindOf(s));
    return out.length === 7 && new Set(out).size === 7 && ss.every((s) => s && s.ch === 2) &&
      ss.filter((s) => s.trap === 'exception').length === 1 && ss.filter((s) => s.trap === 'nonstandard').length === 1 &&
      kinds.length === 5 && ['nasal', 'r-nasal', 'lateral'].every((x) => kinds.includes(x)) && ss.every((s) => !ex.includes(s.id));
  };
  // 가짜 지침 예시처럼 뺄 원고(함정 일부 · 제15항 원고 일부 · 갈래마다 일부)
  const ex1 = ['옷', '꽃', '밖', '겉옷', '옷이', '닭이', '흙을'];
  const ex1All15 = ex1.concat(SC.filter((s) => s.ch === 1 && is15(s)).map((s) => s.id));
  const ex2 = ['먹는', '닫는', '잡는', '담력', '막론', '난로', '칼날', '의견란', '생산량'];
  let bad1 = 0, bad1b = 0, bad1c = 0, bad2 = 0, bad2b = 0;
  const trapAt = new Set(), firstIds = new Set();
  for (let sd = 0; sd < 200; sd++) {
    const a = R.draw(1, SC, [], sd);
    if (!check1(a, [])) bad1++;
    if (!check1(R.draw(1, SC, ex1, sd), ex1)) bad1b++;
    if (!check1(R.draw(1, SC, ex1All15, sd), ex1All15)) bad1c++;
    const b = R.draw(2, SC, [], sd);
    if (!check2(b, [])) bad2++;
    if (!check2(R.draw(2, SC, ex2, sd), ex2)) bad2b++;
    b.forEach((id, i) => { if (byId[id].trap === 'nonstandard') trapAt.add(i); });
    firstIds.add(a[0]);
  }
  check(bad1 === 0, `1장 시드 200개 모두 조건을 지킴 (어긋남 ${bad1})`);
  check(bad1b === 0, `1장 뺄 원고를 주면 뽑지 않고 조건을 지킴 (어긋남 ${bad1b})`);
  check(bad1c === 0, `1장 제15항 원고가 모두 빠져도 뽑힘 (어긋남 ${bad1c})`);
  check(bad2 === 0, `2장 시드 200개 모두 조건을 지킴 (어긋남 ${bad2})`);
  check(bad2b === 0, `2장 뺄 원고를 주면 뽑지 않고 조건을 지킴 (어긋남 ${bad2b})`);
  check(trapAt.size >= 5, `함정 위치도 무작위 (감기가 놓인 자리 ${[...trapAt].sort()})`);
  check(firstIds.size >= 5, '차례도 무작위');
  // 조건을 채울 수 없으면 오류(데이터 잘못)
  const noLink = ids(1).filter((id) => byId[id].trap === 'link').slice(1);
  check(throws(() => R.draw(1, SC, noLink, 1)), '1장 연음 함정이 1개뿐이면 오류');
  check(throws(() => R.draw(2, SC, ['감기'], 1)), '2장 감기가 없으면 오류');
  check(throws(() => R.draw(2, SC, ids(2).filter((id) => R.kindOf(byId[id]) === 'r-nasal'), 1)), '2장 ㄹ의 비음화 원고가 없으면 오류');
  check(throws(() => R.draw(1, SC, ids(1).filter((id) => !byId[id].trap).slice(3), 1)), '1장 일반 원고가 5개보다 적으면 오류');
  check(throws(() => R.draw(9, SC, [], 1)), '뽑기 조건이 없는 장은 오류(3~8장은 3단계에서 조건을 더함)');
  check(J(SC) === poolJ, '뽑기가 원고 풀을 바꾸지 않음');
}

// 7-3 지침 예시 id(뺄 원고) — 지침이 없으면 빈 목록
eq(R.exampleIds(undefined), [], '지침이 없으면 뺄 원고 없음');
eq(R.exampleIds([{ examples: [{ id: '옷' }, { id: '꽃' }] }, { examples: [{ id: '옷이' }, { id: '옷' }] }]), ['옷', '꽃', '옷이'], '지침 예시 id 모으기(겹치면 한 번)');

// 7-4 쌍둥이 원고(§8-4): 규칙 차례·함정 종류가 같고 표준 발음이 다른 원고, 뽑힌 것은 빼고
{
  eq(R.twin(byId['감기'], SC, []), null, '감기: 쌍둥이 원고 없음');
  const tl = R.twins(byId['옷이'], SC, []);
  check(tl.length > 0 && tl.every((id) => byId[id].trap === 'link' && byId[id].ch === 1 && id !== '옷이' && R.strip(byId[id].pron) !== '오시'), `옷이: 쌍둥이는 다른 연음 함정 (${J(tl)})`);
  const picked = ['옷이', tl[0]];
  const t2 = R.twin(byId['옷이'], SC, picked);
  check(t2 !== null && !picked.includes(t2) && byId[t2].trap === 'link', '뽑힌 원고는 쌍둥이 후보가 아님');
  eq(R.twin(byId['옷이'], SC, tl), null, '후보를 모두 빼면 없음');
  const tn = R.twins(byId['낮'], SC, []);
  check(tn.length > 0 && !tn.includes('낯') && !tn.includes('낱') && tn.every((id) => J(byId[id].steps.map((x) => x[0])) === '["coda"]' && !byId[id].trap),
    `낮: 표준 발음이 같은 낯·낱은 쌍둥이가 아님 (${J(tn)})`);
  const tm = R.twins(byId['막론'], SC, []);
  check(tm.length > 0 && tm.every((id) => J(byId[id].steps.map((x) => x[0])) === '["r-nasal","nasal"]'), `막론: 규칙 차례가 같은 원고 (${J(tm)})`);
  check(R.twins(byId['의견란'], SC, []).every((id) => byId[id].trap === 'exception'), '다만 낱말의 쌍둥이는 다만 낱말');
  check(!R.twins(byId['먹는'], SC, []).includes('짓는'), '규칙 차례가 다르면 쌍둥이 아님(먹는·짓는)');
  eq(R.twin(byId['옷이'], SC, []), tl[0], 'twin = 후보 가운데 원고 풀 차례로 첫째');
  // 뽑힌 원고와 표준 발음이 같은 원고도 쌍둥이가 아님(도움 ③이 뽑힌 원고의 답을 보이면 안 됨)
  const to0 = R.twins(byId['옷'], SC, []), to1 = R.twins(byId['옷'], SC, ['옷', '낮']);
  check(to0.includes('낯') && to0.includes('낱') && !to1.includes('낯') && !to1.includes('낱') && !to1.includes('낮'),
    `옷: 낮이 뽑혔으면 같은 발음 [낟]의 낯·낱도 쌍둥이가 아님 (${J(to1)})`);
  check(to1.every((id) => !['옷', '낮'].map((x) => R.strip(byId[x].pron)).includes(R.strip(byId[id].pron))), '쌍둥이의 표준 발음은 뽑힌 어느 원고와도 다름');
}

// 7-5 지침 채점·예시 검증(가짜 지침 — 실제 지침 데이터 검증은 8절, 명세 §7-3)
const G_NASAL = {
  id: 'f-nasal', articles: ['18'], rules: ['nasal'],
  text: { m3: '받침 {b1} 뒤에 {b2}가 오면 같은 자리의 콧소리로', h1: '받침 {b1}은 {b2} 앞에서 비음으로' },
  blanks: {
    b1: { options: ['/ㄱ/·/ㄷ/·/ㅂ/', '/ㄴ/·/ㅁ/·/ㅇ/'], answer: 0, members: ['coda:ㄱ', 'coda:ㄷ', 'coda:ㅂ'] },
    b2: { options: ['/ㄴ/·/ㅁ/', '/ㄹ/', '모음'], answer: 0, members: ['onset:ㄴ', 'onset:ㅁ'] },
  },
  examples: [
    { id: '먹는', shows: { b1: 'coda:ㄱ', b2: 'onset:ㄴ' } },
    { id: '닫는', shows: { b1: 'coda:ㄷ' } },
    { id: '밥물', shows: { b1: 'coda:ㅂ', b2: ['onset:ㅁ'] } },
  ],
};
const G_LINK = {
  id: 'f-link', articles: ['13', '14'], rules: [],
  text: { m3: '받침은 {b1} 앞에서 그대로 옮겨요. 겹받침은 {b2}만', h1: '{b1} 앞에서 연음, 겹받침은 {b2}' },
  blanks: {
    b1: { options: ['모음으로 시작하는 뒤에 붙는 말', '자음'], answer: 0, members: ['cut:formal', 'link'] },
    b2: { options: ['뒤엣것', '앞엣것'], answer: 0, members: ['coda2:ㄹㄱ', 'coda:ㅅ'] },
  },
  examples: [
    { id: '옷이', trap: 'link', shows: { b1: ['cut:formal', 'link'], b2: 'coda:ㅅ' } },
    { id: '닭이', trap: 'link', shows: { b2: 'coda2:ㄹㄱ' } },
  ],
};
const G_LAT = {
  id: 'f-lat', articles: ['20', '20-다만'], rules: ['lateral'],
  text: { m3: '{b1}', h1: '{b1}' },
  blanks: { b1: { options: ['/ㄹ/', '/ㄴ/'], answer: 1, members: ['exc', 'before:ㄴ'] } },
  examples: [
    { id: '난로', shows: { b1: 'before:ㄴ' } },
    { id: '의견란', trap: 'exception', shows: { b1: 'exc' } },
  ],
};
{
  const all = [G_NASAL, G_LINK, G_LAT];
  const allJ = J(all);
  const right = { 'f-nasal': { b1: 0, b2: 0 }, 'f-link': { b1: 0, b2: 0 }, 'f-lat': { b1: 1 } };
  eq(R.gradeGuides(all, right), 0, '지침 채점: 다 맞으면 0칸');
  eq(R.gradeGuides(all, { 'f-nasal': { b1: 0, b2: 1 }, 'f-link': { b1: 1, b2: 0 }, 'f-lat': { b1: 1 } }), 2, '지침 채점: 틀린 칸 수만');
  eq(R.gradeGuides(all, { 'f-nasal': { b1: 0 } }), 4, '지침 채점: 고르지 않은 칸도 틀린 칸');
  eq(R.gradeGuides(all, {}), 5, '지침 채점: 아무것도 안 고르면 모든 칸');
  eq(R.gradeGuides(all, { 'f-lat': { b1: 0 }, 'f-nasal': { b1: 0, b2: 0 }, 'f-link': { b1: 0, b2: 0 } }), 1, '지침 채점: 답 번호 0도 바르게 셈');

  eq(R.checkGuide(G_NASAL, SC), [], '가짜 비음화 지침: 예시가 빈칸 조건을 모두 보임');
  eq(R.checkGuide(G_LINK, SC), [], '가짜 연음 지침(규칙 없음, 함정 예시만): 통과');
  eq(R.checkGuide(G_LAT, SC), [], '가짜 유음화 지침(일반 예시 + 다만 함정 예시): 통과');
  eq(R.checkGuides(all, SC), [], '한 장의 지침 묶음: 통과');
  check(R.checkGuides([G_NASAL, G_NASAL], SC).length > 0, '장 안에서 지침 id가 겹치면 문제');
  check(J(all) === allJ && J(SC) === poolJ, '채점·검증이 지침과 원고를 바꾸지 않음');

  const mut = (g, f) => { const c = JSON.parse(J(g)); f(c); return c; };
  const bad = (g, label) => { const r = R.checkGuide(g, SC); check(Array.isArray(r) && r.length > 0 && r.every((m) => typeof m === 'string'), `${label} → 문제로 알림 (${J(r)})`); };
  bad(mut(G_NASAL, (g) => { g.examples[0].id = '없는원고'; }), '예시 id가 원고에 없음');
  bad(mut(G_NASAL, (g) => { g.examples[2] = { id: '난로', shows: { b1: 'coda:ㅂ' } }; }), '일반 예시가 지침 규칙을 쓰지 않음');
  bad(mut(G_NASAL, (g) => { g.examples.pop(); }), '빈칸 members를 예시가 다 덮지 못함(coda:ㅂ·onset:ㅁ)');
  bad(mut(G_NASAL, (g) => { g.examples[1].shows.b1 = 'coda:ㄱ'; g.examples[0].shows.b1 = 'coda:ㄷ'; }), '선언한 shows가 원고에 실제로 없음');
  bad(mut(G_NASAL, (g) => { g.examples[1].shows.b1 = 'coda:Q'; }), '어휘에 없는 조건 낱말');
  bad(mut(G_NASAL, (g) => { g.blanks.b1.members.push('nasal:ㄱ'); }), 'members에 어휘 밖 낱말');
  bad(mut(G_NASAL, (g) => { g.examples[1].shows.b3 = 'coda:ㄷ'; }), 'shows가 없는 빈칸을 가리킴');
  bad(mut(G_NASAL, (g) => { g.examples[0].shows.b2 = ['onset:ㄴ', 'coda:ㄱ']; }), 'shows 낱말이 그 빈칸 members에 없음');
  bad(mut(G_NASAL, (g) => { g.examples[0].trap = 'link'; }), '함정이 아닌 원고를 함정 예시로 적음');
  bad(mut(G_LINK, (g) => { delete g.examples[0].trap; }), '함정 원고를 일반 예시로 적음(규칙 없는 지침)');
  bad(mut(G_LAT, (g) => { g.examples[1].trap = 'link'; }), '함정 종류가 원고와 다름');
  bad(mut(G_NASAL, (g) => { g.blanks.b1.answer = 2; }), '답 번호가 보기 밖');
  bad(mut(G_NASAL, (g) => { g.blanks.b2.options = ['/ㄴ/']; }), '보기가 2개보다 적음');
  bad(mut(G_NASAL, (g) => { g.blanks.b2.options = ['a', 'b', 'c', 'd', 'e']; }), '보기가 4개보다 많음');
  bad(mut(G_NASAL, (g) => { g.text.h1 = '받침 {b1}'; }), '학년별 문장의 빈칸 자리가 다름');
  bad(mut(G_NASAL, (g) => { g.rules = ['nasal', 'velar']; }), '모르는 규칙 id');
  bad(mut(G_NASAL, (g) => { g.articles = []; }), '공개할 조항이 없음');
  bad({ id: 'x' }, '모양이 크게 틀린 지침도 오류 없이 문제 목록');
  // 조건 낱말 어휘: 원고에서 엔진으로 확인
  const has = (id, w) => R.hasCondition(byId[id], w);
  check(has('밖', 'coda:ㄲ') && !has('밖', 'coda:ㄱ'), 'coda: 처음 상태 종성(쌍받침은 한 음운)');
  check(has('닭이', 'coda2:ㄹㄱ') && !has('닭이', 'coda:ㄱ') && !has('옷이', 'coda2:ㄹㄱ'), 'coda2: 겹받침');
  check(has('국물', 'onset:ㅁ') && !has('국물', 'onset:ㄴ') && !has('옷 위', 'onset:ㅇ'), 'onset: 받침 바로 뒤 초성');
  check(has('담력', 'before:ㅁ') && has('백리', 'before:ㄱ') && !has('먹는', 'before:ㄱ'), 'before: 받침 /X/ + 뒤 /ㄹ/');
  check(has('옷이', 'cut:formal') && has('겉옷', 'cut:content') && has('옷 위', 'cut:space') && !has('국물', 'cut:content'), 'cut: 받침과 빈 초성 사이 경계 종류');
  check(has('옷이', 'link') && has('불놀이', 'link') && !has('겉옷', 'link') && !has('옷', 'link'), 'link: 연음 자리가 있음');
  check(has('의견란', 'exc') && !has('진로', 'exc'), 'exc: 제20항 다만 표시');
  check(throws(() => R.hasCondition(byId['옷'], 'coda:')), '모르는 조건 낱말은 오류');
}

// 7-6 공개할 조항(§9): 지침 조항 + 뽑힌 원고 조항, 번호 순, '20-다만'은 '20' 바로 뒤
{
  const ss = ['놓는', '감기', '난로', '담력', '먹는', '의견란', '물난리'].map((id) => byId[id]);
  eq(R.revealArticles([{ articles: ['18'] }, { articles: ['19'] }, { articles: ['20', '20-다만'] }], ss), ['12', '18', '19', '20', '20-다만', '21'], '2장 공개 조항(놓는이 뽑히면 제12항)');
  eq(R.revealArticles([{ articles: ['20-다만'] }, { articles: ['21', '20'] }], []), ['20', '20-다만', '21'], '다만은 제20항 바로 뒤');
  eq(R.revealArticles(undefined, [byId['옷이'], byId['겉옷'], byId['닭이']]), ['9', '13', '14', '15'], '지침 없이 원고 조항만(번호 순, 9 < 13)');
}

// 7-7 연음 자리(§8-3-4)
{
  const st = (id) => R.start(byId[id]);
  eq(R.linkSites(st('옷이')), [{ s: 0, slot: 'co', k: 0 }], '옷이: /ㅅ/이 연음 자리');
  eq(R.linkSites(st('닭이')), [{ s: 0, slot: 'co', k: 0 }, { s: 0, slot: 'co', k: 1 }], '닭이: /ㄹ/·/ㄱ/ 둘 다 연음 자리');
  eq(R.linkSites(st('불놀이')), [{ s: 1, slot: 'co', k: 0 }], '불놀이: 놀|이의 /ㄹ/만(불|놀은 아님)');
  eq(R.linkSites(st('부엌이')), [{ s: 1, slot: 'co', k: 0 }], '부엌이: 형식 형태소 앞 /ㅋ/');
  eq(R.linkSites(st('겉옷')), [], '겉옷: 실질 형태소 앞은 연음 자리 아님');
  eq(R.linkSites(st('옷 위')), [], '옷 위: 다음 단어 앞은 연음 자리 아님');
  eq(R.linkSites(R.start(script('강아지'))), [], '종성 /ㅇ/은 연음 자리 아님');
  eq(R.linkSites(R.start(script('입원'))), [{ s: 0, slot: 'co', k: 0 }], '경계 없음(null) + 빈 초성도 연음 자리');
  check(R.touchedLink(byId['옷이'], [rep('0.co', 'ㄷ')]), '옷이 /ㅅ/ 고침 → 연음 자리 받침을 건드림');
  check(!R.touchedLink(byId['겉옷'], [rep('0.co', 'ㄷ')]), '겉옷 /ㅌ/ 고침 → 안 건드림');
  check(R.touchedLink(byId['닭이'], [{ op: 'delete', at: '0.co' }]), '닭이 /ㄹ/ 뺌 → 건드림');
  check(R.touchedLink(byId['닭이'], [{ op: 'delete', at: '0.co1' }]), '닭이 /ㄱ/ 뺌 → 건드림');
  check(!R.touchedLink(byId['옷이'], []), '교정 없음 → 안 건드림');
  check(!R.touchedLink(byId['옷이'], [rep('1.nu', 'ㅔ')]), '옷이 모음 고침 → 안 건드림');
  check(!R.touchedLink(byId['옷이'], [{ op: 'delete', at: '0.co1' }]), '할 수 없는 교정(빈 자리 빼기)은 건드린 것이 아님');
  check(R.touchedLink(byId['불놀이'], [rep('1.on', 'ㄹ'), rep('1.co', 'ㄷ')]), '불놀이: 규칙 교정 뒤 놀|이의 받침 고침 → 건드림');
  check(!R.touchedLink(byId['불놀이'], [rep('1.on', 'ㄹ')]), '불놀이: 풀이 과정대로면 안 건드림');
  const sJ = J(byId['닭이']);
  R.touchedLink(byId['닭이'], [{ op: 'delete', at: '0.co' }]);
  check(J(byId['닭이']) === sJ, '연음 자리 판정이 원고를 바꾸지 않음');
}

// 7-8 닮은 칸(§8-2): 지금 상태에서 그 자리에 걸리는 규칙의 결과 음운만
{
  const st = (id) => R.start(byId[id]);
  eq(R.similarCell(st('감기'), '0.co'), null, '감기 /ㅁ/: 닮은 칸 없음');
  eq(R.similarCell(st('막론'), '0.co'), null, '막론 /ㄱ/ 먼저: 닮은 칸 없음');
  eq(R.similarCell(st('막론'), '1.on'), 'ㄴ', '막론 /ㄹ/: /ㄴ/ 칸');
  eq(R.similarCell(R.apply(st('막론'), rep('1.on', 'ㄴ')), { s: 0, slot: 'co' }), 'ㅇ', '막론 /ㄹ/→/ㄴ/ 뒤 /ㄱ/: /ㅇ/ 칸');
  eq(R.similarCell(st('짓는'), '0.co'), 'ㄷ', '짓는 /ㅅ/: 끝소리 규칙의 /ㄷ/ 칸(/ㄴ/ 아님)');
  eq(R.similarCell(st('난로'), '0.co'), 'ㄹ', '난로 /ㄴ/: /ㄹ/ 칸');
  eq(R.similarCell(st('의견란'), '1.co'), null, '의견란 /ㄴ/: 유음화 칸 없음(다만)');
  eq(R.similarCell(st('의견란'), '2.on'), 'ㄴ', '의견란 /ㄹ/: /ㄴ/ 칸');
  eq(R.similarCell(st('옷이'), '0.co'), null, '옷이 /ㅅ/: 연음 자리라 칸 없음');
  eq(R.similarCell(st('먹는'), '0.nu'), null, '모음 자리: 칸 없음');
  eq(R.similarCell(st('먹는'), '5.co'), null, '없는 자리: 칸 없음');
}

// 7-9 원고 결과(§8-5)
{
  eq(R.scriptResult([]), 'skip', '송출 안 함 → 넘김');
  eq(R.scriptResult(['diff', 'onair', 'diff']), 'onair', '온에어가 한 번이라도 → 온에어');
  eq(R.scriptResult(['diff', 'offrule']), 'offrule', '성공 없고 마지막이 규칙 밖 → 규칙 밖');
  eq(R.scriptResult(['offrule', 'diff']), 'skip', '마지막이 다름 → 넘김');
  eq(R.scriptResult(['nonstandard']), 'skip', '마지막이 표준 아님 → 넘김');
  eq(R.scriptResult([{ kind: 'diff' }, { kind: 'offrule' }]), 'offrule', '송출 결과 객체도 받음');
  eq(R.scriptResult(undefined), 'skip', '기록이 없으면 넘김');
}

// 7-10 장 정답 합계(§10): 원고 change·count의 합(학생 교정은 세지 않음)
{
  const ss = ['짓는', '막론', '감기', '물난리', '난로', '의견란', '먹는'].map((id) => byId[id]);
  const t = R.chapterTotals(ss);
  eq(t, { change: { replace: 9, delete: 0, insert: 0, merge: 0 }, count: [6 + 6 + 5 + 8 + 5 + 9 + 6, 6 + 6 + 5 + 8 + 5 + 9 + 6] }, '장 정답 합계');
  eq(R.chapterTotals([]), { change: { replace: 0, delete: 0, insert: 0, merge: 0 }, count: [0, 0] }, '원고가 없으면 0');
  check(plainV(t), '장 정답 합계는 평범한 값');
}

// 7-11 새 함수의 반환값은 JSON으로 옮길 수 있는 평범한 값, 입력을 바꾸지 않음
{
  const st = R.start(byId['닭이']), stJ = J(st);
  const outs = [R.draw(1, SC, [], 3), R.draw(2, SC, [], 3), R.twins(byId['옷이'], SC, []), R.linkSites(st), R.similarCell(st, '0.co'),
    R.revealArticles([G_NASAL], [byId['짓는']]), R.checkGuide(G_NASAL, SC), R.gradeGuides([G_NASAL], {}), R.kindOf(byId['옷']), R.scriptResult(['onair'])];
  check(outs.every(plainV), '새 함수 반환값이 평범한 값');
  check(J(st) === stJ && J(SC) === poolJ, '상태·원고 풀을 바꾸지 않음');
}

// ───────────────────────── 8. 실제 감수 지침(js/data/guides.js, 명세 §7·§6·§13) ─────────────────────────
{
  const GD = ctx.GUIDES, A = ctx.ARTICLES;
  check(!!GD && typeof GD === 'object', 'window.GUIDES 있음');
  check(!!GD && Array.isArray(GD[1]) && GD[1].length === 3, '1장 지침 3개');
  check(!!GD && Array.isArray(GD[2]) && GD[2].length === 3, '2장 지침 3개');
  if (!GD || !Array.isArray(GD[1]) || !Array.isArray(GD[2])) done('규칙 점검');
  const gdJ = J(GD);

  // 8-1 지침마다 공개할 조항(명세 §7-1) · 조항 원문 데이터에 있는 조항
  eq(GD[1].map((g) => g.articles), [['8', '9'], ['13', '14'], ['15']], '1장 지침 조항: ①제8·9항 ②제13·14항 ③제15항');
  eq(GD[2].map((g) => g.articles), [['18'], ['19'], ['20', '20-다만']], '2장 지침 조항: ①제18항 ②제19항 ③제20항·다만');
  [1, 2].forEach((ch) => GD[ch].forEach((g) => (g.articles || []).forEach((a) =>
    check(!!A && a in A, `[${g.id}] 조항 ${a}가 조항 원문 데이터에 있음`))));

  // 8-2 예시 검증(엔진): 예시가 빈칸 조건을 모두 보이고, 원고가 있고, 함정 표시가 맞음
  eq(R.checkGuides(GD[1], SC), [], '1장 지침 예시 검증 통과');
  eq(R.checkGuides(GD[2], SC), [], '2장 지침 예시 검증 통과');
  [1, 2].forEach((ch) => GD[ch].forEach((g) => {
    const n = (g.examples || []).length;
    check(n >= 3 && n <= 4, `[${g.id}] 예시 3~4개 (${n})`);
    check((g.examples || []).every((e) => byId[e.id] && byId[e.id].ch === ch), `[${g.id}] 예시는 그 장 원고`);
  }));
  // 지침 내용(명세 §7-1): 1장 ②는 홑·쌍받침 연음과 겹받침 연음, ③은 제15항 원고, 2장 ③은 다만 낱말
  {
    const ex = (g) => (g.examples || []).map((e) => byId[e.id]).filter(Boolean);
    const [c1a, c1b, c1c] = GD[1], [, , c2c] = GD[2];
    check(ex(c1a).every((s) => !s.trap), '1장 ①: 예시는 함정 아닌 끝소리 원고');
    check(ex(c1b).every((s) => s.trap === 'link'), '1장 ②: 예시는 모두 연음 함정');
    check(ex(c1b).some((s) => R.start(s).syl.some((y) => y.co.length === 1)) && ex(c1b).some((s) => R.start(s).syl.some((y) => y.co.length === 2)),
      '1장 ②: 홑받침·쌍받침 연음과 겹받침 연음 예시가 함께 있음');
    check(ex(c1c).every((s) => !s.trap && (s.articles || []).includes('15')), '1장 ③: 예시는 제15항 원고');
    check(ex(c2c).some((s) => s.trap === 'exception') && ex(c2c).some((s) => !s.trap && R.kindOf(s) === 'lateral'), '2장 ③: 유음화 예시와 다만 낱말 예시가 함께 있음');
  }

  // 8-3 채점: 정답이면 0칸, 칸마다 하나씩 틀리면 1칸, 모두 틀리면 빈칸 수
  [1, 2].forEach((ch) => {
    const gs = GD[ch];
    const answers = (f) => Object.fromEntries(gs.map((g) => [g.id, Object.fromEntries(Object.keys(g.blanks).map((b) => [b, f(g, b)]))]));
    const wrongOf = (g, b) => (g.blanks[b].answer + 1) % g.blanks[b].options.length;
    const total = gs.reduce((n, g) => n + Object.keys(g.blanks).length, 0);
    eq(R.gradeGuides(gs, answers((g, b) => g.blanks[b].answer)), 0, `${ch}장 지침: 정답을 모두 고르면 0칸`);
    let oneOk = 0;
    gs.forEach((g) => Object.keys(g.blanks).forEach((b) => {
      const p = answers((gg, bb) => gg.blanks[bb].answer);
      p[g.id][b] = wrongOf(g, b);
      if (R.gradeGuides(gs, p) === 1) oneOk++;
    }));
    check(oneOk === total, `${ch}장 지침: 빈칸 하나만 틀리면 1칸 (${oneOk}/${total})`);
    eq(R.gradeGuides(gs, answers(wrongOf)), total, `${ch}장 지침: 모두 틀리면 빈칸 수 ${total}`);
    eq(R.gradeGuides(gs, {}), total, `${ch}장 지침: 아무것도 안 고르면 빈칸 수`);
  });

  // 8-4 예시를 뺀 원고 풀로 뽑기(명세 §6): 시드 0~199 모두 성공, 예시는 안 뽑힘, 함정 2개, 제15항·갈래 조건
  const is15 = (s) => (s.articles || []).includes('15');
  const ex1 = R.exampleIds(GD[1]), ex2 = R.exampleIds(GD[2]);
  {
    let fail1 = 0, fail2 = 0, err = '';
    for (let sd = 0; sd < 200; sd++) {
      let a, b;
      try { a = R.draw(1, SC, ex1, sd); } catch (e) { fail1++; err = err || e.message; continue; }
      const ss = a.map((id) => byId[id]);
      const ok1 = a.length === 7 && new Set(a).size === 7 && ss.every((s) => s && s.ch === 1 && !ex1.includes(s.id)) &&
        ss.filter((s) => s.trap === 'link').length === 2 && ss.filter((s) => s.trap).length === 2 &&
        ss.filter((s) => !s.trap).every((s) => R.kindOf(s) === 'coda') && ss.some((s) => !s.trap && is15(s));
      if (!ok1) fail1++;
      try { b = R.draw(2, SC, ex2, sd); } catch (e) { fail2++; err = err || e.message; continue; }
      const tt = b.map((id) => byId[id]);
      const kinds = tt.filter((s) => !s.trap).map((s) => R.kindOf(s));
      const ok2 = b.length === 7 && new Set(b).size === 7 && tt.every((s) => s && s.ch === 2 && !ex2.includes(s.id)) &&
        tt.filter((s) => s.trap === 'exception').length === 1 && tt.filter((s) => s.id === '감기').length === 1 &&
        tt.filter((s) => s.trap).length === 2 && kinds.length === 5 && ['nasal', 'r-nasal', 'lateral'].every((k) => kinds.includes(k));
      if (!ok2) fail2++;
    }
    check(fail1 === 0, `1장: 지침 예시를 빼고 시드 200개 모두 뽑힘 — 연음 함정 2 + 끝소리 5(제15항 ≥1) (어긋남 ${fail1}) ${err}`);
    check(fail2 === 0, `2장: 지침 예시를 빼고 시드 200개 모두 뽑힘 — 다만 1 + 감기 1 + 갈래 셋 (어긋남 ${fail2}) ${err}`);
  }
  // 예시로 쓰고도 뽑을 원고가 남음(제15항 원고 ≥1, 연음 함정 ≥2, 다만 ≥1, 감기는 예시가 아님)
  {
    const left = (ch, ex, f) => SC.filter((s) => s.ch === ch && !ex.includes(s.id) && f(s)).length;
    check(left(1, ex1, (s) => !s.trap && is15(s)) >= 1, `1장 감수에 쓸 제15항 원고가 남음 (${left(1, ex1, (s) => !s.trap && is15(s))}개)`);
    check(left(1, ex1, (s) => s.trap === 'link') >= 2, '1장 연음 함정이 2개 이상 남음');
    check(left(2, ex2, (s) => s.trap === 'exception') >= 1, '2장 다만 낱말이 남음');
    check(!ex2.includes('감기'), '감기는 지침 예시가 아님');
    ['nasal', 'r-nasal', 'lateral'].forEach((k) => check(left(2, ex2, (s) => !s.trap && R.kindOf(s) === k) >= 1, `2장 ${k} 갈래 원고가 남음`));
  }

  // 8-5 지침 문구 규칙(명세 §3-6·§13): 금지 낱말·한자 없음, 학년 키 구조 같음, 빗금 표기, 대괄호(발음 표시) 없음
  {
    const FILE = 'js/data/guides.js';
    const src = fs.readFileSync(path.join(ROOT, FILE), 'utf8');
    // TODO(병합 때): tests/lib/words.mjs의 FORBIDDEN·BROADCASTERS를 가져와 이 목록을 바꾼다(2단계 가지에 있음 — 방송사 이름이 빠져 있음)
    const FORBIDDEN = ['글자', '훈민정음', '해례', '제자 원리', '제자원리', '상형', '가획', '중세', '조선 수군', '조선',
      '판옥선', '협선', '척후선', '게임오버', '게임 오버'];
    const HAN = /\p{Script=Han}/u;
    const JAMO = '\\u3131-\\u318E\\u1100-\\u11FF';
    const slashed = new RegExp(`/[${JAMO}]/`, 'g');
    const lone = new RegExp(`[${JAMO}]`);
    const shown = []; // 화면에 보이는 문구: 지침 문장(두 학년)과 보기
    [1, 2].forEach((ch) => GD[ch].forEach((g) => {
      const t = g.text || {};
      check(Object.keys(t).sort().join() === 'h1,m3', `[${g.id}] 문장은 학년 키 m3·h1 둘`);
      const holes = (s) => J([...new Set(String(s).match(/\{\w+\}/g) || [])].sort());
      check(holes(t.m3) === holes(t.h1), `[${g.id}] 두 학년의 빈칸 자리가 같음`);
      check(J((String(t.m3).match(/\{\w+\}/g) || [])) === J(String(t.h1).match(/\{\w+\}/g) || []), `[${g.id}] 빈칸이 한 번씩, 같은 차례`);
      ['m3', 'h1'].forEach((gr) => shown.push([`${g.id}.text.${gr}`, t[gr]]));
      Object.keys(g.blanks || {}).forEach((b) => (g.blanks[b].options || []).forEach((o, i) => shown.push([`${g.id}.${b}.${i}`, o])));
    }));
    check(shown.length > 20, `지침 문구 수 ${shown.length}`);
    for (const [p, s] of shown) {
      check(typeof s === 'string' && s.trim() === s && s.length > 0, `지침 문구가 빈칸·앞뒤 공백 없음: ${p}`);
      check(!lone.test(String(s).replace(slashed, '')), `지침 문구의 음운은 빗금 표기: ${p} = ${s}`);
      check(!/[\[\]]/.test(s), `지침 문구에 대괄호(발음 표시) 없음: ${p} = ${s}`);
      check(!/[\r\n]/.test(s), `지침 문구는 한 줄: ${p}`);
    }
    for (const w of FORBIDDEN) {
      check(!shown.some(([, s]) => String(s).includes(w)), `지침 문구에 금지 낱말 '${w}' 없음`);
      check(!src.includes(w), `지침 파일에 금지 낱말 '${w}' 없음(주석 포함)`);
    }
    const hanLines = src.split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => HAN.test(l));
    check(!hanLines.length, `지침 파일에 한자 없음 ${hanLines.map(([n]) => n + '행').join(', ')}`);
    check(!/\bdocument\b|localStorage|setTimeout|setInterval/.test(src.replace(/\/\/.*$/gm, '')), '지침 파일은 DOM·저장소·타이머를 쓰지 않음');
  }
  check(J(GD) === gdJ && J(SC) === poolJ, '지침 점검이 지침과 원고를 바꾸지 않음');
  console.log(`  지침 예시(뽑기에서 뺌) 1장 ${ex1.join(', ')} · 2장 ${ex2.join(', ')}`);
}

// ───────────────────────── 9. 3~8장 규칙(구현 3단계) ─────────────────────────
// 원고가 없으면 그 단계만 실패로 알리고 넘어간다(점검이 먼저 쓰이고 원고·규칙이 뒤에 들어옴).
const has3 = (ids) => { const miss = ids.filter((id) => !byId[id]); check(!miss.length, `원고가 있음: ${miss.join(', ')}`); return !miss.length; };
const del = (at) => ({ op: 'delete', at });
const ins = (at, to) => ({ op: 'insert', at, to });
const mrg = (a, b, to) => ({ op: 'merge', at: [a, b], to });
const okAs = (id, c, rule, article, label) => {
  const r = R.check(R.start(byId[id]), c);
  check(r.ok && r.rule === rule && (!article || r.article === article), `${label}: 규칙 안 ${rule}${article ? ' 제' + article + '항' : ''} (${r.ok} ${r.rule} ${r.article})`);
};
const outOf = (id, c, label) => check(!R.check(R.start(byId[id]), c).ok, `${label}: 규칙 밖`);
const sendKind = (id, cs) => R.broadcast(byId[id], cs);
const NEW_RULES = ['palatal', 'tense', 'tense-stem', 'tense-sino', 'tense-adn', 'tense-cmp', 'tense-link', 'simplify', 'h-drop', 'n-insert', 'glide-insert', 'aspirate'];
NEW_RULES.forEach((r) => check(!!R.RULES[r], `규칙 id ${r}가 엔진에 있음`));
check(typeof R.allowable === 'function', 'G.rules.allowable(허용 규칙 후보) 있음');
// 장 배정은 누적(결정 D0-1): N장 원고는 1~N장 규칙만 쓴다
SC.forEach((s) => (s.steps || []).forEach((st) => {
  const r = R.RULES[st[0]];
  check(!!r && r.ch <= s.ch, `[${s.id}] ${st[0]}은 ${r && r.ch}장 규칙 — ${s.ch}장 원고에 쓸 수 있음`);
}));

// 9-1 구개음화(제17항, 받침 자리를 고침 — D3-1)
if (has3(['굳이', '밭이', '벼훑이', '잔디', '마디', '곧이어', '곁에서', '굳히다'])) {
  okAs('굳이', rep('0.co', 'ㅈ'), 'palatal', '17', '굳이 /ㄷ/→/ㅈ/');
  okAs('밭이', rep('0.co', 'ㅊ'), 'palatal', '17', '밭이 /ㅌ/→/ㅊ/');
  okAs('벼훑이', rep('1.co1', 'ㅊ'), 'palatal', '17', '벼훑이 겹받침 /ㄾ/의 /ㅌ/만');
  outOf('벼훑이', rep('1.co', 'ㅈ'), '벼훑이 /ㄹ/을 고침');
  outOf('굳이', rep('1.on', 'ㅈ'), '굳이 뒤 음절 빈 초성에 고침(받침 자리를 고침)');
  eq(R.applicable(R.start(byId['잔디'])), [], '잔디: 한 형태소 안 /ㄷ/+/ㅣ/ — 구개음화 없음');
  eq(R.applicable(R.start(byId['마디'])), [], '마디: 구개음화 없음');
  eq(R.applicable(R.start(byId['곧이어'])), [], '곧이어: 실질 형태소 앞 — 구개음화도 ㄴ 첨가도 없음');
  eq(R.applicable(R.start(byId['곁에서'])), [], '곁에서: /ㅣ/가 아닌 모음 앞 — 구개음화 없음');
  eq(sendKind('곁에서', [rep('0.co', 'ㅊ')]).kind, 'nonstandard', '곁에서 [겨체서]로 송출 → 표준 아님');
  eq(sendKind('잔디', [rep('1.on', 'ㅈ')]).kind, 'diff', '잔디 /ㄷ/→/ㅈ/ 송출 → 다름');
  // [붙임]: 합쳐서 생긴 /ㅌ/만 뒤 음절 초성에서(8장)
  const s = byId['굳히다'];
  check(!R.check(R.start(s), rep('1.on', 'ㅊ')).ok, '굳히다: 합치기 전 /ㅎ/→/ㅊ/은 규칙 밖');
  const m = R.apply(R.start(s), mrg('0.co', '1.on', 'ㅌ'));
  check(R.check(R.start(s), mrg('0.co', '1.on', 'ㅌ')).rule === 'aspirate', '굳히다: /ㄷ/+/ㅎ/→/ㅌ/ 합침이 먼저');
  check(R.check(m, rep('1.on', 'ㅊ')).rule === 'palatal', '굳히다: 합친 뒤 /ㅌ/→/ㅊ/ 구개음화([붙임])');
}

// 9-2 된소리되기(제23~28항, 제14항 괄호)
if (has3(['깎다', '국밥', '신고', '안기다', '감기다', '갈등', '허허실실', '할 것을', '문고리', '볶음밥', '값을', '값이', '할수록'])) {
  outOf('깎다', rep('1.on', 'ㄸ'), '깎다: 끝소리 규칙 전 된소리(받침 /ㄲ/ — D4-1)');
  const k1 = R.apply(R.start(byId['깎다']), rep('0.co', 'ㄱ'));
  check(R.check(k1, rep('1.on', 'ㄸ')).rule === 'tense', '깎다: /ㄲ/→/ㄱ/ 뒤 된소리(제23항)');
  okAs('국밥', rep('1.on', 'ㅃ'), 'tense', '23', '국밥');
  check(!R.applicable(R.start(script('국 그릇', { cuts: ['space', null] }))).some((c) => c.rule === 'tense'), '띄어 쓴 두 단어 사이는 제23항 된소리 없음');
  okAs('신고', rep('1.on', 'ㄲ'), 'tense-stem', '24', '신고(어간 + 어미)');
  eq(R.applicable(R.start(byId['안기다'])), [], '안기다: 피동·사동 -기-는 된소리 없음(제24항 다만)');
  eq(R.applicable(R.start(byId['감기다'])), [], '감기다: 된소리 없음');
  eq(sendKind('안기다', [rep('1.on', 'ㄲ')]).kind, 'diff', '안기다 /ㄱ/→/ㄲ/ 송출 → 다름');
  okAs('갈등', rep('1.on', 'ㄸ'), 'tense-sino', '26', '갈등(한자어 /ㄹ/ + /ㄷ/)');
  eq(R.applicable(R.start(byId['허허실실'])), [], '허허실실: 같은 한자가 겹침 — 된소리 없음(제26항 다만)');
  okAs('할 것을', rep('1.on', 'ㄲ'), 'tense-adn', '27', '할 것을(관형사형 -ㄹ 뒤, 띄어 써도)');
  okAs('할수록', rep('1.on', 'ㅆ'), 'tense-adn', '27', '할수록(-ㄹ로 시작하는 어미)');
  okAs('문고리', rep('1.on', 'ㄲ'), 'tense-cmp', '28', '문고리(사잇소리 합성어)');
  eq(R.applicable(R.start(byId['볶음밥'])), [], '볶음밥: 사잇소리 없는 합성어');
  eq(sendKind('볶음밥', [rep('2.on', 'ㅃ')]).kind, 'nonstandard', '볶음밥 [보끔빱] → 표준 아님');
  okAs('값을', rep('0.co1', 'ㅆ'), 'tense-link', '14', '값을 /ㅅ/→/ㅆ/(제14항 괄호)');
  const v = sendKind('값이', [del('0.co1')]);
  check(v.kind === 'nonstandard' && v.reading === '가비', `값이: /ㅅ/을 빼면 [가비] 표준 아님 (${v.kind} ${v.reading})`);
}

// 9-3 자음군 단순화(제10·11항, 다만)와 ㅎ 탈락(제12항 4·3 [붙임]) — 차례(D5-1)
if (has3(['닭', '넋', '여덟', '밟다', '맑게', '넓다', '맑다', '값지다', '닭 앞에', '통닭을', '낳은', '않네', '않은', '닳는', '놓는', '넓고'])) {
  okAs('닭', del('0.co'), 'simplify', '11', '닭: /ㄺ/은 앞 /ㄹ/을 뺌');
  outOf('닭', del('0.co1'), '닭: /ㄱ/을 빼면');
  okAs('넋', del('0.co1'), 'simplify', '10', '넋: /ㄳ/은 뒤 /ㅅ/을 뺌');
  okAs('여덟', del('1.co1'), 'simplify', '10', '여덟: /ㄼ/은 뒤 /ㅂ/을 뺌');
  okAs('밟다', del('0.co'), 'simplify', '10-다만', '밟다: /ㄼ/인데 앞 /ㄹ/을 뺌(제10항 다만)');
  outOf('밟다', del('0.co1'), '밟다: /ㅂ/을 빼면');
  okAs('닭 앞에', del('0.co'), 'simplify', '15', '닭 앞에: 다음 단어 앞 겹받침(제15항 [붙임])');
  outOf('통닭을', del('1.co'), '통닭을: 형식 형태소 앞 겹받침은 연음(뺌 없음)');
  // 맑게(제11항 다만): 된소리가 먼저 — 겹받침 /ㄺ/이 있을 때(D5-1)
  okAs('맑게', rep('1.on', 'ㄲ'), 'tense', '23', '맑게: /ㄺ/이 있을 때 된소리');
  outOf('맑게', del('0.co1'), '맑게: 된소리 전에 /ㄱ/을 빼면(된소리 조건을 없앰)');
  outOf('맑게', del('0.co'), '맑게: /ㄹ/을 빼면(다만: /ㄱ/ 앞 /ㄺ/은 [ㄹ])');
  const g1 = R.apply(R.start(byId['맑게']), rep('1.on', 'ㄲ'));
  check(R.check(g1, del('0.co1')).article === '11-다만', '맑게: 된소리 뒤 /ㄱ/ 뺌은 제11항 다만');
  eq(sendKind('맑게', [del('0.co1')]).kind, 'diff', '맑게: 뺌만 하고 송출 → 다름');
  eq(sendKind('맑게', [rep('1.on', 'ㄲ'), del('0.co1')]).kind, 'onair', '맑게: 된소리 ▸ 뺌 → 온에어');
  // 넓다(제25항): 같은 차례
  outOf('넓다', del('0.co1'), '넓다: 된소리 전에 /ㅂ/을 빼면');
  eq(sendKind('넓다', [del('0.co1')]).kind, 'diff', '넓다: 뺌만 하면 [널다]에서 멈춤(다름)');
  const nb = sendKind('넓다', [del('0.co1'), rep('1.on', 'ㄸ')]);
  check(nb.kind === 'offrule' && J(nb.outOfRule) === '[0,1]', `넓다: 뺌 ▸ 된소리는 둘 다 규칙 밖(남은 /ㄹ/ 뒤 된소리 조건 없음) (${nb.kind} ${J(nb.outOfRule)})`);
  eq(sendKind('넓다', [rep('1.on', 'ㄸ'), del('0.co1')]).kind, 'onair', '넓다: 된소리 ▸ 뺌 → 온에어');
  // 맑다·값지다: 어느 차례든 규칙 안
  eq(sendKind('맑다', [del('0.co'), rep('1.on', 'ㄸ')]).kind, 'onair', '맑다: 뺌 ▸ 된소리 온에어');
  eq(sendKind('맑다', [rep('1.on', 'ㄸ'), del('0.co')]).kind, 'onair', '맑다: 된소리 ▸ 뺌 온에어');
  eq(sendKind('값지다', [rep('1.on', 'ㅉ'), del('0.co1')]).kind, 'onair', '값지다: 된소리 ▸ 뺌도 온에어(교과서는 뺌 먼저)');
  eq(sendKind('넓고', [del('0.co'), rep('1.on', 'ㄲ')]).kind, 'nonstandard', '넓고 [넙꼬] → 표준 아님');
  okAs('낳은', del('0.co'), 'h-drop', '12-4', '낳은: 모음 앞 /ㅎ/ 탈락');
  okAs('않은', del('0.co1'), 'h-drop', '12-4', '않은: /ㄶ/의 /ㅎ/ 탈락');
  okAs('않네', del('0.co1'), 'h-drop', '12-3', '않네: /ㄶ/ + /ㄴ/ — ㅎ 탈락(D5-3)');
  outOf('닳는', rep('1.on', 'ㄹ'), '닳는: /ㅎ/을 빼기 전 유음화');
  check(!R.check(R.start(byId['놓는']), del('0.co')).ok, '놓는: 홑받침 /ㅎ/ + /ㄴ/은 탈락이 아님(결정 0010, 교체 2회)');
  // F4: 어말 /ㅎ/과 /ㅎ/+/ㅅ/은 아직 닫혀 있음
  eq(R.applicable(R.start(script('히읗', { cuts: [null] }))), [], '히읗: 어말 받침 /ㅎ/은 닫혀 있음(F4)');
  eq(R.applicable(R.start(script('닿소', { cuts: ['formal'] }))), [], '닿소: /ㅎ/+/ㅅ/은 닫혀 있음(D7-4)');
}

// 9-4 ㄴ 첨가(제29항, [붙임 1] 두 단계)와 반모음 첨가(제22항, 허용)
if (has3(['솜이불', '송별연', '등용문', '금요일', '절약', '담임', '솔잎', '피어', '야금야금', '옷 입다'])) {
  okAs('솜이불', ins('1.on', 'ㄴ'), 'n-insert', '29', '솜이불: /ㄴ/ 첨가');
  ['송별연', '등용문', '금요일'].forEach((id) => eq(R.applicable(R.start(byId[id])), [], `${id}: ㄴ 첨가 없음(예외 표시)`));
  ['절약', '담임'].forEach((id) => eq(R.applicable(R.start(byId[id])), [], `${id}: 한 형태소 안 — ㄴ 첨가 없음`));
  eq(sendKind('금요일', [ins('1.on', 'ㄴ')]).kind, 'nonstandard', '금요일 [금뇨일] → 표준 아님');
  outOf('옷이', ins('1.on', 'ㄴ'), '옷이: 형식 형태소 앞 /ㄴ/ 첨가');
  outOf('솔잎', ins('1.on', 'ㄹ'), '솔잎: /ㄹ/을 바로 넣기(첨가 ▸ 유음화 두 단계 — D6-4)');
  const so = R.apply(R.start(byId['솔잎']), ins('1.on', 'ㄴ'));
  check(R.check(so, rep('1.on', 'ㄹ')).rule === 'lateral', '솔잎: 넣은 /ㄴ/ → /ㄹ/ 유음화');
  // 제22항: 원칙 [피어]도 허용 [피여]도 온에어, 엔진은 원칙을 도출
  eq(R.applicable(R.start(byId['피어'])), [], '피어: 반드시 걸리는 규칙 없음(반모음 첨가는 허용)');
  eq(R.allowable(R.start(byId['피어'])).map((c) => [c.rule, c.op, c.at.s, c.at.slot, c.to].join(' ')), ['glide-insert insert 1 gl j'], '피어: 허용 규칙 후보 = /j/ 첨가');
  eq(R.derive(byId['피어']).pron, '피어', '피어: 엔진 도출은 원칙 [피어]');
  const pa = sendKind('피어', [ins('1.gl', 'j')]);
  check(pa.kind === 'onair' && pa.reading === '피여' && pa.change.insert === 1, `피어: /j/ 첨가 송출 → 허용 [피여] 온에어 (${pa.kind} ${pa.reading})`);
  eq(sendKind('피어', []).kind, 'onair', '피어: 교정 없이 원칙 [피어] 온에어');
  eq(sendKind('야금야금', []).kind, 'onair', '야금야금: 표기대로 [야그먀금](허용) 온에어');
  // 첨가 ▸ 비음화(8장): 끝소리 고침과 첨가의 차례는 자유
  eq(sendKind('옷 입다', [ins('1.on', 'ㄴ'), rep('0.co', 'ㄷ'), rep('0.co', 'ㄴ'), rep('2.on', 'ㄸ')]).kind, 'onair', '옷 입다: 첨가 ▸ 끝소리 ▸ 비음화 ▸ 된소리 온에어');
}

// 9-5 거센소리되기(제12항 1·[붙임 1·2] — 합침표)와 ㅎ 탈락의 대비, /ㅈ/+/ㅎ/(D7-2)
if (has3(['놓고', '많고', '놓아', '많아', '꽂히다', '낮 한때', '숱하다', '옷 한 벌', '밝히다', '넓히고', '각하'])) {
  okAs('놓고', mrg('0.co', '1.on', 'ㅋ'), 'aspirate', '12-1', '놓고: /ㅎ/+/ㄱ/→/ㅋ/');
  okAs('많고', mrg('0.co1', '1.on', 'ㅋ'), 'aspirate', '12-1', '많고: /ㄶ/의 /ㅎ/+/ㄱ/');
  okAs('밝히다', mrg('0.co1', '1.on', 'ㅋ'), 'aspirate', '12-1', '밝히다: /ㄺ/의 /ㄱ/+/ㅎ/');
  outOf('밝히다', del('0.co'), '밝히다: /ㅎ/ 앞 겹받침 뺌');
  okAs('각하', mrg('0.co', '1.on', 'ㅋ'), 'aspirate', '12-1', '각하');
  okAs('놓아', del('0.co'), 'h-drop', '12-4', '놓아: 모음 앞은 합침이 아니라 뺌');
  okAs('많아', del('0.co1'), 'h-drop', '12-4', '많아: 뺌');
  check(R.check(R.start(byId['놓아']), mrg('0.co', '1.nu', 'ㅏ')).ok === false, '놓아: 합침표는 규칙 밖');
  check(!R.touchedLink(byId['놓아'], [del('0.co')]), '놓아: 규칙 안 /ㅎ/ 뺌은 연음 안내 없음');
  // 꽂히다: /ㅈ/+/ㅎ/은 곧바로 /ㅊ/(제12항 [붙임 1]) — 끝소리 /ㅈ/→/ㄷ/은 규칙 밖(D7-2)
  okAs('꽂히다', mrg('0.co', '1.on', 'ㅊ'), 'aspirate', '12-1', '꽂히다: /ㅈ/+/ㅎ/→/ㅊ/');
  outOf('꽂히다', rep('0.co', 'ㄷ'), '꽂히다: /ㅎ/ 앞 /ㅈ/→/ㄷ/');
  const kk = sendKind('꽂히다', [rep('0.co', 'ㄷ'), mrg('0.co', '1.on', 'ㅌ'), rep('1.on', 'ㅊ')]);
  check(kk.kind === 'offrule' && J(kk.outOfRule) === '[0]', `꽂히다: /ㅈ/→/ㄷ/ ▸ 합침 ▸ 구개음화는 규칙 밖이 섞임 (${kk.kind} ${J(kk.outOfRule)})`);
  // 낮 한때·옷 한 벌·숱하다: 끝소리 규칙이 먼저([붙임 2])
  okAs('낮 한때', rep('0.co', 'ㄷ'), 'coda', '9', '낮 한때: 다음 단어 앞 /ㅈ/→/ㄷ/');
  outOf('낮 한때', mrg('0.co', '1.on', 'ㅊ'), '낮 한때: /ㅈ/+/ㅎ/ 바로 합침');
  outOf('옷 한 벌', mrg('0.co', '1.on', 'ㅌ'), '옷 한 벌: /ㅅ/+/ㅎ/ 바로 합침');
  outOf('숱하다', mrg('0.co', '1.on', 'ㅌ'), '숱하다: /ㅌ/+/ㅎ/ 바로 합침');
  eq(sendKind('넓히고', [del('0.co'), rep('1.on', 'ㅍ')]).kind, 'nonstandard', '넓히고 [넙피고] → 표준 아님');
  eq(sendKind('넓히고', [mrg('0.co1', '1.on', 'ㅍ')]).kind, 'onair', '넓히고: /ㅂ/+/ㅎ/ 합침 한 번 → 온에어');
}

// 9-6 연쇄(8장): 다음 차례는 상태가 정한다
if (has3(['흙만', '읊는', '값있는', '결단력'])) {
  outOf('흙만', rep('0.co1', 'ㅇ'), '흙만: 겹받침에는 비음화가 걸리지 않음(뺌이 먼저)');
  okAs('흙만', del('0.co'), 'simplify', '11', '흙만: 뺌이 먼저');
  eq(R.derive(byId['읊는']).steps.map((c) => c.rule), ['simplify', 'coda', 'nasal'], '읊는: 뺌 ▸ 끝소리 ▸ 비음화');
  okAs('값있는', del('0.co1'), 'simplify', '15', '값있는: 실질 형태소 앞 겹받침 뺌(제15항 [붙임])');
  okAs('결단력', rep('1.on', 'ㄸ'), 'tense-sino', '26', '결단력: 결+단 한자어 /ㄹ/+/ㄷ/');
  okAs('결단력', rep('2.on', 'ㄴ'), 'r-nasal-exc', '20-다만', '결단력: 단+력 다만');
}

// 9-7 연음 안내: 연음 자리의 규칙 안 교정(구개음화·제14항 된소리·ㅎ 탈락)에는 뜨지 않음(D3-1, D4-7)
if (has3(['굳이', '값을', '낳은', '밭이'])) {
  check(!R.touchedLink(byId['굳이'], [rep('0.co', 'ㅈ')]), '굳이 /ㄷ/→/ㅈ/(규칙 안) → 연음 안내 없음');
  check(R.touchedLink(byId['굳이'], [rep('0.co', 'ㅊ')]), '굳이 /ㄷ/→/ㅊ/(규칙 밖) → 연음 안내');
  check(!R.touchedLink(byId['값을'], [rep('0.co1', 'ㅆ')]), '값을 /ㅅ/→/ㅆ/(규칙 안) → 연음 안내 없음');
  check(R.touchedLink(byId['값을'], [del('0.co1')]), '값을 /ㅅ/ 뺌(규칙 밖) → 연음 안내');
  check(!R.touchedLink(byId['낳은'], [del('0.co')]), '낳은 /ㅎ/ 뺌(규칙 안) → 연음 안내 없음');
  check(R.touchedLink(byId['밭이'], [rep('0.co', 'ㄷ')]), '밭이 /ㅌ/→/ㄷ/(규칙 밖) → 연음 안내');
  // 1·2장 행동은 그대로
  check(R.touchedLink(byId['옷이'], [rep('0.co', 'ㄷ')]) && !R.touchedLink(byId['겉옷'], [rep('0.co', 'ㄷ')]) && R.touchedLink(byId['닭이'], [del('0.co')]), '옷이·겉옷·닭이는 1·2장과 같음');
}

// 9-8 원고 갈래: 함정 종류 / 그 장 규칙 가운데 첫째 / 허용 규칙
{
  const pairs = [['굳이', 'palatal'], ['깎다', 'tense'], ['신고', 'tense-stem'], ['갈등', 'tense-sino'], ['할 것을', 'tense-adn'], ['문고리', 'tense-cmp'],
    ['값을', 'tense-link'], ['넓다', 'simplify'], ['낳은', 'h-drop'], ['솔잎', 'n-insert'], ['피어', 'glide-insert'], ['콧날', 'nasal'], ['놓고', 'aspirate'],
    ['잔디', 'blocked'], ['놓아', 'contrast'], ['맑게', 'exception']];
  if (has3(pairs.map((p) => p[0]))) eq(pairs.map((p) => R.kindOf(byId[p[0]])), pairs.map((p) => p[1]), '3~8장 원고 갈래');
}

// 9-9 조건 낱말(새 어휘)
if (has3(['신고', '안기다', '할 것을', '문고리', '볶음밥', '밟다', '넓다', '송별연', '솜이불', '갈등', '허허실실', '잔디', '굳이', '곧이어', '깻잎', '같이'])) {
  const hv = (id, w) => R.hasCondition(byId[id], w);
  check(hv('신고', 'stem') && !hv('안기다', 'stem'), 'stem: 어간 + 어미 표시');
  check(hv('할 것을', 'adn') && !hv('신고', 'adn'), 'adn: 관형사형 -ㄹ 표시');
  check(hv('문고리', 'sai') && !hv('볶음밥', 'sai'), 'sai: 사잇소리 합성어 표시');
  check(hv('밟다', 'cexc') && !hv('넓다', 'cexc'), 'cexc: 제10항 다만 겹받침 표시');
  check(hv('송별연', 'noins') && !hv('솜이불', 'noins'), 'noins: ㄴ 첨가 없음 표시');
  check(hv('갈등', 'gap:sino') && !hv('허허실실', 'gap:sino') && !hv('갈등', 'cut:sino'), 'gap: 받침 뒤 경계 종류(뒤 초성이 있어도)');
  check(hv('문고리', 'gap:content') && hv('할 것을', 'gap:space'), 'gap: content·space');
  check(hv('잔디', 'cv:ㄷㅣ') && !hv('굳이', 'cv:ㄷㅣ') && !hv('곧이어', 'cv:ㄷㅣ') && hv('같이', 'cv:ㅊㅣ') === false, 'cv: 한 형태소 안 자음 + 모음');
  check(hv('솜이불', 'vowelI') && hv('깻잎', 'vowelI') && !hv('문고리', 'vowelI'), 'vowelI: 받침 뒤 빈 초성 + /ㅣ/·/j/');
  check(throws(() => R.hasCondition(byId['신고'], 'gap:foo')) && throws(() => R.hasCondition(byId['신고'], 'cv:ㄷ')), '모르는 새 낱말은 오류');
}

// 9-10 원고 뽑기 3~8장(결정 D0-2·D8-1): 시드 200개, 조건, 지침 예시를 뺀 여유
{
  const chIds = (ch) => SC.filter((s) => s.ch === ch);
  const firstRule = (s) => ((s.steps || [])[0] || [])[0];
  const seqOf = (s) => (s.steps || []).map((x) => x[0]);
  const ORDER8 = {
    'delete-first': (s) => ((s.steps || [])[0] || [])[1] === 'delete',
    'coda-first': (s) => firstRule(s) === 'coda',
    'aspirate-first': (s) => firstRule(s) === 'aspirate',
    'insert-then-nasal': (s) => { const q = seqOf(s), i = q.indexOf('n-insert'); return i >= 0 && q.indexOf('nasal', i + 1) > i; },
  };
  const NEEDS = {
    3: [['palatal']], 4: [['tense'], ['tense-stem'], ['tense-sino', 'tense-adn', 'tense-cmp']], 5: [['simplify'], ['h-drop']],
    6: [['n-insert']], 7: [['aspirate']],
  };
  // 지침이 아직 없다(GUIDES에 3~8장 없음) — 연구 자료의 지침 초안 예시를 뺀 원고 풀로도 뽑혀야 한다(지침 2~3개 × 예시 최대 4)
  const DRAFT_EX = {
    3: ['굳이', '밭이', '해돋이', '같이', '곧이', '곧이어', '잔디', '벼훑이', '곁에서'],
    4: ['국밥', '곱돌', '꽃다발', '국수', '신고', '삼고', '안기다', '감기다', '갈등', '할 것을', '문고리', '볶음밥'],
    5: ['넋', '여덟', '닭', '삶', '밟다', '맑게', '맑다', '낳은', '쌓이다', '않은', '닳아'],
    6: ['솜이불', '담요', '맨입', '송별연', '솔잎', '물약', '한 일', '할 일', '콧날', '뱃머리', '깻잎', '나뭇잎'],
    // 7장 함정은 셋뿐(놓아·많아·넓히고) — 함정 2개를 뽑으려면 지침 예시로는 하나까지만 쓸 수 있다
    7: ['놓고', '좋던', '쌓지', '많고', '각하', '맏형', '좁히다', '숱하다', '놓아'],
    8: [],
  };
  const ok3to7 = (ch, out, ex) => {
    const ss = out.map((id) => byId[id]);
    const traps = ss.filter((s) => s.trap), kinds = ss.filter((s) => !s.trap).map((s) => R.kindOf(s));
    const trapKinds = new Set(chIds(ch).filter((s) => s.trap && !ex.includes(s.id)).map((s) => s.trap));
    return out.length === 7 && new Set(out).size === 7 && ss.every((s) => s && s.ch === ch && !ex.includes(s.id)) && traps.length === 2 &&
      (trapKinds.size < 2 || traps[0].trap !== traps[1].trap) && NEEDS[ch].every((k) => kinds.some((x) => k.includes(x)));
  };
  const ok8 = (out) => {
    const ss = out.map((id) => byId[id]);
    const hasExc = SC.some((s) => s.ch === 8 && s.trap === 'exception');
    return out.length === 7 && new Set(out).size === 7 && ss.every((s) => s && s.ch === 8) &&
      ss.filter((s) => s.trap === 'exception').length === (hasExc ? 1 : 0) && ss.every((s) => !s.trap || s.trap === 'exception') &&
      Object.values(ORDER8).every((f) => ss.some((s) => !s.trap && f(s)));
  };
  for (let ch = 3; ch <= 8; ch++) {
    if (!chIds(ch).length) { check(false, `${ch}장 원고가 있음`); continue; }
    let bad = 0, badEx = 0, err = '';
    const sameSeed = J(R.draw(ch, SC, [], 5)) === J(R.draw(ch, SC, [], 5));
    check(sameSeed, `${ch}장 같은 시드 → 같은 뽑기`);
    const firsts = new Set();
    for (let sd = 0; sd < 200; sd++) {
      try {
        const a = R.draw(ch, SC, [], sd);
        firsts.add(a[0]);
        if (!(ch === 8 ? ok8(a) : ok3to7(ch, a, []))) bad++;
      } catch (e) { bad++; err = err || e.message; }
      try {
        const ex = DRAFT_EX[ch];
        const b = R.draw(ch, SC, ex, sd);
        if (!(ch === 8 ? ok8(b) : ok3to7(ch, b, ex))) badEx++;
      } catch (e) { badEx++; err = err || e.message; }
    }
    check(bad === 0, `${ch}장 시드 200개 모두 조건을 지킴 (어긋남 ${bad}) ${err}`);
    check(badEx === 0, `${ch}장 지침 초안 예시를 빼도 시드 200개 모두 뽑힘 (어긋남 ${badEx}) ${err}`);
    check(firsts.size >= 4, `${ch}장 차례가 무작위`);
    // 여유: 예시를 뺀 뒤 남는 일반 원고(갈래별)와 함정(종류별)
    const left = chIds(ch).filter((s) => !DRAFT_EX[ch].includes(s.id));
    const tally2 = (list, f) => list.reduce((o, s) => { const k = f(s); o[k] = (o[k] || 0) + 1; return o; }, {});
    console.log(`  ${ch}장 원고 ${chIds(ch).length}개(일반 ${chIds(ch).filter((s) => !s.trap).length}·함정 ${chIds(ch).filter((s) => s.trap).length}) · 초안 예시 ${DRAFT_EX[ch].length}개를 빼면 일반 ${J(tally2(left.filter((s) => !s.trap), R.kindOf))} 함정 ${J(tally2(left.filter((s) => s.trap), (s) => s.trap))}`);
  }
  // 조건을 채울 수 없으면 오류
  const trapIds = (ch) => chIds(ch).filter((s) => s.trap).map((s) => s.id);
  check(throws(() => R.draw(3, SC, trapIds(3).slice(1), 1)), '3장 함정이 1개뿐이면 오류');
  check(throws(() => R.draw(7, SC, ['놓아', '많아'], 1)), '7장 함정 둘을 지침 예시로 쓰면 오류(함정이 1개만 남음)');
  check(throws(() => R.draw(5, SC, chIds(5).filter((s) => R.kindOf(s) === 'h-drop').map((s) => s.id), 1)), '5장 ㅎ 탈락 원고가 없으면 오류');
  check(throws(() => R.draw(8, SC, chIds(8).filter((s) => ORDER8['insert-then-nasal'](s)).map((s) => s.id), 1)), '8장 첨가 ▸ 비음화 원고가 없으면 오류');
  check(!throws(() => R.draw(8, SC, trapIds(8), 1)) && R.draw(8, SC, trapIds(8), 1).every((id) => !byId[id].trap), '8장 예외 함정이 없으면 일반 7개');
  check(J(SC) === poolJ, '3~8장 뽑기가 원고 풀을 바꾸지 않음');
}

// 9-11 쌍둥이(새 장)
if (has3(['굳히다', '닫히다', '피어', '놓아', '많아'])) {
  check(R.twins(byId['굳히다'], SC, []).includes('닫히다'), '굳히다: 쌍둥이에 닫히다(합침 ▸ 구개음화)');
  check(R.twins(byId['피어'], SC, []).length > 0 && R.twins(byId['피어'], SC, []).every((id) => byId[id].steps.length === 0 && !byId[id].trap), '피어: 쌍둥이는 다른 제22항 원고');
  eq(R.twin(byId['놓아'], SC, []), '많아', '놓아: 쌍둥이는 많아(contrast)');
}

// 9-12 공개 조항 차례: 다만·하위 번호는 그 조항 바로 뒤(번호 순)
eq(R.revealArticles([{ articles: ['12-4', '10-다만', '12'] }], [{ articles: ['10', '12-1', '29-다만', '29', '11-다만', '11', '12-3'] }]),
  ['10', '10-다만', '11', '11-다만', '12', '12-1', '12-3', '12-4', '29', '29-다만'], '공개 조항: 10 < 10-다만 < 11 … 12 < 12-1 < 12-3 < 12-4');

// 9-12b 음절이 지워지면 낱말 표시도 새 번호로(경계 표시·음절 표시 모두, 사라진 자리의 표시는 버림)
if (has3(['생산량', '껴안다', '만날 사람', '할 것을'])) {
  const wipe = (id, s, slots) => slots.reduce((st, sl) => R.apply(st, { op: 'delete', at: s + '.' + sl }), R.start(byId[id]));
  const sa = wipe('생산량', 0, ['co', 'nu', 'on']);
  check(sa.syl.length === 2 && J(sa.cuts) === '["sino"]' && J(sa.marks.lateralExc) === '[0]', `생산량 첫 음절을 지우면 다만 표시도 경계 0으로 (${J(sa.cuts)} ${J(sa.marks)})`);
  eq(R.similarCell(sa, '1.on'), 'ㄴ', '생산량 첫 음절을 지운 뒤 /ㄹ/: 여전히 다만(/ㄴ/ 칸)');
  check(R.applicable(sa).some((c) => c.rule === 'r-nasal-exc') && !R.applicable(sa).some((c) => c.rule === 'lateral'), '생산량 첫 음절을 지운 뒤: 유음화가 아니라 다만');
  const ka = wipe('껴안다', 0, ['nu', 'gl', 'on']);
  check(J(ka.marks.stem) === '[0]' && R.applicable(ka).some((c) => c.rule === 'tense-stem'), `껴안다 첫 음절을 지우면 어간 표시도 경계 0으로 (${J(ka.marks)})`);
  const ms = wipe('만날 사람', 0, ['co', 'nu', 'on']);
  check(J(ms.marks.adn) === '[0]' && R.applicable(ms).some((c) => c.rule === 'tense-adn'), `만날 사람 첫 음절을 지우면 관형사형 표시도 음절 0으로 (${J(ms.marks)})`);
  const hg = wipe('할 것을', 0, ['co', 'nu', 'on']);
  check(J(hg.marks.adn) === '[]' && !R.applicable(hg).some((c) => c.rule === 'tense-adn'), `할 것을 표시된 음절을 지우면 표시도 사라짐 (${J(hg.marks)})`);
  const mid = wipe('생산량', 1, ['co', 'nu', 'on']);
  check(J(mid.marks.lateralExc) === '[0]' && J(mid.cuts) === '["sino"]', `생산량 가운데 음절을 지우면 남긴 경계(sino) 쪽 표시만 남음 (${J(mid.cuts)} ${J(mid.marks)})`);
  check(J(R.start(byId['생산량']).marks.lateralExc) === '[1]', '원고 처음 상태는 그대로');
}

// 9-13 모르는 낱말 표시는 오류, 표시 자리 검사
check(throws(() => R.start(script('신고', { cuts: ['formal'], marks: { stem: [3] } }))), '표시 자리가 경계 밖이면 오류');
check(throws(() => R.start(script('신고', { cuts: ['formal'], marks: { what: [0] } }))), '모르는 낱말 표시는 오류');

done('규칙 점검');
