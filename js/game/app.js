'use strict';
// ───────────────────────────────────────────────────────────────
// 앱 뼈대 G.app — 화면 바꾸기 · 시작 화면 · 설정 · 이어 하기와 덮어쓰기 확인 · '세로로 돌려 주세요'(명세 §4 · §5 · §11 · §14)
//   출처: 「음운 해전」 pblsketch/sori-haejeon js/game/app.js 의 화면 전환 · 설정 · 하던 판 묻기 · 세로 안내 방식을 가져와
//   이 게임의 화면 이름과 시작 화면(학년 · 장 · 단계 · 이어 하기)으로 바꿨다.
//   불러오는 순서: util → data → core(hangul · rules · audio · save) → game(howto · 각 화면 · 이 파일) → js/main.js
//   모양: css/app.css      점검: tests/check-app.mjs, tests/check-00-smoke.mjs
//
// ── 화면 바꾸기 ─────────────────────────────────────────────────────────
//   G.app.go(이름, 값) → mount가 돌려준 값(없으면 null)
//     이름(고정): 'start' | 'guide' | 'review' | 'reveal' | 'result'   (G.app.NAMES). 모르는 이름이면 'start'.
//     지금 화면을 떠나고(unmount) #app을 비운 뒤, 새 <section class="screen screen-이름">을 #app에 붙여 그 화면의 mount를 부른다.
//     <html data-screen="이름">을 붙인다. 한 번에 한 화면.
//   G.app.current()   지금 화면 이름
//
// ── 화면 등록(다른 작업이 app.js를 고치지 않고 화면을 더하는 법) ─────────────────
//   화면 파일(js/game/guide.js 등)이 불러올 때 이렇게 등록한다. G.screens는 js/core/util.js가 미리 만들어 둔다.
//     G.screens.review = {
//       mount(root, value) { … root(<section class="screen screen-review">) 안에 그린다 … },   // 반드시
//       unmount() { … 타이머 · 문서 이벤트 정리 … },                                            // 있으면 떠날 때 부름
//     };
//   G.app.go는 부를 때마다 G.screens[이름]을 찾는다(불러오는 차례와 상관없음). 등록이 없으면 자리 화면(.screen-stub —
//   장 이름 · '준비 중' · '장 고르기')을 보인다. 'start'는 이 파일이 그린다(등록으로 바꾸지 않는다).
//   mount가 객체를 돌려주고 그 객체에 destroy()가 있으면 떠날 때 그것도 부른다(음운 해전 방식과 같이).
//   값(value) 약속: 'guide' · 'review' · 'reveal'은 { run: ChapterRun }(js/core/save.js 머리 주석 — 저장소에서 다시 읽은 정리본).
//     'result'도 { run }(원고 7개가 끝난 진행 장 — js/game/result.js 머리 주석). 화면은 값이 없으면 G.save.loadChapter()로 읽어도 된다.
//
// ── 장 시작 · 이어 하기(다른 화면도 쓰는 도우미) ─────────────────────────────────
//   G.app.beginChapter({ ch, level?, grade?, skipGuide?, seed? }) → ChapterRun
//     원고 7개 = G.rules.draw(ch, SCRIPTS, G.rules.exampleIds(GUIDES && GUIDES[ch]), 시드) → 새 진행 장을 저장(옛 진행 장은 덮임)
//     → go('guide', { run }). skipGuide: true면 지침을 건너뛰고 go('review', { run })(장 결과의 [다시 하기], 명세 §10).
//     몸풀기 장(G.save.WARMUP — 1장, 결정 0021)은 원고 몇 개를 먼저: go('review') → 몸풀기 원고가 끝나면 감수 화면이 go('guide').
//     지침이 없는 장(GUIDES에 그 장이 없음 — 8장, 결정 0019)은 늘 감수부터: phase 'review' · guideDone true로 시작한다.
//     level · grade를 안 주면 마지막 선택(G.save.levelOf(ch) · getSelection().grade). 덮어쓰기 확인은 부르는 쪽이 한다
//     (시작 화면은 묻고 부름, 장 결과의 [다시 하기]는 같은 장이라 묻지 않음).
//   G.app.resume() → 저장된 진행 장의 단계 화면으로(없거나 버려졌으면 시작 화면).
//
// ── 그 밖 ───────────────────────────────────────────────────────────────
//   G.app.start()          처음 한 번: '세로로 돌려 주세요' 덮개를 붙이고 시작 화면을 연다(js/main.js가 부름).
//   G.app.isPortrait()     세로 배치(휴대폰 세로 등)인가 — PORTRAIT_Q
//   G.app.isLowLandscape() 높이가 낮은 가로 화면인가 — LOW_Q('세로로 돌려 주세요'가 덮음)
//   G.app.openSettings()   설정 창 열기(시작 화면의 [설정]과 같은 창)
//
// ── 지킬 것 ─────────────────────────────────────────────────────────────
//   화면 문구는 js/data/text.js(TEXT)에서 꺼낸다. 판정 · 뽑기는 G.rules, 저장은 G.save가 한다(여기서 다시 계산하지 않음).
//   1~8장 모두 시작할 수 있다(ACTIVE). ACTIVE에 없는 장은 '준비 중'으로 보이기만 하고 누를 수 없다(명세 §5-2).
//   배경 음악: 시작 화면에는 없다(명세 §15의 소리 자리) — 시작 화면에 오면 멈춘다.
// ───────────────────────────────────────────────────────────────
G.app = (function () {
  const U = G.util, el = U.el;
  const T = () => window.TEXT;
  const NAMES = ['start', 'guide', 'review', 'reveal', 'result'];
  const CHAPTERS = [1, 2, 3, 4, 5, 6, 7, 8];
  const ACTIVE = [1, 2, 3, 4, 5, 6, 7, 8]; // 할 수 있는 장(명세 §2 — 3~8장은 결정 0019의 잠정 선택으로 엶)
  const RECOMMEND_M3 = [1, 2];   // '중3 추천' 표시(명세 §5-2, 결정 0003)
  const LIKE_CHAPTERS = [1, 2];  // 기본 단계 닮은 칸 안내가 있는 장(js/game/review.js와 같음) — 단계 풀이 한 줄을 고를 때만 씀
  // 배치 기준(조정값) — css/base.css · app.css · howto.css의 @media와 같은 값(바꿀 때 모두)
  const PORTRAIT_Q = '(max-width: 760px), (orientation: portrait)';
  const LOW_Q = '(orientation: landscape) and (max-height: 500px)';

  const mq = (q) => !!(window.matchMedia && window.matchMedia(q).matches);
  const isPortrait = () => mq(PORTRAIT_Q);
  const isLowLandscape = () => mq(LOW_Q);
  const host = () => document.getElementById('app');
  const tx = (path, vars, grade) => G.text.t(path, vars, grade);

  let cur = null; // { name, scr, root, handle }

  // ── 작은 도구 ─────────────────────────────────────────
  function btn(label, onClick, cls, attrs) {
    return el('button', Object.assign({ type: 'button', class: 'app-btn' + (cls ? ' ' + cls : ''), onclick: onClick }, attrs || {}), label);
  }
  // 두 갈래 고르기(누른 쪽이 aria-pressed="true"): seg([[값, 이름], …], 지금 값, 고르면, { key: 'grade' → data-grade, label })
  function seg(items, now, onPick, o) {
    return el('div', { class: 'app-seg', role: 'group', 'aria-label': o.label }, items.map(([v, name]) => el('button', {
      type: 'button', class: 'app-seg-btn', ['data-' + o.key]: v, 'aria-pressed': String(v === now),
      onclick: () => { if (v !== now) onPick(v); },
    }, name)));
  }
  function audioStop() { try { if (G.audio && G.audio.stop) G.audio.stop(); } catch (e) { /* 소리 장치 문제로 화면이 멈추지 않게 */ } }

  // ── 화면 바꾸기 ─────────────────────────────────────────
  function leave() {
    if (!cur) return;
    const c = cur;
    cur = null;
    try { if (c.handle && typeof c.handle.destroy === 'function') c.handle.destroy(); } catch (e) { console.error('화면 닫기 실패: ' + c.name + ' ' + (e && e.message)); }
    try { if (c.scr && typeof c.scr.unmount === 'function') c.scr.unmount(); } catch (e) { console.error('화면 닫기 실패: ' + c.name + ' ' + (e && e.message)); }
  }
  function screenOf(name) {
    if (name === 'start') return START;
    const s = G.screens && G.screens[name];
    return s && typeof s.mount === 'function' ? s : STUB;
  }
  function go(name, value) {
    if (NAMES.indexOf(name) < 0) name = 'start';
    const h = host();
    if (!h) return null;
    leave();
    U.clear(h);
    try { window.scrollTo(0, 0); } catch (e) { /* 무시 */ }
    const scr = screenOf(name);
    const root = el('section', { class: 'screen screen-' + name });
    h.appendChild(root);
    document.documentElement.setAttribute('data-screen', name);
    cur = { name, scr, root, handle: null };
    try {
      const r = scr.mount(root, value === undefined ? {} : value, name);
      if (cur && cur.root === root) cur.handle = r || null;
      return r || null;
    } catch (e) {
      console.error('화면 열기 실패: ' + name + ' ' + (e && e.message));
      if (name !== 'start') return go('start');
      return null;
    }
  }

  // ── 장 시작 · 이어 하기 ─────────────────────────────────
  function newSeed() { return (Date.now() ^ Math.floor(Math.random() * 0x3fffffff)) >>> 0; }
  function beginChapter(o) {
    o = o || {};
    const ch = o.ch;
    if (ACTIVE.indexOf(ch) < 0) return null;
    const grade = o.grade === 'm3' || o.grade === 'h1' ? o.grade : G.save.getSelection().grade;
    const level = o.level === 'basic' || o.level === 'advanced' ? o.level : G.save.levelOf(ch);
    const seed = typeof o.seed === 'number' && isFinite(o.seed) ? o.seed : newSeed();
    const guides = window.GUIDES && window.GUIDES[ch];
    const ids = G.rules.draw(ch, window.SCRIPTS || [], G.rules.exampleIds(guides), seed);
    const skip = !!o.skipGuide || !(Array.isArray(guides) && guides.length); // 지침이 없는 장(8장)은 감수부터
    // 몸풀기 장(G.save.WARMUP — 1장): 지침 전에 원고 몇 개를 먼저 감수한다(phase 'review' · guideDone false로 시작, 결정 0021)
    const warm = !skip && (G.save.WARMUP || {})[ch] > 0;
    const run = { grade, ch, level, seed, ids, phase: skip || warm ? 'review' : 'guide', guideDone: skip, done: [], cur: null };
    G.save.saveChapter(run);
    const saved = G.save.loadChapter();
    const r = saved && saved.ch === ch && JSON.stringify(saved.ids) === JSON.stringify(ids) ? saved : run;
    go(r.phase, { run: r });
    return r;
  }
  function resume() {
    const run = G.save.loadChapter();
    if (!run) return go('start');
    return go(run.phase, { run });
  }

  // ── '세로로 돌려 주세요' 덮개(body에 한 번 붙임, 화면 바꾸기와 무관) ──
  function ensureRotate() {
    if (document.querySelector('.app-rotate')) return;
    document.body.appendChild(el('div', { class: 'app-rotate', role: 'status' }, [
      el('span', { class: 'app-rotate-ico', 'aria-hidden': 'true' }, U.glyph('rotate')),
      el('p', null, T().rotate),
    ]));
  }
  function start() {
    ensureRotate();
    return go('start');
  }

  // ── 자리 화면(아직 등록되지 않은 화면) ─────────────────────
  const STUB = {
    mount(root, value) {
      const run = (value && value.run) || G.save.loadChapter();
      root.appendChild(el('div', { class: 'screen-stub' }, [
        run ? el('h1', { class: 'app-h1' }, G.text.chapterTitle(run.ch)) : null,
        el('p', { class: 'screen-stub-note' }, T().start.comingSoon),
        btn(T().result.chapters, () => go('start'), 'is-primary', { 'data-act': 'home' }),
      ]));
    },
  };

  // ── 설정 창(명세 §5-6) ─────────────────────────────────
  //   켜기/끄기 두 단추(누른 쪽 aria-pressed) + 음량 막대(0~100). 바꾸면 곧바로 G.save.setSettings(저장 + 적용).
  //   root 안에 덮개를 붙인다(화면을 떠나면 함께 사라짐). 닫기 · 바깥 누르기 · Esc로 닫힌다. → { close }
  //   모달(G.util.modal): 열린 동안 뒤 화면은 inert, Tab은 창 안에서 돌고, 닫으면 여는 단추로 초점이 돌아간다.
  let settingsCur = null;
  function openSettings(parent, onClose) {
    if (settingsCur) settingsCur.close();
    const S = T().settings;
    const syncs = [];
    function toggle(key, label) {
      const on = el('button', { type: 'button', class: 'app-seg-btn', 'data-v': 'on', onclick: () => set(true) }, S.on);
      const off = el('button', { type: 'button', class: 'app-seg-btn', 'data-v': 'off', onclick: () => set(false) }, S.off);
      function set(v) { G.save.setSettings({ [key]: v }); syncs.forEach((f) => f()); }
      syncs.push(() => {
        const v = !!G.save.getSettings()[key];
        on.setAttribute('aria-pressed', String(v));
        off.setAttribute('aria-pressed', String(!v));
      });
      return el('div', { class: 'app-seg', role: 'group', 'aria-label': label, 'data-key': key }, [on, off]);
    }
    function slider(key, label, onChange) {
      const inp = el('input', { type: 'range', min: '0', max: '100', step: '5', class: 'set-range', 'aria-label': label + ' ' + S.volume, 'data-key': key });
      inp.addEventListener('input', () => G.save.setSettings({ [key]: (+inp.value) / 100 }));
      if (onChange) inp.addEventListener('change', onChange);
      syncs.push(() => {
        const s = G.save.getSettings();
        inp.value = String(Math.round(s[key] * 100));
        const row = inp.closest('.set-row');
        if (row) row.classList.toggle('is-off', !s[key.replace('Volume', 'On')]);
      });
      return el('label', { class: 'set-vol' }, [el('span', { class: 'set-vol-name' }, S.volume), inp]);
    }
    const row = (label, parts, hint) => el('div', { class: 'set-row' }, [
      el('span', { class: 'set-name' }, label),
      el('div', { class: 'set-ctl' }, parts),
      hint ? el('p', { class: 'set-hint' }, hint) : null,
    ]);
    const titleId = 'set-title-' + Date.now();
    const panel = el('div', { class: 'set-panel', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId }, [
      el('header', { class: 'set-head' }, [
        el('span', { class: 'set-head-ico', 'aria-hidden': 'true' }, U.glyph('gear')),
        el('h2', { class: 'set-title', id: titleId }, S.title),
      ]),
      row(S.bgm, [toggle('bgmOn', S.bgm), slider('bgmVolume', S.bgm)]),
      row(S.sfx, [toggle('sfxOn', S.sfx), slider('sfxVolume', S.sfx, () => { try { G.audio.sfx('mark'); } catch (e) { /* 무시 */ } })]),
      row(S.reduceMotion, [toggle('reduceMotion', S.reduceMotion)], S.reduceMotionHint),
      el('p', { class: 'set-saved' }, S.savedHint),
      el('details', { class: 'set-credits' }, [
        el('summary', { class: 'set-credits-title' }, S.credits.title),
        el('ul', { class: 'set-credits-list' }, S.credits.lines.map((t) => el('li', null, t))),
      ]),
      el('footer', { class: 'set-foot' }, btn(S.close, () => close(), 'is-primary', { 'data-act': 'settings-close' })),
    ]);
    const overlay = el('div', { class: 'set-overlay', onclick: (e) => { if (e.target === overlay) close(); } }, panel);
    function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } }
    document.addEventListener('keydown', onKey, true);
    (parent || document.body).appendChild(overlay);
    const release = U.modal(overlay, panel); // 뒤 화면 inert · Tab은 창 안에서 · 닫으면 여는 단추로 초점
    syncs.forEach((f) => f());
    try { panel.querySelector('button').focus({ preventScroll: true }); } catch (e) { /* 무시 */ }
    let closed = false;
    function close() {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKey, true);
      overlay.remove();
      if (settingsCur === handle) settingsCur = null;
      release();
      if (typeof onClose === 'function') onClose();
    }
    const handle = { el: overlay, close };
    settingsCur = handle;
    return handle;
  }

  // ── 시작 화면(명세 §5) ─────────────────────────────────
  //   [제목 · 한 줄 소개 | 게임 방법(처음 표시) · 설정]
  //   [학년 중3/고1] [이어 하기 카드(진행 장이 있을 때)] [장 8개 — 1·2장 고르기, 3~8장 준비 중]
  //   [단계 기본/심화(고른 장의 마지막 선택) · 풀이 한 줄 · 감수 시작]      오른쪽: 타이틀 그림(assets/img/title.webp, 휴대폰 세로에서는 숨김)
