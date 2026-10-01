# tools — 글꼴과 그림을 만드는 도구

## 맡는 것
- `build_fonts.py`: Pretendard에서 이름을 바꾼 글꼴 두 개(`assets/fonts/pron-700.woff2` = GamsuPron, `ui-500.woff2` = GamsuUI)와 `css/fonts.css`, `assets/fonts/OFL-Pretendard.txt`를 만든다(명세 §14). 출처는 「음운 해전」 `tools/build_fonts.py`.
- `gen.ps1` + `prompts/`: Codex 그림 생성으로 화풍 견본을 만든다(결정 0017·0018). 원본은 `assets/raw/`(저장소 제외).

## 쓰는 법
- 원본 글꼴 `Pretendard-Medium.otf`, `Pretendard-Bold.otf`, `OFL-Pretendard.txt`를 음운 해전의 `tools/fonts_src/`에서 이 저장소의 `tools/fonts_src/`(저장소 제외)로 복사한다. 스크립트는 아무것도 내려받지 않는다.
- 저장소 맨 위에서 `python tools/build_fonts.py`(fontTools 필요). **화면 문구를 고쳐 새 글자가 생기면 다시 돌린다.** 결과는 결정적이다(같은 입력 → 같은 파일).

## 불변 조건
- 발음용 GamsuPron(700)은 현대 한글 음절 11,172자 전부 + 호환 자모 + 기본 라틴 + 장음 표시 등 기호를 담는다. 학생이 만든 어떤 음절도 기기 글꼴로 새지 않게 하려는 것이다. 안내 글의 굵은 글씨(600~900)도 이 파일을 쓴다.
- 안내용 GamsuUI(500)는 `index.html`의 글, `js/` 아래 .js의 문자열(주석 제외), `css/`의 `content` 문자열에 쓰인 글자 + 늘 넣는 글자만 담는다.
- OFL에 따라 글꼴 이름을 바꾸고(예약 이름 Pretendard를 쓰지 않음) 저작권 표시와 라이선스 파일은 그대로 둔다.
- 결과만 커밋한다: `assets/fonts/*`, `css/fonts.css`. `tools/fonts_src/`·`assets/raw/`는 올리지 않는다.

## 점검
- 스크립트가 "게임 글자 중 원본 글꼴에 없는 글자: 없음"을 찍어야 한다.
- 브라우저: `cd tests && npm test`의 글꼴 점검(무작위 한글 음절이 기기 글꼴 없이 그려지는지).
