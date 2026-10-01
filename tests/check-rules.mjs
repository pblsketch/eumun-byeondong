// 규칙 점검(브라우저 없이) — 원고 데이터와 규칙 엔진이 서로를 검증한다(기획안 7절).
//   node tests/check-rules.mjs
// 1 음운 데이터 · 2 한글 나누기/합치기 · 3 원고 데이터 모양 · 4 원고마다 엔진 대조(도출 발음 = 표준 발음, 풀이 과정이 규칙 안,
// 음운 수·변동 횟수, 모든 규칙 순서가 같은 발음에 닿음, 송출 신호) · 5 함정과 규칙 밖 교정 · 6 막지 않는 오답과 입력 보존
// · 7 판 진행 함수(원고 갈래·뽑기·쌍둥이·지침 채점과 예시 검증(가짜 지침)·공개 조항·연음 자리·닮은 칸·원고 결과·장 합계)
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
  // 형태소 분석과 형태소 경계가 맞음
  const syl = Array.from(s.text.replace(/ /g, ''));
  check(s.morphs.replace(/[-+ ]/g, '') === syl.join(''), `${n} 형태소 분석의 음절 = 표기`);
  const gaps = new Set();
  let i = -1;
  for (const ch of s.morphs) { if (ch === '+' || ch === ' ') gaps.add(i); else if (ch !== '-') i++; }
  eq(s.cuts.map((c, k) => (c !== null ? k : -1)).filter((k) => k >= 0), [...gaps].sort((a, b) => a - b), `${n} 형태소 분석의 경계 = cuts 자리`);
  (s.nonstandard || []).forEach(([p]) => check(R.strip(p) !== R.strip(s.pron), `${n} 비표준 발음 ${p}은 표준 발음과 다름`));
  if (s.trap === 'link' || s.trap === 'nonstandard') check(s.steps.length === 0, `${n} ${s.trap} 함정은 교정 0회`);
  if (s.trap === 'nonstandard') check((s.nonstandard || []).length > 0, `${n} 비표준 함정에 비표준 발음이 있음`);
  if (s.trap === 'exception') check(((s.marks || {}).lateralExc || []).length > 0, `${n} 예외 함정에 예외 표시가 있음`);
  // 한자어 구성 경계 'sino'는 제20항 다만 낱말의 예외 자리에만(결정 0007)
  const exc = (s.marks || {}).lateralExc || [];
  s.cuts.forEach((c, k) => { if (c === 'sino') check(exc.includes(k), `${n} sino 경계는 예외 표시 자리에만`); });
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
  check(throws(() => R.draw(3, SC, [], 1)), '뽑기 조건이 없는 장은 오류');
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
}

// 7-5 지침 채점·예시 검증(가짜 지침 — 실제 지침 데이터 검증은 T3)
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

done('규칙 점검');
