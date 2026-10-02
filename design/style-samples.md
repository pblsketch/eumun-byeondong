# 화풍 견본 — 발음 감수실 (구현 2단계 T13)

명세 §16. 같은 장면 하나를 화풍 세 가지로 그려 선생님이 보고 고르게 한다. **게임은 이번에 이 그림을 쓰지 않는다.**

## 장면과 지킨 것

- **장면**: 낮의 밝은 방송국 감수실. 가상의 아나운서 한 명(실제 인물과 닮지 않은 지어낸 인물)이 뉴스 책상에 앉아 빈 원고를 들고 오른쪽 프롬프터를 본다. 프롬프터 위에는 글이 없는 둥근 빨간 온에어 램프가 있고, 앞쪽 오른편에 감수 책상(빈 원고 더미, 빨간 연필, 청록 스탠드, 컵)이 있다. 뒤로는 햇빛 드는 창과 화분.
- **아나운서의 생김새**는 견본을 보고 정한다(명세 §16). 세 견본 모두 같은 문구(어깨 길이 검은 머리, 남색 재킷과 흰 윗옷)로 그렸으니 생김새를 바꾸고 싶으면 장면 문구만 고치면 된다.
- **금지**(프롬프트 끝에 모두 넣음): 글자·숫자·원고와 화면 위의 읽히는 글, 로고·방송사 이름·문장·서명·워터마크·테두리, 실제 방송인·방송국·인물, 옛 옷차림·조선 소재.
- **색**(화면 시안 `design/mockups/mockup-1-review.png`의 분위기를 따름, 명세 §14): 따뜻한 종이 흰색 `#F6F3EC`, 짙은 남색 `#1F2A44`, 차분한 청록 `#1C9C8C`, 연한 민트 `#CDEBE4`, 빨강 `#E0483E`은 온에어 램프와 연필에만.
- 크기·품질: 1536×1024, high. 모델 `gpt-6-astra`(Codex CLI 내장 image_gen).

## 견본

| 견본 | 공통 화풍 문구(이후 에셋에 붙일 문구) | 원본(저장소 제외) | 축소본(저장소) |
|---|---|---|---|
| A 평면 벡터 | flat vector illustration made of simple clean geometric shapes, solid color fills with no gradients or only very subtle ones, crisp edges, minimal detail, modern editorial infographic look | `assets/raw/style_a.png` | `design/style-samples/style_a.jpg` |
| B 부드러운 붓 그림 | soft painterly digital illustration, gentle brush textures, smooth soft daylight with soft shadows, slightly simplified shapes, warm but clean contemporary storybook concept-art look, not photorealistic | `assets/raw/style_b.png` | `design/style-samples/style_b.jpg` |
| C 가는 선 + 옅은 채색 | clean fine ink line art with even line weight on light paper, light flat watercolor-like color washes that stay mostly inside the lines, generous white space, airy and minimal, modern picture-book line illustration look | `assets/raw/style_c.png` | `design/style-samples/style_c.jpg` |

- A는 음운 해전에서 선생님이 고른 화풍 A와 같은 문구다(시리즈 일관성을 원하면 A).
- 축소본은 가로 1024px JPEG(품질 88)이다. Python Pillow로 줄였다.

### 공통 장면 문구 (세 견본 같음)

```text
A bright, cheerful broadcasting-station proofreading room in daytime, seen from a gentle three-quarter angle at eye level. On the left side, one fictional young adult news anchor (a generic invented character, not resembling any real person or celebrity) with shoulder-length dark hair, wearing a navy blazer over a white top, sits at a clean light-grey news desk, holding a few sheets of blank script paper and smiling while looking toward a teleprompter. On the right side stands the teleprompter: a studio camera on a tripod with a slanted glass reflector screen in front of it, the screen glowing softly and completely blank. Above the teleprompter hangs a small round red on-air lamp, glowing, plain with no writing on it. In the foreground at the lower right is a tidy proofreading desk with neat stacks of manuscript pages that are blank or show only thin abstract grey lines, a red pencil, a teal desk lamp and a coffee mug. Large windows with soft daylight in the background, a few green potted plants, light warm-white walls. Clean bright palette: warm paper white #F6F3EC, deep navy ink #1F2A44, calm teal #1C9C8C, soft mint #CDEBE4, a small red accent #E0483E only on the on-air lamp and the pencil. Friendly, calm, focused mood suitable for a high-school learning game; plenty of light and air, uncluttered composition.
```

### 공통 금지 문구 (세 견본 같음)

