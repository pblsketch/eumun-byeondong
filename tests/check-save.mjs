// 저장 점검(브라우저 없이) — 명세 §11(§5·§8-3·§8-4·§8-5·§10), 저장 형식은 docs/contracts.md · js/core/save.js 머리 주석.
//   node tests/check-save.mjs
// 출처: 「음운 해전」 pblsketch/sori-haejeon tests/check-save.mjs의 방식(흉내 낸 저장소, console.error 모으기)을 가져와
//   이 게임의 저장 값(설정 · 마지막 선택 · 게임 방법 연 적 · 진행 중인 장)으로 바꿨다.
// 확인하는 것: 설정 기본값과 적용, 마지막 선택(학년 · 장마다 단계), 진행 장 저장 → 복원이 같음,
//   망가진 JSON · 다른 형식 버전 · 없는 원고 id · 지침이 바뀜 · 모양이 틀림 · 데이터 지문이 다름 → 조용히 버림,
//   지금 원고의 마지막 송출 모습(last) · 연 도움 단계(open) 정리,
//   지침 데이터(GUIDES)가 없어도 예외 없음, 진행 장 지우기, 저장소가 막혀도 예외 없이 메모리로 돎(console.error 0).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { loadScripts, check, done, ROOT } from './lib/load.mjs';

const BASE_FILES = ['js/core/util.js', 'js/data/sounds.js', 'js/data/scripts.js', 'js/core/hangul.js', 'js/core/rules.js'];
const SAVE_FILE = 'js/core/save.js';
const PREFIX = 'eumun-byeondong:';
const J = (x) => JSON.stringify(x);
// 키 차례와 상관없이 비교(배열 차례는 그대로 본다)
const canon = (x) => Array.isArray(x) ? '[' + x.map(canon).join(',') + ']'
  : x && typeof x === 'object' ? '{' + Object.keys(x).sort().map((k) => J(k) + ':' + canon(x[k])).join(',') + '}' : J(x);
const eq = (a, b, msg) => check(canon(a) === canon(b), `${msg}: ${J(a)} ≠ ${J(b)}`);
const copy = (x) => JSON.parse(J(x));

// ── 흉내 낸 저장소 ───────────────────────────────────────────
function makeStorage(opts = {}) {
  const m = new Map();
  const fail = (op) => {
    if (opts.throwAll || (opts.throwOn && opts.throwOn.includes(op))) {
      const e = new Error('SecurityError(흉내)'); e.name = 'SecurityError'; throw e;
    }
  };
  return {
    _m: m,
    getItem(k) { fail('get'); return m.has(String(k)) ? m.get(String(k)) : null; },
    setItem(k, v) { fail('set'); m.set(String(k), String(v)); },
    removeItem(k) { fail('remove'); m.delete(String(k)); },
    clear() { fail('clear'); m.clear(); },
    key(i) { fail('key'); return [...m.keys()][i] ?? null; },
    get length() { return m.size; },
  };
}

// ── 점검 안의 작은 가짜 지침(docs/contracts.md 지침 모양 가운데 저장이 쓰는 id · examples, 데이터 지문이 담는 blanks 하나) ──
const FAKE_GUIDES = {
  1: [
    { id: 'c1-coda', examples: [{ id: '옷' }, { id: '꽃' }, { id: '밖' }] },
    { id: 'c1-link', examples: [{ id: '옷이' }, { id: '닭이' }] },
  ],
  2: [
    { id: 'c2-nasal', text: { m3: '받침 {b1}', h1: '받침 {b1}' }, blanks: { b1: { options: ['/ㄱ/', '/ㅇ/'], answer: 1, members: ['coda:ㄱ'] } },
      examples: [{ id: '국물', shows: { b1: 'coda:ㄱ' } }, { id: '닫는' }, { id: '잡는' }] },
    { id: 'c2-rnasal', examples: [{ id: '담력' }, { id: '막론' }] },
    { id: 'c2-lateral', examples: [{ id: '난로' }, { id: '의견란', trap: 'exception' }] },
  ],
};

// ── 게임 불러오기(console.error를 모은다) ─────────────────────
// how: 'normal'(localStorage = storage) | 'getter-throws'(localStorage에 닿기만 해도 오류)
// files: 바탕 스크립트(기본 BASE_FILES). guides: window.GUIDES로 넣을 값(없으면 넣지 않음)
const allErrors = [];
function boot(storage, { how = 'normal', audio = true, doc = true, files = BASE_FILES, guides = null } = {}) {
  const errors = [];
  const cons = { ...console, error: (...a) => { const t = a.map(String).join(' '); errors.push(t); allErrors.push(t); }, warn: () => {}, log: console.log };
  const cls = new Set();
  const classList = {
    add: (c) => cls.add(c), remove: (c) => cls.delete(c), contains: (c) => cls.has(c),
    toggle: (c, on) => { const v = on === undefined ? !cls.has(c) : !!on; if (v) cls.add(c); else cls.delete(c); return v; },
  };
  const extra = { console: cons };
  if (doc) extra.document = { documentElement: { classList } };
  if (how === 'normal') extra.localStorage = storage;
  let ctx;
  try {
    ctx = loadScripts(files, extra);
  } catch (e) {
    check(false, '바탕 스크립트 불러오기 실패: ' + e.message);
    done('저장 점검');
  }
  if (guides) ctx.GUIDES = copy(guides);
  if (how === 'getter-throws') vm.runInContext("Object.defineProperty(window, 'localStorage', { get() { throw new Error('SecurityError(흉내 getter)'); }, configurable: true });", ctx);
  const calls = [];
  if (audio) { ctx.G = ctx.G || {}; ctx.G.audio = { configure: (o) => { calls.push(copy(o)); return o; } }; }
  let loadErr = null;
  try {
    vm.runInContext(fs.readFileSync(path.join(ROOT, SAVE_FILE), 'utf8'), ctx, { filename: SAVE_FILE });
  } catch (e) { loadErr = e; }
  return { ctx, S: ctx.G && ctx.G.save, errors, cls, calls, loadErr };
}