//   휴대폰 세로 · 좁은 화면: 제목 아래 머리 그림(assets/img/start_banner.webp). 장 카드마다 장 배지(assets/img/ch1~8.webp)
  //   진행 장이 있는데 새로 시작하면 "진행 중인 장이 지워져요"를 묻는다(.st-confirm).
  let chosenCh = 1; // 이번 세션에서 고른 장(진행 장이 있으면 그 장이 먼저)
  const START = {
    mount(root) {
      audioStop();
      const S = T().start;
      let info = G.save.chapterInfo();
      if (info && ACTIVE.indexOf(info.ch) >= 0) chosenCh = info.ch;
      if (ACTIVE.indexOf(chosenCh) < 0) chosenCh = ACTIVE[0];
      let confirmEl = null, releaseConfirm = null;
      let pendingStart = null;

      const wrap = el('div', { class: 'st' });
      root.appendChild(wrap);

      function render() {
        // 다시 그린 뒤 같은 단추에 초점을 돌려준다(키보드 사용)
        const a = document.activeElement;
        const fk = a && wrap.contains(a) ? a.getAttribute('data-fk') : null;
        U.clear(wrap);
        info = G.save.chapterInfo();
        const sel = G.save.getSelection();
        const grade = sel.grade;
        const level = G.save.levelOf(chosenCh);
        wrap.appendChild(head());
        // 휴대폰 세로 · 좁은 화면 머리 그림(손 흔드는 두 아나운서) — 넓은 화면에서는 오른쪽 타이틀 그림이 대신한다(CSS로 하나만 보임)
        wrap.appendChild(el('div', { class: 'st-banner', role: 'img', 'aria-label': T().images.startBanner }, [
          el('img', { class: 'st-banner-img', src: 'assets/img/start_banner.webp', alt: '', draggable: 'false', decoding: 'async' }),
          el('span', { class: 'st-banner-lamp', 'aria-hidden': 'true' }),
        ]));
        wrap.appendChild(el('div', { class: 'st-main' }, [
          el('div', { class: 'st-col' }, [gradeRow(grade), info ? resumeCard(info) : null, chapterGrid(grade), levelRow(grade, level)]),
          el('div', { class: 'st-art', role: 'img', 'aria-label': T().images.start }, [
            el('img', { class: 'st-art-img', src: 'assets/img/title.webp', alt: '', draggable: 'false', decoding: 'async' }),
          ]),
        ]));
        if (fk) { const n = wrap.querySelector('[data-fk="' + fk + '"]'); if (n) try { n.focus({ preventScroll: true }); } catch (e) { /* 무시 */ } }
      }

      function head() {
        const fresh = !G.save.seenHowto();
        const howtoBtn = el('button', {
          type: 'button', class: 'app-btn st-tool st-howto' + (fresh ? ' is-fresh' : ''), 'data-act': 'howto', 'data-fk': 'howto',
          onclick: () => G.howto.open({ grade: G.save.getSelection().grade, onClose: render }),
        }, [
          el('span', { class: 'st-tool-ico', 'aria-hidden': 'true' }, U.glyph('book')),
          el('span', { class: 'st-tool-text' }, [
            el('span', { class: 'st-tool-name' }, S.howto),
            fresh ? el('span', { class: 'st-howto-hint' }, S.firstHint) : null,
          ]),
        ]);
        const setBtn = el('button', {
          type: 'button', class: 'app-btn st-tool', 'data-act': 'settings', 'data-fk': 'settings',
          onclick: () => openSettings(root),
        }, [el('span', { class: 'st-tool-ico', 'aria-hidden': 'true' }, U.glyph('gear')), el('span', { class: 'st-tool-name' }, S.settings)]);
        return el('header', { class: 'st-head' }, [
          el('div', { class: 'st-brand' }, [
            el('div', { class: 'st-title-row' }, [
              el('h1', { class: 'st-title' }, S.title),
              el('span', { class: 'st-lamp', 'aria-hidden': 'true' }, T().review.onAir),
            ]),
            el('p', { class: 'st-tagline' }, S.tagline),
          ]),
          el('div', { class: 'st-tools' }, [howtoBtn, setBtn]),
        ]);
      }

      function gradeRow(grade) {
        const g = seg([['m3', S.grades.m3], ['h1', S.grades.h1]], grade, (v) => { G.save.setSelection({ grade: v }); render(); }, { key: 'grade', label: S.grade });
        g.querySelectorAll('button').forEach((b) => b.setAttribute('data-fk', 'grade-' + b.getAttribute('data-grade')));
        return el('div', { class: 'st-row st-grade' }, [
          el('span', { class: 'st-label' }, S.grade), g,
          el('p', { class: 'st-hint' }, S.gradeHint),
        ]);
      }

      function resumeCard(i) {
        const R = S.resume;
        const tpl = R.summary[i.phase] || '';
        const sum = G.text.fill(tpl, { chapter: G.text.chapterTitle(i.ch), level: G.text.levelName(i.level), i: i.no, n: i.total });
        return el('section', { class: 'st-resume', 'aria-label': R.title }, [
          el('span', { class: 'st-resume-ico', 'aria-hidden': 'true' }, U.glyph('script')),
          el('div', { class: 'st-resume-text' }, [
            el('span', { class: 'st-resume-title' }, R.title),
            el('span', { class: 'st-resume-sum' }, sum),
          ]),
          el('div', { class: 'st-resume-btns' }, [
            btn(R.button, () => resume(), 'is-primary', { 'data-act': 'resume', 'data-fk': 'resume' }),
            btn(S.overwrite.yes, () => askOverwrite(() => beginChapter({ ch: chosenCh })), '', { 'data-act': 'restart', 'data-fk': 'restart' }),
          ]),
        ]);
      }

      function chapterGrid(grade) {
        const cards = CHAPTERS.map((ch) => {
          const active = ACTIVE.indexOf(ch) >= 0;
          const parts = [
            // 장 배지(assets/img/ch1~8.webp — 그 장의 변동을 빗댄 그림, 꾸밈이라 alt 없음)
            el('span', { class: 'st-ch-badge', 'aria-hidden': 'true' }, [
              el('img', { class: 'st-ch-badge-img', src: 'assets/img/ch' + ch + '.webp', alt: '', draggable: 'false', decoding: 'async' }),
            ]),
            el('span', { class: 'st-ch-no' }, String(ch)),
            el('span', { class: 'st-ch-name' }, U.keepPh(G.text.chapterName(ch), 'st-ph')), // 음운 표기(/ㅣ/)는 한 덩어리
            el('span', { class: 'st-ch-topic' }, U.keepPh(G.text.chapterTopic(grade, ch), 'st-ph')),
          ];
          if (!active) {
            parts.push(el('span', { class: 'st-ch-tag is-soon' }, [U.glyph('lock'), S.comingSoon]));
            return el('div', { class: 'st-ch is-soon', 'data-ch': String(ch), 'aria-disabled': 'true' }, parts);
          }
          if (RECOMMEND_M3.indexOf(ch) >= 0) parts.push(el('span', { class: 'st-ch-tag is-rec' }, S.recommendM3));
          return el('button', {
            type: 'button', class: 'st-ch' + (ch === chosenCh ? ' is-on' : ''), 'data-ch': String(ch), 'data-fk': 'ch-' + ch,
            'aria-pressed': String(ch === chosenCh),
            onclick: () => { chosenCh = ch; render(); },
          }, parts);
        });
        return el('section', { class: 'st-chapters', 'aria-label': S.chapters }, [
          el('h2', { class: 'st-label st-chapters-h' }, S.chapters),
          el('div', { class: 'st-grid' }, cards),
        ]);
      }

      function levelRow(grade, level) {
        const lv = seg([['basic', G.text.levelName('basic')], ['advanced', G.text.levelName('advanced')]], level,
          (v) => { G.save.setSelection({ levels: { [chosenCh]: v } }); render(); }, { key: 'level', label: S.level });
        lv.querySelectorAll('button').forEach((b) => b.setAttribute('data-fk', 'level-' + b.getAttribute('data-level')));
        return el('div', { class: 'st-row st-level' }, [
          el('div', { class: 'st-level-pick' }, [
            el('span', { class: 'st-label' }, S.level), lv,
            el('p', { class: 'st-hint st-level-hint' }, tx('levels.hint.' + (level === 'basic' && LIKE_CHAPTERS.indexOf(chosenCh) < 0 ? 'basicPlain' : level), null, grade)),
          ]),
          btn([el('span', null, S.begin), U.glyph('next', 'glyph st-begin-ico')], onBegin, 'is-primary is-big st-begin', { 'data-act': 'begin', 'data-fk': 'begin' }),
        ]);
      }

      function onBegin() {
        if (G.save.hasChapter()) askOverwrite(() => beginChapter({ ch: chosenCh }));
        else beginChapter({ ch: chosenCh });
      }

      // "진행 중인 장이 지워져요. 새로 시작할까요?" — [새로 시작] [그만두기]
      function askOverwrite(then) {
        closeConfirm();
        pendingStart = then;
        const O = S.overwrite;
        const askId = 'st-ask-' + Date.now();
        const noBtn = btn(O.no, () => closeConfirm(), '', { 'data-act': 'overwrite-no' });
        confirmEl = el('div', { class: 'st-confirm-wrap', onclick: (e) => { if (e.target === confirmEl) closeConfirm(); } },
          el('div', { class: 'st-confirm', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': askId }, [
            el('p', { class: 'st-confirm-ask', id: askId }, O.ask),
            info ? el('p', { class: 'st-confirm-what' }, wrap.querySelector('.st-resume-sum') ? wrap.querySelector('.st-resume-sum').textContent : '') : null,
            el('div', { class: 'st-confirm-btns' }, [
              btn(O.yes, () => { const f = pendingStart; closeConfirm(); if (f) f(); }, 'is-primary', { 'data-act': 'overwrite-yes' }),
              noBtn,
            ]),
          ]));
        root.appendChild(confirmEl);
        releaseConfirm = U.modal(confirmEl, confirmEl.firstChild); // 뒤 화면 inert · Tab은 창 안에서 · 닫으면 여는 단추로 초점
        try { noBtn.focus({ preventScroll: true }); } catch (e) { /* 무시 */ }
      }
      function closeConfirm() {
        pendingStart = null;
        if (confirmEl) { confirmEl.remove(); confirmEl = null; }
        if (releaseConfirm) { releaseConfirm(); releaseConfirm = null; }
      }
      function onKey(e) { if (e.key === 'Escape' && confirmEl) { e.stopPropagation(); closeConfirm(); } }
      document.addEventListener('keydown', onKey, true);
      START._off = () => document.removeEventListener('keydown', onKey, true);

      render();
    },
    unmount() {
      if (START._off) { START._off(); START._off = null; }
      if (settingsCur) settingsCur.close();
      if (G.howto && G.howto.current && G.howto.current()) G.howto.current().close();
    },
  };

  return {
    go, start, beginChapter, resume, openSettings: (onClose) => openSettings(null, onClose),
    current: () => (cur ? cur.name : null),
    isPortrait, isLowLandscape,
    NAMES: NAMES.slice(), ACTIVE: ACTIVE.slice(), PORTRAIT_Q, LOW_Q,
  };
})();
