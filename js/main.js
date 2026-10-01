'use strict';
// 게임 시작점 — 가장 마지막에 불러온다(index.html의 scripts 끝).
//   출처: 「음운 해전」 pblsketch/sori-haejeon js/main.js 와 같은 방식.
//   1) 저장된 설정(배경 음악 · 효과음 · 움직임 줄이기)을 적용한다(G.save.applySettings → G.audio.configure, <html>.reduce-motion).
//   2) 시작 화면을 연다(G.app.start — '세로로 돌려 주세요' 덮개도 붙임). 진행 중인 장은 시작 화면의 이어 하기 카드로 고른다.
//   소리는 첫 터치 뒤에 켜진다(js/core/audio.js가 알아서 기다림).
//   지침 · 감수 · 조항 공개 · 장 결과 화면은 G.screens.<이름>에 등록되어 있으면 G.app.go가 부른다(js/game/app.js 머리 주석).
(function () {
  function boot() {
    G.save.applySettings();
    G.app.start();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