// 첫 불러오기: save.js가 없거나 G.save가 없으면 여기서 멈춘다(RED)
const NEED = ['fingerprint', 'getSettings', 'setSettings', 'applySettings', 'getSelection', 'setSelection', 'levelOf',
  'seenHowto', 'setSeenHowto', 'saveChapter', 'loadChapter', 'hasChapter', 'chapterInfo', 'clearChapter'];
{
  let b;
  try { b = boot(makeStorage()); } catch (e) { b = { loadErr: e }; }
  if (!fs.existsSync(path.join(ROOT, SAVE_FILE)) || b.loadErr || !b.S) {
    check(false, 'js/core/save.js를 불러오지 못함 또는 G.save 없음: ' + (b.loadErr ? b.loadErr.message : 'G.save undefined'));
    done('저장 점검');
  }
  for (const n of NEED) check(typeof b.S[n] === 'function', 'G.save.' + n + ' 함수');
  check(b.S.PREFIX === PREFIX, '접두사 ' + PREFIX + ': ' + b.S.PREFIX);
  check(b.S.SCHEMA === 2, '저장 형식 버전 SCHEMA 2(cur.open · last 모습 · fp를 더함): ' + b.S.SCHEMA);
  check(!('storageOk' in b.S), '쓰지 않는 storageOk(다섯째 저장 이름 probe를 씀)는 없앰');
}

// ── 진행 장 예시 ─────────────────────────────────────────────
// 2장 원고 7개(가짜 지침의 예시가 아닌 것). 끝난 원고 3개 + 지금 원고(4번째 '먹는')에 교정 1개.
const C_MEOK = { op: 'replace', at: { s: 0, slot: 'co', k: 0 }, to: 'ㅇ' };
// 실제 모양: done은 ids 차례대로. 4번째 원고를 감수 중
function sampleRun() {
  return {
    grade: 'h1', ch: 2, level: 'advanced', seed: 12345,
    ids: ['협력', '감기', '생산량', '먹는', '물난리', '놓는', '백리'],
    phase: 'review', guideDone: true,
    done: [
      { id: '협력', result: 'onair', sends: 2, help: [1, 3], helped: true },
      { id: '감기', result: 'skip', sends: 0, help: [], helped: false },
      { id: '생산량', result: 'offrule', sends: 1, help: [2], helped: true },
    ],
    cur: {
      corrections: [copy(C_MEOK), { op: 'delete', at: { s: 1, slot: 'on', k: 0 } }],
      kinds: ['diff', 'onair'], sends: 2,
      help: [1], helped: true, open: 2,
      last: { kind: 'onair', at: [], diff: 0, reading: '멍는', outOfRule: [], n: 2 },
    },
  };
}
// 저장 · 복원된 진행 장 = 받은 값 + 그 장 지침 id + 지금 데이터의 지문(fp)
const GIDS = { 1: ['c1-coda', 'c1-link'], 2: ['c2-nasal', 'c2-rnasal', 'c2-lateral'] };
const stored = (S, run, guides = GIDS[run.ch]) => ({ ...run, guides, fp: S.fingerprint(run.ch, run.ids) });

// ───────────────────────── 1. 설정(spec §5-6 · §11) ─────────────────────────
const DEF_SETTINGS = { bgmOn: true, bgmVolume: 0.6, sfxOn: true, sfxVolume: 0.8, reduceMotion: false };
{
  const st = makeStorage();
  const b = boot(st);
  eq(b.S.getSettings(), DEF_SETTINGS, '설정 기본값');
  b.S.setSettings({ bgmVolume: 0.3, reduceMotion: true });
  eq(b.S.getSettings(), { ...DEF_SETTINGS, bgmVolume: 0.3, reduceMotion: true }, '설정 바꾸기(준 것만)');
  eq(boot(st).S.getSettings(), { ...DEF_SETTINGS, bgmVolume: 0.3, reduceMotion: true }, '설정이 다시 열어도 남음');
  const raw = JSON.parse(st.getItem(PREFIX + 'settings'));
  check(raw && raw.s === b.S.SCHEMA, '설정 값은 { s: SCHEMA, … } JSON');
  b.S.setSettings({ sfxVolume: 5, bgmVolume: 'x', bgmOn: 'yes', sfxOn: false });
  const s2 = b.S.getSettings();
  check(s2.sfxVolume === 1, '음량 1보다 크면 1로: ' + s2.sfxVolume);
  check(s2.bgmVolume === 0.3, '숫자가 아닌 음량은 무시: ' + s2.bgmVolume);
  check(s2.bgmOn === true, '참/거짓이 아닌 켜기 값은 무시');
  check(s2.sfxOn === false, '효과음 끄기 저장');
  b.S.setSettings({ bgmVolume: -2 });
  check(b.S.getSettings().bgmVolume === 0, '음량 0보다 작으면 0으로');
  st.setItem(PREFIX + 'settings', '{망가짐');
  eq(boot(st).S.getSettings(), DEF_SETTINGS, '망가진 설정 값 → 기본값');
  st.setItem(PREFIX + 'settings', J({ s: 999, bgmOn: false }));
  eq(boot(st).S.getSettings(), DEF_SETTINGS, '다른 형식 버전의 설정 → 기본값');
  const b3 = boot(makeStorage());
  const tmp = b3.S.getSettings(); tmp.bgmOn = false;
  check(b3.S.getSettings().bgmOn === true, 'getSettings는 복사본을 돌려준다');
}

