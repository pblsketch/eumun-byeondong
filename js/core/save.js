'use strict';
// 저장 G.save — 설정 · 마지막 선택 · 게임 방법을 연 적 · 진행 중인 장(spec §11, §5 · §8-4 · §8-5 · §10).
//   출처: 「음운 해전」 pblsketch/sori-haejeon js/core/save.js의 방식(접두사, { s, … } JSON, 막힌 저장소는 메모리로,
//   예외 · console.error 없음)을 가져와 이 게임의 값으로 바꿨다.
//   불러오는 순서: js/core/util.js → js/data/*(sounds · scripts · (guides)) → js/core/hangul.js · rules.js → (audio.js) → 이 파일.
//   점검: tests/check-save.mjs. SCRIPTS는 진행 장 확인에 쓰고, G.rules · GUIDES · G.audio는 있으면 쓰고 없어도 동작한다.
//   저장은 저장만 한다: 덮어쓰기 확인("진행 중인 장이 지워져요")은 화면이 묻고, 원고 결과 · 신호는 G.rules가 정한다.
//
// ── 저장소가 막혀도 돌아간다 ────────────────────────────────────────────
//   localStorage에 닿는 모든 곳을 try/catch로 감싼다. localStorage가 없거나(null) 닿기만 해도 예외가 나거나
//   쓰기가 실패해도(용량 초과 등) 값은 이번 세션 동안 메모리(mem)에 남아 게임은 그대로 돈다(저장만 안 됨).
//   오류를 console.error로 찍지 않는다(util.js가 console.error를 페이지 오류로 모은다). 어떤 함수도 예외를 던지지 않는다.
//
// ── 저장 이름(모두 'eumun-byeondong:' 접두사) · 저장 형식 버전 SCHEMA ──────
//   값마다 { s: SCHEMA, … } 모양의 JSON. s가 다르거나 JSON이 망가졌으면 기본값(진행 장은 '없음')으로 시작한다.
//   저장 모양을 바꾸면 SCHEMA를 올린다 → 옛 값은 모두 조용히 기본값이 되고 옛 진행 장은 버려진다.
//   settings   { s, bgmOn, bgmVolume(0~1), sfxOn, sfxVolume(0~1), reduceMotion }
//   selection  { s, grade: 'm3'|'h1', levels: { '1': 'basic'|'advanced', … '8': … } }   마지막 선택. 단계는 장마다(spec §5-3)
//   seenHowto  { s, seen: true }                                                         '게임 방법'을 연 적 있음
//   chapter    { s, savedAt, run: ChapterRun }                                           진행 중인 장(기기에 하나)
//
// ── 진행 중인 장 ChapterRun (JSON으로 옮길 수 있는 평범한 값) ─────────────────
//   {
//     grade: 'm3'|'h1', ch: 장 번호(1~8), level: 'basic'|'advanced',
//     seed: 원고 뽑기에 쓴 시드(숫자) | null,
//     ids: [원고 id 7개 — 뽑힌 차례 그대로],
//     guides: [그 장 지침 id — 저장할 때 window.GUIDES[ch]에서 이 파일이 적는다] | null(GUIDES가 없을 때 · 지침이 없는 장 — 8장),
//     phase: 'guide'(감수 지침) | 'review'(원고 감수) | 'reveal'(조항 공개),
//     guideDone: 지침을 다 채웠는지(조항 공개 단계면 반드시 true. [다시 하기]는 true로 시작. 몸풀기 장(WARMUP — 1장)은
//                감수 단계에서 false일 수 있다: 몸풀기 원고(done < WARMUP[ch])를 감수하는 동안),
//     done: [끝난 원고 기록 — ids 차례대로, done[i].id === ids[i]] {
//       id, result: 'onair'|'offrule'|'skip'(온에어 · 규칙 밖 · 넘김, G.rules가 정한 값), sends: 송출 횟수,
//       help: [연 도움 단계 1|2|3 — 도움으로 센 것만(§8-4: '먼저 송출해 보세요'였던 ①은 빼고 화면이 넣는다)],
//       helped: help가 하나라도 있으면 true(이 파일이 다시 계산) },
//     cur: 지금 원고(ids[done.length]) 기록 — 감수 단계에만, 다른 단계에서는 null {
//       corrections: [교정 Correction — rules.js 머리 주석의 모양 그대로, 적용한 차례대로],
//       kinds: [이 원고의 송출마다 신호 kind 'onair'|'offrule'|'diff'|'nonstandard'] — 원고 결과(§8-5)를 정할 송출 기록,
//       sends: kinds.length(이 파일이 맞춰 적음),
//       help: [도움으로 센 단계], helped,
//       open: 연 적 있는 가장 높은 도움 단계 0~3 — 다음 단계를 여는 데만 쓴다. '먼저 송출해 보세요'였던 ①도 들어간다
//             (도움으로 세지는 않음 — §8-4). help의 가장 큰 값보다 작으면 이 파일이 맞춰 올린다,
//       last: 마지막 송출의 모습(새로 고친 뒤 그대로 다시 보이려고 — §8-3 · §8-4) | null(송출 전) {
//         kind, at: [다른 음절 번호](도움 ①이 씀), diff: 다른 음절 수, reading: 그때 프롬프터에 보인 발음(G.rules.broadcast의 reading),
//         outOfRule: [규칙 밖 교정 번호](감수 기록 표시), n: 그때의 교정 수 | null(송출 뒤 교정이 바뀜 — 되돌리기 · 다시 감수 · 새 교정) } },
//     fp: 데이터 지문 — 이 장의 판정이 기대는 데이터(뽑힌 원고 · 그 장 지침)의 짧은 해시. 저장할 때 이 파일이 적는다(fingerprint),
//   }
//   [다시 감수]는 cur.corrections만 비운다(송출 기록 kinds · last · 도움은 그 원고에 남는다).
//   last.n이 지금 교정 수와 같을 때만 '송출한 그대로'다: 규칙 밖 표시 · 감수 도장은 그때만 다시 보인다(화면이 교정을 바꾸면 n을 null로).
//
// ── 저장 시점과 지우기 ─────────────────────────────────────────────────
//   화면이 교정 · 되돌리기 · 다시 감수 · 송출 · 도움 · 원고 넘김 · 지침 완료마다 saveChapter(run)을 부른다.
//   새 장을 저장하면 옛 진행 장은 덮여 사라진다(기기에 하나). 장 결과에 닿으면 clearChapter()(spec §10).
//
// ── 버리는 경우(조용히: null을 돌려주고 저장 값을 지운다, 오류 없음 — spec §11) ─────
//   JSON이 망가짐 · 저장 형식 버전이 다름 · 모양이 틀림(위 ChapterRun의 약속을 어김) ·
//   원고 id가 지금 SCRIPTS에 없음(그 장의 원고가 아님 · 겹침 · 7개가 아님 포함) · SCRIPTS가 없음 ·
//   GUIDES가 있는데 그 장의 지침 id 차례가 저장된 것과 다름(GUIDES 없이 저장한 장 포함) · 뽑힌 원고가 지침 예시 ·
//   데이터 지문 fp가 지금 데이터로 다시 낸 값과 다름(뽑힌 원고의 표기 · 경계 · 표준 발음 · 풀이나 그 장 지침의 빈칸 · 예시가 바뀜) ·
//   G.rules가 있는데 지금 원고의 교정을 엔진이 받지 않음(broadcast가 예외 — 모르는 음운 등).
//   GUIDES가 없는 곳(지침 데이터 전)에서는 지침 확인만 건너뛴다. saveChapter도 같은 확인을 거쳐 틀린 값은 쓰지 않는다(false).
//   지침이 없는 장(GUIDES는 있는데 그 장 키가 없음 — 8장, 결정 0019): guides는 null, 지침 단계('guide')는 버린다.
//   불러올 때 저장된 guides가 목록인데 지금 그 장 지침이 없으면(지침이 빠짐) 버린다.
G.save = (function () {
  const PREFIX = 'eumun-byeondong:';
  const SCHEMA = 2; // 저장 형식 버전(바꾸면 옛 저장 값은 모두 기본값으로, 옛 진행 장은 버림). 2: cur.open · last 모습 · fp
  const PICK = 7; // 한 장의 원고 수(spec §6)
  // 몸풀기: 지침보다 먼저 감수하는 원고 수(장마다). 1장만 — 원고 2개 → 지침 → 나머지(결정 0021, 첫 조작까지 걸리는 시간을 줄이려고)
  const WARMUP = { 1: 2 };
  const CHAPTERS = [1, 2, 3, 4, 5, 6, 7, 8];
  const GRADES = ['m3', 'h1'];
  const LEVELS = ['basic', 'advanced'];
  const PHASES = ['guide', 'review', 'reveal'];
  const RESULTS = ['onair', 'offrule', 'skip'];
  const KINDS = ['onair', 'offrule', 'diff', 'nonstandard'];
  const HELPS = [1, 2, 3];
  const OPS = ['replace', 'delete', 'insert', 'merge'];
  const SLOTS = ['on', 'gl', 'nu', 'co'];
  const DEF_SETTINGS = { bgmOn: true, bgmVolume: 0.6, sfxOn: true, sfxVolume: 0.8, reduceMotion: false };
  const DEF_GRADE = 'm3';
  const DEF_LEVEL = 'basic';

  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
  const isNat = (n) => typeof n === 'number' && isFinite(n) && Math.floor(n) === n && n >= 0;
  const copy = (x) => JSON.parse(JSON.stringify(x));
  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  // ── 저장소(막혀도 메모리로) ─────────────────────────────
  const mem = {}; // 이름 → 문자열 | null. 이번 세션에 읽거나 쓴 값(쓰기가 실패해도 여기에는 남는다)
  function store() {
    try {
      const ls = window.localStorage;
      return ls && typeof ls.getItem === 'function' ? ls : null;
    } catch (e) { return null; }
  }
  function rawGet(k) {
    if (own(mem, k)) return mem[k];
    let v = null;
    const ls = store();
    if (ls) { try { v = ls.getItem(PREFIX + k); } catch (e) { v = null; } }
    mem[k] = typeof v === 'string' ? v : null;
    return mem[k];
  }
  function rawSet(k, v) {
    mem[k] = v;
    const ls = store();
    if (!ls) return false;
    try { ls.setItem(PREFIX + k, v); return true; } catch (e) { return false; }
  }
  function rawDel(k) {
    mem[k] = null;
    const ls = store();
    if (ls) { try { ls.removeItem(PREFIX + k); } catch (e) { /* 막혀도 메모리에서는 지워짐 */ } }
  }
  // JSON 읽기: 없거나 망가졌거나 형식 버전이 다르면 null
  function readJSON(k) {
    const raw = rawGet(k);
    if (raw == null) return null;
    try {
      const o = JSON.parse(raw);
      return isObj(o) && o.s === SCHEMA ? o : null;
    } catch (e) { return null; }
  }
  function writeJSON(k, data) {
    let text;
    try { text = JSON.stringify(Object.assign({ s: SCHEMA }, data)); } catch (e) { return false; }
    rawSet(k, text);
    return true;
  }
  // ── 설정(spec §5-6) ──────────────────────────────────
  function cleanSettings(base, o) {
    const r = Object.assign({}, base);
    if (!isObj(o)) return r;
    ['bgmOn', 'sfxOn', 'reduceMotion'].forEach((k) => { if (typeof o[k] === 'boolean') r[k] = o[k]; });
    ['bgmVolume', 'sfxVolume'].forEach((k) => { if (typeof o[k] === 'number' && isFinite(o[k])) r[k] = clamp01(o[k]); });
    return r;
  }
  function getSettings() {
    return cleanSettings(DEF_SETTINGS, readJSON('settings'));
  }
  // 준 값만 바꿔 저장하고 곧바로 적용한다 → 바뀐 전체 설정
  function setSettings(part) {
    const s = cleanSettings(getSettings(), part);
    writeJSON('settings', s);
    applySettings(s);
    return s;
  }
  // 소리 장치(G.audio.configure)와 움직임 줄이기(<html>의 'reduce-motion' 클래스)에 적용
  function applySettings(s) {
    s = s ? cleanSettings(DEF_SETTINGS, s) : getSettings();
    try {
      if (G.audio && typeof G.audio.configure === 'function') {
        G.audio.configure({ bgmOn: s.bgmOn, bgmVolume: s.bgmVolume, sfxOn: s.sfxOn, sfxVolume: s.sfxVolume });
      }
    } catch (e) { /* 소리 장치 문제로 설정 화면이 멈추지 않게 */ }
    try {
      const doc = window.document;
      const cl = doc && doc.documentElement && doc.documentElement.classList;
      if (cl) { if (s.reduceMotion) cl.add('reduce-motion'); else cl.remove('reduce-motion'); }
    } catch (e) { /* 문서가 없는 곳(점검)에서도 조용히 */ }
    return s;
  }

  // ── 마지막 선택(spec §5-1 · §5-3): 학년 하나, 단계는 장마다 ─────────────
  function cleanSelection(base, o) {
    const r = { grade: base.grade, levels: Object.assign({}, base.levels) };
    if (!isObj(o)) return r;
    if (GRADES.indexOf(o.grade) >= 0) r.grade = o.grade;
    if (isObj(o.levels)) {
      CHAPTERS.forEach((ch) => { if (LEVELS.indexOf(o.levels[ch]) >= 0) r.levels[ch] = o.levels[ch]; });
    }
    return r;
  }
  function defSelection() {
    const levels = {};
    CHAPTERS.forEach((ch) => { levels[ch] = DEF_LEVEL; });
    return { grade: DEF_GRADE, levels };
  }
  // → { grade, levels: { 1: 'basic'|'advanced', … 8: … } }(복사본)
  function getSelection() {
    return cleanSelection(defSelection(), readJSON('selection'));
  }
  // 준 값만 바꿔 저장 — setSelection({ grade: 'h1' }), setSelection({ levels: { 2: 'advanced' } })
  function setSelection(part) {
    const s = cleanSelection(getSelection(), part);
    writeJSON('selection', s);
    return s;
  }
  // 그 장의 마지막 단계(없는 장이면 'basic')
  function levelOf(ch) {
    const lv = getSelection().levels[ch];
    return LEVELS.indexOf(lv) >= 0 ? lv : DEF_LEVEL;
  }

  // ── '게임 방법'을 연 적 있는지(spec §5-5) ───────────────
  function seenHowto() {
    const o = readJSON('seenHowto');
    return !!(o && o.seen === true);
  }
  function setSeenHowto(v) {
    if (v === undefined || v) writeJSON('seenHowto', { seen: true });
    else rawDel('seenHowto');
  }

  // ── 진행 중인 장(spec §11) ─────────────────────────────
  // 그 장의 원고 id → 원고. SCRIPTS가 없으면 null
  function scriptsOf(ch) {
    const list = window.SCRIPTS;
    if (!Array.isArray(list)) return null;
    const by = {};
    list.forEach((s) => { if (s && s.ch === ch && typeof s.id === 'string') by[s.id] = s; });
    return by;
  }
  // 지금 지침 데이터: GUIDES가 없으면 null(확인 건너뜀), 그 장 키가 없으면 'none'(지침이 없는 장 — 8장),
  //   있는데 그 장이 쓸 수 없는 모양이면 false
  function guidesOf(ch) {
    const all = window.GUIDES;
    if (!all || typeof all !== 'object') return null;
    if (!Object.prototype.hasOwnProperty.call(all, ch)) return 'none';
    const list = all[ch];
    if (!Array.isArray(list)) return false;
    const ids = [], examples = [];
    for (const g of list) {
      if (!isObj(g) || typeof g.id !== 'string') return false;
      ids.push(g.id);
      (Array.isArray(g.examples) ? g.examples : []).forEach((e) => { if (isObj(e) && typeof e.id === 'string') examples.push(e.id); });
    }
    return { ids, examples };
  }
  // ── 데이터 지문(spec §11 '지침 · 원고 데이터가 바뀌어 맞지 않으면 버림') ─────────
  //   fingerprint(장, 원고 id 목록) → 8자리 16진 글. 순수: 같은 데이터면 늘 같은 값(키 차례와 상관없음), 암호 API를 쓰지 않는다.
  //   담는 것 = 판정이 기대는 것만: 뽑힌 원고마다 id · text · cuts · marks · pron · allowed · nonstandard · steps,
  //   그 장 지침마다 id · 빈칸(보기 · 정답 · 조건 낱말) · 예시(id · trap · shows). 지침 문장 · 출처 · 형태소 풀이 같은 것은 담지 않는다.
  //   GUIDES가 없으면 지침 쪽은 null로 담는다. 없는 원고 id는 null로 담는다(그런 진행 장은 어차피 버림).
  const stable = (x) => (Array.isArray(x) ? '[' + x.map(stable).join(',') + ']'
    : isObj(x) ? '{' + Object.keys(x).sort().map((k) => JSON.stringify(k) + ':' + stable(x[k])).join(',') + '}'
      : x === undefined ? 'null' : JSON.stringify(x));
  function fnv1a(s) {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return ('0000000' + h.toString(16)).slice(-8);
  }
  function fingerprint(ch, ids) {
    const list = Array.isArray(window.SCRIPTS) ? window.SCRIPTS : [];
    const by = {};
    list.forEach((s) => { if (s && typeof s.id === 'string') by[s.id] = s; });
    const pick = (o, keys) => (isObj(o) ? keys.map((k) => o[k]) : null);
    const scripts = (Array.isArray(ids) ? ids : []).map((id) => pick(by[id], ['id', 'text', 'cuts', 'marks', 'pron', 'allowed', 'nonstandard', 'steps']));
    const all = window.GUIDES;
    const gs = all && typeof all === 'object' ? all[ch] : null;
    const guides = Array.isArray(gs) ? gs.map((g) => (isObj(g) ? [
      g.id,
      isObj(g.blanks) ? Object.keys(g.blanks).sort().map((b) => [b].concat(pick(g.blanks[b], ['options', 'answer', 'members']))) : null,
      Array.isArray(g.examples) ? g.examples.map((e) => pick(e, ['id', 'trap', 'shows'])) : null,
    ] : null)) : null;
    try { return fnv1a(stable([ch, scripts, guides])); } catch (e) { return ''; }
  }

  // 자리 Pos: { s, slot, k } 또는 '0.co1' 같은 글. 모양이 틀리면 undefined
  function cleanPos(p) {
    if (typeof p === 'string') return /^\d+\.(on|gl|nu|co)[01]?$/.test(p) ? p : undefined;
    if (!isObj(p) || !isNat(p.s) || SLOTS.indexOf(p.slot) < 0) return undefined;
    if (p.k !== undefined && p.k !== 0 && p.k !== 1) return undefined;
    return { s: p.s, slot: p.slot, k: p.k || 0 };
  }
  // 교정 Correction(rules.js 머리 주석). 모양이 틀리면 undefined
  function cleanCorrection(c) {
    if (!isObj(c) || OPS.indexOf(c.op) < 0) return undefined;
    let at;
    if (c.op === 'merge') {
      if (!Array.isArray(c.at) || c.at.length !== 2) return undefined;
      at = c.at.map(cleanPos);
      if (at.some((p) => p === undefined)) return undefined;
    } else {
      at = cleanPos(c.at);
      if (at === undefined) return undefined;
    }
    if (c.op === 'delete') return { op: c.op, at };
    if (typeof c.to !== 'string' || !c.to) return undefined;
    return { op: c.op, at, to: c.to };
  }
  // 도움 단계 목록: 1|2|3만, 겹침 없이 차례대로. 모양이 틀리면 undefined
  function cleanHelp(h) {
    if (h === undefined) return [];
    if (!Array.isArray(h) || h.some((x) => HELPS.indexOf(x) < 0)) return undefined;
    return HELPS.filter((x) => h.indexOf(x) >= 0);
  }
  function cleanDone(d, id) {
    if (!isObj(d) || d.id !== id || RESULTS.indexOf(d.result) < 0 || !isNat(d.sends)) return undefined;
    if (d.result !== 'skip' && d.sends < 1) return undefined; // 온에어 · 규칙 밖은 송출이 있어야
    const help = cleanHelp(d.help);
    if (!help) return undefined;
    return { id, result: d.result, sends: d.sends, help, helped: help.length > 0 };
  }
  // 마지막 송출의 모습. count = 지금 교정 수 — n이 그와 다르면 '송출 뒤 교정이 바뀜'(null)으로 맞춘다
  function cleanLast(l, count) {
    if (l === null || l === undefined) return null;
    if (!isObj(l) || KINDS.indexOf(l.kind) < 0 || typeof l.reading !== 'string') return undefined;
    const at = l.at === undefined ? [] : l.at;
    const out = l.outOfRule === undefined ? [] : l.outOfRule;
    const diff = l.diff === undefined ? 0 : l.diff;
    if (!Array.isArray(at) || !at.every(isNat) || !Array.isArray(out) || !out.every(isNat) || !isNat(diff)) return undefined;
    if (l.n !== undefined && l.n !== null && !isNat(l.n)) return undefined;
    const n = l.n === count ? count : null;
    return { kind: l.kind, at: at.slice(), diff, reading: l.reading, outOfRule: n === null ? [] : out.filter((i) => i < count), n };
  }
  const freshCur = () => ({ corrections: [], kinds: [], sends: 0, help: [], helped: false, open: 0, last: null });
  function cleanCur(c, script) {
    if (c === null || c === undefined) return freshCur();
    if (!isObj(c)) return undefined;
    const cs = c.corrections === undefined ? [] : c.corrections;
    if (!Array.isArray(cs)) return undefined;
    const corrections = cs.map(cleanCorrection);
    if (corrections.some((x) => x === undefined)) return undefined;
    const kinds = c.kinds === undefined ? [] : c.kinds;
    if (!Array.isArray(kinds) || kinds.some((k) => KINDS.indexOf(k) < 0)) return undefined;
    if (c.sends !== undefined && c.sends !== kinds.length) return undefined;
    const help = cleanHelp(c.help);
    const last = cleanLast(c.last, corrections.length);
    if (!help || last === undefined) return undefined;
    // 연 적 있는 도움 단계(0~3) — 센 도움보다 낮을 수 없다
    const open = c.open === undefined ? 0 : c.open;
    if (!isNat(open) || open > HELPS[HELPS.length - 1]) return undefined;
    // 마지막 송출은 송출 기록의 끝과 같아야 한다(송출 전이면 둘 다 없음)
    if (kinds.length ? !(last && last.kind === kinds[kinds.length - 1]) : last !== null) return undefined;
    // 엔진이 있으면 지금 원고에 이 교정들을 실제로 적용해 본다(데이터가 바뀌어 받지 않으면 버림)
    if (script && G.rules && typeof G.rules.broadcast === 'function') {
      try { G.rules.broadcast(script, corrections); } catch (e) { return undefined; }
    }
    return { corrections, kinds: kinds.slice(), sends: kinds.length, help, helped: help.length > 0, open: Math.max(open, 0, ...help), last };
  }
  // 진행 장을 확인하고 정리한 복사본 → ChapterRun | null(버림).
  //   loading: 불러올 때 true — 저장된 r.guides를 지금 GUIDES와 비교한다. 저장할 때는 지금 GUIDES에서 새로 적는다.
  function cleanRun(r, loading) {
    if (!isObj(r)) return null;
    if (GRADES.indexOf(r.grade) < 0 || LEVELS.indexOf(r.level) < 0) return null;
    if (CHAPTERS.indexOf(r.ch) < 0 || PHASES.indexOf(r.phase) < 0 || typeof r.guideDone !== 'boolean') return null;
    const warm = WARMUP[r.ch] || 0;
    if (r.phase === 'reveal' && !r.guideDone) return null;
    const seed = r.seed === undefined || r.seed === null ? null : r.seed;
    if (seed !== null && !(typeof seed === 'number' && isFinite(seed))) return null;
    // 원고 id: 지금 원고 데이터의 그 장 원고, 겹치지 않는 7개
    const by = scriptsOf(r.ch);
    if (!by || !Array.isArray(r.ids) || r.ids.length !== PICK) return null;
    if (!r.ids.every((id, i) => typeof id === 'string' && own(by, id) && r.ids.indexOf(id) === i)) return null;
    // 지침: GUIDES가 있으면 지침 id 차례가 같고 뽑힌 원고가 지침 예시가 아니어야
    const gd = guidesOf(r.ch);
    if (gd === false) return null;
    let guides = null;
    if (gd === 'none') {
      // 지침이 없는 장: 지침 단계가 없고, 지침이 있던 때 저장한 진행 장(guides 목록)은 맞지 않음
      if (r.phase === 'guide' || !r.guideDone) return null;
      if (loading && Array.isArray(r.guides)) return null;
    } else if (gd) {
      if (loading && !(Array.isArray(r.guides) && r.guides.length === gd.ids.length && r.guides.every((x, i) => x === gd.ids[i]))) return null;
      if (r.ids.some((id) => gd.examples.indexOf(id) >= 0)) return null;
      guides = gd.ids.slice();
    }
    // 데이터 지문: 불러올 때 지금 데이터로 다시 낸 값과 다르면 버린다. 저장할 때는 지금 데이터로 새로 적는다
    const fp = fingerprint(r.ch, r.ids);
    if (loading && r.fp !== fp) return null;
    // 끝난 원고 · 지금 원고
    const ds = r.done === undefined ? [] : r.done;
    if (!Array.isArray(ds) || ds.length > PICK) return null;
    const done = ds.map((d, i) => cleanDone(d, r.ids[i]));
    if (done.some((d) => d === undefined)) return null;
    // 지침 단계: 처음(끝난 원고 없음) 또는 몸풀기를 마친 뒤(끝난 원고 = WARMUP[ch]). 감수 단계에서 지침 전이면 몸풀기 원고만
    if (r.phase === 'guide' && done.length && !(warm && done.length === warm)) return null;
    if (r.phase === 'review' && !r.guideDone && !(warm && gd && gd !== 'none' && done.length < warm)) return null;
    if (r.phase === 'review' && done.length >= PICK) return null;
    if (r.phase === 'reveal' && done.length !== PICK) return null;
    let cur = null;
    if (r.phase === 'review') {
      cur = cleanCur(r.cur, by[r.ids[done.length]]);
      if (cur === undefined) return null;
    }
    return { grade: r.grade, ch: r.ch, level: r.level, seed, ids: r.ids.slice(), guides, phase: r.phase, guideDone: r.guideDone, done, cur, fp };
  }
  function safeClean(r, loading) {
    try { return cleanRun(r, loading); } catch (e) { return null; }
  }

  // 진행 장 저장(새 장이면 옛 진행 장을 덮음). 저장했으면(이번 세션 메모리 포함) true, 틀린 값이면 쓰지 않고 false
  function saveChapter(run) {
    let r;
    try { r = copy(run); } catch (e) { return false; }
    const clean = safeClean(r, false);
    if (!clean) return false;
    return writeJSON('chapter', { savedAt: Date.now(), run: clean });
  }
  // 이어 할 진행 장(복사본) 또는 null. 버릴 값이면 저장 값을 지우고 null(오류 없음)
  function loadChapter() {
    if (rawGet('chapter') == null) return null;
    const o = readJSON('chapter');
    const clean = o ? safeClean(o.run, true) : null;
    if (!clean) { rawDel('chapter'); return null; }
    return clean;
  }
  const hasChapter = () => loadChapter() !== null;
  // 시작 화면의 이어 하기 표시('몇 장 · 어느 단계 · 원고 몇 번째', spec §5-4) → null | { grade, ch, level, phase, no, total }
  //   no: 지침 단계 0, 감수 단계 지금 원고 번호(1~7), 조항 공개 단계 7
  function chapterInfo() {
    const r = loadChapter();
    if (!r) return null;
    const no = r.phase === 'guide' ? 0 : r.phase === 'review' ? r.done.length + 1 : r.ids.length;
    return { grade: r.grade, ch: r.ch, level: r.level, phase: r.phase, no, total: r.ids.length };
  }
  // 진행 장 지우기(장 결과에 닿았을 때 — spec §10). 설정 · 마지막 선택 · 게임 방법 연 적은 남는다
  function clearChapter() { rawDel('chapter'); }

  return {
    PREFIX, SCHEMA, WARMUP, fingerprint,
    getSettings, setSettings, applySettings,
    getSelection, setSelection, levelOf,
    seenHowto, setSeenHowto,
    saveChapter, loadChapter, hasChapter, chapterInfo, clearChapter,
  };
})();
