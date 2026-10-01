# 바깥과의 약속

이 게임에는 서버 API가 없다. 바깥과의 약속은 두 가지다: **교실 기기에 남는 저장 형식**(앞 판 기기와 다음 판 코드 사이)과 **선생님이 고치는 데이터 파일의 형식**(데이터와 엔진·화면 사이).

## 기기 저장 형식 (localStorage)

- 이름은 모두 `eumun-byeondong:` 접두사, 값은 `{ s: 형식 버전, … }` JSON. 지금 형식 버전은 2(1 → 2: 진행 장에 `fp`, `cur.open`, `cur.last`의 송출 모습을 더함).
- 형식 버전이 다르거나 JSON이 망가졌으면 그 값은 기본값으로 시작한다(진행 장은 '없음'). 오류를 띄우지 않는다.
- **저장 모양을 바꾸면 형식 버전을 올린다.** 올리면 교실 기기의 옛 값은 모두 조용히 기본값이 되고 진행 중이던 장은 버려진다. 올리지 않고 필드를 바꾸면 옛 진행 장이 새 코드에서 엉뚱하게 복원될 수 있다.

| 이름 | 값 |
|---|---|
| `eumun-byeondong:settings` | `{ s, bgmOn, bgmVolume(0~1), sfxOn, sfxVolume(0~1), reduceMotion }` |
| `eumun-byeondong:selection` | `{ s, grade: 'm3'\|'h1', levels: { '1'…'8': 'basic'\|'advanced' } }` 마지막 선택 |
| `eumun-byeondong:seenHowto` | `{ s, seen: true }` 게임 방법을 연 적 |
| `eumun-byeondong:chapter` | `{ s, savedAt, run }` 진행 중인 장(기기에 하나) |

진행 장 `run`:

```
{ grade: 'm3'|'h1', ch: 1~8, level: 'basic'|'advanced', seed: 수|null,
  ids: [원고 id 7개, 감수 차례],
  guides: [그 장 지침 id 차례] | null,   // null = 지침 데이터가 없거나 지침이 없는 장(8장)
  phase: 'guide'|'review'|'reveal', guideDone: true|false,
  done: [{ id, result: 'onair'|'offrule'|'skip', sends, help: [1|2|3…], helped }],   // ids 차례대로
  cur: { corrections: [교정…], kinds: [신호 kind…], sends, help, helped, open: 0~3,
         last: { kind, at: [음절 번호], diff, reading, outOfRule: [교정 번호], n: 교정 수 | null } | null } | null,
  fp: 데이터 지문(8자리 16진) }
```

- `done[i].id === ids[i]`. `cur`는 감수 단계에만 있다(지금 원고 = `ids[done.length]`). 조항 공개 단계는 `done` 7개, `cur: null`.
- 지침이 없는 장(`GUIDES`에 그 장 키가 없음 — 8장): `guides`는 null, `phase: 'guide'`는 없다(감수부터, `guideDone: true`). 불러올 때 지침 목록이 적혀 있으면 버린다.
- 감수·조항 공개 단계면 `guideDone`은 true. `sends`는 `kinds.length`, `helped`는 `help`가 비지 않았는지와 같다(저장할 때 맞춰 적음).
- `help`는 도움으로 센 단계, `open`은 연 적 있는 가장 높은 도움 단계(0~3)다. '먼저 송출해 보세요'였던 ①은 `open`에만 들어가고 `help`에는 없다(다음 단계를 여는 데만 씀). `open`이 `help`의 가장 큰 값보다 작으면 저장할 때 맞춰 올린다.
- `last`는 마지막 송출의 모습이다: 신호 `kind`, 다른 음절 번호 `at`·수 `diff`, 그때 프롬프터에 보인 발음 `reading`(연음까지 읽은 것), 규칙 밖 교정 번호 `outOfRule`, 그때의 교정 수 `n`. 새로 고친 뒤 프롬프터·신호 배지·도움 ①은 이 모습 그대로 보인다. 송출 뒤 교정이 바뀌면(되돌리기·다시 감수·새 교정) 화면이 `n`을 null로, `outOfRule`을 []로 적는다 — 규칙 밖 표시와 감수 도장은 `n`이 지금 교정 수와 같을 때만 다시 보인다. 저장할 때 `n`이 교정 수와 다르면 null로 맞춘다.
- `fp`는 이 장의 판정이 기대는 데이터의 지문이다(`G.save.fingerprint(장, ids)` — FNV-1a 32비트를 키 차례와 상관없는 JSON에 건 값). 담는 것: 뽑힌 원고 7개의 `id`·`text`·`cuts`·`marks`·`pron`·`allowed`·`nonstandard`·`steps`, 그 장 지침마다 `id`·`blanks`(보기·정답·`members`)·`examples`. 저장할 때 지금 데이터로 적고, 불러올 때 다시 낸 값과 다르면 그 진행 장을 버린다(형태소 풀이·출처·지침 문장처럼 판정과 상관없는 것만 바뀌면 남는다).
- 교정 모양은 `js/core/rules.js` 머리 주석과 같다: `{ op: 'replace'|'delete'|'insert', at: { s, slot: 'on'|'gl'|'nu'|'co', k }, to? }`, 합침은 `{ op: 'merge', at: [자리, 자리], to }`.
- 저장할 때도 불러올 때도 같은 확인을 한다. 다음이면 그 진행 장을 버린다: 형식이 틀림, 원고 id가 지금 `SCRIPTS`에 없거나 그 장 원고가 아니거나 7개가 아니거나 겹침, 지침 id 차례가 지금 `GUIDES`와 다름, 뽑힌 원고가 지금 지침의 예시 원고임, 데이터 지문 `fp`가 다름, 단계와 `cur`·`done`이 맞지 않음. 원고나 지침 데이터를 고치면 교실 기기의 진행 장이 버려질 수 있다는 뜻이다.