// ───────────────────────── 2. 설정 적용(소리 장치 · 움직임 줄이기) ─────────────────────────
{
  const b = boot(makeStorage());
  b.S.applySettings();
  eq(b.calls[b.calls.length - 1], { bgmOn: true, bgmVolume: 0.6, sfxOn: true, sfxVolume: 0.8 }, 'applySettings → G.audio.configure(소리 설정 네 값)');
  check(!b.cls.has('reduce-motion'), '움직임 줄이기 꺼짐 → reduce-motion 클래스 없음');
  b.S.setSettings({ reduceMotion: true, sfxOn: false });
  check(b.cls.has('reduce-motion'), 'setSettings가 바로 적용: reduce-motion 클래스 붙음');
  check(b.calls[b.calls.length - 1].sfxOn === false, 'setSettings가 바로 적용: 소리 장치에 효과음 끔');
  // 소리 장치 · 문서가 없어도 예외 없음
  const b2 = boot(makeStorage(), { audio: false, doc: false });
  let ok = true;
  try { b2.S.applySettings(); b2.S.setSettings({ reduceMotion: true }); } catch (e) { ok = false; }
  check(ok, '소리 장치 · 문서가 없어도 설정 적용에 예외 없음');
  // 소리 장치가 예외를 던져도 조용히
  const b3 = boot(makeStorage());
  b3.ctx.G.audio = { configure() { throw new Error('소리 장치 고장(흉내)'); } };
  ok = true;
  try { b3.S.setSettings({ bgmOn: false }); } catch (e) { ok = false; }
  check(ok && b3.S.getSettings().bgmOn === false, '소리 장치가 예외를 던져도 설정은 저장되고 예외 없음');
}

// ───────────────────────── 3. 마지막 선택(학년 · 장마다 단계, spec §5) ─────────────────────────
{
  const st = makeStorage();
  const b = boot(st);
  const sel = b.S.getSelection();
  check(sel.grade === 'm3', '학년 기본값 m3: ' + sel.grade);
  check(b.S.levelOf(1) === 'basic' && b.S.levelOf(2) === 'basic', '단계 기본값 basic');
  b.S.setSelection({ grade: 'h1' });
  b.S.setSelection({ levels: { 2: 'advanced' } });
  const b2 = boot(st);
  check(b2.S.getSelection().grade === 'h1', '학년 선택이 다시 열어도 남음');
  check(b2.S.levelOf(2) === 'advanced', '2장 단계 선택이 남음');
  check(b2.S.levelOf(1) === 'basic', '다른 장(1장) 단계는 그대로(장마다 따로 기억)');
  b2.S.setSelection({ grade: 'h3', levels: { 1: 'hard', 2: 'basic' } });
  check(b2.S.getSelection().grade === 'h1', '모르는 학년은 무시');
  check(b2.S.levelOf(1) === 'basic', '모르는 단계는 무시');
  check(b2.S.levelOf(2) === 'basic', '올바른 단계는 반영');
  check(b2.S.levelOf(99) === 'basic', '없는 장의 단계 → basic');
  st.setItem(PREFIX + 'selection', '[[망가짐');
  check(boot(st).S.getSelection().grade === 'm3', '망가진 선택 값 → 기본값');
  const t = b2.S.getSelection(); t.grade = 'm3'; t.levels[2] = 'advanced';
  check(b2.S.getSelection().grade === 'h1' && b2.S.levelOf(2) === 'basic', 'getSelection은 복사본을 돌려준다');
}

// ───────────────────────── 4. 게임 방법을 연 적(spec §5-5) ─────────────────────────
{
  const st = makeStorage();
  const b = boot(st);
  check(b.S.seenHowto() === false, '처음 기기: 게임 방법 연 적 없음');
  b.S.setSeenHowto();
  check(boot(st).S.seenHowto() === true, '한 번 열면 기억(다시 열어도)');
  b.S.setSeenHowto(false);
  check(boot(st).S.seenHowto() === false, 'setSeenHowto(false)로 지움');
}

