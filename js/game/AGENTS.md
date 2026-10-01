# js/game — 화면과 화면 부품

## 맡는 것
- `app.js` → `G.app`: 화면 바꾸기(`go(이름, 값)`), 시작 화면(학년·장 8개·장별 단계·이어 하기·게임 방법·설정), 설정 창, 덮어쓰기 확인, 장 시작(`beginChapter`)·이어 하기(`resume`), 낮은 가로 화면의 '세로로 돌려 주세요'.
- 화면(`G.screens.<이름>`): `guide.js`(감수 지침 빈칸 고르기·한 번에 확인), `review.js`(감수 — 교정 부호 넷, 송출과 신호, 연음 안내, 도움 사다리, 되돌리기·다시 감수·다음 원고·넘김 확인, 감수 기록, 음운 수), `reveal.js`(조항 공개 — 원문 표시), `result.js`(장 결과 — 원고별 줄, 정답 기준 숫자, 다시 하기·장 고르기).
- 부품: `blocks.js` → `G.blocks`(음절 블록 — 초·중·종 칸, 빈 초성 ○, 반모음 자리, ㅢ 한 칸, 겹받침 두 칸, 형태소 경계 '+'와 학년별 이름표, 휴대폰 세로 두 줄 나누기), `chart.js` → `G.chart`(조음 도표 — `SOUNDS` 자질로 그린 자음 체계표, 모음표, 반모음 줄, 닮은 칸 표시), `howto.js` → `G.howto`(게임 방법 창).
- 짝 CSS: `css/app.css`·`howto.css`·`blocks.css`·`chart.css`·`guide.css`·`review.css`·`reveal.css`·`result.css`.

## 맡지 않는 것
- 판정·뽑기·채점·연음 자리·닮은 칸·쌍둥이·원고 결과·공개 조항·장 합계 — 모두 `G.rules`가 정한다. 여기서 규칙 id나 조항 번호로 분기해 판정을 흉내 내지 않는다.
- localStorage — `G.save`만 닿는다. 소리 재생 — `G.audio`.
- 문장 — `TEXT`(지침 문장은 `GUIDES`, 조항은 `ARTICLES`)에서 꺼낸다. 이 폴더 파일에 한국어 화면 문장을 직접 쓰지 않는다.
- 부품끼리: `blocks.js`와 `chart.js`는 서로 부르지 않고 판단하지 않는다. 감수 화면이 둘을 엮는다.

## 불변 조건
- 화면은 `G.screens.<이름> = { mount(root, 값), unmount() }`로 등록하고, 화면끼리는 `G.app.go(이름, 값)`로만 넘어간다. 지금 이름은 `start|guide|review|reveal|result`(`G.app.NAMES` — 새 화면은 여기에 이름을 더함, 목록에 없는 이름은 시작 화면으로) — `start`는 `app.js`가 그린다. `guide`·`review`·`reveal`의 값은 `{ run }`(저장소에서 다시 읽은 진행 장), 값이 없으면 `G.save.loadChapter()`.
- 결과 화면 전에는 뽑힌 원고의 표준 발음·비표준 발음·함정 여부·갈래, 지침 정답이 화면 글·DOM 속성·aria에 없다. 지침의 정답 보기와 오답 보기는 속성이 같아야 한다(`aria-pressed`·`data-i`만 다름). 프롬프터는 송출한 뒤 학생이 교정한 발음만 보인다.
- 심화 단계: `G.blocks.create`에 `level`을 꼭 넘긴다(빠뜨리면 기본으로 그려 경계가 샌다). 심화면 경계·이름표가 DOM·aria에 아예 없고, 닮은 칸을 넘기지 않는다. 닮은 칸은 1·2장 기본 단계만.
- 할 수 없는 교정(`G.rules.apply`가 받은 상태를 그대로 돌려줌)만 한 줄로 알리고 기록하지 않는다. 그 밖의 교정은 막지 않는다.
- 저장 시점: 교정·되돌리기·다시 감수·송출·센 도움·처음 연 도움 단계(`cur.open` — 세지 않는 ①도)·원고 넘김·지침 완료마다 `G.save.saveChapter(run)`. 송출하면 그 모습(`cur.last` — 읽은 발음·신호·다른 음절·규칙 밖 교정·그때의 교정 수 `n`)을 저장하고, 새로 고친 뒤 프롬프터·배지·도움 ①은 그 모습 그대로 그린다(지금 교정으로 다시 읽지 않음). 송출 뒤 교정이 바뀌면 `n`을 null로 — 규칙 밖 표시·감수 도장은 송출한 그대로일 때만. 7번째 원고 뒤 `phase:'reveal'`, `cur:null`, `done` 7개로 저장하고 `G.app.go('reveal', { run })`. 결과 화면이 `G.save.clearChapter()`.
- 화면 크기 다섯에서 가로 스크롤 없음, 누르는 자리 64px(휴대폰 세로 48px, CSS `--touch`). 색은 `base.css` 토큰만. 깜박임 반복·계속 움직이는 장식 없음, `.reduce-motion`이면 송출 연출을 건너뛴다.
- 점검용 조작(`G.review.debug`)은 화면에 단추·글로 드러내지 않는다.