```text
Absolutely no text, no letters, no Korean or Latin characters, no numbers, no readable writing on papers, screens or walls, no logos, no channel names, no emblems, no signatures, no watermarks, no frame or border. No real broadcasters, no real TV station, no real people. Contemporary setting only: no historical costumes, no traditional Korean or Joseon motifs. Landscape 1536x1024.
```

### 견본 A 전체 프롬프트 (`tools/prompts/style_a.txt`)

```text
A bright, cheerful broadcasting-station proofreading room in daytime, seen from a gentle three-quarter angle at eye level. On the left side, one fictional young adult news anchor (a generic invented character, not resembling any real person or celebrity) with shoulder-length dark hair, wearing a navy blazer over a white top, sits at a clean light-grey news desk, holding a few sheets of blank script paper and smiling while looking toward a teleprompter. On the right side stands the teleprompter: a studio camera on a tripod with a slanted glass reflector screen in front of it, the screen glowing softly and completely blank. Above the teleprompter hangs a small round red on-air lamp, glowing, plain with no writing on it. In the foreground at the lower right is a tidy proofreading desk with neat stacks of manuscript pages that are blank or show only thin abstract grey lines, a red pencil, a teal desk lamp and a coffee mug. Large windows with soft daylight in the background, a few green potted plants, light warm-white walls. Clean bright palette: warm paper white #F6F3EC, deep navy ink #1F2A44, calm teal #1C9C8C, soft mint #CDEBE4, a small red accent #E0483E only on the on-air lamp and the pencil. Friendly, calm, focused mood suitable for a high-school learning game; plenty of light and air, uncluttered composition. Style: flat vector illustration made of simple clean geometric shapes, solid color fills with no gradients or only very subtle ones, crisp edges, minimal detail, modern editorial infographic look. Absolutely no text, no letters, no Korean or Latin characters, no numbers, no readable writing on papers, screens or walls, no logos, no channel names, no emblems, no signatures, no watermarks, no frame or border. No real broadcasters, no real TV station, no real people. Contemporary setting only: no historical costumes, no traditional Korean or Joseon motifs. Landscape 1536x1024.
```

### 견본 B 전체 프롬프트 (`tools/prompts/style_b.txt`)

```text
A bright, cheerful broadcasting-station proofreading room in daytime, seen from a gentle three-quarter angle at eye level. On the left side, one fictional young adult news anchor (a generic invented character, not resembling any real person or celebrity) with shoulder-length dark hair, wearing a navy blazer over a white top, sits at a clean light-grey news desk, holding a few sheets of blank script paper and smiling while looking toward a teleprompter. On the right side stands the teleprompter: a studio camera on a tripod with a slanted glass reflector screen in front of it, the screen glowing softly and completely blank. Above the teleprompter hangs a small round red on-air lamp, glowing, plain with no writing on it. In the foreground at the lower right is a tidy proofreading desk with neat stacks of manuscript pages that are blank or show only thin abstract grey lines, a red pencil, a teal desk lamp and a coffee mug. Large windows with soft daylight in the background, a few green potted plants, light warm-white walls. Clean bright palette: warm paper white #F6F3EC, deep navy ink #1F2A44, calm teal #1C9C8C, soft mint #CDEBE4, a small red accent #E0483E only on the on-air lamp and the pencil. Friendly, calm, focused mood suitable for a high-school learning game; plenty of light and air, uncluttered composition. Style: soft painterly digital illustration, gentle brush textures, smooth soft daylight with soft shadows, slightly simplified shapes, warm but clean contemporary storybook concept-art look, not photorealistic. Absolutely no text, no letters, no Korean or Latin characters, no numbers, no readable writing on papers, screens or walls, no logos, no channel names, no emblems, no signatures, no watermarks, no frame or border. No real broadcasters, no real TV station, no real people. Contemporary setting only: no historical costumes, no traditional Korean or Joseon motifs. Landscape 1536x1024.
```

### 견본 C 전체 프롬프트 (`tools/prompts/style_c.txt`)

