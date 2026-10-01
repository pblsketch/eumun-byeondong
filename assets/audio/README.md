# 소리 파일 자리

지금 이 폴더에는 음원이 하나도 없다. 선생님이 `design/audio-candidates.md`의 후보를 듣고 고른 뒤에 넣는다.
파일이 없어도 게임은 조용히 돈다(`js/core/audio.js` — 예외·`console.error` 없이 파일마다 경고 한 번).

음원을 넣을 때는 아래 이름 그대로(모두 소문자) mp3로 저장한다. 이름이 다르면 GitHub Pages에서 찾지 못한다.

## 배경 음악 (`G.audio.play(이름)`)

| 파일 | 이름 | 쓰는 곳 |
|---|---|---|
| `bgm-review.mp3` | `review` | 감수 지침·감수 화면 |
| `bgm-result.mp3` | `result` | 조항 공개·장 결과 |

## 효과음 (`G.audio.sfx(이름)`)

| 파일 | 이름 | 쓰는 곳 |
|---|---|---|
| `sfx-mark.mp3` | `mark` | 교정 부호 하나를 놓을 때 |
| `sfx-send.mp3` | `send` | 송출 |
| `sfx-onair.mp3` | `onair` | 신호: 온에어 성공 |
| `sfx-offrule.mp3` | `offrule` | 신호: 결과는 맞지만 규칙 밖 |
| `sfx-diff.mp3` | `diff` | 신호: n곳이 다름 |
| `sfx-nonstandard.mp3` | `nonstandard` | 신호: 표준 아님 |
| `sfx-guide-ok.mp3` | `guideOk` | 감수 지침 맞음 |
| `sfx-guide-wrong.mp3` | `guideWrong` | 감수 지침 틀림 |

## 넣을 때 함께 할 일

- 음원 출처·라이선스를 이 폴더의 `CREDITS.md`에 적는다(음운 해전 `assets/audio/CREDITS.md`와 같은 모양).
- CC BY 음원이면 게임 안 '만든 사람·출처' 화면과 README에도 출처를 적는다(라이선스 조건).
- 음량은 음운 해전처럼 배경 음악 약 -18 LUFS, 효과음 약 -16 LUFS로 맞추고, 배경 음악은 반복 이음새를 다듬는다.
- 원본은 저장소에 넣지 않는다(`assets/raw/`).
