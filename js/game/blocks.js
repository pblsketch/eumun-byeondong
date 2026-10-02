'use strict';
// 음절 블록 · 형태소 경계 G.blocks — 감수 화면(js/game/review.js)이 원고 상태(G.rules의 State)를 그리고,
//   학생이 음운 · 틈을 누른 것을 알려 받는 부품이다(명세 §8-1 · §8-2 · §14). 판정은 하지 않는다(원칙 1).
//   불러오는 순서: util → data(sounds · text) → core(hangul · rules) → 이 파일. 모양은 css/blocks.css.
//   점검: tests/check-blocks.mjs (점검 전용 페이지 tests/pages/blocks.html)
//   조음 도표(js/game/chart.js)와 서로 부르지 않는다. 둘을 엮는 것은 감수 화면이다.
//   출처: 만드는 방식(G.util.el로 짓기, create → { el, render, destroy } 꼴)은 「음운 해전」 pblsketch/sori-haejeon
//   js/game/board.js를 따랐다. 그림 내용은 이 게임에서 새로 짰다.
//
// ── 만들기 ──────────────────────────────────────────────────────────────
//   const b = G.blocks.create(담을요소, {
//     grade: 'm3'|'h1',               // 경계 이름표 · 자리 이름(학년별 용어)
//     level: 'basic'|'advanced',       // 심화면 '+' · 이름표 · 경계 종류를 그리지 않고 DOM · aria에도 두지 않는다(띄어쓰기 틈만)
//     split: false | true | 'auto',    // 두 줄 나누기(명세 §14): false 한 줄 · true 2음절 이상이면 늘 두 줄 · 'auto' 한 줄에 안 들어갈 때만
//                                      //   언제 켤지는 감수 화면이 정한다(휴대폰 세로면 'auto' 권장)
//     caption: true,                   // 음절마다 지금 상태로 적은 음절(위쪽 작은 글). 적을 수 없는 조합이면 비워 둔다
//     label: '…',                      // (선택) 블록 묶음의 화면 읽기 이름
//     onTap(알림),                     // 음운 칸 · 틈을 누르면(아래 '알림')
//   })
//   b.el                  뿌리 요소(.bk). 같은 알림을 'blocktap' 이벤트(detail = 알림)로도 보낸다
//   b.render(상태)        상태를 그린다(교정할 때마다 다시 부름). 학생이 만든 어떤 상태든 그린다:
//                         빈 중성 · 빈 음절 · 반모음만 · 적을 수 없는 조합 · 음절이 사라져 줄어든 cuts
//   b.setPicked([자리…])  고른 음운 칸 표시(합침표 첫 음운 · 고침표로 누른 칸). 자리 = Pos 또는 '1.on' 꼴. null이면 지움
//   b.setMode('slot'|'gap'|null)  지금 고를 것(음운 칸 / 틈)을 모양으로 돋보이게(뿌리에 is-mode-slot · is-mode-gap).
//                         누르기를 막지는 않는다(원칙 3) — 어느 것을 눌러도 알림은 간다
//   b.setPen([{ at, op }…])  교정 흔적(감수관의 펜 자국): 그 자리 칸에 .is-pen-<op>(replace · delete · insert · merge).
//                         칸이 없어진 자리(겹받침 하나를 뺀 뒤 등)는 그 음절에 .is-pen. 그림일 뿐 판정하지 않는다. null이면 지움
//   b.setSplit(값)        split을 바꾸고 다시 배치
//   b.lines()             지금 줄 수
//   b.destroy()
//
// ── 알림(onTap) ─────────────────────────────────────────────────────────
//   음운 칸: { type: 'slot', at: { s, slot: 'on'|'gl'|'nu'|'co', k }, id: 음운|null, empty: 빈 자리인지, el: 누른 단추 }
//            at은 엔진의 자리(Pos) 그대로 — G.rules.apply · check · similarCell에 바로 넘긴다. 빈 자리도 알린다.
//   틈:      { type: 'gap', gap: 틈 번호(i = i번 음절과 i+1번 음절 사이), onset: { s: i+1, slot: 'on', k: 0 },
//              glide: { s: i+1, slot: 'gl', k: 0 }, el }   넣음표의 자리(/ㄴ/은 onset, j는 glide). 넣을 수 있는지는 엔진이 정한다.
//            경계 종류는 알림에 싣지 않는다(심화에서 새지 않게).
//
// ── 그리는 것(명세 §8-1) ────────────────────────────────────────────────
//   음절(.bk-syl[data-s]) = 위 줄 초성 · (반모음) · 중성, 아래 줄 종성. 칸은 모두 단추(.bk-slot[data-s][data-slot][data-k]).
//   · 초성이 없으면 ○(표기의 초성 'ㅇ'은 음운이 아님). 중성 · 종성이 비면 점선 빈 칸(.is-empty).
//   · 반모음 칸은 반모음이 있을 때만(ㅕ = /j/ + /ㅓ/). ㅢ는 나누지 않고 한 칸(.is-unsplit, 음운 수는 엔진이 셈).
//   · 겹받침은 종성 자리에 두 칸. 음운은 늘 빗금 표기(/ㄱ/ · /j/).
//   틈(.bk-gap[data-gap])은 음절 사이마다 하나, 단추. 띄어쓰기 틈은 .is-space(낱말 사이 표시).
//   · 기본 단계: formal · content · sino 틈에 '+'(.bk-plus, 종류마다 굵기 · 모양 · 색)와 이름표(.bk-cut = G.text.cutLabel),
//     틈에 .cut-종류 · data-cut. 경계 이름은 aria에도(review.aria.cut).
//   · 심화 단계: 위의 것이 하나도 없다 — 심화 블록의 HTML은 경계를 모두 지운 상태의 블록과 똑같다(점검이 확인).
//     두 줄 나누기 자리도 띄어쓰기만 보고 고른다(나누는 자리로 경계가 새지 않게).
//   제20항 다만 표시(marks)는 그리지 않는다(기본 단계 '한자어' 이름표가 그 도움이다 — 명세 원칙 5).
//   낱말 표시 가운데 어간 + 어미(marks.stem)만 기본 단계에 보인다: 그 형식 경계의 이름표를 G.text.cutLabel(학년, 'stem')
//   (중3 '어미 앞' · 고1 '어간+어미')으로 바꾸고 .is-stem을 단다(제24 · 25항, 제11항 다만 — 결정 0019). 심화 단계에는 없다.
//   나머지 표시(adn · sai · noIns · clusterExc · lateralExc)는 어느 단계에도 그리지 않는다.
//
// ── 두 줄 나누기(명세 §14) ──────────────────────────────────────────────
//   음절 · 틈의 실제 너비를 재서 나눈다. 띄어쓰기 틈(기본 단계는 형태소 경계 틈도) 자리에서 먼저 나누되, 그렇게 나눠서
//   줄이 넘치면 다른 자리에서 나눈다. 줄이 바뀌는 곳의 틈은 두 줄 사이에 가로로 길게 놓여(.bk-gap.is-break) 그대로
//   누를 수 있다(넣음표 자리, '+'와 이름표도 거기에). 가로 너비를 먹지 않아서 휴대폰 세로(360px)에서도 4음절이 두 줄에 든다.
//   두 줄로도 안 들어가는 상태(학생이 반모음을 여럿 넣은 경우 등)는 들어가는 만큼씩 더 나눈다. 너비가 바뀌면 다시 나눈다.
G.blocks = (function () {
  const U = G.util;
  const SHOWN = { formal: true, content: true, sino: true }; // 기본 단계에서 '+'를 그리는 경계
  // '+' 모양(종류마다 굵기 · 모양이 다름 — 색만으로 가르지 않는다). viewBox 0 0 100 100
  const PLUS = {
    formal: '<path d="M50 22V78M22 50H78" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/>',
    content: '<path d="M50 14V86M14 50H86" fill="none" stroke="currentColor" stroke-width="17" stroke-linecap="round"/>',
    sino: '<rect x="10" y="10" width="80" height="80" rx="18" fill="none" stroke="currentColor" stroke-width="7"/>' +
      '<path d="M50 28V72M28 50H72" fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round"/>',
  };
  const SPACE = '<path d="M14 34V66H86V34" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>';

  function pic(cls, inner) {
    const s = U.svg('svg', { class: cls, viewBox: '0 0 100 100', 'aria-hidden': 'true', focusable: 'false' });
    s.innerHTML = inner;
    return s;
  }
  // 음운 표기(빗금은 옅게): textContent는 '/ㄱ/'
  function phonemeText(id) {
    return [U.el('span', { class: 'bk-sl', 'aria-hidden': 'true' }, '/'), U.el('span', { class: 'bk-ph' }, id), U.el('span', { class: 'bk-sl', 'aria-hidden': 'true' }, '/')];
  }
  const posOf = (p) => (typeof p === 'string' ? G.rules.pos(p) : { s: p.s, slot: p.slot, k: p.slot === 'co' ? (p.k || 0) : 0 });
  const posKey = (p) => p.s + '.' + p.slot + '.' + (p.slot === 'co' ? p.k : 0);

  function create(container, options) {
    const o = Object.assign({ grade: 'm3', level: 'basic', split: false, caption: true, label: null, onTap: null }, options || {});
    const showCuts = o.level !== 'advanced';
    const root = U.el('div', { class: 'bk', role: 'group', 'aria-label': o.label || null });
    container.appendChild(root);
    let state = null, picked = [], syls = [], gaps = [], lastW = -1, ro = null;

    // ── 칸 하나 ──
    function slotBtn(s, slot, k, id) {
      const name = G.text.term(o.grade, 'slot', slot);
      const empty = id == null;
      const b = U.el('button', {
        type: 'button',
        class: 'bk-slot' + (empty ? ' is-empty' : '') + (id === 'ㅢ' ? ' is-unsplit' : ''),
        'data-s': s, 'data-slot': slot, 'data-k': slot === 'co' ? k : null,
        'data-weight': id === 'ㅢ' ? 2 : null,
        'aria-label': name + ' ' + (empty ? G.text.t('review.aria.emptySlot') : G.text.phoneme(id)),
      });
      if (!empty) U.append(b, phonemeText(id));
      else if (slot === 'on') b.appendChild(U.el('span', { class: 'bk-zero', 'aria-hidden': 'true' }, '○'));
      else b.appendChild(U.el('span', { class: 'bk-hole', 'aria-hidden': 'true' }));
      return b;
    }
    // 지금 상태의 음절 하나를 적은 것(적을 수 없으면 '') — 연음 없이 그 음절만
    function caption(y) {
      let t = '';
      try { t = G.rules.reading({ syl: [y], cuts: [], marks: {} }); } catch (e) { t = ''; }
      return G.hangul.isSyllable(t) ? t : '';
    }
    function sylEl(y, s) {
      const top = U.el('div', { class: 'bk-top' }, [
        slotBtn(s, 'on', 0, y.on || null),
        y.gl ? slotBtn(s, 'gl', 0, y.gl) : null,
        slotBtn(s, 'nu', 0, y.nu || null),
      ]);
      const co = Array.isArray(y.co) ? y.co : [];
      const bot = U.el('div', { class: 'bk-bot' }, co.length ? co.map((c, k) => slotBtn(s, 'co', k, c)) : slotBtn(s, 'co', 0, null));
      return U.el('div', { class: 'bk-syl' + (y.gl ? ' has-gl' : ''), 'data-s': s, role: 'group', 'aria-label': G.text.t('review.aria.syllable', { n: s + 1 }) }, [
        o.caption ? U.el('div', { class: 'bk-cap', 'aria-hidden': 'true' }, caption(y)) : null,
        top, bot,
      ]);
    }
    function gapEl(i, cut) {
      const kind = showCuts && SHOWN[cut] ? cut : null;
      const space = cut === 'space';
      // 어간 + 어미 표시(marks.stem)가 있는 형식 경계: 기본 단계에서 이름표만 학년별 '어간 + 어미' 꼴로(모양 · 색은 형식 경계 그대로)
      const stem = kind === 'formal' && ((state && state.marks && state.marks.stem) || []).indexOf(i) >= 0;
      const name = kind ? G.text.cutLabel(o.grade, stem ? 'stem' : kind) : '';
      let label = G.text.t('review.aria.gap', { n: i + 1 });
      if (kind) label += ', ' + G.text.t('review.aria.cut', { label: name }, o.grade);
      return U.el('button', {
        type: 'button',
        class: 'bk-gap' + (space ? ' is-space' : '') + (kind ? ' cut-' + kind : '') + (stem ? ' is-stem' : ''),
        'data-gap': i, 'data-cut': kind, 'aria-label': label,
      }, kind ? [pic('bk-plus', PLUS[kind]), U.el('span', { class: 'bk-cut', 'aria-hidden': 'true' }, name)]
        : space ? pic('bk-space', SPACE) : null);
    }

    // ── 줄 나누기 ──
    // 줄 시작 음절 번호들([0, …])을 돌려준다. w = { syl: [너비], gap: [너비] }, avail = 쓸 수 있는 너비(모르면 0)
    function chooseBreaks(w, avail, force) {
      const n = w.syl.length;
      if (n < 2) return [0];
      const span = (a, b) => { // a~b 음절 + 그 사이 틈(줄 바뀌는 틈은 두 줄 사이에 가로로 놓여 너비를 먹지 않음)
        let t = 0;
        for (let i = a; i <= b; i++) t += w.syl[i] + (i < b ? w.gap[i] : 0);
        return t;
      };
      const fits = (x) => !avail || x <= avail + 0.5;
      if (!force && fits(span(0, n - 1))) return [0];
      const cuts = (state && state.cuts) || [];
      const rank = (g) => (cuts[g] === 'space' ? 0 : showCuts && SHOWN[cuts[g]] ? 1 : 2);
      let best = null;
      for (let g = 0; g < n - 1; g++) {
        const m = Math.max(span(0, g), span(g + 1, n - 1));
        if (!fits(m)) continue;
        const c = { g, r: rank(g), m };
        if (!best || c.r < best.r || (c.r === best.r && c.m < best.m - 0.5)) best = c;
      }
      if (best) return [0, best.g + 1];
      // 두 줄로도 안 들어감: 들어가는 만큼씩
      const starts = [0];
      let a = 0;
      for (let i = 1; i < n; i++) if (!fits(span(a, i))) { starts.push(i); a = i; }
      return starts;
    }
    function layout() {
      if (!state) return;
      const n = syls.length;
      U.clear(root);
      // 먼저 한 줄로 놓고 잰다
      const one = U.el('div', { class: 'bk-line' });
      syls.forEach((e, i) => { one.appendChild(e); if (i < n - 1) one.appendChild(gaps[i]); });
      root.appendChild(one);
      root.classList.remove('is-split');
      gaps.forEach((g) => g.classList.remove('is-break'));
      if (!o.split || n < 2) return;
      const avail = root.clientWidth;
      lastW = avail;
      const w = { syl: syls.map((e) => e.getBoundingClientRect().width), gap: gaps.map((e) => e.getBoundingClientRect().width) };
      if (!avail && o.split !== true) return; // 아직 화면에 없음 — 너비가 생기면 다시
      const starts = chooseBreaks(w, avail, o.split === true);
      if (starts.length < 2) return;
      U.clear(root);
      starts.forEach((a, j) => {
        const b = j + 1 < starts.length ? starts[j + 1] - 1 : n - 1;
        const line = U.el('div', { class: 'bk-line' });
        for (let i = a; i <= b; i++) { line.appendChild(syls[i]); if (i < b) line.appendChild(gaps[i]); }
        root.appendChild(line);
        if (b < n - 1) { gaps[b].classList.add('is-break'); root.appendChild(gaps[b]); } // 줄 바뀌는 틈: 두 줄 사이에 가로로
      });
      root.classList.add('is-split');
    }
    function watch() {
      if (ro || typeof ResizeObserver !== 'function') return;
      // 다시 배치는 관찰 콜백이 끝난 뒤에(콜백 안에서 크기를 바꾸면 'ResizeObserver loop' 오류가 날 수 있음)
      let queued = false;
      ro = new ResizeObserver(() => {
        if (queued) return;
        queued = true;
        setTimeout(() => {
          queued = false;
          if (!o.split || !state || !root.isConnected) return;
          if (Math.abs(root.clientWidth - lastW) > 0.5) layout();
        }, 0);
      });
      ro.observe(root);
    }

    // ── 그리기 ──
    function render(st) {
      if (!st || !Array.isArray(st.syl)) throw new Error('블록: 상태 모양이 틀림');
      state = st;
      syls = st.syl.map((y, s) => sylEl(y || { on: null, gl: null, nu: null, co: [] }, s));
      gaps = syls.slice(1).map((_, i) => gapEl(i, st.cuts ? st.cuts[i] : null));
      layout();
      paintPicked();
      paintPen();
      watch();
    }
    // 교정 흔적(펜 자국) — 다시 그릴 때마다 다시 붙인다
    let pen = [];
    let penSeen = {}; // 이미 그려진 흔적(다시 그릴 때 펜 그리는 움직임을 되풀이하지 않게 — 새 흔적에만 .is-pen-new)
    const PEN_OPS = ['replace', 'delete', 'insert', 'merge'];
    function paintPen() {
      root.querySelectorAll('.bk-slot, .bk-syl').forEach((n) => {
        n.classList.remove('is-pen', 'is-pen-new');
        PEN_OPS.forEach((op) => n.classList.remove('is-pen-' + op));
      });
      const seen = {};
      pen.forEach(({ at, op }) => {
        const p = posOf(at);
        const key = posKey(p) + ':' + op;
        seen[key] = true;
        const fresh = !penSeen[key];
        const slot = root.querySelector('.bk-slot[data-s="' + p.s + '"][data-slot="' + p.slot + '"]' + (p.slot === 'co' ? '[data-k="' + p.k + '"]' : ''));
        const n = slot || root.querySelector('.bk-syl[data-s="' + p.s + '"]');
        if (!n) return;
        n.classList.add(slot ? 'is-pen-' + op : 'is-pen');
        if (fresh) n.classList.add('is-pen-new');
      });
      penSeen = seen;
    }
    function setPen(list) {
      pen = (list || []).filter((x) => x && x.at && PEN_OPS.indexOf(x.op) >= 0).map((x) => ({ at: x.at, op: x.op }));
      paintPen();
    }
    function paintPicked() {
      const keys = picked.map(posKey);
      root.querySelectorAll('.bk-slot').forEach((b) => {
        const p = { s: +b.getAttribute('data-s'), slot: b.getAttribute('data-slot'), k: +(b.getAttribute('data-k') || 0) };
        b.classList.toggle('is-picked', keys.indexOf(posKey(p)) >= 0);
      });
    }
    function setPicked(list) {
      picked = (list || []).map(posOf);
      paintPicked();
    }
    function setMode(m) {
      root.classList.remove('is-mode-slot', 'is-mode-gap');
      if (m === 'slot' || m === 'gap') root.classList.add('is-mode-' + m);
    }
    function setSplit(v) { o.split = v; layout(); }

    // ── 누르기 → 알림 ──
    function onClick(ev) {
      const b = ev.target && ev.target.closest ? ev.target.closest('button') : null;
      if (!b || !root.contains(b) || !state) return;
      let p = null;
      if (b.classList.contains('bk-slot')) {
        const at = { s: +b.getAttribute('data-s'), slot: b.getAttribute('data-slot'), k: +(b.getAttribute('data-k') || 0) };
        const y = state.syl[at.s] || {};
        const id = at.slot === 'co' ? ((y.co || [])[at.k] || null) : (y[at.slot] || null);
        p = { type: 'slot', at, id, empty: id == null, el: b };
      } else if (b.classList.contains('bk-gap')) {
        const i = +b.getAttribute('data-gap');
        p = { type: 'gap', gap: i, onset: { s: i + 1, slot: 'on', k: 0 }, glide: { s: i + 1, slot: 'gl', k: 0 }, el: b };
      }
      if (!p) return;
      if (typeof o.onTap === 'function') o.onTap(p);
      root.dispatchEvent(new CustomEvent('blocktap', { detail: p, bubbles: true }));
    }
    root.addEventListener('click', onClick);

    function destroy() {
      if (ro) { ro.disconnect(); ro = null; }
      root.removeEventListener('click', onClick);
      if (root.parentNode) root.parentNode.removeChild(root);
      state = null; syls = []; gaps = [];
    }

    return {
      el: root, render, setPicked, setPen, setMode, setSplit, destroy,
      lines: () => root.querySelectorAll('.bk-line').length,
    };
  }

  return { create };
})();
