'use strict';
// 조음 도표 G.chart — 고침표 · 합침표에서 옮겨 갈 음운(결과 음운)을 고르는 부품(명세 §8-2 · §14).
//   불러오는 순서: util → data(sounds · text) → 이 파일. 모양은 css/chart.css.
//   점검: tests/check-chart.mjs (점검 전용 페이지 tests/pages/chart.html)
//   도표는 판단하지 않는다: 규칙 엔진(G.rules)을 부르지 않는다. 지금 음운 · 닮은 칸은 감수 화면이 정해 넘긴다
//   (닮은 칸 = G.rules.similarCell의 결과, 1·2장 기본 단계에서만 — 명세 §8-2 · §19). 음절 블록(js/game/blocks.js)과도 서로 부르지 않는다.
//   출처: 자음표의 줄 · 열(방법 × 위치, 칸 안은 세기 차례)과 모음표의 줄 · 열(높이 × 앞뒤·입술)을 SOUNDS 자질로 짓는 방식은
//   「음운 해전」 pblsketch/sori-haejeon js/game/board.js(geo)를 따랐다. 바다 지도 · 배 그림은 가져오지 않았다.
//
// ── 만들기 ──────────────────────────────────────────────────────────────
//   const c = G.chart.create(담을요소, {
//     grade: 'm3'|'h1',          // 제목 · 머리글(학년별 짧은 이름, G.text.short)
//     onPick(알림),              // 칸을 누르면 { id: 음운 id('ㄴ' · 'ㅓ' · 'j'), part: 'consonant'|'vowel'|'glide', el: 누른 단추 }
//     onClose(),                 // (선택) 주면 [닫기] 단추를 그리고 누르면 부른다
//   })
//   c.el                         뿌리 요소(.ch). 같은 알림을 'chartpick' 이벤트(detail = 알림)로도 보낸다
//   c.show({ parts, current, like })
//       parts:   그릴 표 — 'consonant'(자음 체계표) · 'vowel'(단모음 체계표) · 'glide'(반모음 줄) 가운데 하나 이상, 이 차례로 그린다.
//                누른 자리에 맞는 표는 감수 화면이 고른다(초성 · 종성 → 자음표, 중성 → 모음표, 반모음 → 반모음 줄; 합침표는 둘 이상도 됨).
//       current: 지금 음운 id(그 칸은 누를 수 없음 — 이미 그 음운). 표에 없는 음운(ㅢ 등)이면 아무 칸도 꺼지지 않는다.
//       like:    닮은 칸으로 은은히 보일 음운 id 목록(넘긴 칸만, 보이는 표에 있는 칸만). 비우면 없음.
//   c.setLike(목록|null)          닮은 칸만 바꾸기
//   c.hide() · c.destroy()
//
// ── 그리는 것 ───────────────────────────────────────────────────────────
//   자음표(table.ch-table[data-part=consonant]): 줄 = SOUNDS.manners(파열 · 파찰 · 마찰 · 비음 · 유음), 열 = SOUNDS.places,
//     칸(td.ch-td[data-row][data-col]) 안은 세기 차례(예사 → 된 → 거센). 국어에 없는 칸은 빗금 무늬(td.ch-empty, 누르지 않음).
//     휴대폰 세로에서는 칸 안 음운을 세로로 쌓아 가로 너비를 줄인다.
//   모음표: 줄 = SOUNDS.heights, 열 = SOUNDS.columns(앞뒤 × 입술), 단모음 10개. 반모음 줄: /j/ · /w/.
//   음운 단추(.ch-cell[data-id][data-part])의 글은 빗금 표기(/ㄱ/). 지금 칸 .is-current(꺼짐), 닮은 칸 .is-like(점선 테두리 + 점 —
//   색만으로 구분하지 않음). aria는 review.aria.cell · cellCurrent · cellLike.
G.chart = (function () {
  const U = G.util, S = window.SOUNDS;
  const RANK = { plain: 0, tense: 1, aspirated: 2, none: 0 };
  const PARTS = ['consonant', 'vowel', 'glide'];
  const T = (path, vars, grade) => G.text.t(path, vars, grade);

  function phonemeText(id) {
    return [U.el('span', { class: 'ch-sl', 'aria-hidden': 'true' }, '/'), U.el('span', { class: 'ch-ph' }, id), U.el('span', { class: 'ch-sl', 'aria-hidden': 'true' }, '/')];
  }

  function create(container, options) {
    const o = Object.assign({ grade: 'm3', onPick: null, onClose: null }, options || {});
    const root = U.el('div', { class: 'ch', role: 'group' });
    root.hidden = true;
    container.appendChild(root);
    let view = { parts: [], current: null, like: [] };

    const cell = (id, part) => U.el('button', { type: 'button', class: 'ch-cell', 'data-id': id, 'data-part': part }, phonemeText(id));
    // 표 하나: rows/cols = 자질 값 목록, rg/cg = 짧은 이름 묶음, at(소리) = [줄 값, 열 값]
    function grid(part, list, rows, cols, rg, cg, at, corner) {
      const head = U.el('tr', null, [
        U.el('td', { class: 'ch-corner', 'aria-hidden': 'true' }, [
          U.el('span', { class: 'ch-ax ch-ax-col' }, corner[1] + ' →'),
          U.el('span', { class: 'ch-ax ch-ax-row' }, '↓ ' + corner[0]),
        ]),
      ].concat(cols.map((c) => U.el('th', { scope: 'col', 'data-col': c }, G.text.short(o.grade, cg, c)))));
      const body = rows.map((r) => U.el('tr', null, [U.el('th', { scope: 'row', 'data-row': r }, G.text.short(o.grade, rg, r))].concat(cols.map((c) => {
        const here = list.filter((s) => { const p = at(s); return p[0] === r && p[1] === c; })
          .sort((a, b) => RANK[a.strength || 'none'] - RANK[b.strength || 'none']);
        if (!here.length) return U.el('td', { class: 'ch-td ch-empty', 'data-row': r, 'data-col': c, 'aria-label': T('review.chart.empty') });
        return U.el('td', { class: 'ch-td', 'data-row': r, 'data-col': c }, U.el('div', { class: 'ch-stack' }, here.map((s) => cell(s.id, part))));
      }))));
      return U.el('table', { class: 'ch-table ch-' + part, 'data-part': part }, [U.el('thead', null, head), U.el('tbody', null, body)]);
    }
    function part(name) {
      const id = 'ch-' + name + '-' + Math.random().toString(36).slice(2, 8);
      let title, inner;
      if (name === 'consonant') {
        title = T('review.chart.consonant', null, o.grade);
        inner = [
          grid('consonant', S.consonants, S.manners, S.places, 'manner', 'place', (s) => [s.manner, s.place],
            [G.text.short(o.grade, 'axis', 'manner'), G.text.short(o.grade, 'axis', 'place')]),
          U.el('p', { class: 'ch-legend' }, G.text.short(o.grade, 'axis', 'strength') + ': ' +
            ['plain', 'tense', 'aspirated'].map((k) => G.text.short(o.grade, 'strength', k)).join(' → ')),
        ];
      } else if (name === 'vowel') {
        title = T('review.chart.vowel', null, o.grade);
        inner = [grid('vowel', S.vowels, S.heights, S.columns, 'height', 'column', (s) => [s.height, s.column],
          [G.text.short(o.grade, 'axis', 'height'), G.text.short(o.grade, 'axis', 'backness') + '·' + G.text.short(o.grade, 'axis', 'lips')])];
      } else {
        title = T('review.chart.glide');
        inner = [U.el('div', { class: 'ch-glides' }, S.glides.map((g) => cell(g.id, 'glide')))];
      }
      return U.el('section', { class: 'ch-part', 'data-part': name, 'aria-labelledby': id }, [U.el('div', { class: 'ch-title', id }, title)].concat(inner));
    }
    function build() {
      U.clear(root);
      if (typeof o.onClose === 'function') {
        root.appendChild(U.el('div', { class: 'ch-bar' }, U.el('button', { type: 'button', class: 'app-btn ch-close' }, [U.glyph('close'), T('review.chart.close')])));
      }
      root.appendChild(U.el('div', { class: 'ch-parts' }, view.parts.map(part)));
    }
    function paint() {
      const like = view.like || [];
      root.querySelectorAll('.ch-cell').forEach((b) => {
        const id = b.getAttribute('data-id'), ph = G.text.phoneme(id);
        const cur = id === view.current, lk = !cur && like.indexOf(id) >= 0;
        b.disabled = cur;
        b.classList.toggle('is-current', cur);
        b.classList.toggle('is-like', lk);
        b.setAttribute('aria-label', T(cur ? 'review.aria.cellCurrent' : lk ? 'review.aria.cellLike' : 'review.aria.cell', { phoneme: ph }));
      });
    }

    function show(v) {
      v = v || {};
      const want = Array.isArray(v.parts) ? v.parts : [v.parts];
      view = { parts: PARTS.filter((p) => want.indexOf(p) >= 0), current: v.current || null, like: (v.like || []).slice() };
      build();
      paint();
      root.hidden = false;
    }
    function setLike(ids) { view.like = (ids || []).slice(); paint(); }
    function hide() { root.hidden = true; }

    function onClick(ev) {
      const b = ev.target && ev.target.closest ? ev.target.closest('button') : null;
      if (!b || !root.contains(b) || b.disabled) return;
      if (b.classList.contains('ch-close')) { if (typeof o.onClose === 'function') o.onClose(); return; }
      if (!b.classList.contains('ch-cell')) return;
      const p = { id: b.getAttribute('data-id'), part: b.getAttribute('data-part'), el: b };
      if (typeof o.onPick === 'function') o.onPick(p);
      root.dispatchEvent(new CustomEvent('chartpick', { detail: p, bubbles: true }));
    }
    root.addEventListener('click', onClick);

    function destroy() {
      root.removeEventListener('click', onClick);
      if (root.parentNode) root.parentNode.removeChild(root);
    }

    return { el: root, show, setLike, hide, destroy };
  }

  return { create };
})();
