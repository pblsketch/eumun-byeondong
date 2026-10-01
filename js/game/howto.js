'use strict';
// ───────────────────────────────────────────────────────────────
// 게임 방법 G.howto — 시작 화면과 감수 화면의 '게임 방법' 단추로 여는 안내 창(명세 §4 · §5-5)
// ───────────────────────────────────────────────────────────────
//   출처: 「음운 해전」 pblsketch/sori-haejeon js/game/howto.js 의 창 틀(덮개 · 닫기 셋 · 초점 되돌리기 · 한 번에 창 하나)을 가져왔다.
//   바꾼 것: 바다 탭 · 보기 칩 · 신호 · 배 그림을 빼고, TEXT.howto.sections를 차례대로 번호 카드로 그린다.
//   불러오는 순서: util → data(text) → core(save) → 이 파일. 모양은 css/howto.css.
//   화면의 설명은 한 줄 자리 하나지만, 이 창은 학생이 스스로 여는 안내라서 여러 줄을 담는다(명세 §13).
//   문구는 모두 TEXT.howto(js/data/text.js) — 학년 꼴({ m3, h1 })은 G.text.get으로 그 학년 쪽을 고른다.
//
// 쓰는 법
//   const h = G.howto.open({ grade: 'm3'|'h1', onClose });
//     document.body에 덮개(.howto)를 붙인다. '알겠어요'(.howto-ok) · 닫기(.howto-x) · 바깥 누르기 · Esc로 닫힌다.
//     열면 G.save.setSeenHowto(true) — 시작 화면의 '처음이라면 먼저 보세요' 표시가 사라진다.
//   h.close() · G.howto.current()(열린 창 또는 null)
//   G.howto.button(cls, opts 또는 () => opts, label) → 여는 단추 하나(<button class="howto-open …">)
//   한 번에 창 하나: 이미 열려 있으면 그 창을 닫고 새로 연다.
(function () {
  const U = G.util, el = U.el;
  let cur = null;

  function card(n, sec) {
    const lines = Array.isArray(sec.lines) ? sec.lines : [];
    return el('section', { class: 'howto-card' }, [
      el('h3', { class: 'howto-card-h' }, [el('span', { class: 'howto-num', 'aria-hidden': 'true' }, String(n)), sec.title || '']),
      lines.filter(Boolean).map((t) => el('p', { class: 'howto-p' }, t)),
    ]);
  }

  function open(o) {
    o = o || {};
    if (cur) cur.close();
    const H = window.TEXT.howto;
    const grade = o.grade === 'h1' ? 'h1' : 'm3';
    const sections = G.text.get('howto.sections', grade) || [];
    const prevFocus = document.activeElement;

    const body = el('div', { class: 'howto-body' }, sections.map((s, i) => card(i + 1, s)));
    const closeX = el('button', { type: 'button', class: 'howto-x', 'aria-label': H.closeX, onclick: () => close() }, U.glyph('close', 'howto-x-ico'));
    const okBtn = el('button', { type: 'button', class: 'howto-ok', onclick: () => close() }, H.close);
    const titleId = 'howto-title-' + Date.now();
    const panel = el('div', { class: 'howto-panel', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId }, [
      el('header', { class: 'howto-head' }, [
        el('span', { class: 'howto-head-ico', 'aria-hidden': 'true' }, U.glyph('book')),
        el('h2', { class: 'howto-title', id: titleId }, H.title),
        closeX,
      ]),
      body,
      el('footer', { class: 'howto-foot' }, [okBtn]),
    ]);
    const root = el('div', { class: 'howto', onclick: (e) => { if (e.target === root) close(); } }, [panel]);
    function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } }
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(root);
    try { if (G.save && G.save.setSeenHowto) G.save.setSeenHowto(true); } catch (e) { /* 저장이 막혀도 창은 열린다 */ }
    try { okBtn.focus({ preventScroll: true }); } catch (e) { /* 무시 */ }

    let closed = false;
    function close() {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKey, true);
      root.remove();
      if (cur === handle) cur = null;
      try { if (prevFocus && prevFocus.focus && document.contains(prevFocus)) prevFocus.focus({ preventScroll: true }); } catch (e) { /* 무시 */ }
      if (typeof o.onClose === 'function') o.onClose();
    }
    const handle = { el: root, close, grade };
    cur = handle;
    return handle;
  }

  // 여는 단추: G.howto.button('rv-howto', () => ({ grade }))
  function button(cls, optsFn, label) {
    const name = label || window.TEXT.howto.open;
    return el('button', {
      type: 'button', class: 'howto-open' + (cls ? ' ' + cls : ''),
      onclick: () => open(typeof optsFn === 'function' ? optsFn() : optsFn),
    }, [el('span', { class: 'howto-open-ico', 'aria-hidden': 'true' }, U.glyph('book')), el('span', { class: 'howto-open-label' }, name)]);
  }

  G.howto = { open, button, current: () => cur };
})();
