# 겪어 본 함정

## aside 브라우저 점검

- **점검이 "CDP command timeout"이나 "Aside isn't running"으로 실패한다** → 다른 작업이 같은 Aside 브라우저를 동시에 몰면 탭 하나 여는 데 20~30초가 걸려 한 번의 평가가 시간 안에 끝나지 않는다(코드 결함이 아님). → 그 점검만 다시 돌려(`cd tests && npm test -- review`) 통과하면 부하로 본다. 같은 단계가 다시 돌려도 실패하면 결함이다. 점검을 쓸 때는 한 번의 `evaluate`를 새 탭·새로 고침 자리에서 잘게 나눠 30초 CDP 한도와 120초 호출 한도 안에 둔다. 브라우저 점검 여러 개를 동시에 돌리지 않는다.
- **`aside repl`은 점검이 실패해도 종료 코드 0이다** → 대본 끝에서 `console.log('PASS')`, 실패는 throw나 `FAIL`을 찍고 `tests/aside.mjs`가 출력을 읽어 판정한다. 종료 코드만 보고 통과로 판단하면 안 된다.
- **file:// 주소를 `openTab`으로 열 수 없다** → aside가 거절한다. `about:blank` 탭을 연 뒤 `goto(file URL)`로 가면 열린다(`check-00-smoke`의 file:// 단계). http 주소는 `openTab(url)`로 바로 연다.
- **크기별 점검에서 새로 고침 뒤 게임이 덜 뜬 채로 판정된다** → `tests/pages/frame.html`의 iframe이 처음 `about:blank`를 한 번 읽는데, 그 load를 게임 load로 착각했다. `frameReady`는 첫 about:blank load를 무시하고, `D.reload`는 첫 load가 끝난 뒤 새로 고친다. 크기별 점검을 고칠 때 이 두 곳을 되돌리지 않는다.
- **창 크기를 바꿀 수 없다**(창은 대략 1440×900) → 크기는 `frame.html?w=390&h=844&src=…`의 iframe으로 흉내 낸다. 1920×1080 프레임은 축소해서 보인다.
- **localStorage가 같은 주소의 탭끼리 이어진다** → 점검 시작 때 `eumun-byeondong:` 값을 지우거나 `D.fresh()`로 시작한다. 지우지 않으면 앞 점검의 진행 장이 이어 하기 카드로 떠서 시작 화면 단계가 엉뚱하게 실패한다.
- **블록 두 줄 나누기가 크기를 바꾼 직후 가끔 옛 배치로 남는다** → ResizeObserver 콜백 안에서 바로 다시 재면 레이아웃이 끝나기 전 값이 읽힌다. `G.blocks`는 `setTimeout(0)` 뒤에 다시 배치하고, 점검은 고정 대기 대신 `D.until`로 결과를 기다린다.

## Node 점검에서 게임 스크립트 읽기

- `tests/lib/load.mjs`가 `vm`의 같은 전역에서 스크립트를 차례로 돌린다. 최상위 `const`/`let`은 전역 속성이 되지 않으므로 데이터는 반드시 `window.이름 = …`으로 내보낸다. `const SCRIPTS = …`로 바꾸면 Node 점검에서 `SCRIPTS`가 없다는 오류가 난다.
- `util.js`·`rules.js`·`hangul.js`·`save.js`를 불러올 때(최상위) `document`나 `localStorage`에 닿으면 Node 점검이 바로 깨진다. DOM은 함수 안에서만 쓴다. `save.js`는 저장소를 흉내 낸 객체를 받아 점검한다.
- `js/core/util.js`는 `console.error`를 페이지 오류로 모은다(`window.__gamsuErrors`). 그래서 저장·소리 코드는 실패를 `console.error`로 찍지 않는다 — 찍으면 브라우저 점검이 '페이지 오류'로 실패한다. 소리 파일이 없을 때는 `console.warn` 한 번만 남긴다.

## 엔진·데이터

- 원고 하나를 더하면 엔진이 그 원고를 모든 규칙 순서로 풀어 본다(`check-rules`). 표준 발음이 엔진 도출과 다르면 원고를 고치기 전에 그 낱말이 엔진이 아는 규칙 범위 안인지부터 본다. 범위 밖 변동(된소리되기·자음군 단순화 등)이 섞인 낱말은 엔진이 틀린 발음을 내므로 원고에 넣지 않고 findings의 '엔진이 아직 처리하지 못하는 변동' 표에 더한다.
- 감수 지침 예시를 바꾸면 뽑기 풀이 줄어든다(예시 원고는 뽑지 않음). 2장은 감기가 하나뿐이라 감기를 지침 예시로 쓰면 뽑기가 오류를 던진다. 예시를 바꾼 뒤 `check-rules`의 '모든 시드에서 뽑기 조건' 단계가 통과하는지 본다.
- 동음 낱말(낮·낯·낱)은 한 판에 함께 뽑힐 수 있다(쌍둥이 후보에서만 같은 발음을 뺀다).
- `G.rules.touchedLink`는 고침·뺌만 본다. 연음 자리 받침을 합침표로 바꾼 경우에는 연음 안내가 나오지 않는다.

## 글꼴

- 화면 문구를 고쳐 새 글자가 생겼는데 `python tools/build_fonts.py`를 다시 돌리지 않으면, 안내 글꼴(GamsuUI, 쓰인 글자만)에 없는 글자만 기기 글꼴로 보여 한 줄 안에서 글꼴이 섞인다. 발음 글꼴(GamsuPron)은 한글 음절을 모두 담고 있어 원고·발음은 깨지지 않는다. 스크립트는 같은 입력이면 같은 파일을 만든다(수정 시각 고정) — 문구를 안 바꿨는데 woff2가 바뀌었다면 원본 OTF가 다른 것이다.

## 그림 생성(Codex)

- `codex exec`를 전역 `~/.codex`로 돌리면 플러그인·MCP 때문에 몇 분씩 멈춘다 → `tools/gen.ps1`은 `%TEMP%` 아래 따로 만든 CODEX_HOME(설정 + auth.json 복사본)으로 돈다. 쓰고 난 임시 폴더의 auth.json 복사본은 지운다.
- Codex 작업 공간 보호가 로컬 파일 읽기를 막아 "프롬프트 파일을 읽어라"가 실패한다 → 프롬프트(영어 ASCII)를 명령 인자에 그대로 넣는다. 표준 입력을 닫지 않으면(`</dev/null`) 입력을 기다리며 멈춘다.
- Windows PowerShell 5.1은 BOM 없는 스크립트의 한글을 잘못 읽는다(저장소 경로 '음운 변동'에 한글이 있음) → `gen.ps1`은 순수 ASCII로 두고, 한글 경로는 인자로 넘긴다. Git Bash의 Python heredoc에서도 한글이 cp949로 깨질 수 있다 — 한글을 담은 파일은 편집 도구로 고친다.