// ───────────────────────── 5. 진행 장 저장 → 복원(spec §11) ─────────────────────────
{
  const st = makeStorage();
  const b = boot(st, { guides: FAKE_GUIDES });
  check(b.S.loadChapter() === null && b.S.hasChapter() === false && b.S.chapterInfo() === null, '처음엔 진행 장 없음');
  const run = sampleRun();
  const before = J(run);
  check(b.S.saveChapter(run) === true, 'saveChapter → true');
  check(J(run) === before, 'saveChapter는 받은 값을 바꾸지 않는다');
  const raw = JSON.parse(st.getItem(PREFIX + 'chapter'));
  check(raw && raw.s === b.S.SCHEMA && raw.run, '진행 장은 접두사 + chapter 이름에 { s, run } JSON');
  eq(raw.run.guides, ['c2-nasal', 'c2-rnasal', 'c2-lateral'], '저장할 때 그 장의 지침 id를 함께 적는다');
  const b2 = boot(st, { guides: FAKE_GUIDES });
  const got = b2.S.loadChapter();
  const want = stored(b2.S, sampleRun());
  check(typeof raw.run.fp === 'string' && /^[0-9a-f]{8}$/.test(raw.run.fp), '저장할 때 데이터 지문(8자리 16진)을 함께 적는다: ' + raw.run.fp);
  eq(got, want, '저장 → 다시 열어 복원이 같음(지금 원고의 교정 · 송출 · 도움 · 연 도움 단계 · 마지막 송출 모습까지)');
  check(b2.S.hasChapter() === true, 'hasChapter → true');
  eq(b2.S.chapterInfo(), { grade: 'h1', ch: 2, level: 'advanced', phase: 'review', no: 4, total: 7 }, 'chapterInfo(시작 화면의 이어 하기 표시)');
  got.cur.corrections.push({ op: 'delete', at: { s: 0, slot: 'co', k: 0 } }); got.done[0].sends = 99;
  eq(b2.S.loadChapter(), want, 'loadChapter는 복사본을 돌려준다');

  // 지침 단계(아직 원고 감수 전)와 조항 공개 단계
  const g = { grade: 'm3', ch: 1, level: 'basic', seed: 7, ids: ['낮', '부엌', '꽃을', '앞', '깎아', '겉옷', '젖'], phase: 'guide', guideDone: false, done: [], cur: null };
  check(b2.S.saveChapter(g) === true, '지침 단계 저장');
  eq(boot(st, { guides: FAKE_GUIDES }).S.loadChapter(), stored(b2.S, g), '지침 단계 복원(새 장이 옛 진행 장을 덮음 — 기기에 하나)');
  eq(boot(st, { guides: FAKE_GUIDES }).S.chapterInfo(), { grade: 'm3', ch: 1, level: 'basic', phase: 'guide', no: 0, total: 7 }, '지침 단계 chapterInfo(no 0)');
  // 몸풀기(WARMUP — 1장 처음 두 원고, 결정 0021): 지침 전 감수 단계 · 몸풀기를 마친 지침 단계는 맞는 값, 넘치면 버림
  {
    const ids1 = ['낮', '부엌', '꽃을', '앞', '깎아', '겉옷', '젖'];
    const doneOf = (n) => ids1.slice(0, n).map((id) => ({ id, result: 'onair', sends: 1, help: [], helped: false }));
    check(b2.S.WARMUP && b2.S.WARMUP[1] === 2 && !b2.S.WARMUP[2], '몸풀기는 1장 원고 2개');
    const w0 = { grade: 'm3', ch: 1, level: 'basic', seed: 7, ids: ids1, phase: 'review', guideDone: false, done: [], cur: null };
    check(b2.S.saveChapter(w0) === true && !!boot(st, { guides: FAKE_GUIDES }).S.loadChapter(), '몸풀기 첫 원고(지침 전 감수) 저장 · 복원');
    check(b2.S.saveChapter({ ...w0, done: doneOf(1) }) === true, '몸풀기 둘째 원고 저장');
    check(b2.S.saveChapter({ ...w0, done: doneOf(2) }) === false, '몸풀기가 끝났는데 지침 전 감수 단계면 버림');
    check(b2.S.saveChapter({ ...w0, phase: 'guide', done: doneOf(2) }) === true, '몸풀기를 마친 지침 단계 저장');
    check(b2.S.saveChapter({ ...w0, phase: 'guide', done: doneOf(1) }) === false, '몸풀기 중간의 지침 단계는 버림');
    check(b2.S.saveChapter({ ...w0, guideDone: true, done: doneOf(2) }) === true, '지침을 채운 뒤 셋째 원고 저장');
  }
  const rv = {
    grade: 'h1', ch: 1, level: 'basic', ids: ['낮', '부엌', '꽃을', '앞', '깎아', '겉옷', '젖'], phase: 'reveal', guideDone: true,
    done: ['낮', '부엌', '꽃을', '앞', '깎아', '겉옷', '젖'].map((id, i) => ({ id, result: i % 3 === 0 ? 'onair' : i % 3 === 1 ? 'offrule' : 'skip', sends: i % 3 === 2 ? 0 : 1, help: [], helped: false })),
    cur: null,
  };
  check(b2.S.saveChapter(rv) === true, '조항 공개 단계 저장(원고 7개 끝)');
  eq(boot(st, { guides: FAKE_GUIDES }).S.loadChapter(), stored(b2.S, { ...rv, seed: null }), '조항 공개 단계 복원(시드 없으면 null)');

  // 감수 단계로 막 넘어온 장: 지금 원고 기록이 없으면 빈 기록으로
  const fresh = { grade: 'm3', ch: 2, level: 'basic', seed: 1, ids: sampleRun().ids, phase: 'review', guideDone: true, done: [], cur: null };
  check(b2.S.saveChapter(fresh) === true, '감수 첫 원고(지금 원고 기록 없음) 저장');
  eq(boot(st, { guides: FAKE_GUIDES }).S.loadChapter().cur, { corrections: [], kinds: [], sends: 0, help: [], helped: false, open: 0, last: null }, '지금 원고 기록이 없으면 빈 기록');
  // 도움 단계 정리: 겹침 제거·차례 정렬, helped와 sends는 다시 계산
  const messy = sampleRun();
  messy.done[0].help = [3, 1, 3]; messy.done[0].helped = false;
  messy.cur.help = [2, 1, 2]; messy.cur.helped = false;
  check(b2.S.saveChapter(messy) === true, '도움 단계가 어지러운 값도 저장');
  const mg = boot(st, { guides: FAKE_GUIDES }).S.loadChapter();
  eq([mg.done[0].help, mg.done[0].helped, mg.cur.help, mg.cur.helped], [[1, 3], true, [1, 2], true], '도움 단계 정리(겹침 제거 · 차례 정렬) · helped 다시 계산');

  // 연 도움 단계(open): '먼저 송출해 보세요'였던 ①만 열었어도 남는다(도움으로는 세지 않음) · 센 도움보다 낮으면 올림
  const op = sampleRun(); op.cur.help = []; op.cur.helped = false; op.cur.open = 1;
  check(b2.S.saveChapter(op) === true, '센 도움 없이 ①만 연 기록 저장');
  const og = boot(st, { guides: FAKE_GUIDES }).S.loadChapter().cur;
  eq([og.open, og.help, og.helped], [1, [], false], '①만 열었으면 open 1 · 도움 없음(helped false)이 그대로 복원');
  const op2 = sampleRun(); op2.cur.help = [1, 3]; op2.cur.open = 1;
  b2.S.saveChapter(op2);
  check(boot(st, { guides: FAKE_GUIDES }).S.loadChapter().cur.open === 3, 'open이 센 도움(③)보다 낮으면 3으로 올림');
  const op3 = sampleRun(); delete op3.cur.open; op3.cur.help = [];
  b2.S.saveChapter(op3);
  check(boot(st, { guides: FAKE_GUIDES }).S.loadChapter().cur.open === 0, 'open이 없으면 0');

  // 마지막 송출 모습(last): 교정 수가 그대로면 규칙 밖 번호까지, 송출 뒤 교정이 바뀌었으면(n이 다르거나 null) n null · 규칙 밖 []
  const ls = sampleRun();
  ls.cur.kinds = ['offrule']; ls.cur.sends = 1;
  ls.cur.last = { kind: 'offrule', at: [], diff: 0, reading: '멍는', outOfRule: [0, 1], n: 2 };
  b2.S.saveChapter(ls);
  eq(boot(st, { guides: FAKE_GUIDES }).S.loadChapter().cur.last, { kind: 'offrule', at: [], diff: 0, reading: '멍는', outOfRule: [0, 1], n: 2 }, '송출한 그대로면 last 모습이 그대로 복원');
  ls.cur.last.n = 3;
  b2.S.saveChapter(ls);
  eq(boot(st, { guides: FAKE_GUIDES }).S.loadChapter().cur.last, { kind: 'offrule', at: [], diff: 0, reading: '멍는', outOfRule: [], n: null }, '교정 수가 송출 때와 다르면 n null · 규칙 밖 표시 없음(프롬프터 발음 · 신호는 남음)');
  ls.cur.last.n = null; ls.cur.last.outOfRule = [1];
  b2.S.saveChapter(ls);
  eq(boot(st, { guides: FAKE_GUIDES }).S.loadChapter().cur.last, { kind: 'offrule', at: [], diff: 0, reading: '멍는', outOfRule: [], n: null }, 'n null(송출 뒤 교정이 바뀜)이면 규칙 밖 표시 없음');
  const df = sampleRun();
  df.cur.kinds = ['diff']; df.cur.sends = 1;
  df.cur.last = { kind: 'diff', at: [1], diff: 1, reading: '먹는', n: 2 };
  b2.S.saveChapter(df);
  eq(boot(st, { guides: FAKE_GUIDES }).S.loadChapter().cur.last, { kind: 'diff', at: [1], diff: 1, reading: '먹는', outOfRule: [], n: 2 }, '다름 송출의 모습(다른 음절 위치 · 수 · 읽은 발음) 복원, 규칙 밖 없으면 []');
}

