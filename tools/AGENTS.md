# tools — 글꼴과 그림을 만드는 도구

## 맡는 것
- `build_fonts.py`: Pretendard에서 이름을 바꾼 글꼴 두 개(`assets/fonts/pron-700.woff2` = GamsuPron, `ui-500.woff2` = GamsuUI)와 `css/fonts.css`, `assets/fonts/OFL-Pretendard.txt`를 만든다. 출처는 「음운 해전」 `tools/build_fonts.py`.
- `gen.ps1` + `prompts/`: Codex 그림 생성으로 이미지 한 장을 만든다(화풍 견본 A·B·C — 고른 화풍은 B 부드러운 그림책). 참조 그림 모드(`-Image 그림 -RefMode style|same`)로 화풍만 따르거나 같은 인물을 다른 표정으로 그린다. 원본은 `assets/raw/`(저장소 제외).
- `process_audio.py`: `assets/raw/audio/`(내려받은 원본) → `assets/audio/*.mp3`(배경 음악 반복 구간 · 크로스페이드 · -18 LUFS 고정 이득, 효과음 자르기 · 최댓값 맞추기, `--check`로 이음새 · 길이 · 클리핑 점검). ffmpeg 필요. 출처는 `assets/audio/CREDITS.md`.
- `process_assets.py`: `assets/raw/*.png` → 게임 그림 `assets/img/*.webp`(자홍 배경 지우기 · 아나운서 다섯 상태의 책상 폭 맞추기 · 크기 줄이기, `--check`로 투명도 · 남은 자홍 · 크기 점검). 출처는 음운 해전 `tools/process_assets.py`(결정 0020).

## 맡지 않는 것
- 게임 실행 코드(`js/`, `css/` 중 `fonts.css` 말고는 손대지 않는다). 도구는 게임이 읽는 결과 파일만 만든다.

## 쓰는 법
- 글꼴: 원본 `Pretendard-Medium.otf`, `Pretendard-Bold.otf`, `OFL-Pretendard.txt`를 음운 해전 저장소의 `tools/fonts_src/`에서 이 저장소의 `tools/fonts_src/`(저장소 제외)로 복사한 뒤 저장소 맨 위에서 `python tools/build_fonts.py`(fontTools·brotli 필요). 스크립트는 아무것도 내려받지 않는다 — 원본이 없으면 멈춘다. **화면 문구를 고쳐 새 글자가 생기면 다시 돌린다.**
- 화면 그림 목록과 참조 그림은 `design/style-samples.md` '게임 그림' 표. 배지 · 아이콘 묶음(chapter_badges · ui_icons)은 4열 × 2줄 한 장으로 그려 자른다.
- 그림: `powershell -NoProfile -ExecutionPolicy Bypass -File tools\gen.ps1 -Name 이름 -PromptFile tools\prompts\파일.txt -Out assets\raw\이름.png` (프롬프트는 영어 ASCII만).

## 불변 조건
- 발음용 GamsuPron(700)은 현대 한글 음절 11,172자 전부 + 호환 자모 + 기본 라틴 + 장음 표시 등 기호를 담는다. 학생이 만든 어떤 음절도 기기 글꼴로 새지 않게 하려는 것이다. 안내 글의 굵은 글씨(600~900)도 이 파일을 쓴다.
- 안내용 GamsuUI(500)는 `index.html`의 글, `js/` 아래 .js의 문자열(주석 제외), `css/`의 `content` 문자열에 쓰인 글자 + 늘 넣는 글자만 담는다.
- OFL에 따라 글꼴 이름을 바꾸고(원래 이름 Pretendard를 글꼴 이름에 쓰지 않음) 저작권 표시(name 0)와 라이선스 파일은 그대로 둔다. 결과는 결정적이다(같은 입력 → 같은 파일, 수정 시각 고정).
- 결과만 커밋한다: `assets/fonts/*`, `css/fonts.css`, `assets/img/*`, 프롬프트. `tools/fonts_src/`·`assets/raw/`는 올리지 않는다.
- 그림 안에 글자·실제 방송사 로고·조선 소재가 없어야 한다. 새 화풍은 견본을 선생님께 보여 드리고 고른 것으로만 만든다.

## 구현 방식
- `gen.ps1`은 순수 ASCII다(Windows PowerShell 5.1이 BOM 없는 스크립트의 한글을 잘못 읽음). `%TEMP%` 아래 따로 만든 CODEX_HOME(설정 + auth.json 복사본)으로 돌고, 프롬프트를 명령 인자에 그대로 넣으며(Codex 작업 공간 보호가 파일 읽기를 막음), 표준 입력을 닫고, 실행 전에 찍은 시각보다 새 PNG만 옮긴다.

## 점검
- 글꼴: 스크립트가 "게임 글자 중 원본 글꼴에 없는 글자: 없음"을 찍어야 한다. 이어서 `cd tests && npm test -- fonts`(무작위 한글 음절이 동봉 글꼴로 그려지는지).
- 그림: 만든 PNG를 직접 열어 글자·금지 소재가 없는지 본다.
