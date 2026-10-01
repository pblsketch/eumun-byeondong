# 구조

## 전체 모양

브라우저 한 페이지(`index.html`)가 일반 `<script>` 여러 개를 차례로 읽고, 모든 스크립트가 전역 이름 `window.G` 하나에 자기 이름을 단다. 서버·빌드·모듈 묶기·외부 요청이 없다. 같은 파일이 `file://` 더블클릭과 GitHub Pages(정적 호스팅)에서 그대로 돈다. 상태는 메모리와 기기 localStorage에만 있다.

층과 의존 방향(왼쪽이 먼저 읽히고, 오른쪽만 왼쪽을 쓴다):

```
util ──▶ data ──▶ core ──▶ game ──▶ main
```

| 층 | 파일 | 하는 일 | 쓰는 것 |
|---|---|---|---|
| util | `js/core/util.js` | `G` 만들기, DOM·SVG 도우미, 신호·부호 기호, 화면 자리 `G.screens`, 페이지 오류 모음 | 없음 |
| data | `js/data/sounds.js` | 음운 목록과 자질(자음 19·단모음 10·반모음 j·w, 이중 모음 분해) `window.SOUNDS` | 없음 |
| data | `js/data/scripts.js` | 원고 377개(1~8장) `window.SCRIPTS` | 없음 |
| data | `js/data/articles.js` | 표준 발음법 조항 원문(11개 키) `window.ARTICLES` | 없음 |
| data | `js/data/guides.js` | 장마다 감수 지침(빈칸·보기·예시) `window.GUIDES` | 없음 |
| data | `js/data/text.js` | 화면 문구 `window.TEXT` + 문구 도우미 `G.text` | 없음 |
| core | `js/core/hangul.js` | 한글 음절 나누기·합치기 `G.hangul` | 없음 |
| core | `js/core/rules.js` | 규칙 엔진 `G.rules`(순수 함수) | SOUNDS, G.hangul |
| core | `js/core/audio.js` | 녹음 음원 재생 `G.audio` | 없음 |
| core | `js/core/save.js` | localStorage 저장 `G.save` | SCRIPTS, (GUIDES·G.rules·G.audio는 있으면) |
| game | `js/game/blocks.js` · `chart.js` | 부품: 음절 블록·형태소 경계 `G.blocks`(G.hangul·G.rules·TEXT), 조음 도표 `G.chart`(SOUNDS 자질·TEXT) | core, data |
| game | `js/game/howto.js` | 게임 방법 창 `G.howto` | TEXT |
| game | `js/game/guide.js` · `review.js` · `reveal.js` · `result.js` | 화면: `G.screens.guide/review/reveal/result` | 부품, core |
| game | `js/game/app.js` | 앱 뼈대 `G.app`: 화면 바꾸기, 시작 화면, 설정, 이어 하기 | 화면(이름으로 늦게 찾음) |
| main | `js/main.js` | 첫 실행(`G.app.start()`) | 전부 |

부품 둘(음절 블록·조음 도표)은 서로 부르지 않는다. 감수 화면이 둘을 엮고, 둘 다 판단하지 않는다(블록은 누른 자리를 알리고, 도표는 감수 화면이 넘겨 준 닮은 칸만 표시한다). 화면들도 서로 직접 부르지 않고 `G.app.go(이름, { run })`로만 넘어간다. `G.app.go`는 부를 때마다 `G.screens[이름]`을 찾으므로 game 층 안의 스크립트 차례는 판정에 영향이 없다.

## 한 장이 흐르는 길

