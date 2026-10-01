'use strict';
// 음운 규칙 엔진 G.rules — 판정의 진실은 여기에만 둔다. 화면(DOM)을 쓰지 않는 순수 함수만 둔다.
//   불러오는 순서: js/core/util.js → js/data/sounds.js · scripts.js → js/core/hangul.js → 이 파일.
//   Node 점검: tests/check-rules.mjs. 모든 함수는 받은 값을 바꾸지 않는다(상태를 바꾸는 함수는 새 상태를 돌려준다).
//   화면 문장을 만들지 않는다(오류 메시지는 개발자용). 규칙 이름·조항 문구는 화면 문구 파일이 id로 찾는다.
//
// ── 감수 상태 State (JSON으로 옮길 수 있는 평범한 값) ────────────────────
//   {
//     syl: [{ on: 자음|null,          // 초성. null = 빈 자리(표기의 초성 'ㅇ'은 음운이 아니다)
//             gl: 'j'|'w'|null,        // 반모음(결정 0004: 음운으로 센다)
//             nu: 단모음|'ㅢ'|null,    // 중성. 'ㅢ'는 나누지 않는 이중 모음(음운 2개로 셈, 결정 0009)
//             co: [자음 0~2개] }],     // 종성. 겹받침은 두 자음(닭: ['ㄹ','ㄱ']), 쌍받침 ㄲ·ㅆ은 한 음운
//     cuts: [형태소 경계…],             // 음절 사이(길이 = 음절 수 − 1): 'formal'(뒤가 형식 형태소: 조사·어미·접미사)
//                                      //   | 'content'(뒤가 실질 형태소: 합성어·파생어의 어근) | 'space'(띄어 쓴 두 단어)
//                                      //   | 'sino'(한자어 구성 경계: 교과서 설명에 쓰이는 곳만 — 제20항 다만의 '2음절 한자어 + 한자'(결정 0007),
//                                      //     제26항 자리 갈+등·결+단(결정 D4-3))
//                                      //   | null(경계 아님·표시 안 함). 화면은 모두 '+'로 그린다.
//     marks: {                          // 낱말 표시(소리만으로는 알 수 없는 문법 정보). 모두 생략 가능
//       lateralExc: [경계 번호],         //   그 음절 사이의 'ㄴㄹ'은 유음화 대신 ㄹ→[ㄴ](제20항 다만)
//       stem:       [경계 번호],         //   경계 앞이 용언 어간, 뒤가 어미(경계 종류는 그대로 formal — 결정 D4-2). 제24·25항, 제11항 다만
//       sai:        [경계 번호],         //   관형격 사잇소리가 나는 합성어 경계(표기에 ㅅ 없음, 제28항 — 결정 D4-6)
//       noIns:      [경계 번호],         //   ㄴ 첨가 조건이 맞아도 첨가하지 않는 자리(제29항 다만·교과서 유의 낱말 — 결정 D6-5)
//       adn:        [음절 번호],         //   그 음절 받침 /ㄹ/이 관형사형 어미 -(으)ㄹ(-(으)ㄹ로 시작하는 어미 포함)의 /ㄹ/(제27항)
//       clusterExc: [음절 번호] }        //   그 음절 겹받침 /ㄼ/은 앞 /ㄹ/을 뺌(제10항 다만: 밟-, 넓-죽·넓-둥글)
//   }
//   모르는 표시 이름·범위 밖 번호는 start가 오류를 던진다. 음절이 지워지면(tidy) 표시도 새 번호로 옮기고, 사라진 음절·경계
//   (두 경계가 하나가 되면 경계 종류를 남기지 않은 쪽)의 표시는 버린다.
//   상태는 표기의 음절 자리를 그대로 둔다. 연음은 교정이 아니라 읽을 때 저절로 일어난다(reading, 결정 0002).
//
// ── 자리 Pos ─────────────────────────────────────────────────────────────
//   { s: 음절 번호, slot: 'on'|'gl'|'nu'|'co', k: 종성 안 번호(0|1, co만) }   글로 적으면 '0.co' · '0.co1' · '1.on'
//
// ── 교정 Correction (교정 부호 넷 = 변동 네 갈래, 결정 0002) ────────────
//   { op: 'replace', at: Pos, to: 음운 }   고침표(교체)
//   { op: 'delete',  at: Pos }             뺌표(탈락)
//   { op: 'insert',  at: Pos(빈 자리), to } 넣음표(첨가)
//   { op: 'merge',   at: [Pos, Pos], to }  합침표(축약, 게임 설정) — 이웃한 두 음운이 하나로
//   교정 하나 = 규칙 적용 하나(결정 0009). 지금 상태에서 applicable()이나 allowable()이 내놓는 후보와 같아야 '규칙 안'.
//   모양이 틀린 교정은 오류를 던진다. 모양은 맞지만 할 수 없는 교정(빈 자리 빼기 등)은 상태를 바꾸지 않고 '규칙 밖'이 된다(오답을 막지 않는다).
//
// ── 원고 Script (js/data/scripts.js) ─────────────────────────────────────
//   { id, ch: 장, text: 표기, morphs: 형태소 분석(사람이 읽는 것), cuts, marks?, pron: 표준 발음(장음 ː 포함),
//     allowed?: [허용 발음], nonstandard?: [[흔하지만 표준이 아닌 발음, 조항]], steps: 풀이 과정 [[규칙, op, 자리, 음운]],
//     count: [표기의 음운 수, 발음의 음운 수], change: { replace?, delete?, insert?, merge? }, articles: [조항], src: [출처], trap?: 함정 종류 }
//   장음(ː)은 낱말 정보다. 엔진은 장음을 도출하지 않고, 발음을 비교할 때 장음과 띄어쓰기를 지운다(strip).
//   함정 종류 trap: 'link'(연음 — 교정 없음이 정답) | 'exception'(다만 낱말) | 'nonstandard'(흔한 비표준 발음이 있음)
//     | 'blocked'(조건이 맞지 않아 변동 없음 — 교정 없음이 정답: 잔디·안기다·송별연, 결정 D0-2)
//     | 'contrast'(변동은 있지만 이 장 부호가 아닌 다른 부호가 정답: 7장 놓아·많아는 합침표가 아니라 뺌표, 결정 D0-2)
//   장 배정은 누적(결정 D0-1): N장 원고는 1~N장 규칙만 쓴다(RULES[id].ch ≤ 원고 ch — 점검이 확인).
//
// ── 규칙 Rule id (RULES[id] = { op, article: 대표 조항, ch: 배우는 장, allowed?: 허용 규칙 }) ──
//   후보마다 실제 조항은 applicable이 정한다(check 결과의 article). 조항 id는 js/data/articles.js 키와 같다.
//   1장 'coda'        음절의 끝소리 규칙: 어말·자음 앞(제9항), 모음으로 시작하는 실질 형태소·다음 단어 앞(제15항),
//                     받침 ㅎ + ㄴ 의 ㅎ→ㄷ('12' = 제12항 3, 결정 0010: 놓는[논는] = 교체 2회). 홑받침만.
//                     받침 /ㅈ/ + /ㅎ/(형식 형태소·경계 없음 사이)에는 걸리지 않는다 — 곧바로 거센소리되기(결정 D7-2: 꽂히다)
//   2장 'r-nasal-exc' ㄹ→ㄴ, 제20항 다만(낱말 예외 표시가 있을 때만)
//       'r-nasal'     ㄹ의 비음화: 받침 ㅁ·ㅇ·ㄱ·ㅂ 뒤 ㄹ→ㄴ(제19항·붙임)
//       'nasal'       비음화: 받침 ㄱ·ㄷ·ㅂ + ㄴ·ㅁ → 같은 위치의 비음(제18항). 홑받침만(겹받침은 단순화가 먼저: 흙만)
//       'lateral'     유음화: ㄴ이 ㄹ의 앞이나 뒤에서 ㄹ(제20항). 첨가된 /ㄴ/에도(제29항 [붙임 1] 솔잎 = 첨가 ▸ 유음화, 결정 D6-4)
//   3장 'palatal'     구개음화(제17항, 고침): 받침 /ㄷ·ㅌ/(겹받침 ㄾ의 /ㅌ/) + 형식 형태소(formal)의 빈 초성 /ㅣ/(반모음 없음)
//                     → 받침 자리를 /ㅈ·ㅊ/으로(결정 D3-1, 굳이 0.co — 읽을 때 연음). [붙임]: formal 경계 뒤 초성 /ㅌ/ + /ㅣ/이고
//                     앞 음절 받침이 없으면(합쳐서 생긴 /ㅌ/, 굳히다 1.on) → /ㅊ/. 한 형태소 안(잔디)·실질 형태소 앞(곧이어)·/ㅣ/가 아닌 모음 앞은 없음
//   4장 'tense'       된소리되기(제23항): 받침 /ㄱ·ㄷ·ㅂ/(끝소리 규칙 뒤의 대표음 — 깎다는 /ㄲ/→/ㄱ/이 먼저, 결정 D4-1) 또는 겹받침
//                     ㄳ·ㄺ·ㄿ·ㅄ(ㄼ은 clusterExc가 있을 때만) + 뒤 초성 /ㄱ·ㄷ·ㅂ·ㅅ·ㅈ/ → 된소리(고침, 뒤 초성). 띄어쓰기 사이는 아님
//       'tense-stem'  stem 경계의 어간 받침 /ㄴ·ㅁ/·ㄵ·ㄻ(조항 '24') / ㄼ·ㄾ('25', clusterExc 아님) + /ㄱ·ㄷ·ㅅ·ㅈ/(안기다는 stem 없음)
//       'tense-sino'  sino 경계의 받침 /ㄹ/ + /ㄷ·ㅅ·ㅈ/(제26항 한자어, 허허실실은 경계 없음)
//       'tense-adn'   adn 표시 음절의 받침 /ㄹ/ + /ㄱ·ㄷ·ㅂ·ㅅ·ㅈ/(제27항, 띄어 써도: 할 것을, 할수록)
//       'tense-cmp'   sai 표시 경계 + /ㄱ·ㄷ·ㅂ·ㅅ·ㅈ/(제28항 사잇소리 합성어, 볶음밥은 표시 없음)
//       'tense-link'  겹받침 뒤 /ㅅ/ + 형식 형태소의 빈 초성 → 받침 자리 /ㅅ/→/ㅆ/(제14항 괄호, 값을 0.co1 → [갑쓸], 결정 D4-7)
//   5장 'simplify'    자음군 단순화(뺌): 겹받침(ㄶ·ㅀ 빼고)이 어말·자음 앞(조항 '10' 뒤를 뺌: ㄳ·ㄵ·ㄼ·ㄽ·ㄾ·ㅄ / '11' 앞을 뺌: ㄺ·ㄻ·ㄿ),
//                     실질 형태소·다음 단어의 모음 앞('15', 제15항 [붙임]: 닭 앞에·값어치). 다만: clusterExc의 ㄼ은 앞 /ㄹ/('10-다만'),
//                     stem 경계의 ㄺ + /ㄱ·ㄲ/은 뒤 /ㄱ/('11-다만', 맑게). 형식 형태소의 모음 앞(연음)·/ㅎ/ 앞(거센소리되기)에는 없음.
//                     된소리 조건을 없애는 뺌은 된소리되기 뒤에만(결정 D5-1: 넓다·맑게는 된소리 ▸ 뺌. 값지다·맑다·읊다는 어느 차례든)
//       'h-drop'      ㅎ 탈락(뺌): 받침 /ㅎ/(ㄶ·ㅀ의 /ㅎ/) + 형식 형태소의 빈 초성('12-4': 낳은·놓아), ㄶ·ㅀ + /ㄴ/('12-3' [붙임]: 않네·뚫는,
//                     결정 D5-3). 홑받침 /ㅎ/ + /ㄴ/은 끝소리 규칙(놓는, 결정 0010)
//   6장 'n-insert'    ㄴ 첨가(제29항, 넣음): 받침 + content·space 경계 + 빈 초성의 /ㅣ/·/j/ → 뒤 초성 /ㄴ/. noIns 자리는 없음
//                     (송별연·금요일·곧이어·값있는)
//       'glide-insert' 반모음 첨가(제22항, 허용 규칙 — applicable에 없고 allowable에만): 받침 없는 /ㅚ·ㅣ·ㅟ·ㅐ·ㅔ/ + formal 경계의
//                     빈 초성 /ㅓ·ㅗ/ → 반모음 자리 /j/(피어[피여]·아니오[아니요]). 원칙(교정 없음)도 허용(allowed)도 온에어(결정 D6-2)
//   7장 'aspirate'    거센소리되기(제12항 1·[붙임 1], 합침 → 초성 자리, 조항 '12-1'): 받침 /ㅎ/(ㄶ·ㅀ의 /ㅎ/) + /ㄱ·ㄷ·ㅈ/,
//                     받침 /ㄱ·ㄷ·ㅂ·ㅈ/(겹받침의 뒤 자음 포함: 밝히다 0.co1) + /ㅎ/ → /ㅋ·ㅌ·ㅍ·ㅊ/. /ㅈ/+/ㅎ/은 formal·null 경계만
//                     (띄어 쓴 낮 한때는 끝소리 규칙 ▸ 합침, [붙임 2]). /ㅅ·ㅊ·ㅌ/ + /ㅎ/은 끝소리 규칙이 먼저(옷 한 벌·숱하다)
//   닫혀 있는 것(findings F4·D7-4·D7-1): 어말 받침 /ㅎ/(히읗), /ㅎ/ + /ㅅ/(닿소), 7장 모음 쪽(반모음화·모음 축약)
//   표준 발음 도출(derive)은 ORDER 순서 → 왼쪽 자리부터 applicable만 적용한다(허용 규칙은 적용하지 않음 → 원칙 발음).
//   어떤 순서로 규칙만 적용해도 같은 발음에 닿는지는 점검이 확인한다.
//
// ── 허용 규칙 후보 allowable(상태) → [후보…] ─────────────────────────────
//   applicable과 같은 모양({ rule, article, op, at, to }). 지금은 'glide-insert'뿐. check·broadcast·touchedLink는 규칙 안으로 보고,
//   derive·similarCell·점검의 '모든 규칙 순서'에는 쓰지 않는다.
//
// ── 송출 판정 broadcast의 신호 kind (네 가지, 결정 0002) ─────────────────
//   'onair'       발음이 표준(허용 포함)과 같고 교정이 모두 규칙 안
//   'offrule'     발음은 맞지만 규칙 밖 교정이 섞임
//   'diff'        발음이 표준과 다름(diff = 다른 음절 수, at = 프롬프터 발음에서 다른 음절 번호)
//   'nonstandard' 원고의 nonstandard 목록에 있는 발음(흔하지만 표준이 아님)
//
// ══ 판 진행(구현 2단계, 명세 §17) — 아래도 모두 순수 함수(받은 값을 바꾸지 않고 JSON 값만 돌려줌) ══
//
// ── 원고 갈래 kindOf(원고) (명세 §6) ─────────────────────────────────────
//   함정이면 함정 종류('link'|'exception'|'nonstandard'|'blocked'|'contrast'). 아니면 풀이 과정에서 그 장의 규칙(RULES[id].ch = 원고 ch)
//   가운데 첫째(넓다 = 된소리 ▸ 뺌 → 5장 'simplify'), 없으면 'coda'가 아닌 첫 규칙 id(짓는·놓는 → 'nasal', 막론 → 'r-nasal',
//   물난리 → 'lateral', 6장 콧날 → 'nasal'), 끝소리 규칙만 쓰면 'coda'. 풀이가 없으면 처음 상태의 허용 규칙(피어 → 'glide-insert'),
//   그것도 없으면 null.
//
// ── 원고 뽑기 draw(장, 원고 풀, 뺄 id 목록, 시드) → 원고 id 7개(차례 = 감수 차례) (명세 §6, 결정 0012) ──
//   원고 풀에서 그 장 원고만 쓰고, 뺄 id(그 장 지침 예시 = exampleIds(지침들))는 뽑지 않는다.
//   1장: 연음 함정('link') 2 + 일반('coda' 갈래) 5. 일반에 제15항 원고(articles에 '15')가 남아 있으면 적어도 1개.
//   2장: 다만('exception') 1 + 감기('nonstandard') 1 + 일반 5('nasal'·'r-nasal'·'lateral' 갈래가 적어도 1개씩).
//   3~7장(결정 D0-2): 함정 2(남은 함정 종류가 둘 이상이면 서로 다른 종류) + 일반 5. 일반에 다음 갈래가 적어도 1개씩(* = 남아 있을 때만):
//     3장 'palatal' · 4장 'tense', 'tense-stem', ('tense-sino'|'tense-adn'|'tense-cmp'), 'tense-link'* · 5장 'simplify', 'h-drop'
//     · 6장 'n-insert', 'glide-insert'*, 제30항 원고(articles에 '30')* (6장 일반 갈래 = 'n-insert'·'glide-insert'·'nasal') · 7장 'aspirate'.
//   8장(결정 D8-1, 지침 없음): 예외 함정('exception') 1(남아 있을 때만 — 없으면 일반 7) + 일반(함정 아닌 8장 원고 모두)에
//     탈락이 먼저(첫 단계 op 'delete') · 끝소리 규칙이 먼저(첫 단계 'coda') · 축약이 먼저(첫 단계 'aspirate') ·
//     첨가 ▸ 비음화('n-insert' 뒤에 'nasal')가 적어도 1개씩(앞에서 뽑은 원고가 이미 채우면 건너뜀 — 홑이불은 둘을 채움).
//   7개의 차례와 함정 위치는 무작위. 시드 = 수(같은 시드 → 같은 결과) 또는 () => [0, 1) 함수.
//   조건을 채울 수 없으면(원고가 모자람) 오류를 던진다 — 데이터 잘못(지침 예시를 너무 많이 뺀 것 포함). 뽑기 조건이 없는 장도 오류.
//   exampleIds(한 장의 지침들) → 예시 원고 id 목록(겹치면 한 번). 지침이 없으면(undefined) [] — GUIDES 없이도 뽑힌다.
//
// ── 쌍둥이 원고 twins(원고, 원고 풀, 뺄 id) → [id…] · twin(…) → id | null (명세 §8-4, 결정 0006 대결에서도 씀) ──
//   같은 장, 풀이 과정의 규칙 차례와 함정 종류가 같고, 표준 발음(strip)이 다른 원고. 뺄 id(이번에 뽑힌 7개)와 자기는 빼고,
//   뺄 원고 가운데 어느 것과 표준 발음이 같은 원고도 뺀다(도움 ③이 뽑힌 원고의 답을 보이지 않게 — 낮이 뽑히면 낯·낱 아님).
//   twin은 원고 풀 차례로 첫째. 후보가 없으면 null(감기 등).
//
// ── 연음 자리 linkSites(상태) → [Pos…] · touchedLink(원고, 교정들) → true|false (명세 §8-3-4) ──
//   연음 자리 = 뒤 음절이 빈 초성이고 사이 경계가 'formal'·null이라 읽을 때 저절로 옮겨지는 종성(겹받침은 두 자리 모두,
//   /ㅇ/은 옮기지 않으므로 아님). 옷이 → 0.co, 닭이 → 0.co·0.co1, 불놀이 → 1.co(놀|이). 겉옷·옷 위(실질·띄어쓰기)는 아님.
//   touchedLink: 교정을 차례로 적용하면서 그때의 연음 자리 받침을 고침표·뺌표로 실제로 바꾼 교정이 있으면 true.
//   단 그때 규칙 안인 교정은 건드린 것이 아니다(결정 D3-1·D4-7): 굳이 /ㄷ/→/ㅈ/, 값을 /ㅅ/→/ㅆ/, 낳은·놓아 /ㅎ/ 뺌.
//
// ── 닮은 칸 similarCell(상태, 자리) → 음운 | null (명세 §8-2) ──────────────
//   지금 상태에서 그 자리에 걸리는 규칙(applicable)의 결과 음운. 둘 이상이면 ORDER 앞의 규칙. 걸리는 규칙이 없으면 null
//   (감기 /ㅁ/ → null, 막론 /ㄱ/ 먼저 → null, 막론 /ㄹ/ → 'ㄴ'). 기본 단계에서만 쓰는 것은 화면이 정한다.
//
// ── 감수 지침 GUIDES (js/data/guides.js, window.GUIDES = { 장: [지침…] }) (명세 §7) ──
//   { id: 장 안에서 유일, articles: [이 지침이 공개하는 조항 id(원고 articles와 같은 표기)],
//     rules: [이 지침이 다루는 규칙 id — 일반 예시는 이 가운데 하나 이상을 씀(any-of). 규칙이 없는 지침(연음)은 []],
//     text: { m3: '받침 {b1}은 …', h1: '…' },          // {빈칸 id} 자리. 두 학년의 빈칸 id 집합 = blanks의 키
//     blanks: { b1: { options: [보기 2~4개(빗금 표기)], answer: 정답 보기 번호(0부터), members?: [조건 낱말…] } },
//     examples: [{ id: 원고 id, trap?: 함정 원고면 그 종류(원고 trap과 같음), shows: { 빈칸 id: 조건 낱말 | [조건 낱말…] } }] }
//   members = 예시들이 모두 보여야 할 조건, shows = 그 예시가 보이는 members 낱말.
//
// ── 조건 낱말(members·shows의 어휘 — 이것만 쓴다) hasCondition(원고, 낱말) → true|false ──
//   원고의 처음 상태(start)에서 엔진으로 확인한다. 모르는 낱말은 오류.
//   'coda:X'   어떤 음절 종성이 /X/ 하나(홑받침·쌍받침)       'coda2:XY' 어떤 음절 종성이 겹받침 X+Y
//   'onset:X'  받침 바로 뒤 음절의 초성이 /X/                 'before:X' 받침 /X/ 하나 + 뒤 초성 /ㄹ/(제19항)
//   'cut:K'    받침과 빈 초성 사이 경계가 K('formal'|'content'|'space'|'sino')
//   'link'     연음 자리가 있음(linkSites)                    'exc'      제20항 다만 표시(marks.lateralExc)가 있음
//   'gap:K'    받침 뒤 경계가 K(뒤 초성이 있어도 — 갈+등 'gap:sino', 문+고리 'gap:content', 할 것을 'gap:space')
//   'stem'     어간 + 어미 표시(marks.stem)가 있음            'adn'      관형사형 -ㄹ 표시(marks.adn)가 있음
//   'sai'      사잇소리 표시(marks.sai)가 있음                'cexc'     제10항 다만 겹받침 표시(marks.clusterExc)가 있음
//   'noins'    ㄴ 첨가 없음 표시(marks.noIns)가 있음
//   'cv:XY'    한 형태소 안(첫 음절이거나 앞 경계가 null) 초성 /X/ + 단모음 /Y/(반모음 없음) — 잔디 'cv:ㄷㅣ'(구개음화가 없는 자리)
//   'vowelI'   받침 뒤 빈 초성의 /ㅣ/ 또는 반모음 /j/(이·야·여·요·유 — 제29항 ㄴ 첨가의 모음 조건, 경계 종류는 보지 않음)
//
// ── 지침 채점 gradeGuides(지침들, 고른 값) → 틀린 칸 수 (명세 §7-4) ──────────
//   고른 값 picks = { 지침 id: { 빈칸 id: 고른 보기 번호 } }. 고르지 않은 칸도 틀린 칸으로 센다. 어느 칸인지는 돌려주지 않는다.
//
// ── 지침 예시 검증 checkGuide(지침, 원고 풀) · checkGuides(한 장의 지침들, 원고 풀) → [문제 문장…] (점검용, 명세 §7-3) ──
//   빈 목록 = 통과. 모양이 틀려도 던지지 않는다. 확인하는 것: 예시 id가 원고에 있음 / 일반 예시는 원고 풀이 과정이 지침 rules를
//   하나 이상 씀(풀이가 없는 일반 원고는 원고 갈래 — 피어 'glide-insert'. 함정 원고면 trap을 적어야 함) / 함정 예시는 원고 trap과 같음 / 빈칸마다 members를 예시 shows가 모두 덮음 /
//   shows 낱말은 그 빈칸 members에 있고 원고에 실제로 있음 / 낱말이 어휘 안 / rules가 엔진 규칙 / articles가 있음 /
//   보기 2~4개·답 번호가 보기 안 / 두 학년 문장의 빈칸 자리 = blanks. checkGuides는 장 안의 지침 id가 겹치지 않는지도 본다.
//
// ── 공개할 조항 revealArticles(장의 지침들, 뽑힌 원고들) → [조항 id…] (명세 §9) ──
//   지침 articles와 원고 articles의 합집합. 차례는 조항 번호 순, 하위 번호는 번호 순으로 그 조항 바로 뒤('12' < '12-1' < '12-4'),
//   다만은 그 조항(과 하위 번호) 뒤('10' < '10-다만' < '11', '20' < '20-다만').
//
// ── 원고 결과 scriptResult(송출 기록) → 'onair' | 'offrule' | 'skip' (명세 §8-5) ──
//   송출 기록 = 신호 kind 목록(또는 broadcast 결과 목록). 온에어가 한 번이라도 → 'onair'(온에어),
//   성공 없이 마지막이 'offrule' → 'offrule'(규칙 밖), 그 밖(송출 안 함, 마지막이 다름·표준 아님) → 'skip'(넘김).
//
// ── 장 정답 합계 chapterTotals(원고들) → { change: { replace, delete, insert, merge }, count: [표기 합, 발음 합] } (명세 §10) ──
//   원고 데이터의 change·count 합(정답 기준). 학생이 한 교정은 세지 않는다.
G.rules = (function () {
  const S = window.SOUNDS, H = G.hangul;
  const byId = {};
  S.consonants.concat(S.vowels, S.glides).forEach((s) => { byId[s.id] = s; });
  const DIPH = S.diphthongs;
  const JOIN_V = {};
  Object.keys(DIPH).forEach((k) => { JOIN_V[DIPH[k].join('')] = k; });
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const SLOTS = ['on', 'gl', 'nu', 'co'];
  const OPS = ['replace', 'delete', 'insert', 'merge'];
  const CUT_RANK = { space: 3, content: 2, sino: 2, formal: 1 }; // sino는 판정에 쓰지 않는다(한자음 받침은 ㄱㄴㄹㅁㅂㅇ뿐이라 끝소리 규칙이 걸리지 않음)

  // op = 교정 부호, article = 대표 조항(후보마다 실제 조항은 applicable이 정함), ch = 그 규칙을 배우는 장, allowed = 허용 규칙(반드시 걸리지 않음)
  const RULES = {
    'coda': { op: 'replace', article: '9', ch: 1 },
    'r-nasal-exc': { op: 'replace', article: '20-다만', ch: 2 },
    'r-nasal': { op: 'replace', article: '19', ch: 2 },
    'nasal': { op: 'replace', article: '18', ch: 2 },
    'lateral': { op: 'replace', article: '20', ch: 2 },
    'palatal': { op: 'replace', article: '17', ch: 3 },
    'tense': { op: 'replace', article: '23', ch: 4 },
    'tense-stem': { op: 'replace', article: '24', ch: 4 },
    'tense-sino': { op: 'replace', article: '26', ch: 4 },
    'tense-adn': { op: 'replace', article: '27', ch: 4 },
    'tense-cmp': { op: 'replace', article: '28', ch: 4 },
    'tense-link': { op: 'replace', article: '14', ch: 4 },
    'simplify': { op: 'delete', article: '10', ch: 5 },
    'h-drop': { op: 'delete', article: '12-4', ch: 5 },
    'n-insert': { op: 'insert', article: '29', ch: 6 },
    'glide-insert': { op: 'insert', article: '22', ch: 6, allowed: true },
    'aspirate': { op: 'merge', article: '12-1', ch: 7 },
  };
  const ORDER = ['coda', 'r-nasal-exc', 'r-nasal', 'nasal', 'lateral',
    'palatal', 'tense', 'tense-stem', 'tense-sino', 'tense-adn', 'tense-cmp', 'tense-link', 'simplify', 'h-drop', 'n-insert', 'aspirate', 'glide-insert'];
  // 음절의 끝소리 규칙: 대표음(제9항). 받침 ㅎ은 여기 없다(ㄴ 앞만 따로, 결정 0010).
  const REP = { 'ㄲ': 'ㄱ', 'ㅋ': 'ㄱ', 'ㅅ': 'ㄷ', 'ㅆ': 'ㄷ', 'ㅈ': 'ㄷ', 'ㅊ': 'ㄷ', 'ㅌ': 'ㄷ', 'ㅍ': 'ㅂ' };
  const R_NASAL_AFTER = ['ㅁ', 'ㅇ', 'ㄱ', 'ㅂ'];
  // 된소리(제23~28항): 예사소리 → 된소리. 거센소리(제12항 1·[붙임 1]): 예사소리 → 거센소리
  const TENSE = { 'ㄱ': 'ㄲ', 'ㄷ': 'ㄸ', 'ㅂ': 'ㅃ', 'ㅅ': 'ㅆ', 'ㅈ': 'ㅉ' };
  const ASP = { 'ㄱ': 'ㅋ', 'ㄷ': 'ㅌ', 'ㅂ': 'ㅍ', 'ㅈ': 'ㅊ' };
  // 겹받침(종성 두 자음을 이어 쓴 열쇠): 제23항 된소리를 일으키는 것(ㄳ·ㄺ·ㄿ·ㅄ — ㄼ은 제10항 다만 표시가 있을 때만),
  // 제24항(ㄵ·ㄻ)·제25항(ㄼ·ㄾ) 어간 받침, 자음군 단순화에서 뒤를 빼는 것(제10항)·앞을 빼는 것(제11항)
  const T23_CLUSTER = ['ㄱㅅ', 'ㄹㄱ', 'ㄹㅍ', 'ㅂㅅ'];
  const T24_CLUSTER = ['ㄴㅈ', 'ㄹㅁ'];
  const T25_CLUSTER = ['ㄹㅂ', 'ㄹㅌ'];
  const DROP_BACK = ['ㄱㅅ', 'ㄴㅈ', 'ㄹㅂ', 'ㄹㅅ', 'ㄹㅌ', 'ㅂㅅ'];
  const DROP_FRONT = ['ㄹㄱ', 'ㄹㅁ', 'ㄹㅍ'];
  // 반모음 첨가(제22항, 허용): 앞 음절 모음 · 뒤 음절 모음
  const GLIDE_BEFORE = ['ㅚ', 'ㅣ', 'ㅟ', 'ㅐ', 'ㅔ'], GLIDE_AFTER = ['ㅓ', 'ㅗ'];
  // 낱말 표시(marks): 경계 번호를 받는 것과 음절 번호를 받는 것
  const MARK_GAP = ['lateralExc', 'stem', 'sai', 'noIns'], MARK_SYL = ['adn', 'clusterExc'];

  const slash = (id) => '/' + id + '/';
  const strip = (p) => String(p).replace(/[ː\s]/g, '');
  const isConsonant = (id) => !!byId[id] && byId[id].sea === 'consonant';
  const isGlide = (id) => !!byId[id] && byId[id].sea === 'glide';
  const isNucleus = (id) => (!!byId[id] && byId[id].sea === 'vowel') || id in S.unsplit;
  const isSound = (id) => !!byId[id] || id in S.unsplit;
  // 같은 조음 위치의 비음(위치는 그대로, 방법만 닮음)
  const nasalOf = (id) => {
    const c = byId[id];
    const n = S.consonants.find((x) => x.place === c.place && x.manner === 'nasal');
    return n ? n.id : null;
  };
  const isPlainStop = (id) => isConsonant(id) && byId[id].manner === 'stop' && byId[id].strength === 'plain';

  // ── 자리 ──────────────────────────────────────────────
  function pos(x) {
    if (typeof x === 'string') {
      const m = /^(\d+)\.(on|gl|nu|co)([01])?$/.exec(x);
      if (!m) throw new Error('자리 모양이 틀림: ' + x);
      return { s: +m[1], slot: m[2], k: m[3] ? +m[3] : 0 };
    }
    if (!x || typeof x.s !== 'number' || SLOTS.indexOf(x.slot) < 0) throw new Error('자리 모양이 틀림: ' + JSON.stringify(x));
    return { s: x.s, slot: x.slot, k: x.slot === 'co' ? (x.k || 0) : 0 };
  }
  const samePos = (a, b) => a.s === b.s && a.slot === b.slot && a.k === b.k;
  function get(state, p) {
    const y = state.syl[p.s];
    if (!y) return null;
    return p.slot === 'co' ? (y.co[p.k] || null) : (y[p.slot] || null);
  }
  // 음운 차례(이웃 판단용): 음절마다 on · gl · nu · co0 · co1 중 있는 것만
  function order(state) {
    const out = [];
    state.syl.forEach((y, s) => {
      if (y.on) out.push({ s, slot: 'on', k: 0 });
      if (y.gl) out.push({ s, slot: 'gl', k: 0 });
      if (y.nu) out.push({ s, slot: 'nu', k: 0 });
      y.co.forEach((_, k) => out.push({ s, slot: 'co', k }));
    });
    return out;
  }

  // ── 원고 → 처음 상태 ──────────────────────────────────
  function start(script) {
    if (!script || typeof script.text !== 'string' || !script.text.trim()) throw new Error('원고 표기가 없음');
    const syl = [], spaceGaps = [];
    for (const ch of script.text) {
      if (ch === ' ') { if (syl.length) spaceGaps.push(syl.length - 1); continue; }
      const p = H.split(ch);
      if (!p) throw new Error('한글 음절이 아님: ' + ch + ' (' + script.text + ')');
      const d = DIPH[p.v];
      syl.push({ on: p.on, gl: d ? d[0] : null, nu: d ? d[1] : p.v, co: p.co });
    }
    const cuts = script.cuts ? script.cuts.slice() : syl.slice(1).map(() => null);
    if (cuts.length !== syl.length - 1) throw new Error('형태소 경계 수가 음절 사이 수와 다름: ' + script.text);
    cuts.forEach((c, i) => {
      if (c !== null && !(c in CUT_RANK)) throw new Error('모르는 형태소 경계: ' + c + ' (' + script.text + ')');
      if ((c === 'space') !== spaceGaps.includes(i)) throw new Error('띄어쓰기와 space 경계가 어긋남: ' + script.text);
    });
    const marks = clone(script.marks || {});
    Object.keys(marks).forEach((k) => {
      const gap = MARK_GAP.includes(k);
      if (!gap && !MARK_SYL.includes(k)) throw new Error('모르는 낱말 표시: ' + k + ' (' + script.text + ')');
      const max = gap ? cuts.length : syl.length;
      if (!Array.isArray(marks[k])) throw new Error('낱말 표시는 번호 목록: ' + k + ' (' + script.text + ')');
      marks[k].forEach((g) => { if (!(Number.isInteger(g) && g >= 0 && g < max)) throw new Error('예외 표시 자리가 틀림: ' + k + ' ' + g + ' (' + script.text + ')'); });
    });
    return { syl, cuts, marks };
  }

  // ── 읽기(프롬프터): 연음은 여기서 저절로 ───────────────
  // 모음으로 시작하는 음절 앞의 종성을 옮긴다(겹받침은 뒤엣것만, /ㅇ/은 옮기지 않음). 연음은 변동이 아니다(0회).
  function surface(state) {
    const syl = clone(state.syl);
    for (let i = 0; i + 1 < syl.length; i++) {
      const a = syl[i], b = syl[i + 1];
      if (b.on == null && b.nu && a.nu && a.co.length) {
        const last = a.co[a.co.length - 1];
        if (last !== 'ㅇ') { b.on = last; a.co = a.co.slice(0, -1); }
      }
    }
    return syl;
  }
  function vowelText(y) {
    if (!y.nu) return y.gl || '';
    if (!y.gl) return y.nu;
    return JOIN_V[y.gl + y.nu] || (y.gl + y.nu); // 이중 모음으로 적을 수 없는 조합은 그대로
  }
  const reading = (state) => surface(state).map((y) => H.join(y.on, vowelText(y), y.co)).join('');
  const phonemes = (state) => state.syl.reduce((n, y) =>
    n + (y.on ? 1 : 0) + (y.gl ? 1 : 0) + (y.nu ? (S.unsplit[y.nu] || 1) : 0) + y.co.length, 0);

  // ── 지금 상태에서 적용할 수 있는 규칙 ──────────────────
  const cand = (rule, s, slot, k, to, article) => ({ rule, article, op: 'replace', at: { s, slot, k }, to });
  const markHas = (state, k, n) => ((state.marks && state.marks[k]) || []).includes(n);
  // 음절 i의 받침(co — 따로 주면 그 받침으로 가정)이 뒤 음절 초성을 된소리로 만드는 규칙 [규칙 id, 조항] 또는 null
  //   제23항: 받침 /ㄱ·ㄷ·ㅂ/(끝소리 규칙 뒤의 대표음, 결정 D4-1) 또는 겹받침 ㄳ·ㄺ·ㄿ·ㅄ(ㄼ은 제10항 다만 표시), 띄어쓰기 사이는 아님
  //   제24·25항: 어간 + 어미 표시(stem)가 있는 경계, 받침 /ㄴ·ㅁ/·ㄵ·ㄻ(24) / ㄼ·ㄾ(25), 뒤 /ㄱ·ㄷ·ㅅ·ㅈ/
  //   제26항: 한자어 구성 경계(sino), 받침 /ㄹ/, 뒤 /ㄷ·ㅅ·ㅈ/ · 제27항: 관형사형 -(으)ㄹ 표시(adn)의 받침 /ㄹ/ · 제28항: 사잇소리 표시(sai)
  function tenseRule(state, i, co) {
    const nx = state.syl[i + 1];
    if (!nx || !TENSE[nx.on]) return null;
    const on = nx.on, cut = state.cuts[i];
    const key = co.join(''), c = co.length === 1 ? co[0] : null;
    const exc = markHas(state, 'clusterExc', i);
    if (cut !== 'space' && (c ? ['ㄱ', 'ㄷ', 'ㅂ'].includes(c) : (T23_CLUSTER.includes(key) || (key === 'ㄹㅂ' && exc)))) return ['tense', '23'];
    if (markHas(state, 'stem', i) && on !== 'ㅂ') {
      if (c ? (c === 'ㄴ' || c === 'ㅁ') : T24_CLUSTER.includes(key)) return ['tense-stem', '24'];
      if (!c && T25_CLUSTER.includes(key) && !exc) return ['tense-stem', '25'];
    }
    if (cut === 'sino' && c === 'ㄹ' && ['ㄷ', 'ㅅ', 'ㅈ'].includes(on)) return ['tense-sino', '26'];
    if (markHas(state, 'adn', i) && c === 'ㄹ') return ['tense-adn', '27'];
    if (markHas(state, 'sai', i)) return ['tense-cmp', '28'];
    return null;
  }
  // 자음군 단순화로 뺄 자리 [종성 안 번호, 조항] 또는 null(겹받침이 아니거나 조건이 맞지 않음)
  function simplifyAt(state, i) {
    const y = state.syl[i], nx = state.syl[i + 1], cut = state.cuts[i];
    if (y.co.length !== 2) return null;
    const key = y.co.join(''), nextOn = nx ? nx.on : null;
    if (y.co[1] === 'ㅎ') return null;               // ㄶ·ㅀ은 ㅎ 탈락·거센소리되기(제12항)
    if (nextOn === 'ㅎ') return null;                // /ㅎ/ 앞은 거센소리되기가 겹받침의 뒤 자음을 가져감(밝히다[발키다])
    let art;
    if (!nx || nextOn) art = null;                   // 어말·자음 앞(제10·11항)
    else if (cut === 'content' || cut === 'space') art = '15'; // 실질 형태소·다음 단어 앞(제15항 [붙임])
    else return null;                                // 형식 형태소 앞은 연음(제14항)
    let k, a;
    if (key === 'ㄹㅂ' && markHas(state, 'clusterExc', i)) { k = 0; a = '10-다만'; }
    else if (key === 'ㄹㄱ' && markHas(state, 'stem', i) && (nextOn === 'ㄱ' || nextOn === 'ㄲ')) { k = 1; a = '11-다만'; }
    else if (DROP_BACK.includes(key)) { k = 1; a = '10'; }
    else if (DROP_FRONT.includes(key)) { k = 0; a = '11'; }
    else return null;
    return [k, art || a];
  }
  function applicable(state) {
    const out = [];
    const add = (c) => { if (!out.some((x) => sameCorrection(x, c))) out.push(c); };
    const exc = (state.marks && state.marks.lateralExc) || [];
    state.syl.forEach((y, i) => {
      const nx = state.syl[i + 1], cut = state.cuts[i];
      const nextOn = nx ? nx.on : null;
      // ── 1·2장: 홑받침만(겹받침은 자음군 단순화가 먼저) ──
      if (y.co.length === 1) {
        const c = y.co[0];
        // 음절의 끝소리 규칙: 어말 · 자음 앞(제9항) · 모음으로 시작하는 실질 형태소/다음 단어 앞(제15항)
        //   받침 /ㅈ/ + /ㅎ/(형식 형태소·경계 없음)은 곧바로 거센소리되기(제12항 [붙임 1], 결정 D7-2) — 끝소리 규칙을 열지 않는다
        if (REP[c] && !(c === 'ㅈ' && nextOn === 'ㅎ' && (cut === 'formal' || cut === null))) {
          if (!nx || nextOn) out.push(cand('coda', i, 'co', 0, REP[c], '9'));
          else if (cut === 'content' || cut === 'space') out.push(cand('coda', i, 'co', 0, REP[c], '15'));
        }
        if (c === 'ㅎ' && nextOn === 'ㄴ') out.push(cand('coda', i, 'co', 0, 'ㄷ', '12')); // 결정 0010
        if (nx) {
          if ((nextOn === 'ㄴ' || nextOn === 'ㅁ') && isPlainStop(c)) out.push(cand('nasal', i, 'co', 0, nasalOf(c), '18'));
          if (nextOn === 'ㄹ') {
            if (R_NASAL_AFTER.includes(c)) out.push(cand('r-nasal', i + 1, 'on', 0, 'ㄴ', '19'));
            if (c === 'ㄴ') {
              if (exc.includes(i)) out.push(cand('r-nasal-exc', i + 1, 'on', 0, 'ㄴ', '20-다만'));
              else out.push(cand('lateral', i, 'co', 0, 'ㄹ', '20'));
            }
          }
          if (nextOn === 'ㄴ' && c === 'ㄹ') out.push(cand('lateral', i + 1, 'on', 0, 'ㄹ', '20'));
        }
      }
      // ── 3장 구개음화 [붙임]: 합쳐서 생긴 초성 /ㅌ/ + /ㅣ/(앞 경계가 형식 형태소, 앞 음절 받침 없음) ──
      const pv = state.syl[i - 1];
      if (pv && y.on === 'ㅌ' && !y.gl && y.nu === 'ㅣ' && state.cuts[i - 1] === 'formal' && !pv.co.length) add(cand('palatal', i, 'on', 0, 'ㅊ', '17'));
      if (!y.co.length) return;
      const n = y.co.length, last = y.co[n - 1], lk = n - 1;
      // ── 3장 구개음화(제17항): 받침 /ㄷ·ㅌ/(ㄾ의 /ㅌ/) + 조사·접미사의 /ㅣ/ → 받침 자리를 /ㅈ·ㅊ/으로(결정 D3-1) ──
      if ((last === 'ㄷ' || last === 'ㅌ') && (n === 1 || y.co.join('') === 'ㄹㅌ') && nx && nx.on == null && !nx.gl && nx.nu === 'ㅣ' && cut === 'formal') {
        add(cand('palatal', i, 'co', lk, last === 'ㄷ' ? 'ㅈ' : 'ㅊ', '17'));
      }
      // ── 4장 된소리되기(제23~28항) · 제14항 괄호(겹받침의 /ㅅ/ + 형식 형태소 모음 → /ㅆ/) ──
      const t = tenseRule(state, i, y.co);
      if (t) add(cand(t[0], i + 1, 'on', 0, TENSE[nextOn], t[1]));
      if (n === 2 && last === 'ㅅ' && nx && nx.on == null && cut === 'formal') add(cand('tense-link', i, 'co', 1, 'ㅆ', '14'));
      // ── 5장 자음군 단순화(제10·11항, 다만) — 된소리 조건을 없애는 뺌은 된소리되기 뒤에(결정 D5-1: 넓다·맑게) ──
      const sp = simplifyAt(state, i);
      if (sp) {
        const rest = y.co[1 - sp[0]], restRep = REP[rest] || rest;
        if (!(t && !tenseRule(state, i, [restRep]))) add({ rule: 'simplify', article: sp[1], op: 'delete', at: { s: i, slot: 'co', k: sp[0] } });
      }
      // ── 5장 ㅎ 탈락: 모음으로 시작하는 형식 형태소 앞(제12항 4), 겹받침 ㄶ·ㅀ + /ㄴ/(제12항 3 [붙임], 결정 D5-3) ──
      if (last === 'ㅎ' && nx) {
        if (nx.on == null && cut === 'formal') add({ rule: 'h-drop', article: '12-4', op: 'delete', at: { s: i, slot: 'co', k: lk } });
        else if (n === 2 && nextOn === 'ㄴ') add({ rule: 'h-drop', article: '12-3', op: 'delete', at: { s: i, slot: 'co', k: lk } });
      }
      // ── 6장 ㄴ 첨가(제29항): 받침 + 합성어·파생어 경계(content)·다음 단어(space) + /ㅣ/·/j/, 예외 표시(noIns) 아님 ──
      if (nx && nx.on == null && (nx.gl === 'j' || (!nx.gl && nx.nu === 'ㅣ')) && (cut === 'content' || cut === 'space') && !markHas(state, 'noIns', i)) {
        add({ rule: 'n-insert', article: '29', op: 'insert', at: { s: i + 1, slot: 'on', k: 0 }, to: 'ㄴ' });
      }
      // ── 7장 거센소리되기(제12항 1·[붙임 1], 합침표): 받침 /ㅎ/ + /ㄱ·ㄷ·ㅈ/, 받침 /ㄱ·ㄷ·ㅂ·ㅈ/ + /ㅎ/ ──
      //   /ㅈ/ + /ㅎ/은 형식 형태소·경계 없음 사이만(띄어 쓴 낮 한때는 끝소리 규칙 ▸ 합침, [붙임 2])
      if (nx) {
        let to = null;
        if (last === 'ㅎ' && ['ㄱ', 'ㄷ', 'ㅈ'].includes(nextOn)) to = ASP[nextOn];
        else if (nextOn === 'ㅎ' && ASP[last] && (last !== 'ㅈ' || cut === 'formal' || cut === null)) to = ASP[last];
        if (to) add({ rule: 'aspirate', article: '12-1', op: 'merge', at: [{ s: i, slot: 'co', k: lk }, { s: i + 1, slot: 'on', k: 0 }], to });
      }
    });
    return out;
  }
  // 허용 규칙 후보(반드시 걸리지는 않지만 적용해도 규칙 안 — 결정 D6-2). derive·applicable에는 들어가지 않는다.
  //   'glide-insert' 반모음 첨가(제22항): 받침 없는 /ㅚ·ㅣ·ㅟ·ㅐ·ㅔ/ + 형식 형태소 /ㅓ·ㅗ/ → 뒤 음절 반모음 자리에 /j/(피어[피여], 아니오[아니요])
  function allowable(state) {
    const out = [];
    state.syl.forEach((y, i) => {
      const nx = state.syl[i + 1];
      if (!nx || y.co.length || !GLIDE_BEFORE.includes(y.nu) || state.cuts[i] !== 'formal') return;
      if (nx.on == null && !nx.gl && GLIDE_AFTER.includes(nx.nu)) out.push({ rule: 'glide-insert', article: '22', op: 'insert', at: { s: i + 1, slot: 'gl', k: 0 }, to: 'j' });
    });
    return out;
  }

  // ── 교정 적용 ─────────────────────────────────────────
  function normalize(c) {
    if (!c || OPS.indexOf(c.op) < 0) throw new Error('교정 모양이 틀림: ' + JSON.stringify(c));
    const at = c.op === 'merge' ? (Array.isArray(c.at) && c.at.length === 2 ? c.at.map(pos) : null) : pos(c.at);
    if (!at) throw new Error('합침표는 자리 두 개: ' + JSON.stringify(c));
    if (c.op !== 'delete' && !isSound(c.to)) throw new Error('모르는 음운: ' + c.to);
    return c.op === 'delete' ? { op: c.op, at } : { op: c.op, at, to: c.to };
  }
  const fits = (slot, id) => (slot === 'gl' ? isGlide(id) : slot === 'nu' ? isNucleus(id) : isConsonant(id));
  function put(y, p, id) { if (p.slot === 'co') y.co[p.k] = id; else y[p.slot] = id; }
  function remove(y, p) { if (p.slot === 'co') y.co.splice(p.k, 1); else y[p.slot] = null; }
  // 아무 음운도 남지 않은 음절은 지우고, 양쪽 형태소 경계 가운데 더 큰 것을 남긴다.
  // 낱말 표시도 새 번호로 옮긴다: 음절 표시(adn·clusterExc)는 지운 음절의 것을 버리고 뒤를 하나씩 당기고,
  // 경계 표시(lateralExc·stem·sai·noIns)는 사라진 경계(두 경계가 하나가 되면 남기지 않은 쪽)의 것을 버리고 뒤를 당긴다.
  function remapMarks(st, sylGone, gapGone) {
    const m = st.marks || {};
    const move = (list, gone) => list.filter((g) => g !== gone).map((g) => (g > gone ? g - 1 : g));
    Object.keys(m).forEach((k) => {
      if (MARK_SYL.includes(k)) m[k] = move(m[k], sylGone);
      else if (MARK_GAP.includes(k)) m[k] = move(m[k], gapGone);
    });
  }
  function tidy(st) {
    for (let i = st.syl.length - 1; i >= 0 && st.syl.length > 1; i--) {
      const y = st.syl[i];
      if (y.on || y.gl || y.nu || y.co.length) continue;
      st.syl.splice(i, 1);
      let gone;
      if (i === 0) { st.cuts.splice(0, 1); gone = 0; }
      else if (i === st.cuts.length) { st.cuts.splice(i - 1, 1); gone = i - 1; }
      else {
        const a = st.cuts[i - 1], b = st.cuts[i];
        const keepA = (CUT_RANK[a] || 0) >= (CUT_RANK[b] || 0);
        st.cuts.splice(i - 1, 2, keepA ? a : b);
        gone = keepA ? i : i - 1;
      }
      remapMarks(st, i, gone);
    }
    return st;
  }
  // 할 수 있으면 새 상태, 할 수 없으면 null
  function tryApply(state, c) {
    if (c.op === 'merge') {
      const [a, b] = c.at;
      const seq = order(state);
      const ia = seq.findIndex((p) => samePos(p, a)), ib = seq.findIndex((p) => samePos(p, b));
      if (ia < 0 || ib !== ia + 1) return null; // 이웃한 두 음운만
      const keep = b.slot === 'on' ? b : a, drop = keep === b ? a : b; // 종성+초성은 초성 자리에(놓고 → [노코])
      if (!fits(keep.slot, c.to)) return null;
      const st = clone(state);
      put(st.syl[keep.s], keep, c.to);
      remove(st.syl[drop.s], drop);
      return tidy(st);
    }
    const p = c.at, y = state.syl[p.s];
    if (!y) return null;
    const cur = get(state, p);
    const st = clone(state), ny = st.syl[p.s];
    if (c.op === 'replace') {
      if (!cur || cur === c.to || !fits(p.slot, c.to)) return null;
      put(ny, p, c.to);
      return st;
    }
    if (c.op === 'delete') {
      if (!cur) return null;
      remove(ny, p);
      return tidy(st);
    }
    // insert: 빈 자리에만
    if (!fits(p.slot, c.to)) return null;
    if (p.slot === 'co') {
      if (ny.co.length >= 2 || p.k > ny.co.length) return null;
      ny.co.splice(p.k, 0, c.to);
      return st;
    }
    if (cur) return null;
    put(ny, p, c.to);
    return st;
  }
  // 규칙 판정 없이 교정만 적용. 할 수 없는 교정이면 받은 상태를 그대로(같은 객체) 돌려준다.
  function apply(state, c) { return tryApply(state, normalize(c)) || state; }

  const sameCorrection = (a, b) => a.op === b.op && a.to === b.to &&
    (a.op === 'merge' ? samePos(a.at[0], b.at[0]) && samePos(a.at[1], b.at[1]) : samePos(a.at, b.at));

  // 교정 하나가 지금 상태에서 규칙 안인지(반드시 걸리는 규칙 + 허용 규칙)
  const ruleHit = (state, n) => applicable(state).concat(allowable(state)).find((k) => sameCorrection(k, n)) || null;
  function check(state, c) {
    const n = normalize(c);
    const next = tryApply(state, n);
    const hit = next ? ruleHit(state, n) : null;
    return { ok: !!hit, rule: hit ? hit.rule : null, article: hit ? hit.article : null, applied: !!next, state: next || state };
  }

  function tally(corrections) {
    const t = { replace: 0, delete: 0, insert: 0, merge: 0 };
    corrections.forEach((c) => { t[c.op]++; });
    return t;
  }

  // 표준 발음 도출: 더 걸릴 규칙이 없을 때까지 ORDER 순서 → 왼쪽 자리부터
  const atKey = (c) => { const p = Array.isArray(c.at) ? c.at[0] : c.at; return p.s * 10 + SLOTS.indexOf(p.slot) * 2 + p.k; };
  function derive(script) {
    const first = start(script);
    let st = first;
    const steps = [];
    for (;;) {
      const cs = applicable(st).sort((a, b) => ORDER.indexOf(a.rule) - ORDER.indexOf(b.rule) || atKey(a) - atKey(b));
      if (!cs.length) break;
      if (steps.length >= 30) throw new Error('규칙이 끝나지 않음: ' + script.text);
      steps.push(cs[0]);
      st = tryApply(st, cs[0]);
    }
    return { pron: reading(st), steps, state: st, before: phonemes(first), after: phonemes(st), change: tally(steps) };
  }

  // 음절 단위 편집 거리. at = 프롬프터 발음(a)에서 다른 음절 번호(a에 없는 음절이면 그 앞 번호)
  function sylDiff(a, b) {
    const A = Array.from(a), B = Array.from(b);
    const d = A.map(() => []).concat([[]]);
    for (let i = 0; i <= A.length; i++) for (let j = 0; j <= B.length; j++) {
      d[i][j] = i === 0 ? j : j === 0 ? i : Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (A[i - 1] === B[j - 1] ? 0 : 1));
    }
    const at = [];
    for (let i = A.length, j = B.length; i > 0 || j > 0;) {
      if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + (A[i - 1] === B[j - 1] ? 0 : 1)) { if (A[i - 1] !== B[j - 1]) at.push(i - 1); i--; j--; }
      else if (i > 0 && d[i][j] === d[i - 1][j] + 1) { at.push(i - 1); i--; }
      else { at.push(Math.max(0, i - 1)); j--; }
    }
    return { n: d[A.length][B.length], at: Array.from(new Set(at)).sort((x, y) => x - y) };
  }

  // 송출 판정: 교정을 차례로 적용하고 신호 하나를 정한다
  function broadcast(script, corrections) {
    const first = start(script);
    let st = first;
    const steps = [], applied = [];
    (corrections || []).forEach((c) => {
      const r = check(st, c);
      steps.push(Object.assign(normalize(c), { ok: r.ok, rule: r.rule, article: r.article }));
      if (r.applied) applied.push(normalize(c));
      st = r.state;
    });
    const read = reading(st);
    const outOfRule = steps.map((x, i) => (x.ok ? -1 : i)).filter((i) => i >= 0);
    const targets = [strip(script.pron)].concat((script.allowed || []).map(strip));
    const res = { kind: 'diff', reading: read, outOfRule, diff: 0, at: [], steps, before: phonemes(first), after: phonemes(st), change: tally(applied) };
    if (targets.includes(read)) res.kind = outOfRule.length ? 'offrule' : 'onair';
    else if ((script.nonstandard || []).some((ns) => strip(ns[0]) === read)) res.kind = 'nonstandard';
    else { const d = sylDiff(read, strip(script.pron)); res.diff = d.n; res.at = d.at; }
    return res;
  }

  // 원고 데이터의 풀이 과정 한 줄 [규칙, op, 자리, 음운] → { rule, ...교정 }
  function parseStep(arr) {
    const [rule, op, at, to] = arr;
    const c = normalize({ op, at: op === 'merge' ? String(at).split('+') : at, to });
    return Object.assign({ rule }, c);
  }

  // ══ 판 진행(구현 2단계, 명세 §17) ═════════════════════════════════════
  const ruleSeq = (script) => (script.steps || []).map((x) => x[0]);

  // ── 원고 갈래(§6) ─────────────────────────────────────
  function kindOf(script) {
    if (script.trap) return script.trap;
    const seq = ruleSeq(script);
    // 3~8장: 그 장에서 배우는 규칙이 풀이에 있으면 그 가운데 첫째(넓다 = 된소리 ▸ 뺌 → 5장 'simplify'). 1·2장은 아래와 결과가 같다.
    const own = seq.find((r) => RULES[r] && RULES[r].ch === script.ch);
    if (own) return own;
    const k = seq.find((r) => r !== 'coda') || (seq.length ? 'coda' : null);
    if (k) return k;
    // 교정이 없는 일반 원고(제22항 피어): 처음 상태에 걸리는 허용 규칙
    try { const a = allowable(start(script)); return a.length ? a[0].rule : null; } catch (e) { return null; }
  }

  // ── 난수(시드 → 결정적) ───────────────────────────────
  // 시드는 수(같은 시드 → 같은 결과, mulberry32) 또는 () => [0, 1) 함수
  function rng(seed) {
    if (typeof seed === 'function') return seed;
    if (typeof seed !== 'number' || !isFinite(seed)) throw new Error('시드는 수나 난수 함수: ' + seed);
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(list, rand) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.min(i, Math.floor(rand() * (i + 1)));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // ── 원고 뽑기(§6, 결정 0012) ──────────────────────────
  //   traps: 함정 종류별 개수, normal: 일반 원고가 될 갈래, need: 일반 5개에 적어도 1개씩 들어갈 조건(optional = 남아 있을 때만)
  //   3~8장(결정 D0-2·D8-1): trapN = 함정 개수(종류가 둘 이상 남아 있으면 서로 다른 종류로), trapKinds = 쓸 함정 종류(없으면 모두),
  //   trapOptional = 함정이 모자라면 있는 만큼만. normal이 null이면 함정 아닌 원고 모두가 일반.
  const is15 = (s) => (s.articles || []).includes('15');
  const kindIs = (...ks) => (s) => ks.includes(kindOf(s));
  const needKind = (k, optional) => ({ what: k + ' 갈래', test: kindIs(k), optional: !!optional });
  const stepAt = (s, i) => (s.steps || [])[i] || [];
  const TENSE_KINDS = ['tense', 'tense-stem', 'tense-sino', 'tense-adn', 'tense-cmp', 'tense-link'];
  const DRAW = {
    1: { traps: [['link', 2]], normal: ['coda'], need: [{ what: '제15항 원고', test: is15, optional: true }] },
    2: {
      traps: [['exception', 1], ['nonstandard', 1]], normal: ['nasal', 'r-nasal', 'lateral'],
      need: ['nasal', 'r-nasal', 'lateral'].map((k) => ({ what: k + ' 갈래', test: (s) => kindOf(s) === k })),
    },
    3: { trapN: 2, normal: ['palatal'], need: [needKind('palatal')] },
    4: {
      trapN: 2, normal: TENSE_KINDS,
      need: [needKind('tense'), needKind('tense-stem'),
        { what: '제26·27·28항 갈래', test: kindIs('tense-sino', 'tense-adn', 'tense-cmp') }, needKind('tense-link', true)],
    },
    5: { trapN: 2, normal: ['simplify', 'h-drop'], need: [needKind('simplify'), needKind('h-drop')] },
    6: {
      trapN: 2, normal: ['n-insert', 'glide-insert', 'nasal'],
      need: [needKind('n-insert'), needKind('glide-insert', true), { what: '제30항 원고', test: (s) => (s.articles || []).includes('30'), optional: true }],
    },
    7: { trapN: 2, normal: ['aspirate'], need: [needKind('aspirate')] },
    8: {
      trapN: 1, trapKinds: ['exception'], trapOptional: true, normal: null,
      need: [
        { what: '탈락이 먼저인 원고', test: (s) => stepAt(s, 0)[1] === 'delete' },
        { what: '끝소리 규칙이 먼저인 원고', test: (s) => stepAt(s, 0)[0] === 'coda' },
        { what: '축약이 먼저인 원고', test: (s) => stepAt(s, 0)[0] === 'aspirate' },
        { what: '첨가 뒤 비음화 원고', test: (s) => { const q = ruleSeq(s), i = q.indexOf('n-insert'); return i >= 0 && q.indexOf('nasal', i + 1) > i; } },
      ],
    },
  };
  const DRAW_TOTAL = 7;
  function draw(ch, pool, exclude, seed) {
    const plan = DRAW[ch];
    if (!plan) throw new Error('뽑기 조건이 없는 장: ' + ch);
    const rand = rng(seed);
    const ex = new Set(exclude || []);
    const seen = new Set();
    const all = (pool || []).filter((s) => s.ch === ch && !ex.has(s.id) && !seen.has(s.id) && seen.add(s.id));
    const picked = [];
    const take = (list, n, what) => {
      const rest = shuffle(list.filter((s) => picked.indexOf(s) < 0), rand);
      if (rest.length < n) throw new Error(`원고가 모자람: ${ch}장 ${what} ${n}개가 필요한데 ${rest.length}개`);
      picked.push(...rest.slice(0, n));
    };
    if (plan.traps) plan.traps.forEach(([kind, n]) => take(all.filter((s) => s.trap === kind), n, kind + ' 함정'));
    else {
      // 함정 trapN개: 남은 함정 종류를 섞어 종류마다 하나씩, 모자라면 아무 종류에서
      const traps = all.filter((s) => s.trap && (!plan.trapKinds || plan.trapKinds.includes(s.trap)));
      const n = plan.trapOptional ? Math.min(plan.trapN, traps.length) : plan.trapN;
      const kinds = shuffle(traps.map((s) => s.trap).filter((k, i, a) => a.indexOf(k) === i), rand);
      kinds.slice(0, n).forEach((k) => take(traps.filter((s) => s.trap === k), 1, k + ' 함정'));
      if (picked.length < n) take(traps, n - picked.length, '함정');
    }
    const normal = all.filter((s) => !s.trap && (!plan.normal || plan.normal.includes(kindOf(s))));
    plan.need.forEach((nd) => {
      if (picked.some((s) => !s.trap && nd.test(s))) return; // 앞에서 뽑은 일반 원고가 이미 채움(8장 홑이불 = 끝소리 먼저 + 첨가 ▸ 비음화)
      const c = normal.filter(nd.test);
      if (c.length || !nd.optional) take(c, 1, nd.what);
    });
    take(normal, DRAW_TOTAL - picked.length, '일반 원고');
    return shuffle(picked, rand).map((s) => s.id);
  }
  // 지침 예시 원고 id(뽑기에서 뺄 원고). 지침이 없으면 빈 목록
  function exampleIds(guides) {
    const out = [];
    (guides || []).forEach((g) => (g.examples || []).forEach((e) => { if (out.indexOf(e.id) < 0) out.push(e.id); }));
    return out;
  }

  // ── 쌍둥이 원고(§8-4, 결정 0006) ──────────────────────
  function twins(script, pool, exclude) {
    const ex = new Set(exclude || []);
    const seq = JSON.stringify(ruleSeq(script)), trap = script.trap || null;
    // 이 원고와 뺄 원고(이번에 뽑힌 7개)의 표준 발음은 풀이 예시로 보이지 않는다(낮이 뽑혔으면 낯·낱도 아님)
    const banned = new Set([strip(script.pron)]);
    (pool || []).forEach((s) => { if (ex.has(s.id)) banned.add(strip(s.pron)); });
    return (pool || []).filter((s) => s.ch === script.ch && s.id !== script.id && !ex.has(s.id) &&
      (s.trap || null) === trap && JSON.stringify(ruleSeq(s)) === seq && !banned.has(strip(s.pron))).map((s) => s.id);
  }
  const twin = (script, pool, exclude) => twins(script, pool, exclude)[0] || null;

  // ── 연음 자리(§8-3-4) ─────────────────────────────────
  // 뒤 음절이 빈 초성이고 사이 경계가 formal·null이라 읽을 때 저절로 옮겨지는 종성(겹받침은 두 자리 모두)
  function linkSites(state) {
    const out = [];
    state.syl.forEach((a, i) => {
      const b = state.syl[i + 1];
      if (!b || b.on != null || !b.nu || !a.nu || !a.co.length) return;
      const cut = state.cuts[i];
      if (cut !== 'formal' && cut !== null) return;
      if (a.co[a.co.length - 1] === 'ㅇ') return; // /ㅇ/은 옮기지 않는다(surface와 같음)
      a.co.forEach((_, k) => out.push({ s: i, slot: 'co', k }));
    });
    return out;
  }
  // 교정들을 차례로 적용하면서, 그때의 연음 자리 받침을 고치거나 뺀 교정(실제로 적용된 것)이 있는지.
  //   그 자리의 규칙 안 교정(구개음화 굳이 /ㄷ/→/ㅈ/, 제14항 값을 /ㅅ/→/ㅆ/, ㅎ 탈락 낳은 /ㅎ/ 뺌)은 건드린 것이 아니다(결정 D3-1·D4-7).
  function touchedLink(script, corrections) {
    let st = start(script);
    for (const c of corrections || []) {
      const n = normalize(c);
      const next = tryApply(st, n);
      if (next && (n.op === 'replace' || n.op === 'delete') && linkSites(st).some((p) => samePos(p, n.at)) && !ruleHit(st, n)) return true;
      st = next || st;
    }
    return false;
  }

  // ── 닮은 칸(§8-2): 그 자리에 걸리는 규칙의 결과 음운 하나 또는 null ──
  function similarCell(state, at) {
    const p = pos(at);
    const hit = applicable(state).filter((c) => samePos(c.at, p))
      .sort((a, b) => ORDER.indexOf(a.rule) - ORDER.indexOf(b.rule))[0];
    return hit ? hit.to : null;
  }

  // ── 조건 낱말(지침 members·shows의 어휘) ───────────────
  const CUT_KINDS = ['formal', 'content', 'space', 'sino'];
  // 낱말 표시 조건 낱말 → marks 키
  const MARK_WORDS = { stem: 'stem', adn: 'adn', sai: 'sai', cexc: 'clusterExc', noins: 'noIns' };
  function parseCond(word) {
    if (word === 'link' || word === 'exc' || word === 'vowelI') return { type: word };
    if (typeof word !== 'string') return null;
    if (word in MARK_WORDS) return { type: 'mark', a: MARK_WORDS[word] };
    let m = /^(coda|onset|before):(.)$/.exec(word);
    if (m) return isConsonant(m[2]) ? { type: m[1], a: m[2] } : null;
    m = /^coda2:(.)(.)$/.exec(word);
    if (m) return isConsonant(m[1]) && isConsonant(m[2]) ? { type: 'coda2', a: m[1], b: m[2] } : null;
    m = /^(cut|gap):(.+)$/.exec(word);
    if (m) return CUT_KINDS.includes(m[2]) ? { type: m[1], a: m[2] } : null;
    m = /^cv:(.)(.)$/.exec(word);
    if (m) return isConsonant(m[1]) && isNucleus(m[2]) ? { type: 'cv', a: m[1], b: m[2] } : null;
    return null;
  }
  // 원고의 처음 상태에 그 조건이 있는지(모르는 낱말은 오류)
  function hasCondition(script, word) {
    const c = parseCond(word);
    if (!c) throw new Error('모르는 조건 낱말: ' + word);
    const st = start(script), syl = st.syl;
    const nextOn = (i) => (syl[i + 1] ? syl[i + 1].on : undefined);
    switch (c.type) {
      case 'coda': return syl.some((y) => y.co.length === 1 && y.co[0] === c.a);
      case 'coda2': return syl.some((y) => y.co.length === 2 && y.co[0] === c.a && y.co[1] === c.b);
      case 'onset': return syl.some((y, i) => y.co.length > 0 && nextOn(i) === c.a);
      case 'before': return syl.some((y, i) => y.co.length === 1 && y.co[0] === c.a && nextOn(i) === 'ㄹ');
      case 'cut': return syl.some((y, i) => y.co.length > 0 && nextOn(i) === null && st.cuts[i] === c.a);
      case 'gap': return syl.some((y, i) => y.co.length > 0 && i < st.cuts.length && st.cuts[i] === c.a);
      case 'cv': return syl.some((y, i) => y.on === c.a && !y.gl && y.nu === c.b && (i === 0 || st.cuts[i - 1] === null));
      case 'vowelI': return syl.some((y, i) => y.co.length > 0 && !!syl[i + 1] && syl[i + 1].on == null &&
        (syl[i + 1].gl === 'j' || (!syl[i + 1].gl && syl[i + 1].nu === 'ㅣ')));
      case 'mark': return ((st.marks && st.marks[c.a]) || []).length > 0;
      case 'link': return linkSites(st).length > 0;
      default: return ((st.marks && st.marks.lateralExc) || []).length > 0; // exc
    }
  }

  // ── 지침 채점(§7-4): 틀린 칸 수(고르지 않은 칸도 틀린 칸) ──
  function gradeGuides(guides, picks) {
    let wrong = 0;
    (guides || []).forEach((g) => {
      const mine = (picks && picks[g.id]) || {};
      Object.keys(g.blanks || {}).forEach((b) => { if (mine[b] !== g.blanks[b].answer) wrong++; });
    });
    return wrong;
  }

  // ── 지침 예시 검증(§7-3, 점검용): 문제 목록(빈 목록 = 통과). 모양이 틀려도 던지지 않는다 ──
  const holes = (t) => (typeof t === 'string' ? Array.from(new Set((t.match(/\{([A-Za-z0-9_-]+)\}/g) || []).map((x) => x.slice(1, -1)))).sort() : null);
  const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
  function checkGuide(guide, pool) {
    const errs = [];
    const g = isObj(guide) ? guide : {};
    const n = '[' + g.id + ']';
    const bad = (m) => errs.push(n + ' ' + m);
    if (typeof g.id !== 'string' || !g.id) bad('id가 없음');
    if (!Array.isArray(g.articles) || !g.articles.length || !g.articles.every((a) => typeof a === 'string')) bad('공개할 조항 articles가 없음');
    const rules = Array.isArray(g.rules) ? g.rules : (bad('rules가 목록이 아님'), []);
    rules.forEach((r) => { if (!RULES[r]) bad('모르는 규칙 id: ' + r); });
    const blanks = isObj(g.blanks) ? g.blanks : {};
    const keys = Object.keys(blanks).sort();
    if (!keys.length) bad('빈칸이 없음');
    const text = isObj(g.text) ? g.text : {};
    ['m3', 'h1'].forEach((gr) => {
      const h = holes(text[gr]);
      if (!h) bad(`text.${gr} 문장이 없음`);
      else if (JSON.stringify(h) !== JSON.stringify(keys)) bad(`text.${gr}의 빈칸 자리 ${JSON.stringify(h)} ≠ 빈칸 ${JSON.stringify(keys)}`);
    });
    keys.forEach((k) => {
      const b = blanks[k] || {};
      const o = b.options;
      if (!Array.isArray(o) || o.length < 2 || o.length > 4 || !o.every((x) => typeof x === 'string' && x)) bad(`빈칸 ${k}: 보기는 2~4개`);
      else if (!(Number.isInteger(b.answer) && b.answer >= 0 && b.answer < o.length)) bad(`빈칸 ${k}: 답 번호가 보기 밖`);
      if (b.members !== undefined) {
        if (!Array.isArray(b.members)) bad(`빈칸 ${k}: members가 목록이 아님`);
        else b.members.forEach((w) => { if (!parseCond(w)) bad(`빈칸 ${k}: 모르는 조건 낱말 ${w}`); });
      }
    });
    const byIdP = {};
    (pool || []).forEach((s) => { byIdP[s.id] = s; });
    const covered = {};
    const exs = Array.isArray(g.examples) ? g.examples : (bad('examples가 목록이 아님'), []);
    if (Array.isArray(g.examples) && !exs.length) bad('예시가 없음');
    exs.forEach((e, i) => {
      const en = `예시 ${i + 1}(${e && e.id})`;
      const s = e && byIdP[e.id];
      if (!s) { bad(en + ': 원고에 없는 id'); return; }
      if (e.trap) {
        if (s.trap !== e.trap) bad(`${en}: 함정 종류 ${e.trap} ≠ 원고 ${s.trap || '없음'}`);
      } else {
        if (s.trap) bad(`${en}: 함정 원고(${s.trap})인데 trap이 없음`);
        // 교정이 없는 일반 원고(제22항 피어)는 원고 갈래(허용 규칙)로 본다
        const used = ruleSeq(s).length ? ruleSeq(s) : [kindOf(s)];
        if (!used.some((r) => rules.includes(r))) bad(`${en}: 풀이 과정이 지침 규칙 ${JSON.stringify(rules)}을 쓰지 않음`);
      }
      const shows = isObj(e.shows) ? e.shows : {};
      if (e.shows !== undefined && !isObj(e.shows)) bad(en + ': shows가 객체가 아님');
      Object.keys(shows).forEach((k) => {
        if (!blanks[k]) { bad(`${en}: 없는 빈칸 ${k}`); return; }
        const members = Array.isArray(blanks[k].members) ? blanks[k].members : [];
        [].concat(shows[k]).forEach((w) => {
          if (!parseCond(w)) { bad(`${en}: 모르는 조건 낱말 ${w}`); return; }
          if (members.indexOf(w) < 0) { bad(`${en}: ${w}가 빈칸 ${k}의 members에 없음`); return; }
          let ok = false;
          try { ok = hasCondition(s, w); } catch (err) { bad(`${en}: ${err.message}`); return; }
          if (!ok) { bad(`${en}: 원고에 ${w}가 없음`); return; }
          (covered[k] = covered[k] || []).push(w);
        });
      });
    });
    keys.forEach((k) => {
      const members = blanks[k] && Array.isArray(blanks[k].members) ? blanks[k].members : [];
      members.forEach((w) => { if ((covered[k] || []).indexOf(w) < 0) bad(`빈칸 ${k}: ${w}를 보이는 예시가 없음`); });
    });
    return errs;
  }
  // 한 장의 지침 묶음: 지침 id가 겹치지 않고 지침마다 checkGuide 통과
  function checkGuides(guides, pool) {
    const list = Array.isArray(guides) ? guides : [];
    const errs = Array.isArray(guides) ? [] : ['지침 묶음이 목록이 아님'];
    const ids = list.map((g) => g && g.id);
    ids.forEach((id, i) => { if (ids.indexOf(id) !== i) errs.push('[' + id + '] 장 안에서 지침 id가 겹침'); });
    list.forEach((g) => errs.push(...checkGuide(g, pool)));
    return errs;
  }

  // ── 공개할 조항(§9): 번호 순. 하위 번호('12-1'~'12-4')는 그 조항 바로 뒤 번호 순, 다만('10-다만')은 그 조항(과 하위 번호) 뒤 ──
  //   열쇠 [조항 번호, 하위 번호(없으면 0, 다만이면 그 뒤), 나머지 글]
  function articleKey(a) {
    const m = /^(\d+)(?:-(\d+))?(.*)$/.exec(a);
    if (!m) return [Infinity, 0, String(a)];
    return [+m[1], m[2] ? +m[2] : (m[3] ? Infinity : 0), m[3]];
  }
  function revealArticles(guides, scripts) {
    const set = [];
    const add = (a) => { if (set.indexOf(a) < 0) set.push(a); };
    (guides || []).forEach((g) => (g.articles || []).forEach(add));
    (scripts || []).forEach((s) => (s.articles || []).forEach(add));
    return set.sort((x, y) => {
      const a = articleKey(x), b = articleKey(y);
      return a[0] - b[0] || (a[1] === b[1] ? 0 : a[1] < b[1] ? -1 : 1) || (a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : 0);
    });
  }

  // ── 원고 결과(§8-5): 송출 신호 기록 → 'onair' | 'offrule' | 'skip'(넘김) ──
  function scriptResult(log) {
    const kinds = (log || []).map((x) => (typeof x === 'string' ? x : x && x.kind));
    if (kinds.includes('onair')) return 'onair';
    return kinds[kinds.length - 1] === 'offrule' ? 'offrule' : 'skip';
  }

  // ── 장 정답 합계(§10): 원고 change·count의 합 ──────────
  function chapterTotals(scripts) {
    const change = { replace: 0, delete: 0, insert: 0, merge: 0 }, count = [0, 0];
    (scripts || []).forEach((s) => {
      OPS.forEach((op) => { change[op] += (s.change && s.change[op]) || 0; });
      count[0] += s.count[0]; count[1] += s.count[1];
    });
    return { change, count };
  }

  return {
    RULES, ORDER, slash, strip, pos, start, surface, reading, phonemes, applicable, allowable, apply, check, tally, derive, broadcast, parseStep,
    kindOf, draw, exampleIds, twin, twins, linkSites, touchedLink, similarCell, hasCondition, gradeGuides, checkGuide, checkGuides,
    revealArticles, scriptResult, chapterTotals,
  };
})();
