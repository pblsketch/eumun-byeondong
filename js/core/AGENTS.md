# js/core — 규칙 엔진·한글 음절·저장·소리·공용 도구

## 맡는 것
- `util.js`: 전역 `G`와 `G.util`(DOM·SVG 도우미 `el`·`append`·`svg`·`clear`, 신호·부호·단추 기호 `glyph`), 화면 자리 `G.screens`, 페이지 오류 모음 `window.__gamsuErrors`(`console.error`와 처리 안 된 오류를 모음 — 브라우저 점검이 읽음).
- `hangul.js`: `G.hangul.split`(음절 → 초성·모음·종성 배열, 초성 ㅇ은 null)·`join`(적을 수 없는 조합이면 자모를 그대로 이어 적음).
- `rules.js`: `G.rules` — 판정의 진실 전부. 상태 만들기(`start`), 적용 가능 규칙(`applicable`), 교정 적용(`apply`), 표준 발음 도출(`derive`), 읽기(연음 `reading`), 송출 판정(`broadcast`), 뽑기(`draw`·`exampleIds`·`kindOf`), 쌍둥이(`twins`·`twin`), 연음 자리(`linkSites`·`touchedLink`), 닮은 칸(`similarCell`), 지침(`hasCondition`·`gradeGuides`·`checkGuide(s)`), 공개 조항(`revealArticles`), 원고 결과(`scriptResult`), 장 합계(`chapterTotals`).
- `save.js`: `G.save` — 설정·마지막 선택·게임 방법을 연 적·진행 중인 장의 localStorage 읽기·쓰기와 진행 장 확인.
- `audio.js`: `G.audio` — 녹음 음원(mp3) 배경 음악·효과음 재생(크로스페이드, 잠금 풀기, 파일이 없으면 조용히).

## 맡지 않는 것
- 화면 그리기·화면 문장(`js/game/*`, 문구는 `js/data/text.js`). `rules.js`의 오류 메시지는 개발자용이다.
- 학습 데이터 내용(`js/data/*`) — 엔진은 원고를 읽고 검증할 뿐 원고를 고치지 않는다.
- 덮어쓰기 확인 같은 묻기 — `save.js`는 저장만 하고, 묻는 것은 화면이 한다.

## 불변 조건
- `rules.js`·`hangul.js`는 순수 함수만 둔다: 받은 값을 바꾸지 않고(상태를 바꾸는 함수는 새 상태를 돌려줌), JSON으로 옮길 수 있는 값만 돌려주며, DOM·localStorage·시간·`Math.random`을 쓰지 않는다(뽑기 난수는 시드 수나 함수로 받음 — 같은 시드면 같은 결과).
- 교정 하나 = 규칙 적용 하나. 교정이 지금 상태의 `applicable` 후보와 같아야 규칙 안. 모양이 틀린 교정은 오류를 던지고, 모양은 맞지만 할 수 없는 교정은 받은 상태를 그대로 돌려준다(화면이 이것으로 '할 수 없는 교정'을 알아챔).
- 신호 kind는 `onair`·`offrule`·`diff`·`nonstandard` 넷뿐이다. 발음 비교는 장음 ː과 띄어쓰기를 지우고 한다.
- 연음은 상태를 바꾸지 않는다(읽을 때만). 받침 /ㅇ/은 옮기지 않는다. 연음 자리는 뒤 음절이 빈 초성이고 경계가 `formal`·`null`인 곳뿐이다.
- 이 폴더의 파일은 불러올 때(최상위) `document`·`localStorage`에 닿지 않는다 — Node 점검이 브라우저 없이 읽는다.
- `save.js`·`audio.js`는 어떤 경우에도 예외를 던지지 않고 `console.error`를 쓰지 않는다(`util.js`가 페이지 오류로 모음). 저장소가 막히면 메모리로 돈다.
- 저장 모양을 바꾸면 `save.js`의 `SCHEMA`를 올린다(옛 진행 장은 조용히 버려짐).

## 구현 방식
- 상태 `{ syl:[{on,gl,nu,co[]}], cuts:[…], marks:{lateralExc:[…]} }`와 자리 `{ s, slot, k }`의 모양은 `rules.js` 머리 주석이 기준이다. 새 함수는 머리 주석에 계약(입력 → 출력, 경계 사례)을 먼저 적는다.
- 규칙을 더할 때: `RULES`(op·조항)와 `ORDER`(도출 순서)에 넣고, `applicable`이 지금 상태에서 그 규칙의 후보 교정을 모두 내놓게 한다. `derive`는 `ORDER` 순서 → 왼쪽 자리부터 적용한다.
- 뽑기 조건(장마다 함정 몇 개·갈래 몇 개)은 `draw` 안의 장별 조건이다. 3~8장을 열 때 그 장 조건을 더한다(없으면 오류를 던짐).
- 진행 장 확인은 저장할 때와 불러올 때 같은 함수로 한다 — 원고 id·지침 id 차례·단계와 `cur` 모양이 지금 데이터와 맞지 않으면 버린다.

## 점검
- `cd tests && npm test -- rules save audio-load`.
- `check-rules`: 모든 원고가 엔진 대조 통과(도출 = 표준 발음, 풀이 단계 모두 규칙 안, 음운 수·변동 횟수, 어떤 규칙 순서로도 같은 발음), 시드 200개에서 뽑기 조건과 예시 제외, 쌍둥이(감기 없음·연음 함정), 지침 채점·예시 검증, 공개 조항 차례, 연음 자리(옷이·닭이·불놀이·겉옷), 닮은 칸(감기 /ㅁ/ 없음, 막론 /ㄱ/ 먼저 없음·/ㄹ/은 /ㄴ/).
- `check-save`: 흉내 낸 저장소로 저장→복원이 같음, 망가진 값·다른 버전·없는 원고 id·바뀐 지침은 버림, 막힌 저장소에서 예외 없음.
- 규칙을 고치면 1·2장 원고 전체가 다시 통과해야 한다. 통과하지 않으면 규칙이 아니라 원고를 의심하기 전에 표준 발음법 원문과 대조한다.
