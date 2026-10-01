# 실행·점검·배포 절차

## 준비물

| 무엇 | 언제 필요 | 확인 |
|---|---|---|
| 최신 브라우저 | 게임 실행 | — |
| Node.js 18 이상 | 로컬 서버, 모든 점검 | `node --version` |
| Aside 앱 + `aside` CLI | 브라우저 점검(`check-00-smoke`·`app`·`blocks`·`chart`·`guide`·`review`·`result` …) | Aside 앱이 켜져 있고 `aside guide`가 뜸. 모르는 명령이면 `aside --update` |
| Python 3 + `pip install fonttools brotli` | 글꼴 다시 만들기 | `python -c "import fontTools, brotli"` |
| Codex CLI(로그인됨) | 그림 견본 생성 | `codex login status` |
| GitHub CLI `gh`(pblsketch 로그인) | push·배포 | `gh auth status` |

게임 자체는 설치할 것이 없다(`npm install` 없음, `tests/`에도 외부 패키지 없음).

## 게임 열기

```bash
node tests/server.mjs 8766
```
그 뒤 http://127.0.0.1:8766 을 연다. `index.html` 더블클릭(file://)으로도 돈다. 다만 file://에서는 음원을 `<audio>`로 대신 내고, 브라우저에 따라 글꼴이 막혀 기기 글꼴로 보일 수 있다.

## 점검

```bash
cd tests
npm test
```
- 마지막 줄이 `모두 통과`이고 종료 코드 0이어야 한다. 전체는 브라우저 점검 때문에 약 30분 걸리고, 그 대부분이 `check-layout`의 화면 캡처다. 캡처 없이 재기만 하려면 `SHOTS=0 npm test`(약 12분). 실행 중 Aside 브라우저에 탭이 열렸다 닫히는 것은 정상이다.
- 서버는 `run-all.mjs`가 스스로 띄운다(8791부터 빈 포트).
- Aside 앱이 꺼져 있거나 응답하지 않으면 브라우저 점검이 모두 실패한다 → 앱을 켜고 다시. 한 단계만 시간 초과로 실패하면 그 점검만 다시 돌려 본다.

| 명령·환경 값 | 뜻 |
|---|---|
| `npm test -- rules data save check-text audio-load` | 이름에 그 낱말이 든 점검만(이름의 일부와 맞춰 봄). 이 다섯은 브라우저 없이 몇 초. `text`만 주면 브라우저 점검 `check-screen-text`도 함께 돈다 |
| `npm test -- review` | 감수 화면 브라우저 점검만 |
| `SHOTS=0 npm test` | 모든 점검을 돌리되 `tests/shots/` 화면 캡처를 건너뜀(캡처는 aside가 바쁠 때 한 장에 수십 초) |
| `BASE=https://pblsketch.github.io/eumun-byeondong/ npm test -- 00-smoke` | 로컬 서버 대신 그 주소를 점검(배포 확인). 브라우저 점검만 주소를 쓴다 |
| `STEP=낱말 node check-review.mjs` | 한 점검 파일 안에서 이름에 그 낱말이 든 단계만(서버를 따로 켜 둠: `node server.mjs 8791`) |

## 글꼴 다시 만들기

화면 문구(`js/**/*.js`의 문자열, `index.html`, CSS `content`)에 새 글자가 생겼을 때.

1. 원본 `Pretendard-Medium.otf`, `Pretendard-Bold.otf`, `OFL-Pretendard.txt`를 음운 해전 저장소의 `tools/fonts_src/`에서 이 저장소의 `tools/fonts_src/`(저장소 제외)로 복사한다. 스크립트는 아무것도 내려받지 않는다 — 원본이 없으면 멈춘다.
2. 저장소 맨 위에서 `python tools/build_fonts.py`. "게임 글자 중 원본 글꼴에 없는 글자: 없음"이 나와야 한다.
3. 바뀐 `assets/fonts/*.woff2`와 `css/fonts.css`를 함께 커밋한다.

## 음원 넣기

`assets/audio/README.md`의 파일 이름표대로(모두 소문자) mp3를 넣고 `assets/audio/CREDITS.md`에 출처·라이선스를 적는다. 이름이 다르면 GitHub Pages(대소문자 구분)에서 못 찾는다. 후보는 `design/audio-candidates.md`.

## 배포 (GitHub Pages)

- 저장소 `pblsketch/eumun-byeondong`의 main 가지, 맨 위 폴더(`/`)를 그대로 정적 호스팅한다. 주소: https://pblsketch.github.io/eumun-byeondong/
- 맨 위의 `.nojekyll`이 있어야 한다(밑줄로 시작하는 파일·폴더를 Jekyll이 버리지 않게).
- 순서: 작업 가지에서 `npm test` 통과 → main에 `--no-ff`로 합침 → 선생님 확인 뒤 `git push origin main` → Pages가 1~2분 뒤 다시 짓는다(`gh api repos/pblsketch/eumun-byeondong/pages --jq .status`가 `built`) → `BASE=https://pblsketch.github.io/eumun-byeondong/ npm test -- 00-smoke`로 배포 주소 확인.
- Pages를 처음 켤 때: `gh api -X POST repos/pblsketch/eumun-byeondong/pages -f "source[branch]=main" -f "source[path]=/"`.