// ───────────────────────── 5-2. 데이터 지문(spec §11: 지침 · 원고 데이터가 바뀌면 버림) ─────────────────────────
{
  const st = makeStorage();
  const b = boot(st, { guides: FAKE_GUIDES });
  check(b.S.saveChapter(sampleRun()) === true, '지문 점검용 저장');
  const fp0 = b.S.fingerprint(2, sampleRun().ids);
  check(fp0 === boot(makeStorage(), { guides: FAKE_GUIDES }).S.fingerprint(2, sampleRun().ids), '같은 데이터면 같은 지문(다시 불러와도)');
  check(fp0 !== b.S.fingerprint(2, sampleRun().ids.slice().reverse()), '원고 차례가 다르면 다른 지문');
  // 같은 데이터 → 남음
  check(boot(st, { guides: FAKE_GUIDES }).S.loadChapter() !== null, '데이터가 그대로면 진행 장이 남음');
  // 판정과 상관없는 것(형태소 풀이 · 출처 · 지침 문장)이 바뀌면 → 남음
  {
    const bb = boot(st, { guides: FAKE_GUIDES });
    const sc = bb.ctx.SCRIPTS.find((s) => s.id === '먹는');
    sc.morphs = '바뀐 풀이'; sc.src = ['바뀐 출처'];
    bb.ctx.GUIDES[2][0].text = { m3: '바뀐 문장 {b1}', h1: '바뀐 문장 {b1}' };
    check(bb.S.loadChapter() !== null, '형태소 풀이 · 출처 · 지침 문장만 바뀌면 진행 장이 남음');
  }
  // 뽑힌 원고의 표준 발음이 바뀜 → 버림
  {
    const bb = boot(st, { guides: FAKE_GUIDES });
    bb.ctx.SCRIPTS.find((s) => s.id === '놓는').pron = '논는ː';
    check(bb.S.loadChapter() === null, '뽑힌 원고(놓는)의 표준 발음이 바뀌면 진행 장을 버림');
    check(st.getItem(PREFIX + 'chapter') === null, '지문이 달라 버리면 저장 값도 지움');
  }
  // 지침 빈칸의 정답이 바뀜 → 버림
  {
    b.S.saveChapter(sampleRun());
    const bb = boot(st, { guides: FAKE_GUIDES });
    bb.ctx.GUIDES[2][0].blanks.b1.answer = 0;
    check(bb.S.loadChapter() === null, '그 장 지침 빈칸의 정답이 바뀌면 진행 장을 버림');
  }
  // 지침 예시가 보이는 조건이 바뀜 → 버림
  {
    b.S.saveChapter(sampleRun());
    const bb = boot(st, { guides: FAKE_GUIDES });
    bb.ctx.GUIDES[2][0].examples[0].shows = { b1: 'coda:ㅂ' };
    check(bb.S.loadChapter() === null, '지침 예시(shows)가 바뀌면 진행 장을 버림');
  }
  // 다른 장의 원고 · 지침이 바뀌어도 → 남음
  {
    b.S.saveChapter(sampleRun());
    const bb = boot(st, { guides: FAKE_GUIDES });
    bb.ctx.SCRIPTS.find((s) => s.ch === 1).pron = '바뀜';
    bb.ctx.GUIDES[1][0].examples.push({ id: '앞' });
    check(bb.S.loadChapter() !== null, '다른 장의 원고 · 지침이 바뀌어도 진행 장이 남음');
  }
  // 지문을 손으로 바꾼 값 → 버림
  {
    b.S.saveChapter(sampleRun());
    const o = JSON.parse(st.getItem(PREFIX + 'chapter')); o.run.fp = '00000000';
    st.setItem(PREFIX + 'chapter', J(o));
    check(boot(st, { guides: FAKE_GUIDES }).S.loadChapter() === null, '저장된 지문이 지금 데이터와 다르면 버림');
  }
}