## 구현 방식
- DOM은 `G.util.el`로 짓고, 기호는 `G.util.glyph(이름)`. 문구 틀에 노드 끼우기 `G.util.fillNodes`, 음운 표기 묶기 `G.util.keepPh`, 소리 감싸기 `G.util.sound`, 끝난 진행 장 `G.util.finished`를 쓴다(화면마다 다시 만들지 않음). 묻기 창·한 줄 안내 방식은 `guide.js`·`app.js`와 같게 한다.
- 묻기 창·안내 창(`role="dialog" aria-modal="true"`)은 `G.util.modal(덮개, 창)`으로 연다: 뒤 화면 inert, Tab은 창 안에서, 닫을 때 돌려받은 `release()`를 불러 inert를 떼고 여는 단추로 초점을 돌려준다. 화면을 떠날 때(unmount·destroy) 그 화면에서 연 창(게임 방법 포함)을 닫는다.
- 세로 배치 기준은 `(max-width: 760px), (orientation: portrait)` — CSS 미디어 쿼리와 `G.app.PORTRAIT_Q`가 같은 값이어야 한다. 낮은 가로 화면은 `(orientation: landscape) and (max-height: 500px)`.
- 음절 블록 `split:'auto'`는 실제 너비를 재서 들어가지 않을 때만 두 줄로 나누고, 띄어쓰기 → (기본 단계) 경계 틈을 먼저 고른다. 줄이 바뀌는 틈은 가로 띠로 남아 누를 수 있다. 다시 배치는 `setTimeout(0)` 뒤에(ResizeObserver 직후 값이 틀림).
- 합침표: 두 음운을 자리 차례로 놓고, 결과가 들어갈 표(자음·모음·반모음)는 `G.rules.apply`에 대표 음운을 넣어 봐서 고른다(받는 표가 없으면 이웃이 아님).
- 연음 안내는 신호 줄 → 약 1.5초 뒤 같은 자리가 안내로 바뀌고, 신호 배지는 남는다.
- 소리: 감수 지침·감수는 `G.audio.play('review')`, 조항 공개·결과는 `play('result')`, 시작 화면은 멈춤. 신호 효과음은 `G.audio.sfx(신호.kind)`.

## 점검
- `cd tests && npm test -- 00-smoke app blocks chart guide review result`(+ 전체 흐름·배치·화면 글·글꼴·새는 답 점검).
- 감수 화면: 신호 넷, 연음 안내 조건(옷이 /ㅅ/ 고침 → 나옴, 겉옷 /ㅌ/ → 안 나옴, 닭이 /ㄹ/ 뺌 → 표준 아님 뒤에 나옴), 할 수 없는 교정은 기록 안 됨, 되돌리기, 넘김 확인, 도움 ①은 송출 전 안내, 도움 ③은 이 원고 풀이가 아님, 결과 전 표준 발음이 DOM에 없음, 새로 고침 뒤 교정까지 복원, 7번째 뒤 조항 공개.
- 지침: 정답이 DOM·aria에 없음, 틀린 칸 수가 `gradeGuides`와 같음, 다 맞으면 감수로. 결과: 숫자 = 원고 데이터 합, 다시 하기가 지침을 건너뜀, 결과 뒤 이어 하기 사라짐.
- 화면을 고치면 다섯 크기에서 가로 스크롤·누르는 자리 점검이 다시 통과해야 한다.