```text
A bright, cheerful broadcasting-station proofreading room in daytime, seen from a gentle three-quarter angle at eye level. On the left side, one fictional young adult news anchor (a generic invented character, not resembling any real person or celebrity) with shoulder-length dark hair, wearing a navy blazer over a white top, sits at a clean light-grey news desk, holding a few sheets of blank script paper and smiling while looking toward a teleprompter. On the right side stands the teleprompter: a studio camera on a tripod with a slanted glass reflector screen in front of it, the screen glowing softly and completely blank. Above the teleprompter hangs a small round red on-air lamp, glowing, plain with no writing on it. In the foreground at the lower right is a tidy proofreading desk with neat stacks of manuscript pages that are blank or show only thin abstract grey lines, a red pencil, a teal desk lamp and a coffee mug. Large windows with soft daylight in the background, a few green potted plants, light warm-white walls. Clean bright palette: warm paper white #F6F3EC, deep navy ink #1F2A44, calm teal #1C9C8C, soft mint #CDEBE4, a small red accent #E0483E only on the on-air lamp and the pencil. Friendly, calm, focused mood suitable for a high-school learning game; plenty of light and air, uncluttered composition. Style: clean fine ink line art with even line weight on light paper, light flat watercolor-like color washes that stay mostly inside the lines, generous white space, airy and minimal, modern picture-book line illustration look. Absolutely no text, no letters, no Korean or Latin characters, no numbers, no readable writing on papers, screens or walls, no logos, no channel names, no emblems, no signatures, no watermarks, no frame or border. No real broadcasters, no real TV station, no real people. Contemporary setting only: no historical costumes, no traditional Korean or Joseon motifs. Landscape 1536x1024.
```

## 생성 기록

2026-10-01, 세 장 모두 1회차에 통과(다시 만든 것 없음). 한 장에 1~2분 걸렸다.

| 견본 | 만든 방법 | 결과 | 눈으로 확인한 것 |
|---|---|---|---|
| A | Git Bash 직접 호출(아래) | 1536×1024 PNG | 글자·숫자·로고 없음. 원고는 회색 줄만, 프롬프터 화면은 빈 빛, 온에어 램프는 글 없는 빨간 구 |
| B | `tools/gen.ps1`(이 스크립트가 도는지 확인하려고 B를 이것으로 만듦, 종료 코드 0) | 1536×1024 PNG | 같음. 오른쪽 책장의 책등에도 글 없음 |
| C | Git Bash 직접 호출 | 1536×1024 PNG | 같음 |

- 참고: 세 견본의 아나운서 얼굴이 모두 비슷한 만화풍으로 나왔다. 화풍 차이는 주로 면(A 평면 / B 붓·빛 번짐 / C 선과 옅은 채색)에서 드러나고, C는 기대한 '가는 선 그림'보다 수채 느낌이 강하다.

## 다시 만들기

PowerShell, 저장소 루트에서:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools\gen.ps1 -Name style_a -PromptFile tools\prompts\style_a.txt -Out assets\raw\style_a.png
```

B·C는 `-Name`·`-PromptFile`·`-Out`의 `style_a`를 `style_b`·`style_c`로 바꾼다. 한 장에 2~6분 걸리므로 차례로 하나씩 만든다.

- `tools/gen.ps1`은 음운 해전 `tools/gen.ps1`(pblsketch/sori-haejeon)을 가져와 고친 것이다(파일 머리에 출처). 바꾼 점:
  - 전역 `~/.codex`를 쓰지 않고 `%TEMP%\codex-img-eumun-<이름>`에 `config.toml`(모델·`approval_policy="never"`·`sandbox_mode="workspace-write"`)과 `auth.json` 사본만 둔 따로 된 CODEX_HOME을 쓴다. 전역 설정의 플러그인·MCP 때문에 시작이 몇 분씩 멈추기 때문이다.
  - codex 샌드박스가 로컬 파일 읽기를 막으므로 프롬프트 전체를 명령 인자에 그대로 넣는다. 그래서 프롬프트는 영어(ASCII)만 쓰고, 큰따옴표는 작은따옴표로 바뀐다.
  - 표준 입력을 닫고(입력을 기다리며 멈추지 않게), 실행 전에 표시 파일을 만들어 그보다 새 PNG만 가져온다. 15분(`-TimeoutSec`)이 지나면 이 스크립트가 띄운 codex만 멈춘다.
  - 스크립트는 ASCII로만 썼다(Windows PowerShell 5.1이 BOM 없는 파일의 한글을 잘못 읽음).
- Git Bash에서 직접 부를 때(이번 견본 A·C를 만든 방법):

```bash
H="$TEMP/codex-t13-home"   # config.toml + auth.json 사본만 둔 폴더
CODEX_HOME="$H" codex exec "Use the built-in image_gen tool to generate exactly 1 image, size 1536x1024, quality high, using the following prompt verbatim. Do not run shell commands and do not read any files. Then print only DONE.