// ───────────────────────── 6. 버리는 경우(spec §11: 조용히, 오류 없이) ─────────────────────────
{
  // 진행 장 이름에 직접 값을 넣고 다시 연다 → null이고 저장 값도 지워진다
  function discarded(value, msg, opts = { guides: FAKE_GUIDES }) {
    const st = makeStorage();
    st.setItem(PREFIX + 'chapter', typeof value === 'string' ? value : J(value));
    const b = boot(st, opts);
    let r, ok = true;
    try { r = b.S.loadChapter(); } catch (e) { ok = false; }
    check(ok && r === null, msg + ' → 버림(null): ' + J(r));
    check(st.getItem(PREFIX + 'chapter') === null, msg + ' → 저장 값도 지움');
    check(b.S.hasChapter() === false && b.S.chapterInfo() === null, msg + ' → 이어 하기 없음');
  }
  const S = boot(makeStorage(), { guides: FAKE_GUIDES }).S;
  const wrap = (run, s = S.SCHEMA) => ({ s, savedAt: 1, run: { ...run, guides: ['c2-nasal', 'c2-rnasal', 'c2-lateral'], fp: S.fingerprint(run.ch, run.ids) } });
  const mod = (f) => { const r = sampleRun(); f(r); return wrap(r); };
  // 먼저 wrap(sampleRun())은 버리지 않음을 확인(아래 사례가 '그 한 곳' 때문에 버려짐을 보장)
  {
    const st = makeStorage(); st.setItem(PREFIX + 'chapter', J(wrap(sampleRun())));
    check(boot(st, { guides: FAKE_GUIDES }).S.loadChapter() !== null, '기준 값(손으로 넣은 올바른 진행 장)은 복원됨');
  }
  discarded('{망가진 JSON', '망가진 JSON');
  discarded('null', 'JSON null');
  discarded('[1,2]', 'JSON 배열');
  discarded(wrap(sampleRun(), S.SCHEMA + 1), '다른 저장 형식 버전');
  discarded({ savedAt: 1, run: sampleRun() }, '형식 버전 없음');
  discarded({ s: S.SCHEMA, savedAt: 1 }, 'run 없음');
  discarded(mod((r) => { r.ids[5] = '없는원고'; }), '지금 원고 데이터에 없는 원고 id');
  discarded(mod((r) => { r.ids[5] = '옷'; }), '다른 장의 원고 id');
  discarded(mod((r) => { r.ids[5] = '백리'; }), '같은 원고 id가 두 번');
  discarded(mod((r) => { r.ids.pop(); }), '원고 수가 7이 아님');
  discarded(mod((r) => { r.ids[6] = '국물'; }), '뽑힌 원고가 지침 예시(지침 데이터가 바뀜)');
  {
    const r = wrap(sampleRun()); r.run.guides = ['c2-nasal', 'c2-lateral'];
    discarded(r, '저장된 지침 id가 지금 지침과 다름');
  }
  {
    const r = wrap(sampleRun()); delete r.run.guides;
    discarded(r, '지침이 있는데 저장된 지침 id가 없음');
  }
  discarded(wrap(sampleRun()), '지금 지침에 그 장이 없음', { guides: { 1: FAKE_GUIDES[1] } });
  discarded(mod((r) => { r.grade = 'h2'; }), '모르는 학년');
  discarded(mod((r) => { r.level = 'hard'; }), '모르는 단계');
  discarded(mod((r) => { r.ch = '2'; }), '장이 숫자가 아님');
  discarded(mod((r) => { r.phase = 'result'; }), '모르는 지금 단계');
  discarded(mod((r) => { r.guideDone = false; }), '감수 단계인데 지침을 안 채움');
  discarded(mod((r) => { r.seed = 'abc'; }), '시드가 숫자 · null이 아님');
  discarded(mod((r) => { r.done[1].id = '협력'; }), '끝난 원고 기록의 id가 뽑힌 차례와 다름');
  discarded(mod((r) => { r.done[1].result = 'diff'; }), '끝난 원고 결과가 온에어 · 규칙 밖 · 넘김이 아님');
  discarded(mod((r) => { r.done[0].sends = 0; }), '온에어인데 송출 0번');
  discarded(mod((r) => { r.done[0].sends = -1; }), '송출 횟수가 음수');
  discarded(mod((r) => { r.done[0].help = [4]; }), '모르는 도움 단계');
  discarded(mod((r) => { r.done = r.ids.map((id) => ({ id, result: 'skip', sends: 0, help: [] })); }), '감수 단계인데 원고 7개가 모두 끝남');
  discarded(mod((r) => { r.phase = 'reveal'; r.cur = null; }), '조항 공개 단계인데 원고가 덜 끝남');
  discarded(mod((r) => { r.phase = 'guide'; r.guideDone = false; r.cur = null; }), '지침 단계인데 끝난 원고가 있음');
  discarded(mod((r) => { r.cur.corrections.push({ op: 'swap', at: { s: 0, slot: 'co', k: 0 } }); }), '모르는 교정 부호');
  discarded(mod((r) => { r.cur.corrections.push({ op: 'replace', at: { s: 0, slot: 'xx', k: 0 }, to: 'ㄴ' }); }), '자리 모양이 틀린 교정');
  discarded(mod((r) => { r.cur.corrections.push({ op: 'merge', at: [{ s: 0, slot: 'co', k: 0 }], to: 'ㄴ' }); }), '합침표 자리가 둘이 아님');
  discarded(mod((r) => { r.cur.corrections.push({ op: 'replace', at: { s: 0, slot: 'co', k: 0 }, to: 'Q' }); }), '모르는 음운으로 고친 교정(엔진이 거부)');
  discarded(mod((r) => { r.cur.corrections = 'x'; }), '교정 목록이 배열이 아님');
  discarded(mod((r) => { r.cur.kinds = ['diff', 'boom']; }), '모르는 신호 종류의 송출 기록');
  discarded(mod((r) => { r.cur.sends = 5; }), '송출 횟수와 송출 기록 수가 다름');
  discarded(mod((r) => { r.cur.last = { kind: 'loud', at: [], reading: '멍는' }; }), '마지막 송출의 신호 종류가 네 가지 밖');
  discarded(mod((r) => { r.cur.last = { kind: 'diff', at: [-1], reading: '먹는' }; }), '다른 음절 위치가 음수');
  discarded(mod((r) => { r.cur.last = null; }), '송출했는데 마지막 송출이 없음');
  discarded(mod((r) => { r.cur.last = { kind: 'diff', at: [0], reading: '먹는' }; }), '마지막 송출 종류가 송출 기록의 끝과 다름');
  discarded(mod((r) => { r.cur = 'x'; }), '지금 원고 기록이 객체가 아님');
  discarded(mod((r) => { r.cur.open = 4; }), '연 도움 단계가 3보다 큼');
  discarded(mod((r) => { r.cur.open = -1; }), '연 도움 단계가 음수');
  discarded(mod((r) => { r.cur.open = '2'; }), '연 도움 단계가 숫자가 아님');
  discarded(mod((r) => { delete r.cur.last.reading; }), '마지막 송출에 읽은 발음이 없음');
  discarded(mod((r) => { r.cur.last.reading = 3; }), '마지막 송출의 읽은 발음이 글이 아님');
  discarded(mod((r) => { r.cur.last.outOfRule = [-1]; }), '규칙 밖 교정 번호가 음수');
  discarded(mod((r) => { r.cur.last.diff = 'x'; }), '다른 음절 수가 숫자가 아님');
  discarded(mod((r) => { r.cur.last.n = 'x'; }), '송출 때 교정 수가 숫자 · null이 아님');
  {
    const r = wrap(sampleRun()); delete r.run.fp;
    discarded(r, '데이터 지문이 없음');
  }
  check(allErrors.length === 0, '버리는 동안 console.error 없음: ' + allErrors.join(' | '));
}

