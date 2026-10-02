# 소리 후보 목록 — 발음 감수실

**2026-10-02: 아래 '한눈에 보기'의 추천안을 그대로 넣었다**(선생님 요청 "알아서 좋은 걸로 넣어" — 결정 0020, 출처는 `assets/audio/CREDITS.md`). 바꾸고 싶으면 다른 후보를 받아 `tools/process_audio.py`의 목록만 고쳐 다시 만든다.
고르신 뒤에 원본을 받아 음운 해전처럼 다듬고(음량 맞추기, 배경 음악 반복 이음새) `assets/audio/`에 정해진 이름으로 넣는다(`assets/audio/README.md`).

- **조사한 날**: 2026-10-01. 라이선스와 길이는 그날 각 쪽에서 확인했다.
  - incompetech 곡은 공개 곡 목록(`pieces.json`)의 길이·빠르기를 적었다.
  - Freesound 효과음은 각 소리 쪽의 라이선스 표시('Creative Commons 0')와 길이를 확인했다.
  - Scott Buckley 곡은 누리집에 길이가 없어 같은 곡의 SoundCloud 쪽 길이를 적었다.
- **라이선스는 둘뿐이다.** CC0(조건 없음)과 CC BY 4.0(출처 표기 조건)만 골랐다. Pixabay 같은 자체 라이선스는 넣지 않았다.
  - CC BY 4.0 곡을 고르시면 게임 안 '만든 사람·출처' 화면과 `assets/audio/CREDITS.md`에 아래 표기를 넣어야 한다(이번 범위 밖, 음원 넣을 때 함께).
- **고른 까닭에 대해**: 저(작업자)는 소리를 직접 들을 수 없어서, 만든 사람의 설명·분류·길이를 보고 골랐다. 실제 느낌은 선생님이 들어 보고 판단해 주셔야 한다.
- **고르는 기준**: 밝은 방송국 감수실, 고1·중3 학생이 생각하며 교정하는 동안 방해되지 않을 것.
  - 배경 음악: 차분하고 가사가 없으며, 반복해도 거슬리지 않을 것
  - 효과음: 짧고(대부분 1초 안팎) 또렷하며, 자주 울려도 귀가 피곤하지 않을 것
  - 말소리가 들어간 소리는 뺐다(학생이 직접 발음하는 게임이라 헷갈림 — 음운 해전 결정 0011)
  - 판이 끝났다는 느낌으로 만든 실패음도 뺐다(오답을 막지 않는 게임 — 명세 원칙 3)

---

## 배경 음악

### 감수 — `bgm-review.mp3` (감수 지침·감수 화면)

학생이 가장 오래 듣는 곡이다. 생각을 방해하지 않도록 느리거나 중간 빠르기에 선율이 앞에 나서지 않는 곡을 골랐다.

| | 곡 | 만든 사람 | 라이선스 | 길이 | 고른 까닭 |
|---|---|---|---|---|---|
| A | [Local Forecast - Elevator](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1300012) | Kevin MacLeod | CC BY 4.0 | 3:09 (82 bpm) | '일기 예보' 느낌의 가벼운 재즈곡을 승강기 음악처럼 낮게 섞은 판. 방송국 대기실 같은 분위기가 게임 설정(소리방송 감수실)과 잘 맞고, 소리가 멀게 깔려 생각을 덜 방해한다. |
| B | [Wallpaper](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100843) | Kevin MacLeod | CC BY 4.0 | 3:40 (92 bpm) | 만든 사람이 '거의 모든 면에서 거슬리지 않는 깨끗한 곡'이라고 설명한 배경용 곡. 밝고 차분함(Bright·Calming). 무난함이 가장 크다. |
| C | [Airport Lounge](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100806) | Kevin MacLeod | CC BY 4.0 | 5:08 (129 bpm) | '주의를 빼앗지 않는다'고 소개된 가볍고 산뜻한 곡. 길이가 길어 반복이 덜 느껴진다. 빠르기는 셋 중 가장 빠르다. |