```
시작 화면 ──[감수 시작]──▶ G.app.beginChapter
   │                          G.rules.draw(장, SCRIPTS, 지침 예시 id, 시드) → 원고 id 7개
   │                          G.save.saveChapter(새 진행 장 phase 'guide')   ← 옛 진행 장은 덮임(시작 화면이 먼저 물음)
   ▼
감수 지침 ──[확인]──▶ G.rules.gradeGuides(지침들, 고른 값) → 틀린 칸 수(0이면 guideDone, phase 'review' 저장)
   ▼
감수(원고 7개)  교정 → G.rules.apply → 새 상태 → 음절 블록 다시 그림 → 저장(cur.corrections)
   │            [송출] → G.rules.broadcast(원고, 교정들) → 신호 kind(+다른 음절 at, 규칙 밖 교정) → 저장(cur.kinds·last)
   │            [다음 원고] → G.rules.scriptResult(송출 기록) → done에 한 줄 → 저장
   ▼            7번째 뒤 phase 'reveal', cur null 저장
조항 공개 ── G.rules.revealArticles(지침들, 뽑힌 원고들) → 조항 id → ARTICLES 원문
   ▼
장 결과 ── 원고별 줄(여기서 처음 표준 발음), G.rules.chapterTotals(7개 원고) → 정답 기준 숫자
           G.save.clearChapter()   [다시 하기] = beginChapter({ skipGuide: true }) → 감수로 바로
```

새로 고침하거나 다시 열면 늘 시작 화면이 뜨고, 저장된 진행 장이 있으면 이어 하기 카드가 보인다. [이어 하기]를 누르면 `G.app.resume()`이 저장된 phase 화면으로 간다. 감수 단계면 `cur.corrections`를 처음 상태부터 다시 적용해 하던 교정까지 그대로 그린다.

## 교정 하나가 판정되는 길

1. 학생이 부호(고침·뺌·넣음·합침)를 고르고 음절 블록의 음운이나 틈을 누른다 → 블록이 자리(`{ s, slot, k }`)를 알린다.
2. 고침·합침이면 조음 도표가 열리고(기본 단계 1·2장이면 `G.rules.similarCell`이 준 닮은 칸이 은은히 표시), 학생이 결과 음운을 고른다. 넣음이면 /ㄴ/·/j/ 가운데 고른다.
3. 감수 화면이 교정 `{ op, at, to }`를 만들어 `G.rules.apply(상태, 교정)`에 넣는다. 받은 상태가 그대로 돌아오면(할 수 없는 교정) 한 줄로 알리고 기록하지 않는다. 바뀌었으면 교정 목록에 더하고 저장한다. 규칙 안/밖은 이때 화면에 알리지 않는다.
4. [송출]에서 `G.rules.broadcast`가 교정을 처음부터 다시 적용하며 하나하나 규칙 안인지(`applicable` 후보와 같은지) 보고, 결과 발음을 표준(허용 포함)·비표준 목록과 견준다(장음·띄어쓰기는 지우고 비교). 프롬프터는 이 결과 상태를 연음까지 적용해 읽은 발음을 한 음절씩 보인다.
5. 연음 자리 받침을 고침·뺌으로 바꾼 교정이 있으면(`G.rules.touchedLink`) 신호 줄 다음에 연음 안내 한 줄이 같은 자리에 나온다.

## 바깥과의 경계

- **넘어가는 것**: 없음. 네트워크 요청은 같은 출처의 동봉 파일(`assets/fonts/*.woff2`, 앞으로 `assets/audio/*.mp3`)을 읽는 것뿐이다. `file://`에서는 음원을 `<audio>` 요소로 대신 낸다.
- **기기에 남는 것**: localStorage `eumun-byeondong:` 접두사 값 넷(설정·마지막 선택·게임 방법을 연 적·진행 중인 장). 학생 이름·답안 기록·점수는 남기지 않는다.
- **점검 쪽**: `tests/`의 Node 점검은 `vm`으로 data·core 스크립트를 브라우저 없이 읽고(`tests/lib/load.mjs`), 브라우저 점검은 `tests/server.mjs` 정적 서버 + aside CLI가 연 탭에서 `tests/pages/frame.html`(크기별 iframe)이나 부품 점검 페이지를 몬다.