// ───────────────────────── 7. 잘못된 값은 저장하지 않음 · 진행 장 지우기 ─────────────────────────
{
  const st = makeStorage();
  const b = boot(st, { guides: FAKE_GUIDES });
  b.S.saveChapter(sampleRun());
  const keep = st.getItem(PREFIX + 'chapter');
  const bad = sampleRun(); bad.ids[0] = '없는원고';
  let r, ok = true;
  try { r = b.S.saveChapter(bad); } catch (e) { ok = false; }
  check(ok && r === false, '잘못된 진행 장 → saveChapter false(예외 없음)');
  check(st.getItem(PREFIX + 'chapter') === keep, '잘못된 값은 옛 진행 장을 덮지 않음');
  for (const x of [null, undefined, 3, 'x', [], {}]) {
    ok = true;
    try { r = b.S.saveChapter(x); } catch (e) { ok = false; }
    check(ok && r === false, 'saveChapter(' + J(x) + ') → false, 예외 없음');
  }
  // 지우기: 진행 장만. 설정 · 선택 · 게임 방법은 남는다
  b.S.setSettings({ bgmOn: false }); b.S.setSelection({ grade: 'h1' }); b.S.setSeenHowto();
  b.S.clearChapter();
  check(b.S.loadChapter() === null && b.S.hasChapter() === false, 'clearChapter → 진행 장 없음');
  check(st.getItem(PREFIX + 'chapter') === null, 'clearChapter → 저장소에서도 지움');
  const b2 = boot(st, { guides: FAKE_GUIDES });
  check(b2.S.loadChapter() === null, '지운 뒤 다시 열어도 진행 장 없음');
  check(b2.S.getSettings().bgmOn === false && b2.S.getSelection().grade === 'h1' && b2.S.seenHowto() === true, '진행 장을 지워도 설정 · 마지막 선택 · 게임 방법 연 적은 남음');
  // 모든 저장 이름이 접두사로 시작
  check([...st._m.keys()].every((k) => k.startsWith(PREFIX)), '모든 저장 이름이 ' + PREFIX + '로 시작: ' + [...st._m.keys()].join(','));
}

// ───────────────────────── 8. 지침 데이터(GUIDES)가 없을 때 ─────────────────────────
{
  const st = makeStorage();
  const b = boot(st); // GUIDES 없음
  let ok = true, r;
  try { r = b.S.saveChapter(sampleRun()); } catch (e) { ok = false; }
  check(ok && r === true, 'GUIDES가 없어도 저장(예외 없음)');
  const got = boot(st).S.loadChapter();
  eq(got, stored(b.S, sampleRun(), null), 'GUIDES가 없으면 지침 확인을 건너뛰고 복원(guides null)');
  // 국물(가짜 지침의 예시)이 뽑혀 있어도 GUIDES가 없으면 확인하지 않는다
  const r2 = sampleRun(); r2.ids[6] = '국물';
  check(boot(makeStorage()).S.saveChapter(r2) === true, 'GUIDES가 없으면 예시 겹침 확인도 건너뜀');
  // GUIDES 없이 저장한 장을 GUIDES가 생긴 뒤 열면 지침 데이터가 바뀐 것 → 버림
  check(boot(st, { guides: FAKE_GUIDES }).S.loadChapter() === null, 'GUIDES 없이 저장한 장은 GUIDES가 생기면 버림');
  // 모양이 이상한 GUIDES에도 예외 없음
  for (const gd of [{ 2: 'x' }, { 2: [null, 3] }, []]) {
    const st2 = makeStorage();
    ok = true;
    try { const bb = boot(st2, { guides: gd }); bb.S.saveChapter(sampleRun()); bb.S.loadChapter(); } catch (e) { ok = false; }
    check(ok, '모양이 이상한 GUIDES ' + J(gd) + '에도 예외 없음');
  }
}

