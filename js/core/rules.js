'use strict';
// 음운 규칙 엔진 G.rules — 판정의 진실은 여기에만 둔다. 화면(DOM)을 쓰지 않는 순수 함수만 둔다.
//   불러오는 순서: js/core/util.js → js/data/sounds.js · scripts.js → js/core/hangul.js → 이 파일.
//   Node 점검: tests/check-rules.mjs. 모든 함수는 받은 값을 바꾸지 않는다(상태를 바꾸는 함수는 새 상태를 돌려준다).
//   화면 문장을 만들지 않는다(오류 메시지는 개발자용). 규칙 이름·조항 문구는 화면 문구 파일이 id로 찾는다.
//
// ── 감수 상태 State (JSON으로 옮길 수 있는 평범한 값) ────────────────────
//   {
//     syl: [{ on: 자음|null,          // 초성. null = 빈 자리(표기의 초성 'ㅇ'은 음운이 아니다)
//             gl: 'j'|'w'|null,        // 반모음(결정 0004: 음운으로 센다)
//             nu: 단모음|'ㅢ'|null,    // 중성. 'ㅢ'는 나누지 않는 이중 모음(음운 2개로 셈, 결정 0009)
//             co: [자음 0~2개] }],     // 종성. 겹받침은 두 자음(닭: ['ㄹ','ㄱ']), 쌍받침 ㄲ·ㅆ은 한 음운
//     cuts: [칼집…],                   // 음절 사이(길이 = 음절 수 − 1): 'formal'(뒤가 형식 형태소: 조사·어미·접미사)
//                                      //   | 'content'(뒤가 실질 형태소: 합성어·파생어의 어근) | 'space'(띄어 쓴 두 단어) | null(경계 아님·표시 안 함)
//     marks: { lateralExc: [칼집 번호] } // 낱말 예외 표시: 그 음절 사이의 'ㄴㄹ'은 유음화 대신 ㄹ→[ㄴ](제20항 다만)
//   }
//   상태는 표기의 음절 자리를 그대로 둔다. 연음은 교정이 아니라 읽을 때 저절로 일어난다(reading, 결정 0002).
//
// ── 자리 Pos ─────────────────────────────────────────────────────────────
//   { s: 음절 번호, slot: 'on'|'gl'|'nu'|'co', k: 종성 안 번호(0|1, co만) }   글로 적으면 '0.co' · '0.co1' · '1.on'
//
// ── 교정 Correction (교정 부호 넷 = 변동 네 갈래, 결정 0002) ────────────
//   { op: 'replace', at: Pos, to: 음운 }   고침표(교체)
//   { op: 'delete',  at: Pos }             뺌표(탈락)
//   { op: 'insert',  at: Pos(빈 자리), to } 넣음표(첨가)
//   { op: 'merge',   at: [Pos, Pos], to }  합침표(축약, 게임 설정) — 이웃한 두 음운이 하나로
//   교정 하나 = 규칙 적용 하나(결정 0009). 지금 상태에서 applicable()이 내놓는 후보와 같아야 '규칙 안'.
//   모양이 틀린 교정은 오류를 던진다. 모양은 맞지만 할 수 없는 교정(빈 자리 빼기 등)은 상태를 바꾸지 않고 '규칙 밖'이 된다(오답을 막지 않는다).
//
// ── 원고 Script (js/data/scripts.js) ─────────────────────────────────────
//   { id, ch: 장, text: 표기, morphs: 형태소 분석(사람이 읽는 것), cuts, marks?, pron: 표준 발음(장음 ː 포함),
//     allowed?: [허용 발음], nonstandard?: [[흔하지만 표준이 아닌 발음, 조항]], steps: 풀이 과정 [[규칙, op, 자리, 음운]],
//     count: [표기의 음운 수, 발음의 음운 수], change: { replace?, delete?, insert?, merge? }, articles: [조항], src: [출처], trap?: 함정 종류 }
//   장음(ː)은 낱말 정보다. 엔진은 장음을 도출하지 않고, 발음을 비교할 때 장음과 띄어쓰기를 지운다(strip).
//
// ── 규칙 Rule id (지금 엔진이 아는 것 — 1·2장) ──────────────────────────
//   'coda'        음절의 끝소리 규칙: 어말·자음 앞(제9항), 모음으로 시작하는 실질 형태소·다음 단어 앞(제15항),
//                 받침 ㅎ + ㄴ 의 ㅎ→ㄷ(제12항 3, 결정 0010: 놓는[논는] = 교체 2회)
//   'r-nasal-exc' ㄹ→ㄴ, 제20항 다만(낱말 예외 표시가 있을 때만)
//   'r-nasal'     ㄹ의 비음화: 받침 ㅁ·ㅇ·ㄱ·ㅂ 뒤 ㄹ→ㄴ(제19항·붙임)
//   'nasal'       비음화: 받침 ㄱ·ㄷ·ㅂ + ㄴ·ㅁ → 같은 위치의 비음(제18항)
//   'lateral'     유음화: ㄴ이 ㄹ의 앞이나 뒤에서 ㄹ(제20항)
//   표준 발음 도출(derive)은 ORDER 순서 → 왼쪽 자리부터 적용한다. 어떤 순서로 규칙만 적용해도 같은 발음에 닿는지는 점검이 확인한다.
//
// ── 송출 판정 broadcast의 신호 kind (네 가지, 결정 0002) ─────────────────
//   'onair'       발음이 표준(허용 포함)과 같고 교정이 모두 규칙 안
//   'offrule'     발음은 맞지만 규칙 밖 교정이 섞임
//   'diff'        발음이 표준과 다름(diff = 다른 음절 수, at = 프롬프터 발음에서 다른 음절 번호)
//   'nonstandard' 원고의 nonstandard 목록에 있는 발음(흔하지만 표준이 아님)
G.rules = (function () {
  const S = window.SOUNDS, H = G.hangul;
  const byId = {};
  S.consonants.concat(S.vowels, S.glides).forEach((s) => { byId[s.id] = s; });
  const DIPH = S.diphthongs;
  const JOIN_V = {};
  Object.keys(DIPH).forEach((k) => { JOIN_V[DIPH[k].join('')] = k; });
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const SLOTS = ['on', 'gl', 'nu', 'co'];
  const OPS = ['replace', 'delete', 'insert', 'merge'];
  const CUT_RANK = { space: 3, content: 2, formal: 1 };

  const RULES = {
    'coda': { op: 'replace', article: '9' },
    'r-nasal-exc': { op: 'replace', article: '20-다만' },
    'r-nasal': { op: 'replace', article: '19' },
    'nasal': { op: 'replace', article: '18' },
    'lateral': { op: 'replace', article: '20' },
  };
  const ORDER = ['coda', 'r-nasal-exc', 'r-nasal', 'nasal', 'lateral'];
  // 음절의 끝소리 규칙: 대표음(제9항). 받침 ㅎ은 여기 없다(ㄴ 앞만 따로, 결정 0010).
  const REP = { 'ㄲ': 'ㄱ', 'ㅋ': 'ㄱ', 'ㅅ': 'ㄷ', 'ㅆ': 'ㄷ', 'ㅈ': 'ㄷ', 'ㅊ': 'ㄷ', 'ㅌ': 'ㄷ', 'ㅍ': 'ㅂ' };
  const R_NASAL_AFTER = ['ㅁ', 'ㅇ', 'ㄱ', 'ㅂ'];

  const slash = (id) => '/' + id + '/';
  const strip = (p) => String(p).replace(/[ː\s]/g, '');
  const isConsonant = (id) => !!byId[id] && byId[id].sea === 'consonant';
  const isGlide = (id) => !!byId[id] && byId[id].sea === 'glide';
  const isNucleus = (id) => (!!byId[id] && byId[id].sea === 'vowel') || id in S.unsplit;
  const isSound = (id) => !!byId[id] || id in S.unsplit;
  // 같은 조음 위치의 비음(위치는 그대로, 방법만 닮음)
  const nasalOf = (id) => {
    const c = byId[id];
    const n = S.consonants.find((x) => x.place === c.place && x.manner === 'nasal');
    return n ? n.id : null;
  };
  const isPlainStop = (id) => isConsonant(id) && byId[id].manner === 'stop' && byId[id].strength === 'plain';

  // ── 자리 ──────────────────────────────────────────────
  function pos(x) {
    if (typeof x === 'string') {
      const m = /^(\d+)\.(on|gl|nu|co)([01])?$/.exec(x);
      if (!m) throw new Error('자리 모양이 틀림: ' + x);
      return { s: +m[1], slot: m[2], k: m[3] ? +m[3] : 0 };
    }
    if (!x || typeof x.s !== 'number' || SLOTS.indexOf(x.slot) < 0) throw new Error('자리 모양이 틀림: ' + JSON.stringify(x));
    return { s: x.s, slot: x.slot, k: x.slot === 'co' ? (x.k || 0) : 0 };
  }
  const samePos = (a, b) => a.s === b.s && a.slot === b.slot && a.k === b.k;
  function get(state, p) {
    const y = state.syl[p.s];
    if (!y) return null;
    return p.slot === 'co' ? (y.co[p.k] || null) : (y[p.slot] || null);
  }
  // 음운 차례(이웃 판단용): 음절마다 on · gl · nu · co0 · co1 중 있는 것만
  function order(state) {
    const out = [];
    state.syl.forEach((y, s) => {
      if (y.on) out.push({ s, slot: 'on', k: 0 });
      if (y.gl) out.push({ s, slot: 'gl', k: 0 });
      if (y.nu) out.push({ s, slot: 'nu', k: 0 });
      y.co.forEach((_, k) => out.push({ s, slot: 'co', k }));
    });
    return out;
  }

  // ── 원고 → 처음 상태 ──────────────────────────────────
  function start(script) {
    if (!script || typeof script.text !== 'string' || !script.text.trim()) throw new Error('원고 표기가 없음');
    const syl = [], spaceGaps = [];
    for (const ch of script.text) {
      if (ch === ' ') { if (syl.length) spaceGaps.push(syl.length - 1); continue; }
      const p = H.split(ch);
      if (!p) throw new Error('한글 음절이 아님: ' + ch + ' (' + script.text + ')');
      const d = DIPH[p.v];
      syl.push({ on: p.on, gl: d ? d[0] : null, nu: d ? d[1] : p.v, co: p.co });
    }
    const cuts = script.cuts ? script.cuts.slice() : syl.slice(1).map(() => null);
    if (cuts.length !== syl.length - 1) throw new Error('칼집 수가 음절 사이 수와 다름: ' + script.text);
    cuts.forEach((c, i) => {
      if (c !== null && !(c in CUT_RANK)) throw new Error('모르는 칼집: ' + c + ' (' + script.text + ')');
      if ((c === 'space') !== spaceGaps.includes(i)) throw new Error('띄어쓰기와 space 칼집이 어긋남: ' + script.text);
    });
    const marks = clone(script.marks || {});
    (marks.lateralExc || []).forEach((g) => { if (!(g >= 0 && g < cuts.length)) throw new Error('예외 표시 자리가 틀림: ' + script.text); });
    return { syl, cuts, marks };
  }

  // ── 읽기(프롬프터): 연음은 여기서 저절로 ───────────────
  // 모음으로 시작하는 음절 앞의 종성을 옮긴다(겹받침은 뒤엣것만, /ㅇ/은 옮기지 않음). 연음은 변동이 아니다(0회).
  function surface(state) {
    const syl = clone(state.syl);
    for (let i = 0; i + 1 < syl.length; i++) {
      const a = syl[i], b = syl[i + 1];
      if (b.on == null && b.nu && a.nu && a.co.length) {
        const last = a.co[a.co.length - 1];
        if (last !== 'ㅇ') { b.on = last; a.co = a.co.slice(0, -1); }
      }
    }
    return syl;
  }
  function vowelText(y) {
    if (!y.nu) return y.gl || '';
    if (!y.gl) return y.nu;
    return JOIN_V[y.gl + y.nu] || (y.gl + y.nu); // 이중 모음으로 적을 수 없는 조합은 그대로
  }
  const reading = (state) => surface(state).map((y) => H.join(y.on, vowelText(y), y.co)).join('');
  const phonemes = (state) => state.syl.reduce((n, y) =>
    n + (y.on ? 1 : 0) + (y.gl ? 1 : 0) + (y.nu ? (S.unsplit[y.nu] || 1) : 0) + y.co.length, 0);

  // ── 지금 상태에서 적용할 수 있는 규칙 ──────────────────
  const cand = (rule, s, slot, k, to, article) => ({ rule, article, op: 'replace', at: { s, slot, k }, to });
  function applicable(state) {
    const out = [];
    const exc = (state.marks && state.marks.lateralExc) || [];
    state.syl.forEach((y, i) => {
      if (y.co.length !== 1) return; // 겹받침은 자음군 단순화가 먼저(5장)
      const c = y.co[0], nx = state.syl[i + 1], cut = state.cuts[i];
      const nextOn = nx ? nx.on : null;
      // 음절의 끝소리 규칙: 어말 · 자음 앞(제9항) · 모음으로 시작하는 실질 형태소/다음 단어 앞(제15항)
      if (REP[c]) {
        if (!nx || nextOn) out.push(cand('coda', i, 'co', 0, REP[c], '9'));
        else if (cut === 'content' || cut === 'space') out.push(cand('coda', i, 'co', 0, REP[c], '15'));
      }
      if (c === 'ㅎ' && nextOn === 'ㄴ') out.push(cand('coda', i, 'co', 0, 'ㄷ', '12')); // 결정 0010
      if (!nx) return;
      if ((nextOn === 'ㄴ' || nextOn === 'ㅁ') && isPlainStop(c)) out.push(cand('nasal', i, 'co', 0, nasalOf(c), '18'));
      if (nextOn === 'ㄹ') {
        if (R_NASAL_AFTER.includes(c)) out.push(cand('r-nasal', i + 1, 'on', 0, 'ㄴ', '19'));
        if (c === 'ㄴ') {
          if (exc.includes(i)) out.push(cand('r-nasal-exc', i + 1, 'on', 0, 'ㄴ', '20-다만'));
          else out.push(cand('lateral', i, 'co', 0, 'ㄹ', '20'));
        }
      }
      if (nextOn === 'ㄴ' && c === 'ㄹ') out.push(cand('lateral', i + 1, 'on', 0, 'ㄹ', '20'));
    });
    return out;
  }

  // ── 교정 적용 ─────────────────────────────────────────
  function normalize(c) {
    if (!c || OPS.indexOf(c.op) < 0) throw new Error('교정 모양이 틀림: ' + JSON.stringify(c));
    const at = c.op === 'merge' ? (Array.isArray(c.at) && c.at.length === 2 ? c.at.map(pos) : null) : pos(c.at);
    if (!at) throw new Error('합침표는 자리 두 개: ' + JSON.stringify(c));
    if (c.op !== 'delete' && !isSound(c.to)) throw new Error('모르는 음운: ' + c.to);
    return c.op === 'delete' ? { op: c.op, at } : { op: c.op, at, to: c.to };
  }
  const fits = (slot, id) => (slot === 'gl' ? isGlide(id) : slot === 'nu' ? isNucleus(id) : isConsonant(id));
  function put(y, p, id) { if (p.slot === 'co') y.co[p.k] = id; else y[p.slot] = id; }
  function remove(y, p) { if (p.slot === 'co') y.co.splice(p.k, 1); else y[p.slot] = null; }
  // 아무 음운도 남지 않은 음절은 지우고, 양쪽 칼집 가운데 더 큰 것을 남긴다
  function tidy(st) {
    for (let i = st.syl.length - 1; i >= 0 && st.syl.length > 1; i--) {
      const y = st.syl[i];
      if (y.on || y.gl || y.nu || y.co.length) continue;
      st.syl.splice(i, 1);
      if (i === 0) st.cuts.splice(0, 1);
      else if (i === st.cuts.length) st.cuts.splice(i - 1, 1);
      else {
        const a = st.cuts[i - 1], b = st.cuts[i];
        st.cuts.splice(i - 1, 2, (CUT_RANK[a] || 0) >= (CUT_RANK[b] || 0) ? a : b);
      }
    }
    return st;
  }
  // 할 수 있으면 새 상태, 할 수 없으면 null
  function tryApply(state, c) {
    if (c.op === 'merge') {
      const [a, b] = c.at;
      const seq = order(state);
      const ia = seq.findIndex((p) => samePos(p, a)), ib = seq.findIndex((p) => samePos(p, b));
      if (ia < 0 || ib !== ia + 1) return null; // 이웃한 두 음운만
      const keep = b.slot === 'on' ? b : a, drop = keep === b ? a : b; // 종성+초성은 초성 자리에(놓고 → [노코])
      if (!fits(keep.slot, c.to)) return null;
      const st = clone(state);
      put(st.syl[keep.s], keep, c.to);
      remove(st.syl[drop.s], drop);
      return tidy(st);
    }
    const p = c.at, y = state.syl[p.s];
    if (!y) return null;
    const cur = get(state, p);
    const st = clone(state), ny = st.syl[p.s];
    if (c.op === 'replace') {
      if (!cur || cur === c.to || !fits(p.slot, c.to)) return null;
      put(ny, p, c.to);
      return st;
    }
    if (c.op === 'delete') {
      if (!cur) return null;
      remove(ny, p);
      return tidy(st);
    }
    // insert: 빈 자리에만
    if (!fits(p.slot, c.to)) return null;
    if (p.slot === 'co') {
      if (ny.co.length >= 2 || p.k > ny.co.length) return null;
      ny.co.splice(p.k, 0, c.to);
      return st;
    }
    if (cur) return null;
    put(ny, p, c.to);
    return st;
  }
  // 규칙 판정 없이 교정만 적용. 할 수 없는 교정이면 받은 상태를 그대로(같은 객체) 돌려준다.
  function apply(state, c) { return tryApply(state, normalize(c)) || state; }

  const sameCorrection = (a, b) => a.op === b.op && a.to === b.to &&
    (a.op === 'merge' ? samePos(a.at[0], b.at[0]) && samePos(a.at[1], b.at[1]) : samePos(a.at, b.at));

  // 교정 하나가 지금 상태에서 규칙 안인지
  function check(state, c) {
    const n = normalize(c);
    const next = tryApply(state, n);
    const hit = next ? applicable(state).find((k) => sameCorrection(k, n)) : null;
    return { ok: !!hit, rule: hit ? hit.rule : null, article: hit ? hit.article : null, applied: !!next, state: next || state };
  }

  function tally(corrections) {
    const t = { replace: 0, delete: 0, insert: 0, merge: 0 };
    corrections.forEach((c) => { t[c.op]++; });
    return t;
  }

  // 표준 발음 도출: 더 걸릴 규칙이 없을 때까지 ORDER 순서 → 왼쪽 자리부터
  const atKey = (c) => { const p = Array.isArray(c.at) ? c.at[0] : c.at; return p.s * 10 + SLOTS.indexOf(p.slot) * 2 + p.k; };
  function derive(script) {
    const first = start(script);
    let st = first;
    const steps = [];
    for (;;) {
      const cs = applicable(st).sort((a, b) => ORDER.indexOf(a.rule) - ORDER.indexOf(b.rule) || atKey(a) - atKey(b));
      if (!cs.length) break;
      if (steps.length >= 30) throw new Error('규칙이 끝나지 않음: ' + script.text);
      steps.push(cs[0]);
      st = tryApply(st, cs[0]);
    }
    return { pron: reading(st), steps, state: st, before: phonemes(first), after: phonemes(st), change: tally(steps) };
  }

  // 음절 단위 편집 거리. at = 프롬프터 발음(a)에서 다른 음절 번호(a에 없는 음절이면 그 앞 번호)
  function sylDiff(a, b) {
    const A = Array.from(a), B = Array.from(b);
    const d = A.map(() => []).concat([[]]);
    for (let i = 0; i <= A.length; i++) for (let j = 0; j <= B.length; j++) {
      d[i][j] = i === 0 ? j : j === 0 ? i : Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (A[i - 1] === B[j - 1] ? 0 : 1));
    }
    const at = [];
    for (let i = A.length, j = B.length; i > 0 || j > 0;) {
      if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + (A[i - 1] === B[j - 1] ? 0 : 1)) { if (A[i - 1] !== B[j - 1]) at.push(i - 1); i--; j--; }
      else if (i > 0 && d[i][j] === d[i - 1][j] + 1) { at.push(i - 1); i--; }
      else { at.push(Math.max(0, i - 1)); j--; }
    }
    return { n: d[A.length][B.length], at: Array.from(new Set(at)).sort((x, y) => x - y) };
  }

  // 송출 판정: 교정을 차례로 적용하고 신호 하나를 정한다
  function broadcast(script, corrections) {
    const first = start(script);
    let st = first;
    const steps = [], applied = [];
    (corrections || []).forEach((c) => {
      const r = check(st, c);
      steps.push(Object.assign(normalize(c), { ok: r.ok, rule: r.rule, article: r.article }));
      if (r.applied) applied.push(normalize(c));
      st = r.state;
    });
    const read = reading(st);
    const outOfRule = steps.map((x, i) => (x.ok ? -1 : i)).filter((i) => i >= 0);
    const targets = [strip(script.pron)].concat((script.allowed || []).map(strip));
    const res = { kind: 'diff', reading: read, outOfRule, diff: 0, at: [], steps, before: phonemes(first), after: phonemes(st), change: tally(applied) };
    if (targets.includes(read)) res.kind = outOfRule.length ? 'offrule' : 'onair';
    else if ((script.nonstandard || []).some((ns) => strip(ns[0]) === read)) res.kind = 'nonstandard';
    else { const d = sylDiff(read, strip(script.pron)); res.diff = d.n; res.at = d.at; }
    return res;
  }

  // 원고 데이터의 풀이 과정 한 줄 [규칙, op, 자리, 음운] → { rule, ...교정 }
  function parseStep(arr) {
    const [rule, op, at, to] = arr;
    const c = normalize({ op, at: op === 'merge' ? String(at).split('+') : at, to });
    return Object.assign({ rule }, c);
  }

  return { RULES, ORDER, slash, strip, pos, start, surface, reading, phonemes, applicable, apply, check, tally, derive, broadcast, parseStep };
})();