**추천: A (Local Forecast - Elevator)** — 방송국이라는 게임 설정과 가장 잘 맞고, 승강기 음악처럼 뒤로 물러나 있어 오래 들어도 덜 지친다. 너무 재즈 느낌이 강하면 B.

### 결과 — `bgm-result.mp3` (조항 공개·장 결과)

한 장을 끝낸 뒤 조항을 읽고 결과를 보는 화면이다. 감수 곡보다 조금 밝고 '해냈다'는 느낌이 나되, 조항 원문을 읽는 데 방해되지 않는 곡을 골랐다.

| | 곡 | 만든 사람 | 라이선스 | 길이 | 고른 까닭 |
|---|---|---|---|---|---|
| A | [Inspired](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1600022) | Kevin MacLeod | CC BY 4.0 | 4:46 (120 bpm) | 밝고 편안하며 북돋우는 곡(Bright·Relaxed·Calming·Uplifting). 기업 소개 영상에 쓸 만하다고 소개될 만큼 단정해서, 결과를 차분히 읽는 화면에 어울린다. |
| B | [Simplicity](https://www.scottbuckley.com.au/library/simplicity/) | Scott Buckley | CC BY 4.0 | 약 3:05 | 피아노에 바이올린·어쿠스틱 기타·만돌린·가벼운 드럼이 더해진 차분하고 따뜻한 곡. 음운 해전의 결과 곡(Echoes Of Home)과 같은 작곡가라 시리즈 느낌이 이어진다. |
| C | [Life of Riley](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1400054) | Kevin MacLeod | CC BY 4.0 | 3:55 (102 bpm) | 중간 빠르기의 명랑한 곡(Bright·Relaxed·Uplifting). 셋 중 가장 경쾌해서 '한 장 끝!' 기분이 잘 나지만, 조항을 오래 읽을 때는 조금 들뜰 수 있다. |

**추천: A (Inspired)** — 밝지만 들뜨지 않아 조항 원문을 읽는 동안에도 괜찮다. 시리즈 느낌을 살리고 싶으시면 B.

#### CC BY 4.0 출처 표기(고르신 곡만 넣음)

```
"Local Forecast - Elevator" Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0 License
http://creativecommons.org/licenses/by/4.0/

"Wallpaper" Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0 License
http://creativecommons.org/licenses/by/4.0/

"Airport Lounge" Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0 License
http://creativecommons.org/licenses/by/4.0/

"Inspired" Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0 License
http://creativecommons.org/licenses/by/4.0/

"Life of Riley" Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0 License
http://creativecommons.org/licenses/by/4.0/

'Simplicity' by Scott Buckley - released under CC-BY 4.0. www.scottbuckley.com.au
```

---

## 효과음

모두 Freesound의 **CC0 1.0**(https://creativecommons.org/publicdomain/zero/1.0/) 음원이다. 출처 표기 의무는 없지만 음운 해전처럼 `CREDITS.md`에 적어 둔다.

### 교정 — `sfx-mark.mp3` (교정 부호 하나를 놓을 때)

가장 자주 울리는 소리다. 아주 짧고 작아야 한다. 종이 원고에 표시하는 느낌을 찾았다.

| | 소리 | 만든 사람 | 길이 | 고른 까닭 |
|---|---|---|---|---|
| A | [pencil_check_mark_1.wav](https://freesound.org/people/jakobhandersen/sounds/181052/) | jakobhandersen | 0.53초 | 종이에 연필로 체크 표시를 하는 실제 녹음. '원고에 교정 부호를 긋는다'는 행동과 그대로 겹친다. |
| B | [Sharpie marker drawing circle 01.wav](https://freesound.org/people/elliott.klein/sounds/321137/) | elliott.klein | 0.81초 | 매직펜으로 동그라미를 그리는 녹음. 감수자가 표시하는 느낌이 나지만 조금 길어 앞부분만 쓰면 좋다. |
| C | [Pen Click](https://freesound.org/people/LexzachGames/sounds/431492/) | LexzachGames | 0.43초 | 볼펜 딸깍 소리. 짧고 또렷해 여러 번 울려도 가볍다. |

**추천: A** — 행동과 소리가 가장 잘 맞고 짧다.

### 송출 — `sfx-send.mp3`

원고를 아나운서에게 넘기는 순간. 신호(판정) 소리 바로 앞에 울리므로 짧고 중립적이어야 한다.

| | 소리 | 만든 사람 | 길이 | 고른 까닭 |
|---|---|---|---|---|
| A | [Walkie Talkie - Transmission Start](https://freesound.org/people/bruce965/sounds/321905/) | bruce965 | 0.55초 | 무전기가 송신을 시작할 때의 짧은 신호음(합성). '송출'이라는 말과 가장 가깝다. |
| B | [Whoosh](https://freesound.org/people/qubodup/sounds/60013/) | qubodup | 0.43초 | 대나무 막대를 휘둘러 낸 '휙' 소리. 원고가 넘어가는 느낌. 중립적이라 뒤따르는 신호 소리와 섞이지 않는다. |
| C | [Channel Switch.wav](https://freesound.org/people/LimitSnap_Creations/sounds/279004/) | LimitSnap_Creations | 0.27초 | 텔레비전 채널을 돌릴 때의 짧은 잡음. 방송 느낌은 강하지만 잡음이라 자주 들으면 거칠 수 있다. |

**추천: A** — 송출 느낌이 분명하고 판정과 헷갈리지 않는다.

### 신호: 온에어 성공 — `sfx-onair.mp3`

네 신호 가운데 유일한 성공. 감수 지침 맞음(`guideOk`)보다 조금 더 크고 기쁜 소리가 좋다.

| | 소리 | 만든 사람 | 길이 | 고른 까닭 |
|---|---|---|---|---|
| A | [[UI Sound] Approval - High Pitched Bell Synth](https://freesound.org/people/GabFitzgerald/sounds/625174/) | GabFitzgerald | 0.77초 | 알림·성공 표시용으로 만든 높은 종소리. 짧고 깔끔해 교실에서 여러 기기가 동시에 울려도 덜 시끄럽다. |
| B | [Short Success Sound Glockenspiel Treasure Video Game.mp3](https://freesound.org/people/FunWithSound/sounds/456965/) | FunWithSound | 2.48초 | 글로켄슈필로 연주한 짧은 성공 음. 밝고 맑아 '방송이 나갔다'는 보람이 크다. 조금 길다. |
| C | [Congrats](https://freesound.org/people/Fupicat/sounds/607207/) | Fupicat | 2.33초 | 게임용 성공 징글. 가장 축하하는 느낌이 강하지만 원고 7개마다 들으면 과할 수 있다. |

**추천: B** — 원고 하나를 해낸 보람이 잘 느껴지고, 2초대라 다음 원고로 넘어가는 흐름을 막지 않는다. 짧은 쪽을 원하시면 A.

### 신호: 결과는 맞지만 규칙 밖 — `sfx-offrule.mp3`

발음은 맞았지만 과정이 규칙과 다르다. 실패가 아니라 '한 번 더 살펴보자'는 물음표 느낌을 찾았다.

| | 소리 | 만든 사람 | 길이 | 고른 까닭 |
|---|---|---|---|---|
| A | [Chime Notification](https://freesound.org/people/Jofae/sounds/380482/) | Jofae | 0.32초 | 휴대폰 알림 같은 짧은 차임. 맞음도 틀림도 아닌 '알림' 느낌이라 이 신호의 뜻(결과는 맞음, 과정 확인)과 맞다. |
| B | [Cute Question Mark](https://freesound.org/people/plasterbrain/sounds/396195/) | plasterbrain | 2.46초 | 머리 위에 물음표가 뜰 때 쓰는 만화풍 소리 다섯 개 묶음. 뜻은 가장 잘 맞지만 하나만 잘라 써야 하고, 고1에게는 조금 어리게 들릴 수 있다. |
| C | [UI Button Sound (Cancel / Back / Exit)](https://freesound.org/people/Nomagician/sounds/833628/) | Nomagician | 1.16초 | '취소·뒤로' 단추용으로 만든 부드러운 합성음. 아래로 내려앉는 느낌이라 '다시 해 보기'를 권하는 신호에 어울린다. |

**추천: A** — 성공·실패 어느 쪽으로도 읽히지 않는 중립 소리다. 온에어 소리와 너무 비슷하게 들리면 C.

### 신호: n곳이 다름 — `sfx-diff.mp3`

가장 자주 듣는 실패 신호다. 혼내는 느낌이 아니라 '아직 달라요' 정도로 부드러워야 한다(오답을 막지 않는 게임).

| | 소리 | 만든 사람 | 길이 | 고른 까닭 |
|---|---|---|---|---|
| A | [Beep_Error_1.wav](https://freesound.org/people/JonnyRuss01/sounds/478191/) | JonnyRuss01 | 0.24초 | 쇠 그릇을 두드려 만든 부드러운 삐 소리. 아주 짧고 날카롭지 않아 여러 번 들어도 기분이 덜 상한다. |
| B | [Bonk Click w/deny feel](https://freesound.org/people/GameAudio/sounds/220210/) | GameAudio | 1.00초 | '안 돼요' 느낌의 둔탁한 합성 딸깍 소리. 실패가 분명히 전달되지만 무겁지 않다. |
| C | [Wrong Answer / Incorrect / Error](https://freesound.org/people/Beetlemuse/sounds/528956/) | Beetlemuse | 0.67초 | 오답용으로 만든 소리. 뜻은 가장 분명하지만 '틀렸다'는 느낌이 셋 중 가장 강하다. |

**추천: A** — 부드럽고 짧아 다시 시도하게 만든다.

### 신호: 표준 아님 — `sfx-nonstandard.mp3`

원고에 적힌 흔한 비표준 발음(감기[강기] 등)으로 송출했을 때. 방송에서 '걸러지는' 느낌의 삐 소리를 골랐다.

| | 소리 | 만든 사람 | 길이 | 고른 까닭 |
|---|---|---|---|---|
| A | [Short Censor Beep](https://freesound.org/people/prueslove/sounds/586975/) | prueslove | 0.35초 | 방송용으로 만든 '짧고 거슬리지 않는' 삐 소리. 방송국 설정과 맞고, 셋 중 가장 짧다. |
| B | [Reality TV Censor Beep](https://freesound.org/people/LilMati/sounds/460015/) | LilMati | 0.45초 | 예능 방송에서 쓰는 삐 소리. 방송 느낌이 가장 뚜렷하다. |
| C | [Censor Beep](https://freesound.org/people/mattskydoodle/sounds/195116/) | mattskydoodle | 0.50초 | 전형적인 삐 소리. 가장 단순하다. |

**추천: A** — 방송에서 표준이 아닌 말을 걸러 내는 느낌이 이 신호의 뜻과 맞다.
다만 삐 소리는 원래 욕설을 가리는 소리라 단일 사인파는 귀에 따가울 수 있다. 들어 보시고 거슬리면 효과음 음량을 낮춰 넣거나, '다름' 후보 B를 대신 쓰는 방법도 있다.

### 감수 지침 맞음 — `sfx-guide-ok.mp3`

지침 빈칸 묶음을 확정했을 때 맞으면. 온에어 성공보다 작고 짧게.

| | 소리 | 만든 사람 | 길이 | 고른 까닭 |
|---|---|---|---|---|
| A | [correct](https://freesound.org/people/ertfelda/sounds/243701/) | ertfelda | 0.32초 | 정답용 밝은 차임(전자 건반 연주). 아주 짧아 지침 채우기 흐름을 끊지 않는다. 같은 사람의 '틀림' 소리와 짝을 이룬다. |
| B | [Correct Answer / That's Right!](https://freesound.org/people/Beetlemuse/sounds/528957/) | Beetlemuse | 0.73초 | 정답용 소리. 같은 사람의 오답 소리(위 '다름' C)와 짝이다. |
| C | [Typewriter Bell.wav](https://freesound.org/people/ramsamba/sounds/318687/) | ramsamba | 0.89초 | 타자기 줄 끝 '땡' 소리. 원고를 다루는 감수실 분위기와 어울리는 색다른 선택. |

**추천: A** — 짧고 밝으며 '틀림' 짝이 있어 둘의 결이 맞는다.

### 감수 지침 틀림 — `sfx-guide-wrong.mp3`

지침 빈칸이 틀렸을 때. 틀린 칸 수만 알려 주는 단계이므로 부드럽게.

| | 소리 | 만든 사람 | 길이 | 고른 까닭 |
|---|---|---|---|---|
| A | [incorrect](https://freesound.org/people/ertfelda/sounds/243700/) | ertfelda | 0.28초 | 오답용 아쉬운 소리(전자 건반 연주). 지침 맞음 A와 같은 악기라 짝이 맞는다. |
| B | [WrongAnswer.mp3](https://freesound.org/people/Gronkjaer/sounds/554053/) | Gronkjaer | 0.19초 | 오답용 아주 짧은 소리. 가장 짧아 거의 신경 쓰이지 않는다. |
| C | [Correct / Incorrect Tones](https://freesound.org/people/LaurenPonder/sounds/635643/) | LaurenPonder | 1.21초 | 맞음·틀림 신호음이 한 파일에 든 합성음. 틀림 부분만 잘라 써야 하며, 맞음 부분을 지침 맞음에 함께 쓸 수도 있다. |

**추천: A** — 지침 맞음 A와 짝으로 쓰면 둘이 같은 결로 들린다.

---

## 한눈에 보기 (추천안)

| 자리 | 파일 | 추천 | 라이선스 |
|---|---|---|---|
| 배경 음악: 감수 | `bgm-review.mp3` | Local Forecast - Elevator (Kevin MacLeod) | CC BY 4.0 |
| 배경 음악: 결과 | `bgm-result.mp3` | Inspired (Kevin MacLeod) | CC BY 4.0 |
| 교정 | `sfx-mark.mp3` | pencil_check_mark_1 (jakobhandersen) | CC0 |
| 송출 | `sfx-send.mp3` | Walkie Talkie - Transmission Start (bruce965) | CC0 |
| 온에어 성공 | `sfx-onair.mp3` | Short Success Sound Glockenspiel (FunWithSound) | CC0 |
| 규칙 밖 | `sfx-offrule.mp3` | Chime Notification (Jofae) | CC0 |
| n곳이 다름 | `sfx-diff.mp3` | Beep_Error_1 (JonnyRuss01) | CC0 |
| 표준 아님 | `sfx-nonstandard.mp3` | Short Censor Beep (prueslove) | CC0 |
| 지침 맞음 | `sfx-guide-ok.mp3` | correct (ertfelda) | CC0 |
| 지침 틀림 | `sfx-guide-wrong.mp3` | incorrect (ertfelda) | CC0 |

추천안대로라면 CC BY 곡은 배경 음악 두 곡뿐이다. 그래도 '만든 사람·출처' 화면은 필요하다(다음 차례).
배경 음악 두 곡을 음운 해전처럼 128~160 kbps로 다듬으면 합쳐 약 7~9MB가 될 것으로 보인다. 반복 구간만 잘라 쓰면 더 줄어든다.