## 데이터 파일 형식 (선생님이 고치는 곳)

### 원고 `js/data/scripts.js` → `window.SCRIPTS = [원고…]`

```
{ id: 표기와 같은 유일한 이름, ch: 장, text: 표기, morphs: 형태소 분석(사람이 읽는 것),
  cuts: [음절 사이 경계 — 'formal'|'content'|'space'|'sino'|null, 길이 = 음절 수 − 1],
  marks?: { lateralExc: [경계 번호] },            // 제20항 다만 자리
  pron: 표준 발음(장음 ː 포함), allowed?: [허용 발음],
  nonstandard?: [[흔하지만 표준이 아닌 발음, 조항]],
  steps: [[규칙 id, op, 자리('0.co'·'1.on'·'0.co1'), 음운]…],   // 풀이 과정, 교정 하나 = 규칙 하나
  count: [표기의 음운 수, 발음의 음운 수], change: { replace?, delete?, insert?, merge? },
  articles: [조항 id], src: [출처 — 원문 대조본의 조항·쪽], trap?: 'link'|'exception'|'nonstandard' }
```
- 모든 원고는 엔진 대조를 통과해야 한다(엔진 도출 = `pron`, `steps` 모두 규칙 안, `count`·`change`가 데이터와 같음).
- 조항 id는 `'8'`·`'9'`·`'12'`·`'13'`·`'14'`·`'15'`·`'18'`·`'19'`·`'20'`·`'20-다만'`·`'21'` 꼴이고 `ARTICLES`에 있어야 한다.

### 감수 지침 `js/data/guides.js` → `window.GUIDES = { 장: [지침…] }`

```
{ id: 장 안에서 유일, articles: [이 지침이 공개하는 조항 id], rules: [다루는 규칙 id](연음 지침은 []),
  text: { m3: '받침 {b1}은 …', h1: '…' },                  // {빈칸 id} 자리 = blanks의 키
  blanks: { b1: { options: [보기 2~4개, 빗금 표기], answer: 정답 번호(0부터), members?: [조건 낱말…] } },
  examples: [{ id: 원고 id, trap?: 함정 원고면 그 종류, shows: { 빈칸 id: 조건 낱말 | [조건 낱말…] } }] }
```
- 조건 낱말: `coda:X`(종성 /X/ 하나), `coda2:XY`(겹받침), `onset:X`(받침 뒤 초성), `before:X`(받침 /X/ + 뒤 /ㄹ/), `cut:K`(받침과 빈 초성 사이 경계 종류), `gap:K`(받침 뒤 경계 종류 — 뒤 초성이 있어도), `link`(연음 자리 있음), `exc`(제20항 다만 표시), `stem`·`adn`·`sai`·`cexc`·`noins`(낱말 표시가 있음), `cv:XY`(한 형태소 안 초성 + 단모음 — 잔디), `vowelI`(받침 뒤 빈 초성의 /ㅣ/·/j/). 원고의 처음 상태에서 엔진이 확인한다(`js/core/rules.js` 머리 주석).
- 예시들의 `shows`가 빈칸마다 `members`를 모두 덮어야 한다. 예시 원고는 그 장 뽑기에서 빠진다. `GUIDES`에 키가 없는 장(8장)은 지침 없이 감수부터 한다.
- 보기는 화면에 데이터 차례대로 나온다 — 한 장의 정답이 한 자리에 몰리지 않게 보기 차례를 정한다. 지침 문장에 빈칸 정답을 그대로 쓰지 않는다.

### 조항 원문 `js/data/articles.js` → `window.ARTICLES = { 조항 id: { name, parts, src } }`

`parts`는 `{ text, examples? }` 또는 `{ label: '(1)', examples }`의 목록, 예시는 `[표기, 발음]`(제21항은 `[표기, 발음, 틀린 발음]`). 문장은 현행 고시(문화체육관광부 고시 제2017-13호) 원문 그대로다.

### 화면 문구 `js/data/text.js` → `window.TEXT`

화면별 묶음(app·common·chapters·levels·start·settings·howto·guide·review·signal·help·reveal·result·terms·shortTerms·rotate·images). 학년마다 다른 문구는 `{ m3, h1 }`, 값을 채울 자리는 `{이름}`. 신호 문구의 키는 엔진 신호 kind와 같다(`onair`·`offrule`·`diff`·`nonstandard`). 문구를 고친 뒤 `npm test -- text`와 글꼴 다시 만들기.

### 음원 `assets/audio/` (파일 이름 약속)

배경 음악 `bgm-review.mp3`(감수 지침·감수)·`bgm-result.mp3`(조항 공개·결과), 효과음 `sfx-mark`·`sfx-send`·`sfx-onair`·`sfx-offrule`·`sfx-diff`·`sfx-nonstandard`·`sfx-guide-ok`·`sfx-guide-wrong`(.mp3). 모두 소문자. 없어도 게임은 조용히 돈다.
