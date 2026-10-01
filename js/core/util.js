'use strict';
// 모든 스크립트가 함께 쓰는 전역 이름 G. 가장 먼저 불러온다(층 순서 util → data → core → game → main).
//   작업마다 이름 하나씩: G.hangul, G.rules (화면 모듈은 구현 2단계에서 더한다)
window.G = window.G || {};

// 점검용 오류 모음: 페이지에서 난 오류를 window.__gamsuErrors에 모아 둔다(점검 도구가 읽음).
(function () {
  const errs = (window.__gamsuErrors = window.__gamsuErrors || []);
  window.addEventListener('error', (e) => errs.push(String(e.message || e)));
  window.addEventListener('unhandledrejection', (e) => errs.push('rejection: ' + String((e.reason && e.reason.message) || e.reason)));
  const ce = console.error.bind(console);
  console.error = function (...a) { errs.push(a.map(String).join(' ')); return ce(...a); };
})();
