'use strict';
// 음운 데이터(판정의 진실). 화면 문구(용어 이름 등)는 여기 두지 않는다.
//   출처: 「음운 해전」 pblsketch/sori-haejeon js/data/sounds.js (자음 19·단모음 10의 자질, 2026-10 master 10ccc6a)를 그대로 가져왔다.
//   더한 것: 반모음 j·w(결정 0004 — 반모음도 음운으로 센다), 이중 모음 분해표, 나누지 않는 이중 모음 ㅢ(결정 0009).
//   뺀 것: 음운 해전의 '알아 두기' 조건(notes) — 그 게임 결과 화면 전용.
//   음운 id는 자모 한 개('ㄱ', 'ㅏ'), 반모음은 'j'·'w'. 화면에는 언제나 /ㄱ/처럼 빗금으로 적는다.
window.SOUNDS = (function () {
  // 자음: 조음 위치(열, 왼→오), 조음 방법(행, 위→아래, 교과서 순서), 세기
  const places = ['bilabial', 'alveolar', 'palatal', 'velar', 'glottal'];
  const manners = ['stop', 'affricate', 'fricative', 'nasal', 'liquid'];
  const strengths = ['plain', 'tense', 'aspirated']; // 세기 구분이 없는 소리는 'none'

  // [소리, 위치, 방법, 세기]
  const C = [
    ['ㅂ', 'bilabial', 'stop', 'plain'], ['ㅃ', 'bilabial', 'stop', 'tense'], ['ㅍ', 'bilabial', 'stop', 'aspirated'],
    ['ㄷ', 'alveolar', 'stop', 'plain'], ['ㄸ', 'alveolar', 'stop', 'tense'], ['ㅌ', 'alveolar', 'stop', 'aspirated'],
    ['ㄱ', 'velar', 'stop', 'plain'], ['ㄲ', 'velar', 'stop', 'tense'], ['ㅋ', 'velar', 'stop', 'aspirated'],
    ['ㅈ', 'palatal', 'affricate', 'plain'], ['ㅉ', 'palatal', 'affricate', 'tense'], ['ㅊ', 'palatal', 'affricate', 'aspirated'],
    ['ㅅ', 'alveolar', 'fricative', 'plain'], ['ㅆ', 'alveolar', 'fricative', 'tense'],
    ['ㅎ', 'glottal', 'fricative', 'none'], // 교과서마다 세기 자리가 달라서 세기 없음
    ['ㅁ', 'bilabial', 'nasal', 'none'], ['ㄴ', 'alveolar', 'nasal', 'none'], ['ㅇ', 'velar', 'nasal', 'none'],
    ['ㄹ', 'alveolar', 'liquid', 'none'],
  ];

  // 모음: 행 = 혀의 높이, 열 = 혀의 앞뒤 × 입술 모양
  const heights = ['high', 'mid', 'low'];
  const columns = ['front-unrounded', 'front-rounded', 'back-unrounded', 'back-rounded'];
  // [소리, 높이, 앞뒤, 입술] — 표준 발음법 원칙대로 단모음 10개(/ㅚ/·/ㅟ/ 포함)
  const V = [
    ['ㅣ', 'high', 'front', 'unrounded'], ['ㅟ', 'high', 'front', 'rounded'], ['ㅡ', 'high', 'back', 'unrounded'], ['ㅜ', 'high', 'back', 'rounded'],
    ['ㅔ', 'mid', 'front', 'unrounded'], ['ㅚ', 'mid', 'front', 'rounded'], ['ㅓ', 'mid', 'back', 'unrounded'], ['ㅗ', 'mid', 'back', 'rounded'],
    ['ㅐ', 'low', 'front', 'unrounded'], ['ㅏ', 'low', 'back', 'unrounded'],
  ];

  // 반모음(결정 0004). like: 이 반모음과 짝이 되는 단모음(반모음화 = 이 단모음 → 반모음 교체).
  //   지학사 공통국어1 111쪽: 'ㅣ̆[j]'계 ㅑ ㅒ ㅕ ㅖ ㅛ ㅠ, 'ㅗ̆/ㅜ̆[w]'계 ㅘ ㅙ ㅝ ㅞ.
  const G = [
    ['j', ['ㅣ']],
    ['w', ['ㅗ', 'ㅜ']],
  ];

  return {
    places, manners, strengths, heights, columns,
    backs: ['front', 'back'],
    lips: ['unrounded', 'rounded'],
    consonants: C.map(([id, place, manner, strength]) => ({ id, sea: 'consonant', place, manner, strength })),
    vowels: V.map(([id, height, backness, lips]) => ({ id, sea: 'vowel', height, backness, lips, column: backness + '-' + lips })),
    glides: G.map(([id, like]) => ({ id, sea: 'glide', like })),
    // 이중 모음 = 반모음 + 단모음(음운 2개)
    diphthongs: {
      'ㅑ': ['j', 'ㅏ'], 'ㅒ': ['j', 'ㅐ'], 'ㅕ': ['j', 'ㅓ'], 'ㅖ': ['j', 'ㅔ'], 'ㅛ': ['j', 'ㅗ'], 'ㅠ': ['j', 'ㅜ'],
      'ㅘ': ['w', 'ㅏ'], 'ㅙ': ['w', 'ㅐ'], 'ㅝ': ['w', 'ㅓ'], 'ㅞ': ['w', 'ㅔ'],
    },
    // 나누지 않는 이중 모음: 음운 수만 센다(결정 0009). ㅢ는 교과서가 j계·w계 어디에도 넣지 않는다(지학사 공통국어1 111쪽).
    unsplit: { 'ㅢ': 2 },
  };
})();
