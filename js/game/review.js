'use strict';
// ───────────────────────────────────────────────────────────────
// 감수 화면 G.screens.review — 원고 7개를 교정 부호 넷으로 고치고 송출한다(명세 §8 · §11 · §14 · §15)
// ───────────────────────────────────────────────────────────────
//   불러오는 순서: util → data(sounds · scripts · guides · text) → core(hangul · rules · audio · save)
//     → game(blocks · chart · howto · 이 파일 · … · app.js) → main.   모양: css/review.css   점검: tests/check-review.mjs
//   새로 만든 화면이다(음운 해전에는 같은 화면이 없음). 화면 등록 방식은 js/game/app.js 머리 주석,
//   만드는 방식(G.util.el로 짓기, 한 줄 안내 · 묻기 창)은 js/game/guide.js · app.js와 같다.
//   부품: 음절 블록 G.blocks(js/game/blocks.js), 조음 도표 G.chart(js/game/chart.js) — 둘은 서로 부르지 않고 이 화면이 엮는다.
//
// ── 들어오는 값 ─────────────────────────────────────────────────────────
//   G.app.go('review', { run })   run = 감수 단계 진행 장(js/core/save.js 머리 주석의 ChapterRun).
//   값이 없으면 G.save.loadChapter(). 진행 장이 없으면 시작 화면, 다른 단계면 그 단계 화면으로 간다.
//   지금 원고 = run.ids[run.done.length], 그 기록 = run.cur(교정 · 송출 신호 · 도움). 새로 고침하면 교정까지 그대로 돌아온다.
//
// ── 화면 ────────────────────────────────────────────────────────────────
//   머리: 장 · 단계 | 원고 n/7 | 음운 수 '표기 n → 지금 m' | 감수실 그림 자리 | [게임 방법] [소리]
//   책상(화면 너비 가득): 원고 표기 · 감수 도장 · 음절 블록(G.blocks) · 교정 부호 넷 · 한 줄 자리(.rw-say — 안내 · 알림 · 신호 ·
//     연음 안내가 차례로)
//   그 아래(가로 배치는 나란히, 휴대폰 세로는 차례로): 프롬프터(ON AIR 램프 · 아나운서 그림 자리 · 아나운서가 읽는 발음 · 신호 배지)
//     · 감수 기록 · 도움. 그림 자리 둘은 빈 틀(명세 §14 — aria-label만, 휴대폰 세로에서는 숨김)
//   아래: [되돌리기] [다시 감수] [도움] [송출] [다음 원고 / 조항 공개로]
//   판(.rw-sheet — 가로 배치는 화면 아래에 떠 있고, 휴대폰 세로는 책상 안에 펼쳐짐): 조음 도표(고침표 · 합침표) 또는
//     넣을 음운 고르기(/ㄴ/ · /j/)
//
// ── 판정은 모두 G.rules에서(명세 원칙 1) — 여기서 규칙을 다시 만들지 않는다 ──────────
//   지금 상태 = 교정들을 G.rules.apply로 차례로 적용한 것. 할 수 없는 교정은 apply가 받은 상태를 그대로 돌려준다
//     → 넣을 빈자리 없음 · 이웃 아님은 한 줄로 알리고 기록하지 않는다(원칙 3의 예외). 그 밖의 교정은 막지 않는다.
//   합침표: 두 음운을 자리 차례(음절 → 초성 · 반모음 · 중성 · 종성)로 놓고, 결과가 들어갈 표(자음 · 모음 · 반모음)는
//     G.rules.apply에 대표 음운을 넣어 봐서 고른다(받는 표가 하나도 없으면 이웃이 아님). 결과 음운은 학생이 고른다.
//   송출 = G.rules.broadcast(신호 kind · 다른 음절 at · 규칙 밖 교정 outOfRule), 연음 안내 = G.rules.touchedLink,
//   닮은 칸 = G.rules.similarCell(1 · 2장 기본 단계만 — 명세 §8-2 · §19), 원고 결과 = G.rules.scriptResult,
//   도움 ③ 풀이 예시 = G.rules.twin(이 원고, 원고 풀, 이번에 뽑힌 7개) — 이 원고의 풀이는 보이지 않는다.
//
// ── 아직 얻지 않은 답은 화면 글 · DOM · aria 어디에도 두지 않는다(명세 원칙 5) ──────────
//   이 원고의 표준 발음 · 비표준 발음 · 함정 여부 · 갈래를 DOM에 적지 않는다. 프롬프터는 송출한 뒤 학생이 교정한 발음만 보인다.
//   심화 단계 경계는 G.blocks가 그리지 않는다(level을 꼭 넘김). 닮은 칸도 심화에서는 넘기지 않는다.
//
// ── 저장 시점(명세 §11) — 모두 G.save.saveChapter(run) ───────────────────
//   교정 · 되돌리기 · 다시 감수 · 송출 · 도움(센 것, 처음 연 단계 — cur.open) · 원고 넘김. 7번째 원고가 끝나면 phase 'reveal' · cur null ·
//   done 7개로 저장하고 조항 공개 화면으로 간다(G.app.go('reveal', { run })).
//   송출하면 그 모습(cur.last — 신호 · 읽은 발음 · 다른 음절 · 규칙 밖 교정 · 그때의 교정 수 n)을 저장하고, 새로 고친 뒤 그 모습 그대로 보인다.
//   송출 뒤 교정이 바뀌면 n을 null로 — 규칙 밖 표시 · 감수 도장은 송출한 그대로일 때만 다시 보인다(프롬프터 발음 · 배지는 남음).
//
// ── 묻기 창(넘김 확인)은 모달(G.util.modal — 뒤 화면 inert, Tab은 창 안에서, 닫으면 여는 단추로 초점). 화면을 떠나면
//   이 화면에서 연 게임 방법 창도 닫는다.
//
// ── 소리(명세 §15) ──────────────────────────────────────────────────────
//   배경 음악 'review', 효과음 mark(교정) · send(송출) · 신호 kind 그대로(G.audio.sfx(result.kind)). 소리 장치 문제로 멈추지 않게 감싼다.
//
// ── 조정 가능한 기본값(명세 §20) ──────────────────────────────────────────
//   SEND_MS 송출 연출 전체(1.5초 안쪽), LINK_MS 신호 줄이 연음 안내로 바뀌기까지(약 1.5초). 움직임 줄이기면 연출 없이 곧바로.
//
// ── 점검 전용 G.review.debug(게임 화면에 단추 · 글로 드러내지 않음 — 명세 §18) ─────────
//   script() 지금 원고 · cur() 지금 원고 기록(복사본) · run() 진행 장(복사본) · state() 지금 상태(복사본) · busy() 송출 연출 중인지
//   load(id)  아무 원고나 '연습 자리'로 띄운다(지침 예시 원고처럼 뽑히지 않는 원고 — 저장하지 않음). [다음 원고]나 exit()이면 돌아옴
//   exit()    연습 자리에서 원래 원고로
//   solve()   지금 원고의 풀이 과정(원고 데이터 steps)을 교정으로 넣는다(점검의 빠른 진행용 — 저장함)
(function () {
  const U = G.util, el = U.el;
  const T = () => window.TEXT;
  const SEND_MS = 1400;
  const LINK_MS = 1500;
  const SLOTS = ['on', 'gl', 'nu', 'co'];
  const PART_OF = { on: 'consonant', co: 'consonant', nu: 'vowel', gl: 'glide' };   // 누른 자리에 맞는 도표(명세 §8-2)
  const PROBE = { consonant: 'ㄱ', vowel: 'ㅏ', glide: 'j' };                         // 합침표: 받는 표를 엔진에 물어볼 대표 음운
  const INSERTS = [['ㄴ', 'onset'], ['j', 'glide']];                                   // 넣음표: /ㄴ/은 뒤 음절 초성, j는 반모음 자리
  const MARKS = ['replace', 'delete', 'insert', 'merge'];

  const sound = U.sound, fillNodes = U.fillNodes;
  const keepPh = (s) => U.keepPh(s, 'rw-ph'); // 음운 표기(/ㄱ/)를 줄에서 끊지 않는 덩어리로
  const copy = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)));
  const freshCur = () => ({ corrections: [], kinds: [], sends: 0, help: [], helped: false, open: 0, last: null });
  const posOf = (p) => G.rules.pos(p);
  const samePos = (a, b) => a.s === b.s && a.slot === b.slot && a.k === b.k;
  const seqKey = (p) => p.s * 10 + SLOTS.indexOf(p.slot) * 2 + p.k;   // 자리 차례(음절 → 초성 · 반모음 · 중성 · 종성)
  // 상태에서 그 자리의 음운(없으면 null) — 그리기 · 기록용(판정 아님)
  function phonemeAt(st, p) {
    const y = st.syl[p.s];
    if (!y) return null;
    return p.slot === 'co' ? (y.co[p.k] || null) : (y[p.slot] || null);
  }
  // 감수 기록 한 줄에 넣을 값(교정 전 상태에서 읽음)
  function logInfo(st, c) {
    if (c.op === 'merge') {
      const ab = c.at.map(posOf);
      return { op: 'merge', from: [phonemeAt(st, ab[0]), phonemeAt(st, ab[1])], to: c.to };
    }
    const p = posOf(c.at);
    if (c.op === 'insert') return { op: 'insert', to: c.to };
    if (c.op === 'delete') return { op: 'delete', from: phonemeAt(st, p) };
    return { op: 'replace', from: phonemeAt(st, p), to: c.to };
  }
  // 교정들을 차례로 적용 → { state, lines(감수 기록 줄) }
  function replay(script, cs) {
    let st = G.rules.start(script);
    const lines = (cs || []).map((c, i) => {
      const line = G.text.logLine(i + 1, logInfo(st, c));
      st = G.rules.apply(st, c);
      return line;
    });
    return { state: st, lines };
  }
  let view = null; // 지금 열린 감수 화면(점검 전용 debug가 씀)

  function createView(root, run) {
    const R = T().review, H = T().help, C = T().common;
    const grade = run.grade === 'h1' ? 'h1' : 'm3';
    const level = run.level === 'advanced' ? 'advanced' : 'basic';
    const likeOn = level === 'basic' && (run.ch === 1 || run.ch === 2); // 닮은 칸: 1 · 2장 기본 단계만
    const by = {};
    (window.SCRIPTS || []).forEach((s) => { by[s.id] = s; });
    if (!run.cur) run.cur = freshCur();
    if (!Array.isArray(run.done)) run.done = [];

    // 지금 원고 자리 S와 화면 상태
    let S = null;            // { script, cur, sandbox, state, from }
    let real = null;         // 연습 자리에 있을 때 원래 원고 { script, cur }
    let mode = null;         // 고른 교정 부호
    let pick = null;         // 고침표로 누른 자리
    let mergeA = null;       // 합침표 첫 음운 자리
    let mergePair = null;    // 합침표 두 자리(도표가 열림)
    let gapP = null;         // 넣음표로 누른 틈
    let outRule = [];        // 마지막 송출의 규칙 밖 교정 번호(교정이 바뀌면 지움)
    let busy = false, finalize = null, timers = [], sayToken = 0;
    let helpOpen = false, helpView = 0;
    let blocks = null, confirmEl = null, releaseConfirm = null;
    let alive = true;

    function later(fn, ms) { const id = setTimeout(() => { timers = timers.filter((x) => x !== id); if (alive) fn(); }, ms); timers.push(id); }
    function clearTimers() { timers.forEach((id) => clearTimeout(id)); timers = []; }

    // ── 뼈대 ──
    const btn = (act, glyph, label, onClick, cls) => el('button', {
      type: 'button', class: 'app-btn rw-btn' + (cls ? ' ' + cls : ''), 'data-act': act, onclick: onClick,
    }, [glyph ? U.glyph(glyph, 'glyph rw-btn-ico') : null, el('span', { class: 'rw-btn-label' }, label)]);

    const kicker = el('p', { class: 'rw-kicker' }, G.text.t('common.chapterLevel', { chapter: G.text.chapterTitle(run.ch), level: G.text.levelName(level) }));
    const noEl = el('h1', { class: 'app-h1 rw-no' });
    const countVal = el('span', { class: 'rw-count-val' });
    const countEl = el('p', { class: 'rw-count' }, [el('span', { class: 'rw-count-name' }, R.header.count), countVal]);
    const soundBtn = el('button', { type: 'button', class: 'app-btn rw-tool rw-sound', 'data-act': 'rw-sound', onclick: () => toggleSound() });
    const howtoBtn = G.howto.button('rw-tool rw-howto', () => ({ grade }), R.buttons.howto);

    const scriptText = el('p', { class: 'rw-script-text' });
    const stamp = el('div', { class: 'rw-stamp', hidden: true }, [U.glyph('onair', 'glyph rw-stamp-ico'), el('span', { class: 'rw-stamp-text' }, R.stamp)]);
    const blocksHost = el('div', { class: 'rw-blocks' });
    const markBtns = MARKS.map((m) => el('button', {
      type: 'button', class: 'rw-mark', 'data-mark': m, 'aria-pressed': 'false', onclick: () => pickMode(m),
    }, [U.glyph(m, 'glyph rw-mark-ico'), el('span', { class: 'rw-mark-name' }, R.marks[m])]));
    const sayEl = el('p', { class: 'rw-say', role: 'status', 'aria-live': 'polite' });

    const lamp = el('span', { class: 'rw-lamp', 'aria-hidden': 'true' }, R.onAir);
    const prompter = el('div', { class: 'rw-prompter' });
    const badge = el('p', { class: 'rw-badge', hidden: true });
    // 그림 자리(이번에는 빈 틀 — 명세 §14): 아나운서는 프롬프터 옆, 감수실은 머리 가운데. 글 없이 aria-label만, 휴대폰 세로에서는 숨김
    const art = (cls, label) => el('div', { class: 'rw-art ' + cls, role: 'img', 'aria-label': label }, U.glyph('image', 'glyph rw-art-ico'));
    const booth = el('section', { class: 'rw-booth', 'aria-label': R.prompter }, [
      el('div', { class: 'rw-booth-bar' }, [lamp, el('span', { class: 'rw-booth-name' }, R.prompter)]),
      el('div', { class: 'rw-booth-row' }, [art('rw-art-announcer', T().images.announcer), el('div', { class: 'rw-booth-screen' }, [prompter, badge])]),
    ]);

    const logMark = el('span', { class: 'rw-log-mark', hidden: true }, [U.glyph('offrule', 'glyph rw-log-mark-ico'), R.offruleMark]);
    const logList = el('ol', { class: 'rw-log-list' });
    const logBox = el('section', { class: 'rw-log' }, [el('h2', { class: 'rw-h2' }, [el('span', null, R.log.title), logMark]), logList]);

    const helpSteps = [1, 2, 3].map((n) => el('button', {
      type: 'button', class: 'rw-help-step', 'data-step': String(n), 'aria-pressed': 'false', onclick: () => openHelp(n),
    }, G.text.fill(H.stepLabel, { no: G.text.circled(n), name: H.steps[n] })));
    const helpBody = el('div', { class: 'rw-help-body', 'aria-live': 'polite' });
    const helpBox = el('section', { class: 'rw-help', hidden: true, 'aria-label': H.title }, [
      el('div', { class: 'rw-help-head' }, [
        el('h2', { class: 'rw-h2' }, [U.glyph('help', 'glyph rw-h2-ico'), H.title]),
        el('button', { type: 'button', class: 'app-btn rw-help-close', onclick: () => toggleHelp(false) }, [U.glyph('close', 'glyph rw-btn-ico'), C.close]),
      ]),
      el('p', { class: 'rw-help-note' }, H.noPenalty),
      el('div', { class: 'rw-help-steps', role: 'group' }, helpSteps),
      helpBody,
    ]);

    const undoBtn = btn('rw-undo', 'undo', R.buttons.undo, () => undo());
    const redoBtn = btn('rw-redo', 'script', R.buttons.redo, () => redo());
    redoBtn.hidden = true;
    const helpBtn = btn('rw-help', 'help', R.buttons.help, () => toggleHelp());
    const sendBtn = btn('rw-send', 'send', R.buttons.broadcast, () => broadcast());
    const nextBtn = btn('rw-next', 'next', R.buttons.next, () => next());
    const nextLabel = nextBtn.querySelector('.rw-btn-label');

    // 떠 있는 판: 조음 도표 · 넣을 음운
    const chartHost = el('div', { class: 'rw-chart' });
    const insBtns = INSERTS.map(([id, where]) => el('button', {
      type: 'button', class: 'rw-ins', 'data-id': id,
      'aria-label': id === 'j' ? G.text.term(grade, 'glide', 'j') : G.text.phoneme(id),
      onclick: () => insertPick(id, where),
    }, G.text.phoneme(id)));
    //   안내 '넣을 음운을 골라 주세요'는 한 줄 자리(.rw-say)에 나오므로 여기서는 화면에 다시 쓰지 않고 묶음의 읽기 이름으로만 둔다
    const insTitleId = 'rw-ins-title-' + Date.now();
    const insHost = el('div', { class: 'rw-ins-pick', role: 'group', 'aria-labelledby': insTitleId, hidden: true }, [
      el('p', { class: 'rw-ins-title sr-only', id: insTitleId }, R.prompt.insertPick),
      el('div', { class: 'rw-ins-row' }, insBtns),
      el('div', { class: 'rw-sheet-bar' }, el('button', { type: 'button', class: 'app-btn rw-sheet-close', onclick: () => cancelPick() }, [U.glyph('close', 'glyph rw-btn-ico'), C.close])),
    ]);
    const sheetIn = el('div', { class: 'rw-sheet-in' }, [chartHost, insHost]);
    const sheet = el('div', { class: 'rw-sheet', hidden: true }, sheetIn);
    const chart = G.chart.create(chartHost, { grade, onPick: (p) => chartPick(p), onClose: () => cancelPick() });

    const wrap = el('div', { class: 'rw' }, [
      el('header', { class: 'rw-head' }, [
        el('div', { class: 'rw-head-main' }, [kicker, el('div', { class: 'rw-head-row' }, [noEl, countEl])]),
        art('rw-art-room', T().images.room),
        el('div', { class: 'rw-tools' }, [howtoBtn, soundBtn]),
      ]),
      el('div', { class: 'rw-main' }, [
        el('section', { class: 'rw-desk' }, [
          el('div', { class: 'rw-script' }, [el('span', { class: 'rw-script-label' }, [U.glyph('script', 'glyph rw-script-ico'), R.scriptLabel]), scriptText, stamp]),
          blocksHost,
          el('div', { class: 'rw-marks', role: 'group' }, markBtns),
          sayEl,
          sheet,
        ]),
        el('div', { class: 'rw-side' }, [booth, logBox, helpBox]),
      ]),
      el('footer', { class: 'rw-foot' }, [undoBtn, redoBtn, helpBtn, sendBtn, nextBtn]),
    ]);
    root.appendChild(wrap);

    // ── 휴대폰 세로: 한 줄에 안 들어가는 원고(4음절 이상 등)는 두 줄로(명세 §14) ──
    //   G.blocks split 'auto' = 한 줄에 들어가지 않을 때만 나눈다(너비가 바뀌면 다시). 가로 배치는 책상이 화면 너비 가득이라
    //   4음절도 한 줄에 들고, 좁은 가로 화면에서만 같은 방식으로 나뉜다. mq는 판(.rw-sheet)의 배치에 쓴다.
    const mq = window.matchMedia ? window.matchMedia(G.app.PORTRAIT_Q) : null;

    function onKey(e) {
      if (e.key !== 'Escape' || (G.howto.current && G.howto.current())) return;
      if (confirmEl) { e.stopPropagation(); closeConfirm(); } else if (!sheet.hidden) { e.stopPropagation(); cancelPick(); }
    }
    document.addEventListener('keydown', onKey, true);

    // ── 한 줄 자리(안내 · 알림 · 신호 · 연음 안내가 차례로, 명세 §8-3-4 · §13) ──
    function say(content, kind) {
      sayToken++;
      U.clear(sayEl);
      U.append(sayEl, content);
      sayEl.className = 'rw-say' + (kind ? ' is-' + kind : '');
    }
    const promptText = () => (mode ? R.prompt[mode] : R.prompt.none);

    // ── 저장(연습 자리는 저장하지 않음) ──
    function save() {
      if (S.sandbox) return;
      run.cur = S.cur;
      G.save.saveChapter(run);
    }

    // ── 원고 하나 띄우기 ──
    function setScript(script, cur, sandbox) {
      flush();
      clearTimers();
      closeConfirm();
      S = { script, cur, sandbox: !!sandbox, state: null, from: G.rules.phonemes(G.rules.start(script)) };
      mode = null; outRule = []; helpView = 0;
      resetPicks();
      closeSheet();
      toggleHelp(false);
      U.clear(helpBody);
      scriptText.textContent = script.text;
      stamp.hidden = true;
      setLamp(false);
      if (blocks) blocks.destroy();
      blocks = G.blocks.create(blocksHost, { grade, level, split: 'auto', caption: true, label: R.scriptLabel, onTap: (p) => onTap(p) });
      refresh();
      // 새로 고침 뒤: 마지막 송출의 모습 그대로 — 그때 프롬프터에 보인 발음 · 신호 배지(도움 ①이 이 발음에 위치를 표시).
      //   교정이 송출 때 그대로일 때만(last.n === 교정 수) 규칙 밖 표시와 감수 도장도 — 바뀌었으면 송출한 직후 교정을 바꾼 때와 같게 지움
      U.clear(prompter);
      badge.hidden = true;
      const last = cur.last;
      if (last) {
        const same = sentAsIs();
        fillPrompter(Array.from(last.reading), false);
        showBadge(last.kind);
        stamp.hidden = !(same && last.kind === 'onair');
        outRule = same && last.kind === 'offrule' ? last.outOfRule.slice() : [];
        refresh();
      }
      say(promptText());
    }

    // ── 다시 그리기(교정 · 되돌리기 · 모드가 바뀔 때마다) ──
    function refresh() {
      const r = replay(S.script, S.cur.corrections);
      S.state = r.state;
      blocks.render(r.state);
      blocks.setPicked(mergePair || (mergeA ? [mergeA] : pick ? [pick] : null));
      blocks.setMode(mode === 'insert' ? 'gap' : mode ? 'slot' : null);
      const no = Math.min(run.done.length + 1, run.ids.length);
      noEl.textContent = G.text.t('review.header.script', { i: no, n: run.ids.length });
      countVal.textContent = G.text.t('review.header.countValue', { from: S.from, now: G.rules.phonemes(r.state) });
      // 감수 기록
      U.clear(logList);
      if (!r.lines.length) logList.appendChild(el('li', { class: 'rw-log-empty' }, R.log.empty));
      r.lines.forEach((line, i) => {
        const off = outRule.indexOf(i) >= 0;
        logList.appendChild(el('li', { class: 'rw-log-item' + (off ? ' is-offrule' : '') }, [
          el('span', { class: 'rw-log-line' }, keepPh(line)),
          off ? el('span', { class: 'rw-log-tag' }, [U.glyph('offrule', 'glyph rw-log-tag-ico'), R.offruleMark]) : null,
        ]));
      });
      logMark.hidden = !outRule.length;
      // 교정 부호
      markBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.getAttribute('data-mark') === mode)));
      // 단추: 온에어 뒤 [다음 원고]가 앞에, 규칙 밖 뒤 [다시 감수]가 앞에(명세 §8-3)
      const onair = S.cur.kinds.indexOf('onair') >= 0;
      const offrule = !!(S.cur.last && S.cur.last.kind === 'offrule') && S.cur.corrections.length > 0;
      redoBtn.hidden = !offrule;
      redoBtn.classList.toggle('is-primary', offrule);
      redoBtn.classList.toggle('is-front', offrule);
      nextBtn.classList.toggle('is-primary', onair);
      nextBtn.classList.toggle('is-front', onair);
      sendBtn.classList.toggle('is-primary', !onair && !offrule);
      const last = !S.sandbox && run.done.length + 1 >= run.ids.length;
      nextLabel.textContent = last ? R.buttons.toReveal : R.buttons.next;
      helpBtn.setAttribute('aria-expanded', String(helpOpen));
      helpBtn.classList.toggle('is-on', helpOpen);
      paintSound();
      paintHelp();
    }

    // ── 교정 부호 고르기 ──
    function pickMode(m) {
      mode = mode === m ? null : m;
      resetPicks();
      closeSheet();
      say(promptText());
      refresh();
    }
    function resetPicks() { pick = null; mergeA = null; mergePair = null; gapP = null; }

    // ── 블록을 누름 ──
    function onTap(p) {
      if (!mode) { say(R.prompt.none); return; }
      if (mode === 'insert') {
        if (p.type !== 'gap') { say(R.prompt.insert); return; }
        resetPicks();
        gapP = p;
        openInsert();
        say(R.prompt.insertPick);
        return;
      }
      if (p.type !== 'slot') { say(promptText()); return; }
      if (mode === 'merge' && mergePair) { mergePair = null; mergeA = null; closeSheet(); }
      if (p.empty) { say(mode === 'merge' && mergeA ? R.prompt.mergeSecond : promptText()); return; }
      const at = posOf(p.at);
      if (mode === 'delete') { commit({ op: 'delete', at }); return; }
      if (mode === 'replace') {
        pick = at;
        blocks.setPicked([at]);
        let like = [];
        if (likeOn) { const id = G.rules.similarCell(S.state, at); if (id) like = [id]; }
        openChart({ parts: [PART_OF[at.slot]], current: p.id, like });
        say(R.prompt.replaceChart);
        return;
      }
      // 합침표
      if (!mergeA) { mergeA = at; blocks.setPicked([at]); say(R.prompt.mergeSecond); return; }
      if (samePos(mergeA, at)) { say(R.notice.samePick, 'notice'); return; }
      const pair = [mergeA, at].sort((a, b) => seqKey(a) - seqKey(b));
      const parts = ['consonant', 'vowel', 'glide'].filter((part) => G.rules.apply(S.state, { op: 'merge', at: pair, to: PROBE[part] }) !== S.state);
      if (!parts.length) {
        resetPicks();
        blocks.setPicked(null);
        say(R.notice.notAdjacent, 'notice');
        return;
      }
      mergePair = pair;
      blocks.setPicked(pair);
      openChart({ parts, current: null, like: [] });
      say(R.prompt.mergeChart);
    }
    function chartPick(c) {
      if (mode === 'replace' && pick) {
        const at = pick;
        resetPicks(); closeSheet();
        commit({ op: 'replace', at, to: c.id });
      } else if (mode === 'merge' && mergePair) {
        const at = mergePair;
        resetPicks(); closeSheet();
        commit({ op: 'merge', at, to: c.id });
      }
    }
    function insertPick(id, where) {
      if (!gapP) return;
      const at = gapP[where];
      resetPicks(); closeSheet();
      commit({ op: 'insert', at: { s: at.s, slot: at.slot, k: at.k }, to: id }, R.notice.noRoom);
    }
    function cancelPick() {
      resetPicks();
      closeSheet();
      if (blocks) blocks.setPicked(null);
      say(promptText());
    }

    // 교정 하나: 할 수 없는 교정(상태가 그대로)이면 알리고 기록하지 않는다
    function commit(c, failText) {
      const next = G.rules.apply(S.state, c);
      if (next === S.state) {
        say(failText || promptText(), failText ? 'notice' : null);
        refresh();
        return false;
      }
      S.cur.corrections.push(c);
      sound(() => G.audio.sfx('mark'));
      changed();
      say(promptText());
      return true;
    }
    // 교정 목록이 바뀜: 연출 끝내기 · 도장 · 램프 · 규칙 밖 표시 지우기 → 저장 → 다시 그리기
    function changed() {
      flush();
      outRule = [];
      if (S.cur.last) { S.cur.last.n = null; S.cur.last.outOfRule = []; } // 송출한 그대로가 아님(js/core/save.js 머리 주석)
      stamp.hidden = true;
      setLamp(false);
      save();
      refresh();
    }
    function undo() {
      closeSheet();
      if (!S.cur.corrections.length) { say(R.notice.nothingToUndo, 'notice'); return; }
      S.cur.corrections.pop();
      resetPicks();
      changed();
      say(promptText());
    }
    // [다시 감수]: 이 원고의 교정을 모두 지운다(송출 기록 · 도움은 남음 — js/core/save.js 머리 주석)
    function redo() {
      closeSheet();
      S.cur.corrections = [];
      resetPicks();
      changed();
      say(promptText());
    }

    // ── 떠 있는 판 ──
    // 가로 배치: 화면 아래에 떠 있되 음절 블록을 가리지 않게 블록 아래 남은 높이만큼(모자라면 화면의 절반까지, 안에서 스크롤).
    // 휴대폰 세로: 책상 흐름 안에 펼쳐지므로(css) 높이를 정하지 않고 보이게 스크롤만 한다.
    function placeSheet() {
      if (mq && mq.matches) {
        sheetIn.style.maxHeight = '';
        try { sheet.scrollIntoView({ block: 'nearest' }); } catch (e) { /* 무시 */ }
        return;
      }
      const vh = window.innerHeight || 800;
      const room = vh - Math.max(0, blocksHost.getBoundingClientRect().bottom) - 12;
      sheetIn.style.maxHeight = Math.round(Math.max(room, vh * 0.5)) + 'px';
    }
    function openChart(v) {
      insHost.hidden = true;
      chart.show(v);
      sheet.hidden = false;
      sheet.setAttribute('data-sheet', 'chart');
      placeSheet();
    }
    function openInsert() {
      chart.hide();
      insHost.hidden = false;
      sheet.hidden = false;
      sheet.setAttribute('data-sheet', 'insert');
      placeSheet();
    }
    function closeSheet() {
      sheet.hidden = true;
      sheet.removeAttribute('data-sheet');
      chart.hide();
      insHost.hidden = true;
    }

    // ── 송출(명세 §8-3) ──
    function setLamp(on) {
      lamp.classList.toggle('is-on', !!on);
      if (on) { lamp.removeAttribute('aria-hidden'); lamp.setAttribute('role', 'img'); lamp.setAttribute('aria-label', R.aria.lamp); }
      else { lamp.setAttribute('aria-hidden', 'true'); lamp.removeAttribute('role'); lamp.removeAttribute('aria-label'); }
    }
    function fillPrompter(syl, waiting) {
      U.clear(prompter);
      syl.forEach((ch, i) => prompter.appendChild(el('span', { class: 'rw-psyl' + (waiting ? ' is-wait' : ''), 'data-i': String(i) }, ch)));
    }
    function showBadge(kind) {
      U.clear(badge);
      badge.setAttribute('data-kind', kind);
      U.append(badge, [U.glyph(kind, 'glyph rw-badge-ico'), el('span', { class: 'rw-badge-name' }, G.text.signalName(kind))]);
      badge.hidden = false;
    }
    function broadcast() {
      flush();
      clearTimers();
      closeSheet();
      resetPicks();
      const res = G.rules.broadcast(S.script, S.cur.corrections);
      const linking = G.rules.touchedLink(S.script, S.cur.corrections);
      S.cur.kinds.push(res.kind);
      S.cur.sends = S.cur.kinds.length;
      S.cur.last = { kind: res.kind, at: res.at.slice(), diff: res.diff, reading: res.reading, outOfRule: res.outOfRule.slice(), n: S.cur.corrections.length };
      save();
      sound(() => G.audio.sfx('send'));
      outRule = res.kind === 'offrule' ? res.outOfRule.slice() : [];
      stamp.hidden = true;
      badge.hidden = true;
      badge.removeAttribute('data-kind');
      setLamp(true);
      const syl = Array.from(res.reading);
      const quick = U.reducedMotion();
      fillPrompter(syl, !quick);
      busy = true;
      say('');
      finalize = () => {
        finalize = null;
        busy = false;
        prompter.querySelectorAll('.is-wait').forEach((n) => n.classList.remove('is-wait'));
        showSignal(res, linking);
        refresh();
      };
      refresh();
      if (quick) { finalize(); return; }
      // 한 음절씩 나타나고, 그다음 신호(전체 SEND_MS 안쪽)
      const stepMs = Math.max(60, Math.min(220, Math.floor(SEND_MS / (syl.length + 1))));
      syl.forEach((_, i) => later(() => {
        const n = prompter.querySelector('.rw-psyl[data-i="' + i + '"]');
        if (n) n.classList.remove('is-wait');
      }, stepMs * (i + 1)));
      later(() => { if (finalize) finalize(); }, stepMs * (syl.length + 1));
    }
    // 연출 중이면 곧바로 끝낸다(다른 조작이 끼어들 때)
    function flush() { if (finalize) { clearTimers(); finalize(); } }
    function showSignal(res, linking) {
      showBadge(res.kind);
      const line = G.text.signal(res.kind, { n: res.diff });
      if (res.kind === 'nonstandard') say([el('span', { class: 'rw-board' }, T().signal.board), ' ', line], 'sig-nonstandard');
      else say(line, 'sig-' + res.kind);
      sound(() => G.audio.sfx(res.kind));
      if (res.kind === 'onair') stamp.hidden = false;
      // 연음 자리 받침을 고친 채 송출: 신호 줄 다음, 같은 자리가 연음 안내로(배지는 남음)
      if (linking) {
        const tok = sayToken;
        later(() => { if (sayToken === tok) say(T().signal.linking, 'linking'); }, LINK_MS);
      }
    }

    // ── 도움 사다리(명세 §8-4): 한 칸씩 학생이 엶, 감점 없음 ──
    // 열 수 있는 단계: 연 적 있는 가장 높은 단계(S.cur.open — '먼저 송출해 보세요'였던 ①도, 저장됨) + 1
    function reach() { return Math.max(0, S.cur.open || 0, ...S.cur.help); }
    // 마지막 송출 뒤 교정이 그대로인가(규칙 밖 표시 · 감수 도장을 다시 보일지)
    function sentAsIs() { const l = S.cur.last; return !!l && l.n === S.cur.corrections.length; }
    function paintHelp() {
      const r = reach();
      helpSteps.forEach((b, i) => {
        const n = i + 1;
        b.disabled = n > r + 1;
        b.setAttribute('aria-pressed', String(n === helpView));
      });
    }
    function toggleHelp(open) {
      helpOpen = open === undefined ? !helpOpen : !!open;
      helpBox.hidden = !helpOpen;
      helpBtn.setAttribute('aria-expanded', String(helpOpen));
      helpBtn.classList.toggle('is-on', helpOpen);
      if (helpOpen) {
        paintHelp();
        try { helpBox.scrollIntoView({ block: 'nearest' }); } catch (e) { /* 무시 */ }
      }
    }
    function record(n) {
      if (S.cur.help.indexOf(n) >= 0) return;
      S.cur.help.push(n);
      S.cur.help.sort((a, b) => a - b);
      S.cur.helped = true;
      save();
    }
    function openHelp(n) {
      if (n > reach() + 1) return;
      helpView = n;
      const opened = n > (S.cur.open || 0);
      if (opened) S.cur.open = n;
      U.clear(helpBody);
      if (n === 1) {
        const last = S.cur.last;
        if (last && last.kind === 'diff') {
          if (!prompter.querySelector('.rw-psyl')) fillPrompter(Array.from(last.reading), false);
          prompter.querySelectorAll('.rw-psyl').forEach((s) => s.classList.toggle('is-diff', last.at.indexOf(+s.getAttribute('data-i')) >= 0));
          helpBody.appendChild(el('p', { class: 'rw-help-line' }, H.diffMarked));
          record(1);
        } else {
          helpBody.appendChild(el('p', { class: 'rw-help-line' }, H.needBroadcast)); // 도움으로 세지 않음(연 단계만 저장 — ②가 열림)
          if (opened) save();
        }
      } else if (n === 2) {
        helpBody.appendChild(guidesView());
        record(2);
      } else {
        U.append(helpBody, exampleView());
        record(3);
      }
      paintHelp();
    }
    // ② 이 장의 채운 감수 지침(빈칸에 고른 답) — 지침은 이미 다 맞힌 것이다
    function guidesView() {
      const gs = (window.GUIDES && window.GUIDES[run.ch]) || [];
      return el('div', { class: 'rw-guides' }, [
        el('h3', { class: 'rw-help-h' }, H.guideTitle),
        el('ol', { class: 'rw-guide-list' }, gs.map((g) => {
          const fills = {};
          Object.keys(g.blanks || {}).forEach((b) => {
            const bl = g.blanks[b];
            fills[b] = el('span', { class: 'rw-guide-fill' }, keepPh(bl.options[bl.answer]));
          });
          return el('li', { class: 'rw-guide' }, fillNodes((g.text && g.text[grade]) || '', fills).map((x) => (typeof x === 'string' ? keepPh(x) : x)));
        })),
      ]);
    }
    // ③ 같은 규칙을 쓰는 다른 낱말(이번에 뽑힌 7개 · 같은 발음은 뺌 — G.rules.twin). 없으면 지침 + 한 줄
    function exampleView() {
      const id = G.rules.twin(S.script, window.SCRIPTS || [], run.ids);
      const tw = id ? by[id] : null;
      if (!tw) return [guidesView(), el('p', { class: 'rw-help-line' }, H.noExample)];
      let st = G.rules.start(tw);
      const steps = (tw.steps || []).map((x) => G.rules.parseStep(x)).map((c, i) => {
        const line = G.text.logLine(i + 1, logInfo(st, c));
        st = G.rules.apply(st, c);
        return el('li', { class: 'rw-ex-step' }, keepPh(G.text.fill(H.exampleStep, { line, rule: G.text.rule(grade, c.rule) })));
      });
      return el('div', { class: 'rw-ex' }, [
        el('h3', { class: 'rw-help-h' }, H.exampleTitle),
        el('p', { class: 'rw-ex-row' }, [el('span', { class: 'rw-ex-label' }, H.exampleSpelling), el('span', { class: 'rw-ex-spell' }, tw.text)]),
        steps.length ? el('ol', { class: 'rw-ex-steps' }, steps) : el('p', { class: 'rw-ex-none' }, H.noCorrection),
        el('p', { class: 'rw-ex-row' }, [el('span', { class: 'rw-ex-label' }, H.examplePron), el('span', { class: 'rw-ex-pron' }, G.text.pron(tw.pron))]),
      ]);
    }

    // ── 다음 원고 · 넘김(명세 §8-5) ──
    function next() {
      closeSheet();
      if (S.sandbox) { leaveSandbox(); return; }
      if (!S.cur.sends) { askSkip(); return; }
      finish();
    }
    function askSkip() {
      closeConfirm();
      const K = R.skip;
      const askId = 'rw-ask-' + Date.now();
      const noBtn = el('button', { type: 'button', class: 'app-btn', 'data-act': 'rw-skip-no', onclick: () => closeConfirm() }, K.no);
      confirmEl = el('div', { class: 'rw-confirm-wrap', onclick: (e) => { if (e.target === confirmEl) closeConfirm(); } },
        el('div', { class: 'rw-confirm', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': askId }, [
          el('p', { class: 'rw-confirm-ask', id: askId }, K.ask),
          el('div', { class: 'rw-confirm-btns' }, [
            el('button', { type: 'button', class: 'app-btn is-primary', 'data-act': 'rw-skip-yes', onclick: () => { closeConfirm(); finish(); } }, K.yes),
            noBtn,
          ]),
        ]));
      root.appendChild(confirmEl);
      releaseConfirm = U.modal(confirmEl, confirmEl.firstChild); // 뒤 화면 inert · Tab은 창 안에서 · 닫으면 여는 단추로 초점
      try { noBtn.focus({ preventScroll: true }); } catch (e) { /* 무시 */ }
    }
    function closeConfirm() {
      if (!confirmEl) return;
      confirmEl.remove();
      confirmEl = null;
      if (releaseConfirm) { releaseConfirm(); releaseConfirm = null; }
    }
    function finish() {
      flush();
      clearTimers();
      const cur = S.cur;
      const result = G.rules.scriptResult(cur.kinds);
      run.done.push({ id: S.script.id, result, sends: cur.sends, help: cur.help.slice(), helped: cur.help.length > 0 });
      if (run.done.length >= run.ids.length) {
        // 7번째 원고 끝: 조항 공개 단계로 저장하고 그 화면으로(js/game/reveal.js와의 약속)
        run.phase = 'reveal';
        run.cur = null;
        G.save.saveChapter(run);
        G.app.go('reveal', { run: G.save.loadChapter() || run });
        return;
      }
      run.cur = freshCur();
      G.save.saveChapter(run);
      setScript(by[run.ids[run.done.length]], run.cur, false);
      try { window.scrollTo(0, 0); } catch (e) { /* 무시 */ }
    }

    // ── 소리 켜기/끄기(감수 중에는 이것만 — 명세 §4) ──
    function soundOn() { const s = G.save.getSettings(); return !!(s.sfxOn || s.bgmOn); }
    function paintSound() {
      const on = soundOn();
      U.clear(soundBtn);
      U.append(soundBtn, [U.glyph(on ? 'sound' : 'mute', 'glyph rw-btn-ico'), el('span', { class: 'rw-tool-label' }, on ? C.soundOff : C.soundOn)]);
      soundBtn.setAttribute('aria-pressed', String(!on));
    }
    function toggleSound() {
      const on = soundOn();
      G.save.setSettings({ sfxOn: !on, bgmOn: !on });
      if (!on) sound(() => G.audio.play('review'));
      paintSound();
    }

    // ── 연습 자리(점검 전용) ──
    function loadSandbox(id) {
      const s = by[id];
      if (!s) throw new Error('없는 원고: ' + id);
      if (!real) real = { script: S.script, cur: S.cur };
      setScript(s, freshCur(), true);
    }
    function leaveSandbox() {
      if (!real) return;
      const r = real;
      real = null;
      setScript(r.script, r.cur, false);
    }
    function solve() {
      S.cur.corrections = (S.script.steps || []).map((x) => {
        const c = G.rules.parseStep(x);
        return c.op === 'delete' ? { op: c.op, at: c.at } : { op: c.op, at: c.at, to: c.to };
      });
      resetPicks();
      changed();
    }

    function destroy() {
      if (!alive) return;
      alive = false;
      clearTimers();
      finalize = null;
      document.removeEventListener('keydown', onKey, true);
      if (blocks) { blocks.destroy(); blocks = null; }
      chart.destroy();
      closeConfirm();
      // 감수 화면에서 연 게임 방법 창(document.body에 붙음)도 닫는다 — 그 창의 문서 이벤트도 함께 떨어진다
      const h = G.howto.current && G.howto.current();
      if (h) h.close();
    }

    // 처음 원고
    const first = by[run.ids[run.done.length]];
    if (!first) throw new Error('감수할 원고가 없음');
    setScript(first, run.cur, false);

    return {
      destroy,
      debug: {
        script: () => S.script,
        cur: () => copy(S.cur),
        run: () => copy(run),
        state: () => copy(S.state),
        busy: () => busy,
        load: loadSandbox,
        exit: leaveSandbox,
        solve,
      },
    };
  }

  const SCREEN = {
    mount(root, value) {
      const run = (value && value.run) || G.save.loadChapter();
      if (!run) { G.app.go('start'); return null; }
      if (run.phase !== 'review') { G.app.go(run.phase, { run }); return null; }
      sound(() => G.audio.play('review'));
      const v = createView(root, run);
      view = v;
      return { destroy: () => { v.destroy(); if (view === v) view = null; } };
    },
    unmount() { if (view) { view.destroy(); view = null; } },
  };
  G.screens.review = SCREEN;

  // 점검 전용(게임 화면에는 드러나지 않음). 감수 화면이 열려 있지 않으면 null
  const dbg = (name) => (...a) => (view ? view.debug[name](...a) : null);
  G.review = {
    debug: {
      script: dbg('script'), cur: dbg('cur'), run: dbg('run'), state: dbg('state'), busy: dbg('busy'),
      load: dbg('load'), exit: dbg('exit'), solve: dbg('solve'),
    },
  };
})();
