'use strict';
// 모든 스크립트가 함께 쓰는 전역 이름 G와 작은 도구들. 가장 먼저 불러온다(층 순서 util → data → core → game → main).
//   작업마다 이름 하나씩: G.util, G.hangul, G.rules, G.text, G.audio, G.save, G.howto, G.app, 화면 G.screens.<이름>
//   출처: DOM · SVG 도우미와 기호(glyph)는 「음운 해전」 pblsketch/sori-haejeon js/core/util.js 를 가져왔다.
//   바꾼 것: 오류 모음 이름(__gamsuErrors), 기호 목록(이 게임의 신호 넷 · 교정 부호 넷 · 단추 기호), G.screens 자리.
//
// ── 이 파일은 Node 점검(tests/check-rules.mjs 등)이 document 없이 불러온다 ──────────
//   그래서 불러올 때(최상위)는 document에 닿지 않는다. document는 아래 함수 안에서만 쓴다.
//   window.addEventListener는 Node 점검 쪽에서 빈 함수로 흉내 낸다.
window.G = window.G || {};

// 점검용 오류 모음: 페이지에서 난 오류를 window.__gamsuErrors에 모아 둔다(점검 도구가 읽음).
//   console.error도 페이지 오류로 센다 — 게임 코드는 예상된 실패에 console.error를 쓰지 않는다(console.warn 한 번).
(function () {
  const errs = (window.__gamsuErrors = window.__gamsuErrors || []);
  window.addEventListener('error', (e) => errs.push(String(e.message || e)));
  window.addEventListener('unhandledrejection', (e) => errs.push('rejection: ' + String((e.reason && e.reason.message) || e.reason)));
  const ce = console.error.bind(console);
  console.error = function (...a) { errs.push(a.map(String).join(' ')); return ce(...a); };
})();

// 화면 등록 자리(js/game/app.js의 G.app.go가 이름으로 찾음). 화면 파일은 이 자리에 자기를 더한다:
//   G.screens.review = { mount(root, value) { … }, unmount() { … } }
//   자세한 약속은 js/game/app.js 머리 주석.
G.screens = G.screens || {};

