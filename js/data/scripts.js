'use strict';
// 원고 데이터(1·2장) — 선생님이 고치는 곳. 모양은 js/core/rules.js 머리 주석의 '원고 Script'.
//   고친 뒤에는 꼭: node tests/check-rules.mjs (엔진이 도출한 발음 = pron, 풀이 과정이 규칙 안, 음운 수가 맞는지 확인)
//
//   text     표기(원고에 적힌 그대로). 띄어 쓴 두 단어는 cuts의 그 자리가 'space'.
//   morphs   형태소 분석(사람이 읽는 것): '+' 형태소 경계, '-' 어간·어미·접사 표시, 띄어쓰기 = 단어 경계.
//            한자어 한 단어 안의 경계는 나누지 않는다(판정에 쓰이지 않음 — findings 참고).
//   cuts     음절 사이 형태소 경계(화면에서는 교과서처럼 '+', 결정 0007): 'formal'(뒤가 형식 형태소) | 'content'(뒤가 실질 형태소) | 'space' | null
//   marks    낱말 예외 표시. lateralExc: [경계 번호] = 그 사이의 'ㄴㄹ'은 [ㄴㄴ](제20항 다만)
//   pron     표준 발음(원문 그대로, 장음 ː 포함 — 엔진은 장음을 비교하지 않음)
//   nonstandard  [[흔하지만 표준이 아닌 발음, 조항]] → 송출하면 '표준 아님' 신호
//   steps    풀이 과정 [규칙 id, 'replace'|'delete'|'insert'|'merge', 자리('0.co' = 0번 음절 종성), 바뀐 음운]
//   count    [표기의 음운 수, 표준 발음의 음운 수]   change  변동 유형별 횟수(교체 replace · 탈락 delete · 첨가 insert · 축약 merge)
//   articles 근거 조항(표준 발음법 제N항, '20-다만' = 제20항 다만)
//   trap     함정 원고: 'link'(연음 — 교정하지 않는 것이 정답) | 'exception'(제20항 다만) | 'nonstandard'(흔한 비표준 발음) | 없음
//   src      출처(design/research/03 §2·§4):
//            '표준 N'      표준 발음법 제N항 원문 예시
//            '지공1 p'     지학사 공통국어1 연구용 교과서 p쪽     '지공1지도 p'  지학사 공통국어1 지도서 p쪽
//            '지화언 p'    지학사 화법과 언어 연구용 교과서 p쪽
//   원문 대조가 안 된 예시는 넣지 않는다(CLAUDE.md 꼭 지킬 것 5).
window.SCRIPTS = [
  // ───────────── 1장 첫 출근: 음절의 끝소리 규칙, 연음(교정 아님) ─────────────
  { id: '옷', ch: 1, text: '옷', morphs: '옷', cuts: [], pron: '옫', steps: [['coda', 'replace', '0.co', 'ㄷ']], count: [2, 2], change: { replace: 1 }, articles: ['9'], src: ['표준 9', '지공1 107'] },
  { id: '꽃', ch: 1, text: '꽃', morphs: '꽃', cuts: [], pron: '꼳', steps: [['coda', 'replace', '0.co', 'ㄷ']], count: [3, 3], change: { replace: 1 }, articles: ['9'], src: ['표준 9', '지공1지도 131'] },
  { id: '앞', ch: 1, text: '앞', morphs: '앞', cuts: [], pron: '압', steps: [['coda', 'replace', '0.co', 'ㅂ']], count: [2, 2], change: { replace: 1 }, articles: ['9'], src: ['표준 9', '지공1지도 131'] },
  { id: '밖', ch: 1, text: '밖', morphs: '밖', cuts: [], pron: '박', steps: [['coda', 'replace', '0.co', 'ㄱ']], count: [3, 3], change: { replace: 1 }, articles: ['9'], src: ['지공1 107'] },
  { id: '부엌', ch: 1, text: '부엌', morphs: '부엌', cuts: [null], pron: '부억', steps: [['coda', 'replace', '1.co', 'ㄱ']], count: [4, 4], change: { replace: 1 }, articles: ['9'], src: ['지공1 107'] },
  { id: '낮', ch: 1, text: '낮', morphs: '낮', cuts: [], pron: '낟', steps: [['coda', 'replace', '0.co', 'ㄷ']], count: [3, 3], change: { replace: 1 }, articles: ['9'], src: ['지공1 107'] },
  { id: '낯', ch: 1, text: '낯', morphs: '낯', cuts: [], pron: '낟', steps: [['coda', 'replace', '0.co', 'ㄷ']], count: [3, 3], change: { replace: 1 }, articles: ['9'], src: ['지공1 107'] },
  { id: '낱', ch: 1, text: '낱', morphs: '낱', cuts: [], pron: '낟', steps: [['coda', 'replace', '0.co', 'ㄷ']], count: [3, 3], change: { replace: 1 }, articles: ['9'], src: ['지공1 107'] },
  { id: '잎', ch: 1, text: '잎', morphs: '잎', cuts: [], pron: '입', steps: [['coda', 'replace', '0.co', 'ㅂ']], count: [2, 2], change: { replace: 1 }, articles: ['9'], src: ['지공1 107'] },
  { id: '솥', ch: 1, text: '솥', morphs: '솥', cuts: [], pron: '솓', steps: [['coda', 'replace', '0.co', 'ㄷ']], count: [3, 3], change: { replace: 1 }, articles: ['9'], src: ['지공1지도 131'] },
  { id: '젖', ch: 1, text: '젖', morphs: '젖', cuts: [], pron: '젇', steps: [['coda', 'replace', '0.co', 'ㄷ']], count: [3, 3], change: { replace: 1 }, articles: ['9'], src: ['지공1지도 131'] },
  { id: '키읔', ch: 1, text: '키읔', morphs: '키읔', cuts: [null], pron: '키윽', steps: [['coda', 'replace', '1.co', 'ㄱ']], count: [4, 4], change: { replace: 1 }, articles: ['9'], src: ['지공1지도 131'] },
  { id: '겉옷', ch: 1, text: '겉옷', morphs: '겉+옷', cuts: ['content'], pron: '거돋', steps: [['coda', 'replace', '0.co', 'ㄷ'], ['coda', 'replace', '1.co', 'ㄷ']], count: [5, 5], change: { replace: 2 }, articles: ['9', '15'], src: ['표준 15'] },
  { id: '옷 위', ch: 1, text: '옷 위', morphs: '옷 위', cuts: ['space'], pron: '오뒤', steps: [['coda', 'replace', '0.co', 'ㄷ']], count: [3, 3], change: { replace: 1 }, articles: ['15'], src: ['지공1 107', '지공1지도 131'] },
  // 함정: 연음(음운 변동 0회 — 아무 교정도 하지 않는 것이 정답)
  { id: '옷이', ch: 1, text: '옷이', morphs: '옷+이', cuts: ['formal'], pron: '오시', steps: [], count: [3, 3], change: {}, articles: ['13'], trap: 'link', src: ['표준 13', '지공1 107'] },
  { id: '꽃이', ch: 1, text: '꽃이', morphs: '꽃+이', cuts: ['formal'], pron: '꼬치', steps: [], count: [4, 4], change: {}, articles: ['13'], trap: 'link', src: ['지공1 107'] },
  { id: '꽃을', ch: 1, text: '꽃을', morphs: '꽃+을', cuts: ['formal'], pron: '꼬츨', steps: [], count: [5, 5], change: {}, articles: ['13'], trap: 'link', src: ['지화언 35', '지화언 27'] },
  { id: '낮이', ch: 1, text: '낮이', morphs: '낮+이', cuts: ['formal'], pron: '나지', steps: [], count: [4, 4], change: {}, articles: ['13'], trap: 'link', src: ['지공1 107', '지화언 35'] },
  { id: '깎아', ch: 1, text: '깎아', morphs: '깎-+-아', cuts: ['formal'], pron: '까까', steps: [], count: [4, 4], change: {}, articles: ['13'], trap: 'link', src: ['지화언 30'] },
  { id: '부엌이', ch: 1, text: '부엌이', morphs: '부엌+이', cuts: [null, 'formal'], pron: '부어키', steps: [], count: [5, 5], change: {}, articles: ['13'], trap: 'link', src: ['지화언 35'] },
  { id: '밭에', ch: 1, text: '밭에', morphs: '밭+에', cuts: ['formal'], pron: '바테', steps: [], count: [4, 4], change: {}, articles: ['13'], trap: 'link', src: ['지화언 35'] },
  { id: '앞으로', ch: 1, text: '앞으로', morphs: '앞+으로', cuts: ['formal', null], pron: '아프로', steps: [], count: [5, 5], change: {}, articles: ['13'], trap: 'link', src: ['지화언 35'] },
  { id: '닭을', ch: 1, text: '닭을', morphs: '닭+을', cuts: ['formal'], pron: '달글', steps: [], count: [6, 6], change: {}, articles: ['14'], trap: 'link', src: ['표준 14', '지화언 35'] },
  { id: '닭이', ch: 1, text: '닭이', morphs: '닭+이', cuts: ['formal'], pron: '달기', nonstandard: [['다기', '14']], steps: [], count: [5, 5], change: {}, articles: ['14'], trap: 'link', src: ['지화언 29', '지화언 35'] },
  { id: '흙을', ch: 1, text: '흙을', morphs: '흙+을', cuts: ['formal'], pron: '흘글', nonstandard: [['흐글', '14']], steps: [], count: [6, 6], change: {}, articles: ['14'], trap: 'link', src: ['지화언 29', '지화언 35'] },
  { id: '여덟을', ch: 1, text: '여덟을', morphs: '여덟+을', cuts: [null, 'formal'], pron: '여덜블', nonstandard: [['여더를', '14']], steps: [], count: [8, 8], change: {}, articles: ['14'], trap: 'link', src: ['지화언 29', '지화언 35'] },

  // ───────────── 2장 닮은 소리: 비음화, ㄹ의 비음화, 유음화 ─────────────
  // 비음화(제18항)
  { id: '먹는', ch: 2, text: '먹는', morphs: '먹-+-는', cuts: ['formal'], pron: '멍는', steps: [['nasal', 'replace', '0.co', 'ㅇ']], count: [6, 6], change: { replace: 1 }, articles: ['18'], src: ['표준 18', '지공1지도 132'] },
  { id: '국물', ch: 2, text: '국물', morphs: '국+물', cuts: ['content'], pron: '궁물', steps: [['nasal', 'replace', '0.co', 'ㅇ']], count: [6, 6], change: { replace: 1 }, articles: ['18'], src: ['지공1 108', '지공1지도 132'] },
  { id: '닫는', ch: 2, text: '닫는', morphs: '닫-+-는', cuts: ['formal'], pron: '단는', steps: [['nasal', 'replace', '0.co', 'ㄴ']], count: [6, 6], change: { replace: 1 }, articles: ['18'], src: ['표준 18', '지공1지도 132'] },
  { id: '잡는', ch: 2, text: '잡는', morphs: '잡-+-는', cuts: ['formal'], pron: '잠는', steps: [['nasal', 'replace', '0.co', 'ㅁ']], count: [6, 6], change: { replace: 1 }, articles: ['18'], src: ['표준 18', '지공1지도 132'] },
  { id: '밥물', ch: 2, text: '밥물', morphs: '밥+물', cuts: ['content'], pron: '밤물', steps: [['nasal', 'replace', '0.co', 'ㅁ']], count: [6, 6], change: { replace: 1 }, articles: ['18'], src: ['지공1지도 132'] },
  { id: '받는다', ch: 2, text: '받는다', morphs: '받-+-는-+-다', cuts: ['formal', 'formal'], pron: '반는다', steps: [['nasal', 'replace', '0.co', 'ㄴ']], count: [8, 8], change: { replace: 1 }, articles: ['18'], src: ['지공1 108'] },
  { id: '먹는다', ch: 2, text: '먹는다', morphs: '먹-+-는-+-다', cuts: ['formal', 'formal'], pron: '멍는다', steps: [['nasal', 'replace', '0.co', 'ㅇ']], count: [8, 8], change: { replace: 1 }, articles: ['18'], src: ['지공1 108'] },
  { id: '맏며느리', ch: 2, text: '맏며느리', morphs: '맏-+며느리', cuts: ['content', null, null], pron: '만며느리', steps: [['nasal', 'replace', '0.co', 'ㄴ']], count: [10, 10], change: { replace: 1 }, articles: ['18'], src: ['지공1 108'] },
  { id: '책 만들다', ch: 2, text: '책 만들다', morphs: '책 만들-+-다', cuts: ['space', null, 'formal'], pron: '챙만들다', steps: [['nasal', 'replace', '0.co', 'ㅇ']], count: [11, 11], change: { replace: 1 }, articles: ['18'], src: ['지화언 31'] },
  // 끝소리 규칙 → 비음화(교체 2회)
  { id: '짓는', ch: 2, text: '짓는', morphs: '짓-+-는', cuts: ['formal'], pron: '진ː는', steps: [['coda', 'replace', '0.co', 'ㄷ'], ['nasal', 'replace', '0.co', 'ㄴ']], count: [6, 6], change: { replace: 2 }, articles: ['9', '18'], src: ['표준 18', '지공1지도 132'] },
  { id: '깎는', ch: 2, text: '깎는', morphs: '깎-+-는', cuts: ['formal'], pron: '깡는', steps: [['coda', 'replace', '0.co', 'ㄱ'], ['nasal', 'replace', '0.co', 'ㅇ']], count: [6, 6], change: { replace: 2 }, articles: ['9', '18'], src: ['지공1 108', '지공1지도 132'] },
  { id: '있는', ch: 2, text: '있는', morphs: '있-+-는', cuts: ['formal'], pron: '인는', steps: [['coda', 'replace', '0.co', 'ㄷ'], ['nasal', 'replace', '0.co', 'ㄴ']], count: [5, 5], change: { replace: 2 }, articles: ['9', '18'], src: ['지공1 109', '지공1지도 132'] },
  { id: '맞는', ch: 2, text: '맞는', morphs: '맞-+-는', cuts: ['formal'], pron: '만는', steps: [['coda', 'replace', '0.co', 'ㄷ'], ['nasal', 'replace', '0.co', 'ㄴ']], count: [6, 6], change: { replace: 2 }, articles: ['9', '18'], src: ['지공1지도 132'] },
  { id: '쫓는', ch: 2, text: '쫓는', morphs: '쫓-+-는', cuts: ['formal'], pron: '쫀는', steps: [['coda', 'replace', '0.co', 'ㄷ'], ['nasal', 'replace', '0.co', 'ㄴ']], count: [6, 6], change: { replace: 2 }, articles: ['9', '18'], src: ['지공1지도 132'] },
  { id: '붙는', ch: 2, text: '붙는', morphs: '붙-+-는', cuts: ['formal'], pron: '분는', steps: [['coda', 'replace', '0.co', 'ㄷ'], ['nasal', 'replace', '0.co', 'ㄴ']], count: [6, 6], change: { replace: 2 }, articles: ['9', '18'], src: ['지공1지도 132'] },
  { id: '키읔만', ch: 2, text: '키읔만', morphs: '키읔+만', cuts: [null, 'formal'], pron: '키응만', steps: [['coda', 'replace', '1.co', 'ㄱ'], ['nasal', 'replace', '1.co', 'ㅇ']], count: [7, 7], change: { replace: 2 }, articles: ['9', '18'], src: ['지공1지도 132'] },
  { id: '꽃망울', ch: 2, text: '꽃망울', morphs: '꽃+망울', cuts: ['content', null], pron: '꼰망울', steps: [['coda', 'replace', '0.co', 'ㄷ'], ['nasal', 'replace', '0.co', 'ㄴ']], count: [8, 8], change: { replace: 2 }, articles: ['9', '18'], src: ['지공1지도 132'] },
  { id: '젖멍울', ch: 2, text: '젖멍울', morphs: '젖+멍울', cuts: ['content', null], pron: '전멍울', steps: [['coda', 'replace', '0.co', 'ㄷ'], ['nasal', 'replace', '0.co', 'ㄴ']], count: [8, 8], change: { replace: 2 }, articles: ['9', '18'], src: ['지공1지도 132'] },
  { id: '앞마당', ch: 2, text: '앞마당', morphs: '앞+마당', cuts: ['content', null], pron: '암마당', steps: [['coda', 'replace', '0.co', 'ㅂ'], ['nasal', 'replace', '0.co', 'ㅁ']], count: [7, 7], change: { replace: 2 }, articles: ['9', '18'], src: ['지공1지도 132'] },
  { id: '부엌문', ch: 2, text: '부엌문', morphs: '부엌+문', cuts: [null, 'content'], pron: '부엉문', steps: [['coda', 'replace', '1.co', 'ㄱ'], ['nasal', 'replace', '1.co', 'ㅇ']], count: [7, 7], change: { replace: 2 }, articles: ['9', '18'], src: ['지공1 109'] },
  // 받침 ㅎ + ㄴ: ㅎ→ㄷ(제12항 3) → 비음화(결정 0010: 교체 2회)
  { id: '놓는', ch: 2, text: '놓는', morphs: '놓-+-는', cuts: ['formal'], pron: '논는', steps: [['coda', 'replace', '0.co', 'ㄷ'], ['nasal', 'replace', '0.co', 'ㄴ']], count: [6, 6], change: { replace: 2 }, articles: ['12', '18'], src: ['지공1지도 132'] },
  { id: '책 넣는다', ch: 2, text: '책 넣는다', morphs: '책 넣-+-는-+-다', cuts: ['space', 'formal', 'formal'], pron: '챙넌는다', steps: [['nasal', 'replace', '0.co', 'ㅇ'], ['coda', 'replace', '1.co', 'ㄷ'], ['nasal', 'replace', '1.co', 'ㄴ']], count: [11, 11], change: { replace: 3 }, articles: ['12', '18'], src: ['표준 18'] },
  // ㄹ의 비음화(제19항)
  { id: '담력', ch: 2, text: '담력', morphs: '담력', cuts: [null], pron: '담ː녁', steps: [['r-nasal', 'replace', '1.on', 'ㄴ']], count: [7, 7], change: { replace: 1 }, articles: ['19'], src: ['표준 19', '지공1 108'] },
  { id: '침략', ch: 2, text: '침략', morphs: '침략', cuts: [null], pron: '침냑', steps: [['r-nasal', 'replace', '1.on', 'ㄴ']], count: [7, 7], change: { replace: 1 }, articles: ['19'], src: ['표준 19'] },
  { id: '강릉', ch: 2, text: '강릉', morphs: '강릉', cuts: [null], pron: '강능', steps: [['r-nasal', 'replace', '1.on', 'ㄴ']], count: [6, 6], change: { replace: 1 }, articles: ['19'], src: ['표준 19'] },
  { id: '대통령', ch: 2, text: '대통령', morphs: '대통령', cuts: [null, null], pron: '대ː통녕', steps: [['r-nasal', 'replace', '2.on', 'ㄴ']], count: [9, 9], change: { replace: 1 }, articles: ['19'], src: ['표준 19', '지화언 31'] },
  { id: '항로', ch: 2, text: '항로', morphs: '항로', cuts: [null], pron: '항ː노', steps: [['r-nasal', 'replace', '1.on', 'ㄴ']], count: [5, 5], change: { replace: 1 }, articles: ['19'], src: ['지공1 108'] },
  // ㄹ의 비음화 → 비음화(교체 2회, 순서: ㄹ→ㄴ이 먼저)
  { id: '막론', ch: 2, text: '막론', morphs: '막론', cuts: [null], pron: '망논', steps: [['r-nasal', 'replace', '1.on', 'ㄴ'], ['nasal', 'replace', '0.co', 'ㅇ']], count: [6, 6], change: { replace: 2 }, articles: ['18', '19'], src: ['표준 19', '지공1 108'] },
  { id: '백리', ch: 2, text: '백리', morphs: '백리', cuts: [null], pron: '뱅니', steps: [['r-nasal', 'replace', '1.on', 'ㄴ'], ['nasal', 'replace', '0.co', 'ㅇ']], count: [5, 5], change: { replace: 2 }, articles: ['18', '19'], src: ['표준 19'] },
  { id: '협력', ch: 2, text: '협력', morphs: '협력', cuts: [null], pron: '혐녁', steps: [['r-nasal', 'replace', '1.on', 'ㄴ'], ['nasal', 'replace', '0.co', 'ㅁ']], count: [8, 8], change: { replace: 2 }, articles: ['18', '19'], src: ['표준 19', '지화언 31'] },
  { id: '십리', ch: 2, text: '십리', morphs: '십리', cuts: [null], pron: '심니', steps: [['r-nasal', 'replace', '1.on', 'ㄴ'], ['nasal', 'replace', '0.co', 'ㅁ']], count: [5, 5], change: { replace: 2 }, articles: ['18', '19'], src: ['표준 19'] },
  // 유음화(제20항)
  { id: '난로', ch: 2, text: '난로', morphs: '난로', cuts: [null], pron: '날ː로', steps: [['lateral', 'replace', '0.co', 'ㄹ']], count: [5, 5], change: { replace: 1 }, articles: ['20'], src: ['표준 20', '지공1 108'] },
  { id: '신라', ch: 2, text: '신라', morphs: '신라', cuts: [null], pron: '실라', steps: [['lateral', 'replace', '0.co', 'ㄹ']], count: [5, 5], change: { replace: 1 }, articles: ['20'], src: ['표준 20', '지공1 108'] },
  { id: '천리', ch: 2, text: '천리', morphs: '천리', cuts: [null], pron: '철리', steps: [['lateral', 'replace', '0.co', 'ㄹ']], count: [5, 5], change: { replace: 1 }, articles: ['20'], src: ['지공1 108', '지공1지도 132'] },
  { id: '광한루', ch: 2, text: '광한루', morphs: '광한루', cuts: [null, null], pron: '광ː할루', steps: [['lateral', 'replace', '1.co', 'ㄹ']], count: [9, 9], change: { replace: 1 }, articles: ['20'], src: ['지공1지도 132', '지화언 31'] },
  { id: '대관령', ch: 2, text: '대관령', morphs: '대관령', cuts: [null, null], pron: '대ː괄령', steps: [['lateral', 'replace', '1.co', 'ㄹ']], count: [10, 10], change: { replace: 1 }, articles: ['20'], src: ['지공1지도 132', '지화언 31'] },
  { id: '권력', ch: 2, text: '권력', morphs: '권력', cuts: [null], pron: '궐력', steps: [['lateral', 'replace', '0.co', 'ㄹ']], count: [8, 8], change: { replace: 1 }, articles: ['20'], src: ['지화언 31'] },
  { id: '진리', ch: 2, text: '진리', morphs: '진리', cuts: [null], pron: '질리', steps: [['lateral', 'replace', '0.co', 'ㄹ']], count: [5, 5], change: { replace: 1 }, articles: ['20'], src: ['지공1 109'] },
  { id: '진로', ch: 2, text: '진로', morphs: '진로', cuts: [null], pron: '질ː로', nonstandard: [['진노', '20']], steps: [['lateral', 'replace', '0.co', 'ㄹ']], count: [5, 5], change: { replace: 1 }, articles: ['20'], src: ['지화언 28'] },
  { id: '칼날', ch: 2, text: '칼날', morphs: '칼+날', cuts: ['content'], pron: '칼랄', steps: [['lateral', 'replace', '1.on', 'ㄹ']], count: [6, 6], change: { replace: 1 }, articles: ['20'], src: ['표준 20', '지공1 108'] },
  { id: '설날', ch: 2, text: '설날', morphs: '설+날', cuts: ['content'], pron: '설ː랄', steps: [['lateral', 'replace', '1.on', 'ㄹ']], count: [6, 6], change: { replace: 1 }, articles: ['20'], src: ['지화언 31'] },
  { id: '달님', ch: 2, text: '달님', morphs: '달+-님', cuts: ['formal'], pron: '달림', steps: [['lateral', 'replace', '1.on', 'ㄹ']], count: [6, 6], change: { replace: 1 }, articles: ['20'], src: ['지공1 108'] },
  { id: '불놀이', ch: 2, text: '불놀이', morphs: '불+놀-+-이', cuts: ['content', 'formal'], pron: '불로리', steps: [['lateral', 'replace', '1.on', 'ㄹ']], count: [7, 7], change: { replace: 1 }, articles: ['20'], src: ['지화언 31'] },
  { id: '물놀이', ch: 2, text: '물놀이', morphs: '물+놀-+-이', cuts: ['content', 'formal'], pron: '물로리', steps: [['lateral', 'replace', '1.on', 'ㄹ']], count: [7, 7], change: { replace: 1 }, articles: ['20'], src: ['지공1 109'] },
  { id: '실내화', ch: 2, text: '실내화', morphs: '실내화', cuts: [null, null], pron: '실래화', steps: [['lateral', 'replace', '1.on', 'ㄹ']], count: [8, 8], change: { replace: 1 }, articles: ['20'], src: ['지공1 114'] },
  { id: '물난리', ch: 2, text: '물난리', morphs: '물+난리', cuts: ['content', null], pron: '물랄리', steps: [['lateral', 'replace', '1.on', 'ㄹ'], ['lateral', 'replace', '1.co', 'ㄹ']], count: [8, 8], change: { replace: 2 }, articles: ['20'], src: ['지공1 108', '지공1지도 132'] },
  // 함정: 제20항 다만 — 'ㄴㄹ'을 [ㄴㄴ]으로
  { id: '의견란', ch: 2, text: '의견란', morphs: '의견란', cuts: [null, null], marks: { lateralExc: [1] }, pron: '의ː견난', steps: [['r-nasal-exc', 'replace', '2.on', 'ㄴ']], count: [9, 9], change: { replace: 1 }, articles: ['20-다만'], trap: 'exception', src: ['표준 20', '지공1 108'] },
  { id: '임진란', ch: 2, text: '임진란', morphs: '임진란', cuts: [null, null], marks: { lateralExc: [1] }, pron: '임ː진난', steps: [['r-nasal-exc', 'replace', '2.on', 'ㄴ']], count: [8, 8], change: { replace: 1 }, articles: ['20-다만'], trap: 'exception', src: ['지공1지도 132'] },
  { id: '생산량', ch: 2, text: '생산량', morphs: '생산량', cuts: [null, null], marks: { lateralExc: [1] }, pron: '생산냥', steps: [['r-nasal-exc', 'replace', '2.on', 'ㄴ']], count: [10, 10], change: { replace: 1 }, articles: ['20-다만'], trap: 'exception', src: ['표준 20', '지공1 108'] },
  { id: '동원령', ch: 2, text: '동원령', morphs: '동원령', cuts: [null, null], marks: { lateralExc: [1] }, pron: '동ː원녕', steps: [['r-nasal-exc', 'replace', '2.on', 'ㄴ']], count: [10, 10], change: { replace: 1 }, articles: ['20-다만'], trap: 'exception', src: ['지공1지도 132'] },
  { id: '상견례', ch: 2, text: '상견례', morphs: '상견례', cuts: [null, null], marks: { lateralExc: [1] }, pron: '상견녜', steps: [['r-nasal-exc', 'replace', '2.on', 'ㄴ']], count: [10, 10], change: { replace: 1 }, articles: ['20-다만'], trap: 'exception', src: ['표준 20', '지공1지도 132'] },
  { id: '횡단로', ch: 2, text: '횡단로', morphs: '횡단로', cuts: [null, null], marks: { lateralExc: [1] }, pron: '횡단노', steps: [['r-nasal-exc', 'replace', '2.on', 'ㄴ']], count: [8, 8], change: { replace: 1 }, articles: ['20-다만'], trap: 'exception', src: ['지공1지도 132'] },
  { id: '이원론', ch: 2, text: '이원론', morphs: '이원론', cuts: [null, null], marks: { lateralExc: [1] }, pron: '이ː원논', steps: [['r-nasal-exc', 'replace', '2.on', 'ㄴ']], count: [7, 7], change: { replace: 1 }, articles: ['20-다만'], trap: 'exception', src: ['지공1지도 132', '지화언 32'] },
  { id: '입원료', ch: 2, text: '입원료', morphs: '입원료', cuts: [null, null], marks: { lateralExc: [1] }, pron: '이붠뇨', steps: [['r-nasal-exc', 'replace', '2.on', 'ㄴ']], count: [8, 8], change: { replace: 1 }, articles: ['20-다만'], trap: 'exception', src: ['지공1지도 132', '지화언 32'] },
  { id: '구근류', ch: 2, text: '구근류', morphs: '구근류', cuts: [null, null], marks: { lateralExc: [1] }, pron: '구근뉴', steps: [['r-nasal-exc', 'replace', '2.on', 'ㄴ']], count: [8, 8], change: { replace: 1 }, articles: ['20-다만'], trap: 'exception', src: ['지공1지도 132'] },
  // 함정: 위치 동화는 표준이 아님(제21항) — 아무 교정도 하지 않는 것이 정답
  { id: '감기', ch: 2, text: '감기', morphs: '감기', cuts: [null], pron: '감ː기', nonstandard: [['강ː기', '21']], steps: [], count: [5, 5], change: {}, articles: ['21'], trap: 'nonstandard', src: ['표준 21'] },
];
