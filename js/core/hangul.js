'use strict';
// 한글 음절 나누기·합치기 G.hangul — 순수 함수(DOM 없음). 규칙 엔진이 표기를 음절 자리로 바꾸고, 프롬프터 발음을 다시 음절로 적을 때 쓴다.
//   불러오는 순서: js/core/util.js → js/data/* → 이 파일 → js/core/rules.js
//   split('닭') → { on: 'ㄷ', v: 'ㅏ', co: ['ㄹ', 'ㄱ'] }   (초성 'ㅇ'은 null = 빈 자리, 겹받침은 두 자음으로)
//   join('ㄷ', 'ㅏ', ['ㄹ', 'ㄱ']) → '닭'                     (음절로 적을 수 없는 조합이면 자모를 그대로 이어 적는다)
G.hangul = (function () {
  const BASE = 0xac00, LAST = 0xd7a3;
  const L = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  const V = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
  const T = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  // 겹받침 = 두 자음(쌍받침 ㄲ·ㅆ은 한 음운이라 여기 없다)
  const CLUSTER = {
    'ㄳ': ['ㄱ', 'ㅅ'], 'ㄵ': ['ㄴ', 'ㅈ'], 'ㄶ': ['ㄴ', 'ㅎ'], 'ㄺ': ['ㄹ', 'ㄱ'], 'ㄻ': ['ㄹ', 'ㅁ'], 'ㄼ': ['ㄹ', 'ㅂ'],
    'ㄽ': ['ㄹ', 'ㅅ'], 'ㄾ': ['ㄹ', 'ㅌ'], 'ㄿ': ['ㄹ', 'ㅍ'], 'ㅀ': ['ㄹ', 'ㅎ'], 'ㅄ': ['ㅂ', 'ㅅ'],
  };
  const CLUSTER_OF = {};
  Object.keys(CLUSTER).forEach((k) => { CLUSTER_OF[CLUSTER[k].join('')] = k; });

  const isSyllable = (ch) => typeof ch === 'string' && ch.length === 1 && ch.charCodeAt(0) >= BASE && ch.charCodeAt(0) <= LAST;

  function split(ch) {
    if (!isSyllable(ch)) return null;
    const n = ch.charCodeAt(0) - BASE;
    const t = T[n % 28], v = V[Math.floor(n / 28) % 21], l = L[Math.floor(n / 588)];
    return { on: l === 'ㅇ' ? null : l, v, co: t === '' ? [] : CLUSTER[t] ? CLUSTER[t].slice() : [t] };
  }

  // on: 초성 자음 또는 null(빈 자리), v: 모음 자모, co: 종성 자음 0~2개
  function join(on, v, co) {
    const coda = co || [];
    const l = L.indexOf(on == null ? 'ㅇ' : on), vi = V.indexOf(v);
    const t = coda.length === 0 ? 0 : coda.length === 1 ? T.indexOf(coda[0]) : T.indexOf(CLUSTER_OF[coda.join('')] || '?');
    if (l < 0 || vi < 0 || t < 0 || coda.length > 2) return (on || '') + (v || '') + coda.join(''); // 음절로 적을 수 없음
    return String.fromCharCode(BASE + (l * 21 + vi) * 28 + t);
  }

  return { isSyllable, split, join, CLUSTER };
})();