// ───────────────────────── 8-2. 지침이 없는 장(8장 — GUIDES에 그 장 키가 없음, 결정 0019) ─────────────────────────
{
  const st = makeStorage();
  const b = boot(st, { guides: FAKE_GUIDES });
  const ids8 = b.ctx.G.rules.draw(8, b.ctx.SCRIPTS, [], 3);
  const run8 = { grade: 'h1', ch: 8, level: 'basic', seed: 3, ids: ids8, phase: 'review', guideDone: true, done: [], cur: null };
  check(b.S.saveChapter(copy(run8)) === true, '8장(지침 없음) 감수 단계 저장');
  const got = boot(st, { guides: FAKE_GUIDES }).S.loadChapter();
  check(!!got && got.ch === 8 && got.guides === null && got.phase === 'review' && got.guideDone === true, '8장 진행 장 복원(guides null)');
  eq(boot(st, { guides: FAKE_GUIDES }).S.chapterInfo(), { grade: 'h1', ch: 8, level: 'basic', phase: 'review', no: 1, total: 7 }, '8장 chapterInfo');
  check(boot(makeStorage(), { guides: FAKE_GUIDES }).S.saveChapter({ ...copy(run8), phase: 'guide', guideDone: false }) === false, '지침이 없는 장의 지침 단계는 저장하지 않음');
  // 지침 목록을 적어 둔 8장 진행 장(지침이 있던 때의 값)은 버림
  const st2 = makeStorage();
  const S2 = boot(st2, { guides: FAKE_GUIDES }).S;
  st2.setItem(PREFIX + 'chapter', J({ s: S2.SCHEMA, savedAt: 1, run: { ...copy(run8), guides: ['c8-x'], fp: S2.fingerprint(8, ids8) } }));
  check(boot(st2, { guides: FAKE_GUIDES }).S.loadChapter() === null, '지침이 없는 장인데 지침 목록이 저장돼 있으면 버림');
  // 조항 공개 단계(원고 7개 끝)도 저장 · 복원
  const rv = { ...copy(run8), phase: 'reveal', cur: null, done: ids8.map((id) => ({ id, result: 'onair', sends: 1, help: [] })) };
  const st3 = makeStorage();
  check(boot(st3, { guides: FAKE_GUIDES }).S.saveChapter(rv) === true, '8장 조항 공개 단계 저장');
  const got3 = boot(st3, { guides: FAKE_GUIDES }).S.loadChapter();
  check(!!got3 && got3.phase === 'reveal' && got3.done.length === 7 && got3.guides === null, '8장 조항 공개 단계 복원');
}

// ───────────────────────── 9. 엔진 · 원고 데이터가 없을 때 ─────────────────────────
{
  // 엔진(G.rules) 없이: 모양 확인만으로 저장 · 복원
  const st = makeStorage();
  const noRules = ['js/core/util.js', 'js/data/sounds.js', 'js/data/scripts.js'];
  const b = boot(st, { files: noRules, guides: FAKE_GUIDES });
  check(b.S.saveChapter(sampleRun()) === true, '엔진 없이도 저장');
  eq(boot(st, { files: noRules, guides: FAKE_GUIDES }).S.loadChapter(), stored(b.S, sampleRun()), '엔진 없이도 복원');
  // 원고 데이터 없이: 원고 id를 확인할 수 없으므로 진행 장은 버린다(예외 없음)
  let ok = true, r;
  try { r = boot(st, { files: ['js/core/util.js'] }).S.loadChapter(); } catch (e) { ok = false; }
  check(ok && r === null, '원고 데이터(SCRIPTS)가 없으면 진행 장을 버림(예외 없음)');
}

// ───────────────────────── 10. 저장소가 막혀도(spec §11: 예외 없음, 메모리로) ─────────────────────────
{
  const cases = [
    ['localStorage null', null, 'normal'],
    ['localStorage에 닿기만 해도 예외', null, 'getter-throws'],
    ['getItem · setItem · removeItem 모두 예외', makeStorage({ throwAll: true }), 'normal'],
    ['쓰기만 예외(용량 초과 등)', makeStorage({ throwOn: ['set'] }), 'normal'],
  ];
  for (const [name, storage, how] of cases) {
    let ok = true, err = '';
    let b;
    try {
      b = boot(storage, { how, guides: FAKE_GUIDES });
      if (!b.S) throw new Error('G.save 없음' + (b.loadErr ? ': ' + b.loadErr.message : ''));
      eq(b.S.getSettings(), DEF_SETTINGS, name + ': 설정 기본값');
      b.S.setSettings({ sfxVolume: 0.2 });
      check(b.S.getSettings().sfxVolume === 0.2, name + ': 설정이 이번 세션 메모리에 남음');
      b.S.setSelection({ grade: 'h1', levels: { 1: 'advanced' } });
      check(b.S.getSelection().grade === 'h1' && b.S.levelOf(1) === 'advanced', name + ': 마지막 선택이 메모리에 남음');
      b.S.setSeenHowto();
      check(b.S.seenHowto() === true, name + ': 게임 방법 연 적이 메모리에 남음');
      check(b.S.saveChapter(sampleRun()) === true, name + ': saveChapter → true(메모리)');
      eq(b.S.loadChapter(), stored(b.S, sampleRun()), name + ': 진행 장이 이번 세션 동안 복원');
      check(b.S.chapterInfo().no === 4, name + ': chapterInfo');
      b.S.clearChapter();
      check(b.S.loadChapter() === null, name + ': 지우기');
      b.S.applySettings();
    } catch (e) { ok = false; err = e.message; }
    check(ok, name + ': 예외 없음 ' + err);
    if (b) check(b.errors.length === 0, name + ': console.error 없음 ' + b.errors.join(' | '));
  }
}

check(allErrors.length === 0, '점검 전체에서 console.error 없음: ' + allErrors.join(' | '));
done('저장 점검');
