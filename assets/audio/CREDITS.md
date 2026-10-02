# 음원 출처와 라이선스

이 폴더의 음원 10개는 모두 자유 이용 라이선스(CC BY 4.0 또는 CC0)다. `design/audio-candidates.md`의 추천안을 에이전트가 골라 넣었다(선생님 요청 "알아서 좋은 걸로 넣어", 2026-10-02 — 결정 0020).
원본은 저장소에 넣지 않았고(`assets/raw/audio/`, git 제외), `python tools/process_audio.py`로 다듬은 결과만 넣었다.

공통으로 손본 것:
- 16 kHz 위 성분을 걸러 냈다.
- 배경 음악: 반복 구간을 골라(2초 창의 소리 결과 크기가 가장 닮은 두 지점 → 파형 상관으로 샘플 단위 맞춤) 0.9초 등전력 크로스페이드로 끝→처음을 이었다. 측정한 통합 음량으로 고정 이득을 걸어 약 -18 LUFS, 최댓값 제한. 44.1 kHz 스테레오 128 kbps.
- 효과음: 앞 무음을 자르고, 정한 길이로 자른 뒤 끝을 줄여 끄고, 최댓값을 자리마다 맞췄다(자주 울리는 교정은 작게, '표준 아님' 삐 소리는 귀가 따갑지 않게 낮춤). 44.1 kHz 모노 96 kbps.

## 게임 안 '만든 사람·출처'(설정 창)에 넣은 표기

```
"Local Forecast - Elevator" Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0 License
http://creativecommons.org/licenses/by/4.0/

"Inspired" Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0 License
http://creativecommons.org/licenses/by/4.0/

효과음: Freesound(freesound.org)의 CC0 음원 — jakobhandersen, bruce965, FunWithSound, Jofae, JonnyRuss01, prueslove, ertfelda
```

## 배경 음악

| 파일 | 곡 | 만든 사람 | 출처 | 라이선스 | 손본 것 |
|---|---|---|---|---|---|
| `bgm-review.mp3` | Local Forecast - Elevator | Kevin MacLeod | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1300012 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | 원곡 25.50–165.96초(140.5초)를 반복 구간으로, +0.8 dB |
| `bgm-result.mp3` | Inspired | Kevin MacLeod | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1600022 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | 원곡 29.00–137.00초(108.0초)를 반복 구간으로, -5.3 dB |

## 효과음

모두 Freesound의 CC0 음원이다(출처 표기 의무는 없지만 적어 둔다). Freesound가 공개한 고음질 미리듣기 mp3를 받아 썼다.

| 파일 | 원래 이름 | 만든 사람 | 출처 | 손본 것 |
|---|---|---|---|---|
| `sfx-mark.mp3` | pencil_check_mark_1.wav | jakobhandersen | https://freesound.org/people/jakobhandersen/sounds/181052/ | 0.50초, 최댓값 -9 dBFS |
| `sfx-send.mp3` | Walkie Talkie - Transmission Start | bruce965 | https://freesound.org/people/bruce965/sounds/321905/ | 0.55초, -5 dBFS |
| `sfx-onair.mp3` | Short Success Sound Glockenspiel Treasure Video Game.mp3 | FunWithSound | https://freesound.org/people/FunWithSound/sounds/456965/ | 1.90초로 자르고 끝 0.6초 줄임, -3 dBFS |
| `sfx-offrule.mp3` | Chime Notification | Jofae | https://freesound.org/people/Jofae/sounds/380482/ | 0.32초, -5 dBFS |
| `sfx-diff.mp3` | Beep_Error_1.wav | JonnyRuss01 | https://freesound.org/people/JonnyRuss01/sounds/478191/ | 0.24초, -6 dBFS |
| `sfx-nonstandard.mp3` | Short Censor Beep | prueslove | https://freesound.org/people/prueslove/sounds/586975/ | 0.35초, -13 dBFS(삐 소리라 낮춤) |
| `sfx-guide-ok.mp3` | correct | ertfelda | https://freesound.org/people/ertfelda/sounds/243701/ | 0.31초, -5 dBFS |
| `sfx-guide-wrong.mp3` | incorrect | ertfelda | https://freesound.org/people/ertfelda/sounds/243700/ | 0.28초, -6 dBFS |

## 다시 만들기 · 점검

원본을 `assets/raw/audio/`에 받는다(배경 음악은 incompetech의 mp3, 효과음은 Freesound 미리듣기 `https://cdn.freesound.org/previews/<번호 앞자리>/<번호>_<만든 사람 번호>-hq.mp3`). 그다음 `python tools/process_audio.py`(ffmpeg 필요). `--check`는 파일 10개 · 효과음 2초 이하 · 배경 음악 반복 이음새(앞뒤 20 ms 크기 차 6 dB 이하) · 클리핑을 잰다.