G.util = {
  // 요소 만들기: el('div', { class: 'x', onclick: fn, 'aria-label': '…' }, [자식 또는 글])
  //   값이 null · undefined · false면 그 속성은 붙이지 않는다. true면 빈 값('')으로 붙인다.
  //   'html'은 innerHTML(코드로 만든 SVG 기호에만 쓴다 — 문구를 넣지 않는다).
  el(tag, attrs, children) {
    const n = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else if (k === 'class') n.className = v;
      else if (k === 'html') n.innerHTML = v;
      else n.setAttribute(k, v === true ? '' : v);
    }
    G.util.append(n, children);
    return n;
  },
  // 자식 붙이기(글 · 요소 · 배열, null · false는 건너뜀) → 그 요소
  append(n, children) {
    if (children != null) (Array.isArray(children) ? children : [children]).forEach((c) => {
      if (c == null || c === false) return;
      if (Array.isArray(c)) { G.util.append(n, c); return; }
      n.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
    return n;
  },
  // SVG 요소: svg('path', { d: 'M0 0…', class: 'x' })
  svg(tag, attrs) {
    const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    if (attrs) for (const k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    return n;
  },
  // 안의 것 모두 비우기
  clear(n) { while (n && n.firstChild) n.removeChild(n.firstChild); return n; },
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  // 벡터 기호(글꼴에 기대지 않음): glyph('onair', 'sig-badge') → <svg class="sig-badge" data-glyph="onair" aria-hidden="true">
  //   신호 넷(색 + 기호로 구분, 명세 §3-4 · §14): onair 감수 도장(동그라미 + 맞음) · offrule 규칙 밖(세모 + 느낌표)
  //     · diff 다름(같지 않음 =에 빗금) · nonstandard 표준 아님(말풍선 + ×)
  //   교정 부호 넷(단추 기호 — 원고 위에 그리는 실제 부호 모양은 감수 화면이 정함): replace 고침(연필) · delete 뺌(빼기)
  //     · insert 넣음(꺾쇠 ∨) · merge 합침(겹친 고리)
  //   그 밖: undo 되돌리기 · help 도움(?) · next 다음(›) · send 송출(▶) · sound/mute 소리 켬/끔 · book 게임 방법
  //     · gear 설정 · script 원고(종이) · image 그림 자리 · check 고름 · close 닫기(×) · lock 준비 중(자물쇠) · rotate 돌리기
  glyph(name, cls) {
    const s = G.util.svg('svg', { class: cls || 'glyph', viewBox: '0 0 100 100', 'aria-hidden': 'true', focusable: 'false', 'data-glyph': name });
    s.innerHTML = G.util.GLYPHS[name] || '';
    return s;
  },
  GLYPHS: (function () {
    const ln = (d, w) => '<path d="' + d + '" fill="none" stroke="currentColor" stroke-width="' + (w || 10) + '" stroke-linecap="round" stroke-linejoin="round"/>';
    const ring = (r, w) => '<circle cx="50" cy="50" r="' + r + '" fill="none" stroke="currentColor" stroke-width="' + (w || 9) + '"/>';
    return {
      // 신호
      onair: ring(41, 8) + ring(31, 4) + ln('M33 51l12 12 23-25', 11),
      offrule: ln('M50 12L90 84H10Z', 9) + ln('M50 38v22', 11) + '<circle cx="50" cy="72" r="6" fill="currentColor"/>',
      diff: ln('M20 38H80M20 62H80', 11) + ln('M66 16L34 84', 9),
      nonstandard: ln('M16 22h68a6 6 0 0 1 6 6v36a6 6 0 0 1-6 6H44L26 86V70H16a6 6 0 0 1-6-6V28a6 6 0 0 1 6-6z', 8) + ln('M38 34l24 24M62 34L38 58', 9),
      // 교정 부호(단추 기호)
      replace: ln('M22 78l6-20 40-40 14 14-40 40z', 8) + ln('M60 26l14 14', 8) + ln('M18 88h64', 7),
      delete: ln('M18 50H82', 12),
      insert: ln('M20 30L50 76L80 30', 11),
      merge: '<circle cx="38" cy="50" r="22" fill="none" stroke="currentColor" stroke-width="9"/><circle cx="62" cy="50" r="22" fill="none" stroke="currentColor" stroke-width="9"/>',
      // 단추 기호
      undo: ln('M30 38H62a20 20 0 0 1 0 40H40', 10) + ln('M42 22L26 38l16 16', 10),
      help: ring(40, 8) + ln('M38 38a12 12 0 1 1 18 10c-4 3-6 5-6 10', 9) + '<circle cx="50" cy="72" r="5.5" fill="currentColor"/>',
      next: ln('M38 20l30 30-30 30', 12),
      send: '<path d="M30 18L82 50 30 82z" fill="currentColor"/>',
      sound: '<path d="M14 38h16l22-18v60L30 62H14z" fill="currentColor"/>' + ln('M64 36a18 18 0 0 1 0 28M74 24a34 34 0 0 1 0 52', 8),
      mute: '<path d="M14 38h16l22-18v60L30 62H14z" fill="currentColor"/>' + ln('M64 38l22 24M86 38L64 62', 8),
      book: ln('M50 26c-10-8-24-10-38-8v58c14-2 28 0 38 8 10-8 24-10 38-8V18c-14-2-28 0-38 8zM50 26v58', 7),
      gear: ring(14, 9) + ln('M50 10v14M50 76v14M10 50h14M76 50h14M22 22l10 10M68 68l10 10M22 78l10-10M68 32l10-10', 10) + ring(28, 8),
      script: ln('M24 10h36l18 18v62H24z', 7) + ln('M60 10v18h18M36 48h30M36 62h30M36 76h20', 7),
      image: ln('M12 20h76v60H12z', 6) + ln('M18 74l22-26 16 16 10-10 16 20', 6) + '<circle cx="66" cy="38" r="7" fill="currentColor"/>',
      check: ln('M18 52l20 20 44-46', 12),
      close: ln('M24 24L76 76M76 24L24 76', 11),
      lock: '<rect x="22" y="44" width="56" height="42" rx="8" fill="currentColor"/>' + ln('M34 44V34a16 16 0 0 1 32 0v10', 9),
      rotate: '<rect x="34" y="8" width="32" height="56" rx="6" fill="none" stroke="currentColor" stroke-width="6"/>' + ln('M14 62a36 36 0 0 0 28 28', 6) + ln('M30 92l13 0-3-12', 6),
    };
  })(),
  // 움직임 줄이기: 설정(<html>.reduce-motion — G.save.applySettings가 붙임) 또는 기기 설정
  reducedMotion() {
    return document.documentElement.classList.contains('reduce-motion') ||
      !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  },
};
