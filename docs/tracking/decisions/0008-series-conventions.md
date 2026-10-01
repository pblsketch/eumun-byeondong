# 0008 기술·점검은 소리 해전 관례를 따름

## 결정
- HTML + CSS + 순수 JS, 빌드 없음, 일반 `<script>` + 전역 `window.G`(층 순서 util → data → core → game → main). file://과 GitHub Pages 모두 동작.
- 자질 데이터는 소리 해전 `js/data/sounds.js`를 가져와(출처 표시) 반모음 j·w를 더한다.
- 규칙 점검은 Node `vm`, 브라우저 점검은 **aside**(선생님 PC — 소리 해전 0003과 같음).
- 그림은 정확해야 하는 것은 SVG, 분위기 그림은 `tools/gen.ps1`(Codex image_gen).
- 커밋 메시지는 한국어. push 전에 선생님 확인.
