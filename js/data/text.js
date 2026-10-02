'use strict';
// ───────────────────────────────────────────────────────────────
// 발음 감수실 — 화면에 나오는 문구 모음 (선생님이 고치는 곳)
// ───────────────────────────────────────────────────────────────
// · 화면 문구는 모두 여기에 둔다. 문장을 바꾸고 싶으면 이 파일의 따옴표 안만 고치면 된다.
//   예외: 감수 지침 문장은 js/data/guides.js, 조항 원문은 js/data/articles.js에 둔다(명세 §13).
//   도우미 모양은 「음운 해전」 pblsketch/sori-haejeon js/data/text.js를 따랐다(fill, 학년별 용어 term/short).
//   조음 도표의 자질 용어(terms·shortTerms의 axis~column)는 그 파일에서 그대로 가져왔다.
// · 모든 문구는 플레이 테스트에서 선생님이 검토할 초안이다.
// · 지킬 것(점검: tests/check-text.mjs — 이 파일 전체를 읽는다. 금지 낱말 목록은 그 점검 파일에 있다)
//   - 음운은 언제나 빗금으로 적는다: /ㄱ/, /ㅏ/, /j/. 빗금 없이 자모만 쓰면 점검이 실패한다.
//   - 원고에 적힌 것은 '표기', 아나운서가 읽는 것은 '발음', 단위는 '음운'이다. 문자 쪽 말을 섞지 않는다.
//   - 대괄호는 발음 표시 전용이다. 문구에 대괄호를 쓰지 않는다(발음은 게임이 G.text.pron으로 채움).
//     문구에 실제 낱말의 발음을 적지 않는다 — 뽑힌 원고의 답이 새지 않게(명세 원칙 5).
//   - 한자를 쓰지 않는다. 고1 용어도 '비음화'처럼 한글 한자어만.
//   - 실제 방송사 이름·로고·인물을 쓰지 않는다. 방송국은 가상의 「소리방송」이다.
//   - 문구는 한 줄(줄바꿈 문자 없음). 여러 줄이 필요하면 배열로 둔다.
//   - 한 줄 자리(신호·안내·확인·단추·머리)는 대략 30자 이내. 여러 줄을 써도 되는 곳은 게임 방법 창(howto)과
//     조항 공개 머리 문장(reveal.heading)뿐이다(명세 §13).
// · 학년 값: 'm3' = 중3(우리말 풀이), 'h1' = 고1(우리말 + 한글 한자어 용어, 결정 0003)
//   학년마다 다른 문구는 { m3: …, h1: … } 꼴로 둔다. 두 학년은 키 구조와 {이름} 자리가 똑같아야 한다.
//   G.text.get / G.text.t는 이 꼴을 만나면 그 학년 쪽을 고른다(모르는 학년은 중3).
// · 문구 안의 {이름} 자리는 게임이 값으로 채운다(예: '{n}곳이 달라요' → '2곳이 달라요').
//
// ── 키 구조(화면별 묶음) ─────────────────────────────────────────
//   app        게임 이름, 방송국 이름, 역할 이름
//   common     여러 화면이 함께 쓰는 단추·꼴(네/아니요, 원문·게임 설정 표시, '{n}장', '{n}번' …)
//   chapters   장 이름 8개(name) + 다루는 변동 한 줄(topic, 학년별) — 기획안 3절
//   levels     단계 이름(basic 기본 / advanced 심화) + 단계 풀이(hint, 학년별)
//   start      시작 화면: 학년·장·단계 고르기, 준비 중, 중3 추천, 게임 방법·설정 단추, 이어 하기(resume),
//              덮어쓰기 확인(overwrite)
//   settings   설정 창
//   howto      게임 방법 창: 제목·단추 + sections(차례대로 { title, lines })
//   guide      감수 지침 화면: 안내, 예시, 빈칸, 확인, 틀린 칸 수
//   review     감수 화면: 머리(header), 단추(buttons), 교정 부호(marks), 부호를 고른 뒤 한 줄(prompt),
//              할 수 없는 교정 안내(notice), 감수 기록(log), 넘김 확인(skip), 조음 도표(chart), 접근성 이름(aria)
//   signal     송출 신호 넷: 한 줄(line)·이름(name)·시청자 게시판·연음 안내 — 키는 G.rules.broadcast의 kind
//              ('onair' | 'offrule' | 'diff' | 'nonstandard')
//   help       도움 사다리 ①②③ 문구
//   reveal     조항 공개 화면
//   result     장 결과 화면: 칸 이름, 원고 결과 이름(outcome: 'onair' | 'offrule' | 'skip'), 정답 기준 숫자
//   terms      학년별 긴 이름 { m3, h1 }: 자질(axis~column), 반모음(glide), 음절 자리(slot),
//              형태소 경계 이름표(cut — 명세 §8-1 표, stem = 어간 + 어미 경계), 규칙 이름(rule — G.rules 규칙 id), 변동 유형(change — 교정 op)
//   shortTerms 학년별 짧은 이름 { m3, h1 }: 도표 머리글·결과 표처럼 좁은 곳
//   rotate     낮은 가로 화면 안내
//   images     그림 자리 대체 글(이번에는 빈 틀)
//
// ── 값 이름표(키) ───────────────────────────────────────────────
//   자질(js/data/sounds.js와 같음) place: bilabial alveolar palatal velar glottal · manner: stop affricate fricative nasal liquid
//     strength: plain tense aspirated none · height: high mid low · backness: front back · lips: unrounded rounded
//     column: front-unrounded front-rounded back-unrounded back-rounded · glide: j w
//   음절 자리 slot: on gl nu co (js/core/rules.js의 자리 Pos)
//   형태소 경계 cut: formal content sino (space·null은 이름표 없음) + stem(형식 경계 가운데 어간 + 어미 표시가 있는 곳 — 기본 단계 이름표만)
//   규칙 rule: coda r-nasal-exc r-nasal nasal lateral palatal tense tense-stem tense-sino tense-adn tense-cmp tense-link
//     simplify h-drop n-insert glide-insert aspirate · 변동 change: replace delete insert merge
//   화면 단계 phase: guide review reveal · 단계 level: basic advanced
// · 맨 아래에 다른 코드가 쓰는 도우미 함수(G.text.…)가 있다. 문구만 고칠 때는 건드리지 않아도 된다.

