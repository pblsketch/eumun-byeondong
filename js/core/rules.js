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
//     cuts: [형태소 경계…],             // 음절 사이(길이 = 음절 수 − 1): 'formal'(뒤가 형식 형태소: 조사·어미·접미사)
//                                      //   | 'content'(뒤가 실질 형태소: 합성어·파생어의 어근) | 'space'(띄어 쓴 두 단어)
//                                      //   | 'sino'(한자어 구성 경계: 교과서 설명에 쓰이는 곳만 — 제20항 다만의 '2음절 한자어 + 한자', 결정 0007)
//                                      //   | null(경계 아님·표시 안 함). 화면은 모두 '+'로 그린다.
//     marks: { lateralExc: [경계 번호] } // 낱말 예외 표시: 그 음절 사이의 'ㄴㄹ'은 유음화 대신 ㄹ→[ㄴ](제20항 다만)
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
//
// ══ 판 진행(구현 2단계, 명세 §17) — 아래도 모두 순수 함수(받은 값을 바꾸지 않고 JSON 값만 돌려줌) ══
//
// ── 원고 갈래 kindOf(원고) (명세 §6) ─────────────────────────────────────
//   함정이면 함정 종류('link'|'exception'|'nonstandard'), 아니면 풀이 과정에서 'coda'가 아닌 첫 규칙 id
//   ('nasal'|'r-nasal'|'lateral' — 짓는·놓는 → 'nasal', 막론 → 'r-nasal', 물난리 → 'lateral'), 끝소리 규칙만 쓰면 'coda'.
//   함정도 풀이도 없으면 null.
//
// ── 원고 뽑기 draw(장, 원고 풀, 뺄 id 목록, 시드) → 원고 id 7개(차례 = 감수 차례) (명세 §6, 결정 0012) ──
//   원고 풀에서 그 장 원고만 쓰고, 뺄 id(그 장 지침 예시 = exampleIds(지침들))는 뽑지 않는다.
//   1장: 연음 함정('link') 2 + 일반('coda' 갈래) 5. 일반에 제15항 원고(articles에 '15')가 남아 있으면 적어도 1개.
//   2장: 다만('exception') 1 + 감기('nonstandard') 1 + 일반 5('nasal'·'r-nasal'·'lateral' 갈래가 적어도 1개씩).
//   7개의 차례와 함정 위치는 무작위. 시드 = 수(같은 시드 → 같은 결과) 또는 () => [0, 1) 함수.
//   조건을 채울 수 없으면(원고가 모자람) 오류를 던진다 — 데이터 잘못. 뽑기 조건이 없는 장(3~8장)도 오류.
//   exampleIds(한 장의 지침들) → 예시 원고 id 목록(겹치면 한 번). 지침이 없으면(undefined) [] — GUIDES 없이도 뽑힌다.
//
// ── 쌍둥이 원고 twins(원고, 원고 풀, 뺄 id) → [id…] · twin(…) → id | null (명세 §8-4, 결정 0006 대결에서도 씀) ──
//   같은 장, 풀이 과정의 규칙 차례와 함정 종류가 같고, 표준 발음(strip)이 다른 원고. 뺄 id(이번에 뽑힌 7개)와 자기는 빼고.
//   twin은 원고 풀 차례로 첫째. 후보가 없으면 null(감기 등).
//
// ── 연음 자리 linkSites(상태) → [Pos…] · touchedLink(원고, 교정들) → true|false (명세 §8-3-4) ──
//   연음 자리 = 뒤 음절이 빈 초성이고 사이 경계가 'formal'·null이라 읽을 때 저절로 옮겨지는 종성(겹받침은 두 자리 모두,
//   /ㅇ/은 옮기지 않으므로 아님). 옷이 → 0.co, 닭이 → 0.co·0.co1, 불놀이 → 1.co(놀|이). 겉옷·옷 위(실질·띄어쓰기)는 아님.
//   touchedLink: 교정을 차례로 적용하면서 그때의 연음 자리 받침을 고침표·뺌표로 실제로 바꾼 교정이 있으면 true.
//
// ── 닮은 칸 similarCell(상태, 자리) → 음운 | null (명세 §8-2) ──────────────
//   지금 상태에서 그 자리에 걸리는 규칙(applicable)의 결과 음운. 둘 이상이면 ORDER 앞의 규칙. 걸리는 규칙이 없으면 null
//   (감기 /ㅁ/ → null, 막론 /ㄱ/ 먼저 → null, 막론 /ㄹ/ → 'ㄴ'). 기본 단계에서만 쓰는 것은 화면이 정한다.
//
// ── 감수 지침 GUIDES (js/data/guides.js, window.GUIDES = { 장: [지침…] }) (명세 §7) ──
//   { id: 장 안에서 유일, articles: [이 지침이 공개하는 조항 id(원고 articles와 같은 표기)],
//     rules: [이 지침이 다루는 규칙 id — 일반 예시는 이 가운데 하나 이상을 씀(any-of). 규칙이 없는 지침(연음)은 []],
//     text: { m3: '받침 {b1}은 …', h1: '…' },          // {빈칸 id} 자리. 두 학년의 빈칸 id 집합 = blanks의 키
//     blanks: { b1: { options: [보기 2~4개(빗금 표기)], answer: 정답 보기 번호(0부터), members?: [조건 낱말…] } },
//     examples: [{ id: 원고 id, trap?: 함정 원고면 그 종류(원고 trap과 같음), shows: { 빈칸 id: 조건 낱말 | [조건 낱말…] } }] }
//   members = 예시들이 모두 보여야 할 조건, shows = 그 예시가 보이는 members 낱말.
//
// ── 조건 낱말(members·shows의 어휘 — 이것만 쓴다) hasCondition(원고, 낱말) → true|false ──
//   원고의 처음 상태(start)에서 엔진으로 확인한다. 모르는 낱말은 오류.
//   'coda:X'   어떤 음절 종성이 /X/ 하나(홑받침·쌍받침)       'coda2:XY' 어떤 음절 종성이 겹받침 X+Y
//   'onset:X'  받침 바로 뒤 음절의 초성이 /X/                 'before:X' 받침 /X/ 하나 + 뒤 초성 /ㄹ/(제19항)
//   'cut:K'    받침과 빈 초성 사이 경계가 K('formal'|'content'|'space'|'sino')
//   'link'     연음 자리가 있음(linkSites)                    'exc'      제20항 다만 표시(marks.lateralExc)가 있음
//
// ── 지침 채점 gradeGuides(지침들, 고른 값) → 틀린 칸 수 (명세 §7-4) ──────────
//   고른 값 picks = { 지침 id: { 빈칸 id: 고른 보기 번호 } }. 고르지 않은 칸도 틀린 칸으로 센다. 어느 칸인지는 돌려주지 않는다.
//
// ── 지침 예시 검증 checkGuide(지침, 원고 풀) · checkGuides(한 장의 지침들, 원고 풀) → [문제 문장…] (점검용, 명세 §7-3) ──
//   빈 목록 = 통과. 모양이 틀려도 던지지 않는다. 확인하는 것: 예시 id가 원고에 있음 / 일반 예시는 원고 풀이 과정이 지침 rules를
//   하나 이상 씀(함정 원고면 trap을 적어야 함) / 함정 예시는 원고 trap과 같음 / 빈칸마다 members를 예시 shows가 모두 덮음 /
//   shows 낱말은 그 빈칸 members에 있고 원고에 실제로 있음 / 낱말이 어휘 안 / rules가 엔진 규칙 / articles가 있음 /
//   보기 2~4개·답 번호가 보기 안 / 두 학년 문장의 빈칸 자리 = blanks. checkGuides는 장 안의 지침 id가 겹치지 않는지도 본다.
//
// ── 공개할 조항 revealArticles(장의 지침들, 뽑힌 원고들) → [조항 id…] (명세 §9) ──
//   지침 articles와 원고 articles의 합집합. 차례는 조항 번호 순, '20-다만'은 '20' 바로 뒤.
//
// ── 원고 결과 scriptResult(송출 기록) → 'onair' | 'offrule' | 'skip' (명세 §8-5) ──
//   송출 기록 = 신호 kind 목록(또는 broadcast 결과 목록). 온에어가 한 번이라도 → 'onair'(온에어),
//   성공 없이 마지막이 'offrule' → 'offrule'(규칙 밖), 그 밖(송출 안 함, 마지막이 다름·표준 아님) → 'skip'(넘김).
//
// ── 장 정답 합계 chapterTotals(원고들) → { change: { replace, delete, insert, merge }, count: [표기 합, 발음 합] } (명세 §10) ──
//   원고 데이터의 change·count 합(정답 기준). 학생이 한 교정은 세지 않는다.
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
  const CUT_RANK = { space: 3, content: 2, sino: 2, formal: 1 }; // sino는 판정에 쓰지 않는다(한자음 받침은 ㄱㄴㄹㅁㅂㅇ뿐이라 끝소리 규칙이 걸리지 않음)

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
    if (cuts.length !== syl.length - 1) throw new Error('형태소 경계 수가 음절 사이 수와 다름: ' + script.text);
    cuts.forEach((c, i) => {
      if (c !== null && !(c in CUT_RANK)) throw new Error('모르는 형태소 경계: ' + c + ' (' + script.text + ')');
      if ((c === 'space') !== spaceGaps.includes(i)) throw new Error('띄어쓰기와 space 경계가 어긋남: ' + script.text);
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
  // 아무 음운도 남지 않은 음절은 지우고, 양쪽 형태소 경계 가운데 더 큰 것을 남긴다
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

  // ══ 판 진행(구현 2단계, 명세 §17) ═════════════════════════════════════
  const ruleSeq = (script) => (script.steps || []).map((x) => x[0]);

  // ── 원고 갈래(§6) ─────────────────────────────────────
  function kindOf(script) {
    if (script.trap) return script.trap;
    const seq = ruleSeq(script);
    return seq.find((r) => r !== 'coda') || (seq.length ? 'coda' : null);
  }

  // ── 난수(시드 → 결정적) ───────────────────────────────
  // 시드는 수(같은 시드 → 같은 결과, mulberry32) 또는 () => [0, 1) 함수
  function rng(seed) {
    if (typeof seed === 'function') return seed;
    if (typeof seed !== 'number' || !isFinite(seed)) throw new Error('시드는 수나 난수 함수: ' + seed);
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(list, rand) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.min(i, Math.floor(rand() * (i + 1)));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // ── 원고 뽑기(§6, 결정 0012) ──────────────────────────
  //   traps: 함정 종류별 개수, normal: 일반 원고가 될 갈래, need: 일반 5개에 적어도 1개씩 들어갈 조건(optional = 남아 있을 때만)
  const is15 = (s) => (s.articles || []).includes('15');
  const DRAW = {
    1: { traps: [['link', 2]], normal: ['coda'], need: [{ what: '제15항 원고', test: is15, optional: true }] },
    2: {
      traps: [['exception', 1], ['nonstandard', 1]], normal: ['nasal', 'r-nasal', 'lateral'],
      need: ['nasal', 'r-nasal', 'lateral'].map((k) => ({ what: k + ' 갈래', test: (s) => kindOf(s) === k })),
    },
  };
  const DRAW_NORMAL = 5;
  function draw(ch, pool, exclude, seed) {
    const plan = DRAW[ch];
    if (!plan) throw new Error('뽑기 조건이 없는 장: ' + ch);
    const rand = rng(seed);
    const ex = new Set(exclude || []);
    const seen = new Set();
    const all = (pool || []).filter((s) => s.ch === ch && !ex.has(s.id) && !seen.has(s.id) && seen.add(s.id));
    const picked = [];
    const take = (list, n, what) => {
      const rest = shuffle(list.filter((s) => picked.indexOf(s) < 0), rand);
      if (rest.length < n) throw new Error(`원고가 모자람: ${ch}장 ${what} ${n}개가 필요한데 ${rest.length}개`);
      picked.push(...rest.slice(0, n));
    };
    plan.traps.forEach(([kind, n]) => take(all.filter((s) => s.trap === kind), n, kind + ' 함정'));
    const normal = all.filter((s) => !s.trap && plan.normal.includes(kindOf(s)));
    plan.need.forEach((nd) => {
      const c = normal.filter(nd.test);
      if (c.length || !nd.optional) take(c, 1, nd.what);
    });
    take(normal, DRAW_NORMAL - (picked.length - plan.traps.reduce((n, t) => n + t[1], 0)), '일반 원고');
    return shuffle(picked, rand).map((s) => s.id);
  }
  // 지침 예시 원고 id(뽑기에서 뺄 원고). 지침이 없으면 빈 목록
  function exampleIds(guides) {
    const out = [];
    (guides || []).forEach((g) => (g.examples || []).forEach((e) => { if (out.indexOf(e.id) < 0) out.push(e.id); }));
    return out;
  }

  // ── 쌍둥이 원고(§8-4, 결정 0006) ──────────────────────
  function twins(script, pool, exclude) {
    const ex = new Set(exclude || []);
    const seq = JSON.stringify(ruleSeq(script)), p = strip(script.pron), trap = script.trap || null;
    return (pool || []).filter((s) => s.ch === script.ch && s.id !== script.id && !ex.has(s.id) &&
      (s.trap || null) === trap && JSON.stringify(ruleSeq(s)) === seq && strip(s.pron) !== p).map((s) => s.id);
  }
  const twin = (script, pool, exclude) => twins(script, pool, exclude)[0] || null;

  // ── 연음 자리(§8-3-4) ─────────────────────────────────
  // 뒤 음절이 빈 초성이고 사이 경계가 formal·null이라 읽을 때 저절로 옮겨지는 종성(겹받침은 두 자리 모두)
  function linkSites(state) {
    const out = [];
    state.syl.forEach((a, i) => {
      const b = state.syl[i + 1];
      if (!b || b.on != null || !b.nu || !a.nu || !a.co.length) return;
      const cut = state.cuts[i];
      if (cut !== 'formal' && cut !== null) return;
      if (a.co[a.co.length - 1] === 'ㅇ') return; // /ㅇ/은 옮기지 않는다(surface와 같음)
      a.co.forEach((_, k) => out.push({ s: i, slot: 'co', k }));
    });
    return out;
  }
  // 교정들을 차례로 적용하면서, 그때의 연음 자리 받침을 고치거나 뺀 교정(실제로 적용된 것)이 있는지
  function touchedLink(script, corrections) {
    let st = start(script);
    for (const c of corrections || []) {
      const n = normalize(c);
      const next = tryApply(st, n);
      if (next && (n.op === 'replace' || n.op === 'delete') && linkSites(st).some((p) => samePos(p, n.at))) return true;
      st = next || st;
    }
    return false;
  }

  // ── 닮은 칸(§8-2): 그 자리에 걸리는 규칙의 결과 음운 하나 또는 null ──
  function similarCell(state, at) {
    const p = pos(at);
    const hit = applicable(state).filter((c) => samePos(c.at, p))
      .sort((a, b) => ORDER.indexOf(a.rule) - ORDER.indexOf(b.rule))[0];
    return hit ? hit.to : null;
  }

  // ── 조건 낱말(지침 members·shows의 어휘) ───────────────
  const CUT_KINDS = ['formal', 'content', 'space', 'sino'];
  function parseCond(word) {
    if (word === 'link' || word === 'exc') return { type: word };
    if (typeof word !== 'string') return null;
    let m = /^(coda|onset|before):(.)$/.exec(word);
    if (m) return isConsonant(m[2]) ? { type: m[1], a: m[2] } : null;
    m = /^coda2:(.)(.)$/.exec(word);
    if (m) return isConsonant(m[1]) && isConsonant(m[2]) ? { type: 'coda2', a: m[1], b: m[2] } : null;
    m = /^cut:(.+)$/.exec(word);
    if (m) return CUT_KINDS.includes(m[1]) ? { type: 'cut', a: m[1] } : null;
    return null;
  }
  // 원고의 처음 상태에 그 조건이 있는지(모르는 낱말은 오류)
  function hasCondition(script, word) {
    const c = parseCond(word);
    if (!c) throw new Error('모르는 조건 낱말: ' + word);
    const st = start(script), syl = st.syl;
    const nextOn = (i) => (syl[i + 1] ? syl[i + 1].on : undefined);
    switch (c.type) {
      case 'coda': return syl.some((y) => y.co.length === 1 && y.co[0] === c.a);
      case 'coda2': return syl.some((y) => y.co.length === 2 && y.co[0] === c.a && y.co[1] === c.b);
      case 'onset': return syl.some((y, i) => y.co.length > 0 && nextOn(i) === c.a);
      case 'before': return syl.some((y, i) => y.co.length === 1 && y.co[0] === c.a && nextOn(i) === 'ㄹ');
      case 'cut': return syl.some((y, i) => y.co.length > 0 && nextOn(i) === null && st.cuts[i] === c.a);
      case 'link': return linkSites(st).length > 0;
      default: return ((st.marks && st.marks.lateralExc) || []).length > 0; // exc
    }
  }

  // ── 지침 채점(§7-4): 틀린 칸 수(고르지 않은 칸도 틀린 칸) ──
  function gradeGuides(guides, picks) {
    let wrong = 0;
    (guides || []).forEach((g) => {
      const mine = (picks && picks[g.id]) || {};
      Object.keys(g.blanks || {}).forEach((b) => { if (mine[b] !== g.blanks[b].answer) wrong++; });
    });
    return wrong;
  }

  // ── 지침 예시 검증(§7-3, 점검용): 문제 목록(빈 목록 = 통과). 모양이 틀려도 던지지 않는다 ──
  const holes = (t) => (typeof t === 'string' ? Array.from(new Set((t.match(/\{([A-Za-z0-9_-]+)\}/g) || []).map((x) => x.slice(1, -1)))).sort() : null);
  const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
  function checkGuide(guide, pool) {
    const errs = [];
    const g = isObj(guide) ? guide : {};
    const n = '[' + g.id + ']';
    const bad = (m) => errs.push(n + ' ' + m);
    if (typeof g.id !== 'string' || !g.id) bad('id가 없음');
    if (!Array.isArray(g.articles) || !g.articles.length || !g.articles.every((a) => typeof a === 'string')) bad('공개할 조항 articles가 없음');
    const rules = Array.isArray(g.rules) ? g.rules : (bad('rules가 목록이 아님'), []);
    rules.forEach((r) => { if (!RULES[r]) bad('모르는 규칙 id: ' + r); });
    const blanks = isObj(g.blanks) ? g.blanks : {};
    const keys = Object.keys(blanks).sort();
    if (!keys.length) bad('빈칸이 없음');
    const text = isObj(g.text) ? g.text : {};
    ['m3', 'h1'].forEach((gr) => {
      const h = holes(text[gr]);
      if (!h) bad(`text.${gr} 문장이 없음`);
      else if (JSON.stringify(h) !== JSON.stringify(keys)) bad(`text.${gr}의 빈칸 자리 ${JSON.stringify(h)} ≠ 빈칸 ${JSON.stringify(keys)}`);
    });
    keys.forEach((k) => {
      const b = blanks[k] || {};
      const o = b.options;
      if (!Array.isArray(o) || o.length < 2 || o.length > 4 || !o.every((x) => typeof x === 'string' && x)) bad(`빈칸 ${k}: 보기는 2~4개`);
      else if (!(Number.isInteger(b.answer) && b.answer >= 0 && b.answer < o.length)) bad(`빈칸 ${k}: 답 번호가 보기 밖`);
      if (b.members !== undefined) {
        if (!Array.isArray(b.members)) bad(`빈칸 ${k}: members가 목록이 아님`);
        else b.members.forEach((w) => { if (!parseCond(w)) bad(`빈칸 ${k}: 모르는 조건 낱말 ${w}`); });
      }
    });
    const byIdP = {};
    (pool || []).forEach((s) => { byIdP[s.id] = s; });
    const covered = {};
    const exs = Array.isArray(g.examples) ? g.examples : (bad('examples가 목록이 아님'), []);
    if (Array.isArray(g.examples) && !exs.length) bad('예시가 없음');
    exs.forEach((e, i) => {
      const en = `예시 ${i + 1}(${e && e.id})`;
      const s = e && byIdP[e.id];
      if (!s) { bad(en + ': 원고에 없는 id'); return; }
      if (e.trap) {
        if (s.trap !== e.trap) bad(`${en}: 함정 종류 ${e.trap} ≠ 원고 ${s.trap || '없음'}`);
      } else {
        if (s.trap) bad(`${en}: 함정 원고(${s.trap})인데 trap이 없음`);
        if (!ruleSeq(s).some((r) => rules.includes(r))) bad(`${en}: 풀이 과정이 지침 규칙 ${JSON.stringify(rules)}을 쓰지 않음`);
      }
      const shows = isObj(e.shows) ? e.shows : {};
      if (e.shows !== undefined && !isObj(e.shows)) bad(en + ': shows가 객체가 아님');
      Object.keys(shows).forEach((k) => {
        if (!blanks[k]) { bad(`${en}: 없는 빈칸 ${k}`); return; }
        const members = Array.isArray(blanks[k].members) ? blanks[k].members : [];
        [].concat(shows[k]).forEach((w) => {
          if (!parseCond(w)) { bad(`${en}: 모르는 조건 낱말 ${w}`); return; }
          if (members.indexOf(w) < 0) { bad(`${en}: ${w}가 빈칸 ${k}의 members에 없음`); return; }
          let ok = false;
          try { ok = hasCondition(s, w); } catch (err) { bad(`${en}: ${err.message}`); return; }
          if (!ok) { bad(`${en}: 원고에 ${w}가 없음`); return; }
          (covered[k] = covered[k] || []).push(w);
        });
      });
    });
    keys.forEach((k) => {
      const members = blanks[k] && Array.isArray(blanks[k].members) ? blanks[k].members : [];
      members.forEach((w) => { if ((covered[k] || []).indexOf(w) < 0) bad(`빈칸 ${k}: ${w}를 보이는 예시가 없음`); });
    });
    return errs;
  }
  // 한 장의 지침 묶음: 지침 id가 겹치지 않고 지침마다 checkGuide 통과
  function checkGuides(guides, pool) {
    const list = Array.isArray(guides) ? guides : [];
    const errs = Array.isArray(guides) ? [] : ['지침 묶음이 목록이 아님'];
    const ids = list.map((g) => g && g.id);
    ids.forEach((id, i) => { if (ids.indexOf(id) !== i) errs.push('[' + id + '] 장 안에서 지침 id가 겹침'); });
    list.forEach((g) => errs.push(...checkGuide(g, pool)));
    return errs;
  }

  // ── 공개할 조항(§9): 번호 순, '20-다만'은 '20' 바로 뒤 ──
  function articleKey(a) {
    const m = /^(\d+)(.*)$/.exec(a);
    return m ? [+m[1], m[2]] : [Infinity, String(a)];
  }
  function revealArticles(guides, scripts) {
    const set = [];
    const add = (a) => { if (set.indexOf(a) < 0) set.push(a); };
    (guides || []).forEach((g) => (g.articles || []).forEach(add));
    (scripts || []).forEach((s) => (s.articles || []).forEach(add));
    return set.sort((x, y) => {
      const a = articleKey(x), b = articleKey(y);
      return a[0] - b[0] || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0);
    });
  }

  // ── 원고 결과(§8-5): 송출 신호 기록 → 'onair' | 'offrule' | 'skip'(넘김) ──
  function scriptResult(log) {
    const kinds = (log || []).map((x) => (typeof x === 'string' ? x : x && x.kind));
    if (kinds.includes('onair')) return 'onair';
    return kinds[kinds.length - 1] === 'offrule' ? 'offrule' : 'skip';
  }

  // ── 장 정답 합계(§10): 원고 change·count의 합 ──────────
  function chapterTotals(scripts) {
    const change = { replace: 0, delete: 0, insert: 0, merge: 0 }, count = [0, 0];
    (scripts || []).forEach((s) => {
      OPS.forEach((op) => { change[op] += (s.change && s.change[op]) || 0; });
      count[0] += s.count[0]; count[1] += s.count[1];
    });
    return { change, count };
  }

  return {
    RULES, ORDER, slash, strip, pos, start, surface, reading, phonemes, applicable, apply, check, tally, derive, broadcast, parseStep,
    kindOf, draw, exampleIds, twin, twins, linkSites, touchedLink, similarCell, hasCondition, gradeGuides, checkGuide, checkGuides,
    revealArticles, scriptResult, chapterTotals,
  };
})();