$(cat tools/prompts/style_a.txt)" -C "$H" --skip-git-repo-check -c 'model_reasoning_effort="medium"' </dev/null
# 그림은 $H/generated_images/**/ 에 생긴다. 실행 전에 만든 표시 파일보다 새 PNG만 assets/raw/로 복사한다.
```

- 축소본 만들기: `assets/raw/<이름>.png`를 Pillow로 가로 1024px로 줄여 `design/style-samples/<이름>.jpg`(JPEG 품질 88)로 저장한다.
- 원본(`assets/raw/`)은 `.gitignore`로 저장소에서 빠진다(`git check-ignore -v assets/raw/style_a.png` → `.gitignore:5:assets/raw`).

## 선생님이 고를 것

- 화풍 A·B·C 가운데 하나(또는 섞을 점).
- 아나운서의 생김새(머리 모양·옷·나이대). 정하면 장면 문구를 고쳐 같은 화풍으로 다시 만든다.

## 게임 그림 (결정 0020, 2026-10-02)

화풍 B 공통 문구 · 공통 금지 문구는 위와 같다. 모두 `tools/gen.ps1`(Codex CLI image_gen)로 만들었고, 프롬프트 전문은 `tools/prompts/<이름>.txt`다.

| 이름 | 크기 | 참조 그림(`-Image`, `-RefMode`) | 게임 파일 | 쓰는 곳 |
|---|---|---|---|---|
| anchors_idle | 1536×1024 | 견본 B 축소본(`style`) | `assets/img/anchors_idle.webp` | 감수 화면 무대(기다림) · 장 결과(사고 있음) |
| anchors_read | 1536×1024 | anchors_idle(`same`) | `anchors_read.webp` | 송출 중 |
| anchors_oops | 1536×1024 | anchors_idle(`same`) | `anchors_oops.webp` | 다름 |
| anchors_happy | 1536×1024 | anchors_idle(`same`) | `anchors_happy.webp` | 온에어 · 장 결과(모두 온에어) |
| anchors_puzzled | 1536×1024 | anchors_idle(`same`) | `anchors_puzzled.webp` | 규칙 밖 · 표준 아님 |
| studio_bg | 1536×1024 | 견본 B(`style`) | `studio_bg.webp` | 감수 화면 무대 배경 |
| title | 1024×1536 | 견본 B(`style`) | `title.webp` | 시작 화면 오른쪽 |
| senior | 1024×1024 | 견본 B(`style`) | `senior.webp` | 감수 지침 · 조항 공개 |
| start_banner | 1536×1024 | title(`same`) | `start_banner.webp`(가운데 띠 12:5) | 휴대폰 세로 · 좁은 화면 시작 화면 머리(결정 0022) |
| chapter_badges | 1536×1024(배지 8개) | 견본 B(`style`) | `ch1.webp`~`ch8.webp` | 시작 화면 장 카드 · 감수 화면 머리(결정 0022) |
| ui_icons | 1536×1024(아이콘 8개) | chapter_badges(`style`) | `ic_guide` · `ic_review` · `ic_rule` · `ic_trophy` · `ic_blocks` · `ic_mark` · `ic_onair` · `ic_hint` | 지침 · 조항 공개 · 장 결과 제목, 게임 방법 카드(결정 0022) |

- 아나운서 · 선배는 자홍(#FF00FF) 단색 배경으로 그리고 `python tools/process_assets.py`가 지운다(음운 해전 방식). 아나운서 다섯 장은 책상 윗면 폭을 맞춰 같은 판(1200×704)에 놓으므로 상태를 바꿔 끼워도 책상이 움직이지 않는다.
- 다섯 상태가 같은 얼굴로 나오도록 기다림 그림을 참조 그림(`same`)으로 넣었다. 눈으로 확인한 것: 글자 · 로고 없음, 원고 종이는 비어 있음, 실제 인물 닮음 없음, 옷 · 머리 · 넥타이 색이 다섯 장에서 같음.
- 배지 · 아이콘은 한 장에 4열 × 2줄로 그려 `process_assets.py`가 자홍을 지우고 덩어리 8개를 줄 · 열 차례로 자른다. 장 배지의 빗댐: 1 사원증과 마이크(첫 출근) · 2 똑같이 따라 하는 새 두 마리(닮은 소리) · 3 비탈을 굴러 구슬 색을 바꾸는 공(/ㅣ/ 앞에서) · 4 북채로 세게 친 북(세게) · 5 방석 하나만 남은 의자(자리가 하나) · 6 빈자리에 끼워지는 퍼즐 조각(덧나는 소리) · 7 하나로 합쳐지는 물방울(하나로) · 8 차례로 넘어지는 도미노와 온에어 등(생방송). 눈으로 확인한 것: 글자 · 숫자 없음(도미노 점은 무늬), 로고 없음.
- 다시 만들기(PowerShell, 저장소 루트): `powershell -NoProfile -ExecutionPolicy Bypass -File tools\gen.ps1 -Name anchors_oops -PromptFile tools\prompts\anchors_oops.txt -Out assets\raw\anchors_oops.png -Image assets\raw\anchors_idle.png -RefMode same` → `python tools/process_assets.py`.