window.TEXT = {

  // ── 게임 이름 ───────────────────────────────────────────────
  app: {
    title: '발음 감수실',
    station: '소리방송',
    stationFull: '「소리방송」 뉴스 감수실',
    role: '발음 감수관',
    announcer: '아나운서',
  },

  // ── 여러 화면이 함께 쓰는 것 ─────────────────────────────────
  common: {
    yes: '네', no: '아니요', ok: '확인', close: '닫기', back: '뒤로', cancel: '그만두기',
    on: '켜기', off: '끄기',
    chapterN: '{n}장',
    chapterTitle: '{n}장 {name}',          // '2장 닮은 소리'
    chapterLevel: '{chapter} · {level} 단계', // 화면 머리 위 작은 줄(지침 · 감수 · 조항 공개): '2장 닮은 소리 · 기본 단계'
    timesN: '{n}번',
    countN: '{n}개',
    original: '원문',                       // 실제 조항 원문에 다는 표시(결정 0001)
    gameSetting: '게임 설정',               // 방송국·합침표처럼 게임이 만든 것에 다는 표시(결정 0001)
    soundOn: '소리 켜기',                   // 감수 화면 구석의 소리 단추(지금 꺼져 있을 때)
    soundOff: '소리 끄기',                  // (지금 켜져 있을 때)
    listJoin: '·',                          // 여러 이름을 이을 때('제18항·제19항')
  },

  // ── 장 이름(기획안 3절) ─────────────────────────────────────
  // 3장 이름의 모음은 음운이므로 빗금으로 적었다(기획안은 따옴표로 적음 — 선생님 검토).
  // 7장은 모음 쪽(반모음화 · 모음 축약)을 아직 넣지 않아(결정 0019, findings F8) 거센소리되기만 적는다.
  chapters: {
    1: { name: '첫 출근', topic: { m3: '받침의 일곱 소리, 이어 읽기', h1: '음절의 끝소리 규칙, 연음' } },
    2: { name: '닮은 소리', topic: { m3: '이웃 소리를 닮아 바뀌기', h1: '비음화, /ㄹ/의 비음화, 유음화' } },
    3: { name: '/ㅣ/ 앞에서', topic: { m3: '/ㅣ/ 앞에서 바뀌는 소리', h1: '구개음화' } },
    4: { name: '세게', topic: { m3: '세게 바뀌는 소리', h1: '된소리되기' } },
    5: { name: '자리가 하나', topic: { m3: '받침 하나만 남기', h1: '자음군 단순화, /ㅎ/ 탈락' } },
    6: { name: '덧나는 소리', topic: { m3: '없던 소리가 덧나기', h1: '/ㄴ/ 첨가, 반모음 첨가, 사잇소리' } },
    7: { name: '하나로', topic: { m3: '두 소리가 하나로 줄기', h1: '거센소리되기' } },
    8: { name: '생방송', topic: { m3: '여러 변동이 차례로', h1: '연쇄 변동' } },
  },

  // ── 단계 ─────────────────────────────────────────────────────
  levels: {
    name: { basic: '기본', advanced: '심화' },
    tag: '{level} 단계',                    // '심화 단계'
    hint: {
      basic: { m3: '말의 경계와 닮은 칸 안내가 보여요', h1: '형태소 경계와 닮은 칸 안내가 보여요' },
      advanced: { m3: '경계도 안내도 없이 감수해요', h1: '경계도 안내도 없이 감수해요' },
      // 3~8장 기본 단계: 닮은 칸 안내는 1·2장에만 있다
      basicPlain: { m3: '말의 경계와 이름표가 보여요', h1: '형태소 경계와 이름표가 보여요' },
    },
  },

  // ── 시작 화면(명세 §5) ───────────────────────────────────────
  start: {
    title: '발음 감수실',
    tagline: '「소리방송」 뉴스 감수실 첫 출근 날',
    grade: '학년',
    grades: { m3: '중3', h1: '고1' },
    gradeHint: '학년에 따라 용어만 달라져요',
    chapters: '장 고르기',
    level: '단계',
    comingSoon: '준비 중',
    recommendM3: '중3 추천',
    begin: '감수 시작',
    howto: '게임 방법',
    firstHint: '처음이라면 먼저 보세요',   // 이 기기에서 게임 방법을 아직 안 열었을 때 단추 옆에
    settings: '설정',
    // 이어 하기: 진행 중인 장이 있을 때
    resume: {
      title: '진행 중인 장',
      button: '이어 하기',
      // 요약 한 줄(지금 단계 phase에 따라 하나를 고름). {chapter} = '1장 첫 출근', {level} = '기본'
      summary: {
        guide: '{chapter} · {level} 단계 · 감수 지침',
        review: '{chapter} · {level} 단계 · 원고 {i}/{n}',
        reveal: '{chapter} · {level} 단계 · 조항 공개',
      },
    },
    // 진행 중인 장이 있는데 새 장을 시작할 때 한 번 묻는다
    overwrite: {
      ask: '진행 중인 장이 지워져요. 새로 시작할까요?',
      yes: '새로 시작',
      no: '그만두기',
    },
  },

  // ── 설정(명세 §5-6) ─────────────────────────────────────────
  settings: {
    title: '설정',
    bgm: '배경 음악',
    sfx: '효과음',
    volume: '음량',
    reduceMotion: '움직임 줄이기',
    reduceMotionHint: '송출 연출 없이 곧바로 보여요',
    on: '켜기', off: '끄기',
    savedHint: '설정은 이 기기에만 저장돼요',
    close: '닫기',
  },

  // ── 게임 방법 창(시작 화면·감수 화면에서 엶). 여러 줄을 써도 되는 곳 ──────
  // 단추 이름은 따옴표로 적는다(대괄호는 발음 표시 전용).
  howto: {
    title: '게임 방법',
    open: '게임 방법',
    close: '알겠어요',
    closeX: '닫기',
    sections: [
      {
        title: '오늘은 첫 출근 날',
        lines: [
          '나는 「소리방송」 뉴스 발음 감수관이에요.',
          '아나운서는 원고를 감수관이 교정한 대로만 읽어요.',
          '원고의 표기를 보고, 실제 발음대로 읽히도록 교정 부호로 고쳐요.',
        ],
      },
      {
        title: '한 장은 이렇게 흘러가요',
        lines: [
          '① 감수 지침: 예시 원고를 보고 지침의 빈칸을 골라 채워요.',
          '② 원고 감수: 원고 7개를 하나씩 교정하고 송출해요.',
          '③ 조항 공개: 채운 지침이 실제 「표준 발음법」의 어느 조항인지 알려 줘요.',
          '④ 장 결과: 원고마다 표준 발음과 내 결과를 확인해요.',
          '8장 생방송은 감수 지침 없이 곧바로 원고 감수부터 해요.',
        ],
      },
      {
        title: '음절 블록 읽기',
        lines: {
          m3: [
            '음절마다 첫소리·가운뎃소리·끝소리 자리가 있어요.',
            '첫소리 자리의 ○은 빈 자리예요. 그 자리에는 음운이 없어요.',
            '이중 모음은 반모음 칸과 단모음 칸으로 나뉘어 보여요.',
            '기본 단계에서는 음절 사이에 말의 경계가 + 로 보여요.',
            '머리의 음운 수는 표기의 음운 수 → 지금 음운 수예요. 교정할 때마다 바뀌어요.',
          ],
          h1: [
            '음절마다 초성·중성·종성 자리가 있어요.',
            '초성 자리의 ○은 빈 자리예요. 그 자리에는 음운이 없어요.',
            '이중 모음은 반모음 칸과 단모음 칸으로 나뉘어 보여요.',
            '기본 단계에서는 음절 사이에 형태소 경계가 + 로 보여요.',
            '머리의 음운 수는 표기의 음운 수 → 지금 음운 수예요. 교정할 때마다 바뀌어요.',
          ],
        },
      },
      {
        title: '교정 부호는 넷',
        lines: {
          m3: [
            '고침표: 음운을 다른 음운으로 바꿔요. 음운을 누르고 도표에서 옮겨 갈 칸을 눌러요.',
            '뺌표: 음운을 빼요. 뺄 음운을 눌러요.',
            '넣음표: 없던 음운을 넣어요. 음절 사이 틈을 누르고 /ㄴ/이나 반모음 /j/를 골라요.',
            '합침표: 이웃한 두 음운을 하나로 줄여요. 두 음운을 차례로 누르고 도표에서 결과를 골라요.',
            '합침표는 실제 교정 부호가 아니라 이 게임에서 만든 부호예요.',
            '되돌리기: 마지막 교정 하나를 취소해요.',
          ],
          h1: [
            '고침표(교체): 음운을 누르고 조음 도표에서 옮겨 갈 칸을 눌러요.',
            '뺌표(탈락): 뺄 음운을 눌러요.',
            '넣음표(첨가): 음절 사이 틈을 누르고 /ㄴ/이나 반모음 /j/를 골라요.',
            '합침표(축약): 이웃한 두 음운을 차례로 누르고 조음 도표에서 결과를 골라요.',
            '합침표는 실제 교정 부호가 아니라 이 게임에서 만든 부호예요.',
            '되돌리기: 마지막 교정 하나를 취소해요.',
          ],
        },
      },
      {
        title: '송출하고 신호를 읽어요',
        lines: [
          '교정을 마치면 \'송출\'을 눌러요. 아나운서가 교정한 대로 읽어요.',
          '온에어 성공: 표준 발음과 같고, 교정이 모두 규칙대로예요.',
          '결과는 맞지만 규칙 밖: 발음은 맞는데 규칙에 없는 교정이 섞였어요. \'다시 감수\'로 다시 해 봐요.',
          '몇 곳이 달라요: 표준 발음과 다른 음절이 몇 곳인지만 알려 줘요.',
          '표준 발음이 아니에요: 흔히 그렇게 말하지만 표준 발음은 아니에요. 시청자 게시판에 올라와요.',
          '송출은 몇 번이든 할 수 있어요.',
        ],
      },
      {
        title: '알아 둘 것',
        lines: [
          '고칠 게 없으면 교정 없이 송출하세요.',
          '연음은 교정하지 않아요. 아나운서가 읽을 때 받침을 저절로 이어 읽어요.',
          '어떤 부호든 어느 음운에나 쓸 수 있어요. 맞는지는 송출할 때 알려 줘요.',
          '할 수 없는 교정(넣을 빈자리가 없음, 이웃하지 않은 두 음운)은 한 줄로 알려 주고 기록하지 않아요.',
          '\'다음 원고\'는 언제나 누를 수 있어요. 송출하지 않았으면 한 번 물어봐요.',
        ],
      },
      {
        title: '막히면 \'도움\'',
        lines: [
          '도움은 한 칸씩 열려요: ① 다른 음절 위치 → ② 지침 다시 보기 → ③ 같은 규칙의 다른 낱말 풀이.',
          '도움을 받아도 감점은 없어요. 장 결과에 \'도움 받음\'으로만 적혀요.',
        ],
      },
      {
        title: '기본과 심화',
        lines: {
          m3: [
            '기본: 말의 경계(+)와 이름표가 보이고, 1·2장에서는 고침표의 도표에 닮은 칸이 은은히 보여요.',
            '심화: 경계도 닮은 칸도 보이지 않아요. 스스로 판단해요.',
          ],
          h1: [
            '기본: 형태소 경계(+)와 이름표가 보이고, 1·2장에서는 조음 도표에 닮은 칸이 은은히 보여요.',
            '심화: 경계도 닮은 칸도 보이지 않아요. 스스로 판단해요.',
          ],
        },
      },
    ],
  },

  // ── 감수 지침 화면(명세 §7). 지침 문장 자체는 js/data/guides.js ──────────
  guide: {
    title: '감수 지침',
    from: '선배 감수관이 남긴 지침',
    intro: '예시 원고를 보고 지침의 빈칸을 골라요',
    examples: '예시 원고',
    exampleRow: '{text} → {pron}',          // {pron}은 G.text.pron으로 대괄호를 씌운 발음
    blankAria: '{n}번 빈칸',
    choose: '골라 주세요',
    check: '확인',
    notAll: '빈칸을 모두 골라 주세요',
    wrong: '{n}칸이 맞지 않아요',           // 틀린 칸의 수만. 어느 칸인지는 알리지 않는다
    allRight: '지침을 모두 채웠어요',
    go: '원고 감수 시작',
    // 선배 감수관의 말풍선(한 줄 자리)
    seniorName: '선배 감수관',
    senior: '첫 출근 축하해요! 지침 빈칸부터 채워 볼까요?',
    seniorWrong: '괜찮아요, 예시 원고를 다시 살펴봐요',
    seniorOk: '좋아요! 이제 생방송 원고를 맡길게요',
  },

  // ── 감수 화면(명세 §8) ──────────────────────────────────────
  review: {
    header: {
      script: '원고 {i}/{n}',
      count: '음운 수',
      countValue: '표기 {from} → 지금 {now}',
    },
    scriptLabel: '원고',
    newsLabel: '뉴스 원고',                  // 감수할 말이 들어 있는 뉴스 한 줄의 이름표
    targetHint: '감수할 말',                  // 뉴스 한 줄에서 밑줄 친 말 옆 작은 표
    prompter: '프롬프터',
    studio: '스튜디오',
    // 송출 직전 초읽기(움직임 줄이기면 건너뜀). {n} = 3 · 2 · 1
    cue: { count: '{n}', go: '큐!' },
    // 머리의 큐시트(이번 장 원고 7개의 차례와 결과)
    rundown: {
      title: '오늘의 큐시트',
      now: '{i}번 원고, 지금 감수 중',
      wait: '{i}번 원고, 대기',
      done: '{i}번 원고, {outcome}',
    },
    onAir: 'ON AIR',
    stamp: '감수 완료',                      // 온에어 성공 때 찍히는 감수 도장
    offruleMark: '규칙 밖 교정',              // '결과는 맞지만 규칙 밖'일 때 감수 기록 옆 표시
    marks: { replace: '고침표', delete: '뺌표', insert: '넣음표', merge: '합침표' },
    buttons: {
      undo: '되돌리기',
      broadcast: '송출',
      help: '도움',
      next: '다음 원고',
      toReveal: '조항 공개로',               // 7번째 원고에서 '다음 원고' 자리
      redo: '다시 감수',                     // 이 원고의 교정을 모두 지우고 다시
      howto: '게임 방법',
    },
    // 교정 부호를 고른 뒤 한 줄 자리에 뜨는 안내
    prompt: {
      none: '교정 부호를 골라 주세요',
      replace: '고칠 음운을 눌러 주세요',
      replaceChart: '도표에서 옮겨 갈 칸을 눌러 주세요',
      delete: '뺄 음운을 눌러 주세요',
      insert: '음운을 넣을 틈을 눌러 주세요',
      insertPick: '넣을 음운을 골라 주세요',
      merge: '합칠 음운을 하나 눌러 주세요',
      mergeSecond: '이웃한 음운을 하나 더 눌러 주세요',
      mergeChart: '도표에서 합쳐진 음운을 골라 주세요',
    },
    // 물리적으로 할 수 없는 교정: 한 줄로 알리고 기록하지 않는다(명세 원칙 3). 정답에 관한 정보는 주지 않는다
    notice: {
      noRoom: '이 틈에는 넣을 빈자리가 없어요',
      notAdjacent: '이웃한 두 음운만 합칠 수 있어요',
      samePick: '다른 음운을 하나 더 눌러 주세요',
      nothingToUndo: '되돌릴 교정이 없어요',
    },
    // 감수 기록 한 줄. {no} = ①②…(G.text.circled), {from}·{to}·{a}·{b} = 빗금 표기 음운
    log: {
      title: '감수 기록',
      empty: '아직 교정이 없어요',
      replace: '{no} 고침 {from}→{to}',
      delete: '{no} 뺌 {from}',
      insert: '{no} 넣음 {to}',
      merge: '{no} 합침 {a}·{b}→{to}',
    },
    // [다음 원고]를 송출 전에 눌렀을 때 한 번 묻는다
    skip: {
      ask: '송출하지 않고 넘길까요?',
      yes: '넘기기',
      no: '더 감수하기',
    },
    // 조음 도표(고침표·합침표)
    chart: {
      consonant: { m3: '자음 도표', h1: '자음 체계표' },
      vowel: { m3: '모음 도표', h1: '단모음 체계표' },
      glide: '반모음',
      close: '닫기',
      empty: '국어에 없는 칸',
    },
    // 화면 읽기 도구용 이름(aria). 심화 단계에서는 경계 이름을 DOM에 두지 않는다(명세 §8-1)
    aria: {
      syllable: '{n}번째 음절',
      emptySlot: '빈 자리',
      gap: '{n}번째 음절 뒤 틈',
      cut: { m3: '말의 경계: {label}', h1: '형태소 경계: {label}' },
      cell: '{phoneme}',
      cellCurrent: '{phoneme}, 지금 음운',
      cellLike: '{phoneme}, 닮은 칸',
      lamp: '방송 중',
    },
  },

  // ── 송출 신호(명세 §8-3). 네 가지뿐. 키 = G.rules.broadcast의 kind ─────────
  signal: {
    // 송출 뒤 한 줄
    line: {
      onair: '온에어 성공!',
      offrule: '결과는 맞지만 규칙 밖 교정이 있어요',
      diff: '{n}곳이 달라요',
      nonstandard: '표준 발음이 아니에요',
    },
    // 신호 기호(배지) 옆 짧은 이름
    name: {
      onair: '온에어 성공',
      offrule: '규칙 밖',
      diff: '다름',
      nonstandard: '표준 아님',
    },
    board: '시청자 게시판',                   // '표준 아님' 한 줄이 올라오는 자리 이름
    // 송출 뒤 스튜디오 무대에 크게 뜨는 띠(한 번만 나타남, 계속 움직이지 않음)
    banner: {
      onair: '방송 성공',
      offrule: 'PD 확인 요청',
      diff: '방송 사고',
      nonstandard: '시청자 항의',
    },
    // 송출 뒤 스튜디오 오른쪽에 올라오는 반응(무작위로 두세 개). 발음 · 위치 · 정답을 말하지 않는다
    who: { viewer: '시청자', pd: 'PD' },
    nicks: ['아침형 인간', '라면 국물', '등굣길 버스', '발음 요정', '우리 집 강아지', '야간 자율 학습', '급식 당번'],
    react: {
      onair: ['귀에 쏙쏙 들어와요', '발음 정말 깔끔해요', '오늘도 믿고 봅니다', '감수관님 최고예요', '역시 소리방송!'],
      offrule: ['발음은 맞는데 감수 기록이 이상해요', '규칙에 없는 교정이 섞였어요', '다시 감수해 보면 좋겠어요'],
      diff: ['방금 뭐라고 하신 거예요?', '어딘가 어색하게 들려요', '앵커님 당황하셨어요', '귀를 의심했어요', '다시 한번 감수해 주세요'],
      nonstandard: ['저도 그렇게 말하는데요?', '흔한 발음이지만 표준은 아니래요', '방송에서는 표준 발음으로 부탁해요'],
    },
    // 반응을 누가 올렸는지: 규칙 밖은 PD, 나머지는 시청자
    reactBy: { onair: 'viewer', offrule: 'pd', diff: 'viewer', nonstandard: 'viewer' },
    linking: '연음은 소리가 바뀐 것이 아니에요', // 연음 자리 받침을 교정한 채 송출했을 때(신호 줄 다음)
  },

  // ── 도움 사다리(명세 §8-4). 한 칸씩 학생이 엶, 감점 없음 ───────────────
  help: {
    title: '도움',
    steps: { 1: '다른 음절 위치', 2: '지침 다시 보기', 3: '풀이 예시' },
    stepLabel: '{no} {name}',               // '① 다른 음절 위치'
    nextStep: '다음 도움',
    diffMarked: '다른 음절을 프롬프터에 표시했어요',
    needBroadcast: '먼저 송출해 보세요',     // 아직 송출 안 함 또는 마지막 송출이 '다름'이 아닐 때(도움으로 세지 않음)
    guideTitle: '이 장의 감수 지침',
    noGuide: '이 장에는 감수 지침이 없어요',   // 지침이 없는 장(8장)의 도움 ② · ③(쌍둥이가 없을 때)
    exampleTitle: '같은 규칙을 쓰는 다른 낱말',
    exampleSpelling: '표기',
    examplePron: '발음',
    exampleStep: '{line} · {rule}',          // 감수 기록 한 줄 + 규칙 이름
    noCorrection: '교정 없이 송출',            // 연음 함정의 풀이 예시
    noExample: '같은 풀이 예시가 없어요',
    noPenalty: '도움을 받아도 감점은 없어요',
    used: '도움 받음',
  },

  // ── 조항 공개(명세 §9) ──────────────────────────────────────
  reveal: {
    title: '조항 공개',
    // {articles} = '제18항·제19항·제20항'(G.text.articleList). 여러 줄을 써도 되는 머리 문장
    heading: '선생님이 채운 지침은 실제로 「표준 발음법」 {articles}입니다',
    // 지침이 없는 장(8장): 감수한 원고의 근거 조항만 공개한다
    headingNoGuide: '선생님이 감수한 원고의 근거는 「표준 발음법」 {articles}입니다',
    articleName: '제{n}항',
    articleSub: '제{n}항 {sub}',             // '제20항 다만', '제19항 붙임', '제12항 3'
    source: '「표준 발음법」',
    note: '원문 표시가 붙은 글은 실제 조항이에요',
    mine: '이번에 감수한 말',                 // 조항 예시 가운데 이번 장 원고와 같은 말에 붙는 표
    senior: '선생님이 채운 지침, 실제 조항과 꼭 닮았죠?',
    seniorNoGuide: '오늘 감수한 원고의 근거를 확인해 봐요',
    next: '장 결과 보기',
  },

  // ── 장 결과(명세 §10) ───────────────────────────────────────
  result: {
    title: '장 결과',
    subtitle: '{chapter} · {level} 단계',
    columns: {
      spelling: '표기',
      pron: '표준 발음',
      outcome: '결과',
      broadcasts: '송출',
      help: '도움',
    },
    // 원고 결과(명세 §8-5). 키 = G.rules의 원고 결과 값
    outcome: { onair: '온에어', offrule: '규칙 밖', skip: '넘김' },
    helpUsed: '도움 받음',
    helpNone: '없음',
    totalsTitle: '이번 장 원고의 정답 기준',
    totalsNote: '내가 한 교정이 아니라 표준 발음으로 센 숫자예요',
    changeTitle: { m3: '바뀐 방법별 횟수', h1: '변동 유형별 횟수' },
    changeLine: '{name} {n}번',
    countTitle: '음운 수',
    countLine: '표기 {from} → 발음 {to}',
    articles: '공개된 조항',
    again: '다시 하기',
    chapters: '장 고르기',
    // 장 결과 머리의 방송 마무리 한 줄
    wrap: {
      clean: '오늘 방송, 사고 없이 끝났어요!',
      done: '오늘 방송이 끝났어요. 수고했어요!',
    },
    onairCount: '온에어 {n}/{total}',
  },

  // ── 학년별 긴 이름 ───────────────────────────────────────────
  // 두 학년은 키가 똑같아야 한다. 중3 = 우리말, 고1 = 우리말 + 한글 한자어.
  terms: {
    m3: {
      axis: {
        place: '소리 내는 자리', manner: '소리 내는 방법', strength: '소리의 세기',
        height: '혀의 높이', backness: '혀의 앞뒤', lips: '입술 모양', glide: '반모음',
      },
      place: {
        bilabial: '입술소리', alveolar: '잇몸소리', palatal: '센입천장소리',
        velar: '여린입천장소리', glottal: '목청소리',
      },
      manner: { stop: '파열음', affricate: '파찰음', fricative: '마찰음', nasal: '비음', liquid: '유음' },
      strength: { plain: '예사소리', tense: '된소리', aspirated: '거센소리', none: '세기 구분 없음' },
      height: { high: '혀가 높은 모음', mid: '혀가 중간인 모음', low: '혀가 낮은 모음' },
      backness: { front: '혀의 앞쪽', back: '혀의 뒤쪽' },
      lips: { unrounded: '입술 평평하게', rounded: '입술 둥글게' },
      column: {
        'front-unrounded': '혀 앞·입술 평평', 'front-rounded': '혀 앞·입술 둥글게',
        'back-unrounded': '혀 뒤·입술 평평', 'back-rounded': '혀 뒤·입술 둥글게',
      },
      glide: { j: '반모음 /j/', w: '반모음 /w/' },
      slot: { on: '첫소리', gl: '반모음', nu: '가운뎃소리', co: '끝소리' },
      // 형태소 경계 이름표(명세 §8-1 표). space·null은 이름표 없음
      // stem = 형식 경계 가운데 어간 + 어미 표시가 있는 곳(4·5장 — 결정 0019, 기본 단계만)
      cut: { formal: '뒤에 붙는 말', content: '뜻이 있는 말', sino: '한자어', stem: '어미 앞' },
      // 규칙 이름(도움 ③ 풀이 예시 등). 키 = G.rules 규칙 id
      rule: {
        'coda': '끝소리 규칙',
        'r-nasal-exc': '/ㄹ/을 /ㄴ/으로 읽는 낱말',
        'r-nasal': '/ㄹ/이 /ㄴ/으로 닮기',
        'nasal': '비음으로 닮기',
        'lateral': '/ㄹ/로 닮기',
        'palatal': '/ㅣ/ 앞에서 바뀌기',
        'tense': '된소리로 바뀌기',
        'tense-stem': '어간 받침 뒤 된소리',
        'tense-sino': '한자어 /ㄹ/ 뒤 된소리',
        'tense-adn': '꾸미는 /ㄹ/ 뒤 된소리',
        'tense-cmp': '사잇소리 된소리',
        'tense-link': '겹받침 /ㅅ/의 된소리',
        'simplify': '겹받침 하나 빼기',
        'h-drop': '/ㅎ/ 빼기',
        'n-insert': '/ㄴ/ 덧나기',
        'glide-insert': '반모음 덧나기',
        'aspirate': '거센소리로 줄기',
      },
      // 변동 네 갈래(교정 op)
      change: { replace: '바뀜', delete: '빠짐', insert: '덧남', merge: '줄어듦' },
    },
    h1: {
      axis: {
        place: '조음 위치', manner: '조음 방법', strength: '소리의 세기',
        height: '혀의 높이', backness: '혀의 앞뒤', lips: '입술 모양', glide: '반모음',
      },
      place: {
        bilabial: '입술소리·양순음', alveolar: '잇몸소리·치조음', palatal: '센입천장소리·경구개음',
        velar: '여린입천장소리·연구개음', glottal: '목청소리·후음',
      },
      manner: { stop: '파열음', affricate: '파찰음', fricative: '마찰음', nasal: '비음', liquid: '유음' },
      strength: { plain: '예사소리', tense: '된소리', aspirated: '거센소리', none: '세기 구분 없음' },
      height: { high: '높은 모음·고모음', mid: '중간 모음·중모음', low: '낮은 모음·저모음' },
      backness: { front: '앞쪽 모음·전설 모음', back: '뒤쪽 모음·후설 모음' },
      lips: { unrounded: '평평한 입술·평순 모음', rounded: '둥근 입술·원순 모음' },
      column: {
        'front-unrounded': '전설 평순 모음', 'front-rounded': '전설 원순 모음',
        'back-unrounded': '후설 평순 모음', 'back-rounded': '후설 원순 모음',
      },
      glide: { j: '반모음 /j/', w: '반모음 /w/' },
      slot: { on: '초성', gl: '반모음', nu: '중성', co: '종성' },
      cut: { formal: '형식 형태소', content: '실질 형태소', sino: '한자어', stem: '어간+어미' },
      rule: {
        'coda': '음절의 끝소리 규칙',
        'r-nasal-exc': '유음화의 예외',
        'r-nasal': '/ㄹ/의 비음화',
        'nasal': '비음화',
        'lateral': '유음화',
        'palatal': '구개음화',
        'tense': '된소리되기',
        'tense-stem': '된소리되기(어간 받침)',
        'tense-sino': '된소리되기(한자어)',
        'tense-adn': '된소리되기(관형사형)',
        'tense-cmp': '된소리되기(사잇소리)',
        'tense-link': '된소리되기(겹받침 /ㅅ/)',
        'simplify': '자음군 단순화',
        'h-drop': '/ㅎ/ 탈락',
        'n-insert': '/ㄴ/ 첨가',
        'glide-insert': '반모음 첨가',
        'aspirate': '거센소리되기',
      },
      change: { replace: '교체(바뀜)', delete: '탈락(빠짐)', insert: '첨가(덧남)', merge: '축약(줄어듦)' },
    },
  },

  // ── 학년별 짧은 이름(도표 머리글·결과 표처럼 좁은 곳). 키는 terms와 같은 묶음 ─────
  shortTerms: {
    m3: {
      axis: { place: '자리', manner: '방법', strength: '세기', height: '높이', backness: '앞뒤', lips: '입술', glide: '반모음' },
      place: { bilabial: '두 입술', alveolar: '잇몸', palatal: '센입천장', velar: '여린입천장', glottal: '목청' },
      manner: { stop: '파열', affricate: '파찰', fricative: '마찰', nasal: '비음', liquid: '유음' },
      strength: { plain: '예사', tense: '된', aspirated: '거센', none: '세기 없음' },
      height: { high: '높은', mid: '중간', low: '낮은' },
      backness: { front: '앞', back: '뒤' },
      lips: { unrounded: '평평하게', rounded: '둥글게' },
      column: {
        'front-unrounded': '앞·평평', 'front-rounded': '앞·둥글게',
        'back-unrounded': '뒤·평평', 'back-rounded': '뒤·둥글게',
      },
      glide: { j: '/j/', w: '/w/' },
      slot: { on: '첫', gl: '반', nu: '가운데', co: '끝' },
      change: { replace: '바뀜', delete: '빠짐', insert: '덧남', merge: '줄어듦' },
    },
    h1: {
      axis: { place: '위치', manner: '방법', strength: '세기', height: '높이', backness: '앞뒤', lips: '입술', glide: '반모음' },
      place: { bilabial: '양순음', alveolar: '치조음', palatal: '경구개음', velar: '연구개음', glottal: '후음' },
      manner: { stop: '파열', affricate: '파찰', fricative: '마찰', nasal: '비음', liquid: '유음' },
      strength: { plain: '예사', tense: '된', aspirated: '거센', none: '세기 없음' },
      height: { high: '고모음', mid: '중모음', low: '저모음' },
      backness: { front: '전설', back: '후설' },
      lips: { unrounded: '평순', rounded: '원순' },
      column: {
        'front-unrounded': '전설·평순', 'front-rounded': '전설·원순',
        'back-unrounded': '후설·평순', 'back-rounded': '후설·원순',
      },
      glide: { j: '/j/', w: '/w/' },
      slot: { on: '초성', gl: '반모음', nu: '중성', co: '종성' },
      change: { replace: '교체', delete: '탈락', insert: '첨가', merge: '축약' },
    },
  },

  // 가로로 눕힌 휴대폰처럼 높이가 낮은 화면(음운 해전과 같음)
  rotate: '세로로 돌려 주세요',

  // 그림(assets/img — 화풍 B, Codex로 생성). 화면 읽기 도구용 대체 글
  images: {
    start: '감수실 책상 너머로 생방송 중인 「소리방송」 스튜디오',
    studio: '「소리방송」 뉴스 스튜디오',
    senior: '선배 감수관',
    // 스튜디오의 두 아나운서(상태마다 그림이 바뀜 — 송출 뒤 결과를 그림으로도 보인다)
    anchors: {
      idle: '아나운서 두 사람이 방송을 기다려요',
      read: '아나운서 두 사람이 원고를 읽어요',
      oops: '아나운서 두 사람이 당황했어요',
      happy: '아나운서 두 사람이 활짝 웃어요',
      puzzled: '아나운서 두 사람이 고개를 갸웃해요',
    },
  },
};

// ───────────────────────────────────────────────────────────────
// 도우미 함수(다른 코드가 문구를 꺼낼 때 씀). 문구만 고칠 때는 건드리지 않는다.
// DOM·저장소·타이머를 쓰지 않는다(Node vm에서 그대로 불러 점검).
// ───────────────────────────────────────────────────────────────
window.G = window.G || {};
G.text = (function () {
  const T = window.TEXT;
  const gr = (g) => (g === 'h1' ? 'h1' : 'm3'); // 모르는 값이면 중3
  const isGradePair = (v) => !!v && typeof v === 'object' && !Array.isArray(v)
    && Object.keys(v).length === 2 && 'm3' in v && 'h1' in v;
  // { m3, h1 } 꼴을 만나면 그 학년 쪽을 고른다(깊이 끝까지). 원본을 바꾸지 않고 새 값을 돌려준다.
  function resolve(v, grade) {
    if (isGradePair(v)) return resolve(v[gr(grade)], grade);
    if (Array.isArray(v)) return v.map((x) => resolve(x, grade));
    if (v && typeof v === 'object') {
      const o = {};
      Object.keys(v).forEach((k) => { o[k] = resolve(v[k], grade); });
      return o;
    }
    return v;
  }
  const CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';

  const api = {
    // {이름} 자리 채우기: fill('{n}곳이 달라요', { n: 2 }) → '2곳이 달라요'
    fill(tpl, vars) {
      return String(tpl).replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] != null ? String(vars[k]) : m));
    },
    // 점으로 이은 경로로 꺼내기(학년 꼴은 그 학년 쪽): get('howto.sections', 'h1'). 없으면 undefined
    get(path, grade) {
      let v = T;
      for (const k of String(path).split('.')) {
        if (v == null) return undefined;
        if (isGradePair(v)) v = v[gr(grade)];
        v = v[k];
      }
      return resolve(v, grade);
    },
    // 문구 한 줄 꺼내 채우기: t('signal.line.diff', { n: 2 }) → '2곳이 달라요'. 없으면 ''
    t(path, vars, grade) {
      const v = api.get(path, grade);
      return typeof v === 'string' ? api.fill(v, vars) : '';
    },
    // 학년별 긴 이름: term('h1', 'place', 'velar') → '여린입천장소리·연구개음'
    term(grade, group, id) {
      const g = T.terms[gr(grade)][group];
      return g && g[id] != null ? g[id] : '';
    },
    // 학년별 짧은 이름: short('m3', 'manner', 'stop') → '파열'
    short(grade, group, id) {
      const g = T.shortTerms[gr(grade)][group];
      return g && g[id] != null ? g[id] : '';
    },
    // 음운 표기: phoneme('ㄱ') → '/ㄱ/'
    phoneme(id) { return '/' + id + '/'; },
    // 발음 표기: pron('궁물') → '[궁물]'
    pron(p) { return '[' + p + ']'; },
    // 동그라미 숫자: circled(1) → '①'(20 넘으면 '(21)')
    circled(n) { return n >= 1 && n <= CIRCLED.length ? CIRCLED[n - 1] : '(' + n + ')'; },
    // 장 이름: chapterName(2) → '닮은 소리', chapterTitle(2) → '2장 닮은 소리'
    chapterName(n) { return (T.chapters[n] && T.chapters[n].name) || ''; },
    chapterTitle(n) { return api.fill(T.common.chapterTitle, { n, name: api.chapterName(n) }); },
    chapterTopic(grade, n) { return T.chapters[n] ? T.chapters[n].topic[gr(grade)] : ''; },
    // 단계 이름: levelName('advanced') → '심화'
    levelName(level) { return T.levels.name[level] || ''; },
    // 송출 신호 한 줄과 이름: signal('diff', { n: 2 }) → '2곳이 달라요'
    signal(kind, vars) { return T.signal.line[kind] ? api.fill(T.signal.line[kind], vars) : ''; },
    signalName(kind) { return T.signal.name[kind] || ''; },
    // 원고 결과 이름: outcome('skip') → '넘김'
    outcome(kind) { return T.result.outcome[kind] || ''; },
    // 형태소 경계 이름표: cutLabel('m3', 'formal') → '뒤에 붙는 말'. space·null은 ''(이름표 없음)
    cutLabel(grade, kind) { return api.term(grade, 'cut', kind); },
    // 규칙 이름: rule('h1', 'nasal') → '비음화'
    rule(grade, id) { return api.term(grade, 'rule', id); },
    // 변동 이름: change('h1', 'replace') → '교체(바뀜)', change('h1', 'replace', true) → '교체'
    change(grade, op, short) { return short ? api.short(grade, 'change', op) : api.term(grade, 'change', op); },
    // 조항 이름: articleName('18') → '제18항', articleName('20-다만') → '제20항 다만'
    articleName(id) {
      const m = /^(\d+)(?:-(.+))?$/.exec(String(id));
      if (!m) return String(id);
      return m[2] ? api.fill(T.reveal.articleSub, { n: m[1], sub: m[2] }) : api.fill(T.reveal.articleName, { n: m[1] });
    },
    // 조항 목록: articleList(['18', '19']) → '제18항·제19항'
    articleList(ids) { return (ids || []).map(api.articleName).join(T.common.listJoin); },
    // 감수 기록 한 줄: logLine(1, { op: 'replace', from: 'ㄷ', to: 'ㄴ' }) → '① 고침 /ㄷ/→/ㄴ/'
    //   merge는 from: [앞 음운, 뒤 음운]
    logLine(i, c) {
      const tpl = c && T.review.log[c.op];
      if (!tpl || typeof tpl !== 'string') return '';
      const from = Array.isArray(c.from) ? c.from : [c.from];
      return api.fill(tpl, {
        no: api.circled(i),
        from: c.from != null && !Array.isArray(c.from) ? api.phoneme(c.from) : '',
        to: c.to != null ? api.phoneme(c.to) : '',
        a: from[0] != null ? api.phoneme(from[0]) : '',
        b: from[1] != null ? api.phoneme(from[1]) : '',
      });
    },
  };
  api.sound = api.phoneme; // 음운 해전과 같은 이름
  return api;
})();
