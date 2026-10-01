// 화면 문구(js/data/text.js) 점검 — 브라우저 없이(명세 §13·§18, 원칙 §3-6).
//   출처: 「음운 해전」 pblsketch/sori-haejeon tests/check-text.mjs의 방식을 이 게임의 문구에 맞게 다시 썼다.
//   · 파일이 document 없이 Node vm에서 불러지고 window.TEXT와 G.text 도우미가 있는지
//   · 학년 꼴 { m3, h1 }마다 두 학년의 키 구조와 {이름} 자리가 같은지(terms·shortTerms 포함)
//   · 금지 낱말·실제 방송사 이름이 문구에도, 파일 전체(주석 포함)에도 없는지
//   · 한자가 파일 어디에도 없는지
//   · 문구 안의 음운이 모두 빗금 표기(/ㄱ/)인지, 대괄호(발음 표시)를 문구에 쓰지 않았는지
//   · 문구는 한 줄(줄바꿈 없음), 한 줄 자리 문구는 대략 30자 이내인지
//   · 명세가 정한 문구(신호 넷, 연음 안내, 도움, 넘김·덮어쓰기 확인, 경계 이름표 표 …)가 그대로 있는지
//   · 도우미 함수가 약속대로 동작하는지
import fs from 'node:fs';
import path from 'node:path';
import { loadScripts, check, done, ROOT } from './lib/load.mjs';

const FILE = 'js/data/text.js';
check(fs.existsSync(path.join(ROOT, FILE)), `${FILE}이 있다`);
let ctx = null;
try {
  ctx = loadScripts(['js/core/util.js', FILE]);
} catch (e) {
  check(false, `${FILE}을 document 없이 불러온다: ${e.message}`);
  done('check-text');
}
const T = ctx.TEXT;
const H = ctx.G && ctx.G.text;
check(T && typeof T === 'object', 'window.TEXT가 있다');
check(H && typeof H.t === 'function' && typeof H.fill === 'function' && typeof H.term === 'function', 'G.text 도우미가 있다');
if (!T || !H) done('check-text');
const src = fs.readFileSync(path.join(ROOT, FILE), 'utf8');
check(!/\bdocument\b|localStorage|setTimeout|setInterval/.test(src.replace(/\/\/.*$/gm, '')), '문구 파일은 DOM·저장소·타이머를 쓰지 않는다');

// ── 문구 모으기: [경로, 문구] ──
const strings = [];
(function walk(v, p) {
  if (typeof v === 'string') { strings.push([p, v]); return; }
  if (v && typeof v === 'object') for (const k of Object.keys(v)) walk(v[k], p + '.' + k);
})(T, 'TEXT');
check(strings.length > 200, `문구 수 ${strings.length}`);

// ── 1. 학년 꼴 { m3, h1 }: 두 학년의 키 구조와 {이름} 자리가 같다 ──
const isPair = (v) => !!v && typeof v === 'object' && !Array.isArray(v)
  && Object.keys(v).length === 2 && 'm3' in v && 'h1' in v;
const holes = (s) => JSON.stringify([...new Set(String(s).match(/\{\w+\}/g) || [])].sort());
// 모양: 문자열이면 'S' + 자리 목록, 배열·객체면 키마다 모양
function shape(v) {
  if (typeof v === 'string') return 'S' + holes(v);
  if (Array.isArray(v)) return '[' + v.map(shape).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map((k) => k + ':' + shape(v[k])).join(',') + '}';
  return typeof v;
}
const pairs = [];
(function findPairs(v, p) {
  if (isPair(v)) pairs.push([p, v]);
  if (v && typeof v === 'object') for (const k of Object.keys(v)) findPairs(v[k], p + '.' + k);
})(T, 'TEXT');
check(pairs.length >= 15, `학년 꼴 수 ${pairs.length}`);
for (const [p, v] of pairs) check(shape(v.m3) === shape(v.h1), `학년 키 구조·{이름} 자리 같음: ${p}`);
check(pairs.some(([p]) => p === 'TEXT.terms') && pairs.some(([p]) => p === 'TEXT.shortTerms'), 'terms·shortTerms가 학년 꼴');
// 학년 꼴이 아닌데 한쪽 학년만 있는 실수(m3만, h1만)
(function lone(v, p) {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const ks = Object.keys(v);
    if (ks.includes('m3') !== ks.includes('h1')) check(false, `학년 한쪽만 있음: ${p}`);
    for (const k of ks) lone(v[k], p + '.' + k);
  } else if (Array.isArray(v)) v.forEach((x, i) => lone(x, p + '.' + i));
})(T, 'TEXT');

// ── 2. 금지 낱말(명세 §3-6) + 실제 방송사 이름 — 문구와 파일 전체(주석 포함) ──
const FORBIDDEN = ['글자', '훈민정음', '해례', '제자 원리', '제자원리', '상형', '가획', '중세', '조선 수군', '조선',
  '판옥선', '협선', '척후선', '게임오버', '게임 오버'];
const BROADCASTERS = ['KBS', 'MBC', 'SBS', 'EBS', 'JTBC', 'YTN', 'MBN', 'OBS', 'CBS', 'BBC', 'CNN', 'NHK',
  '채널A', '채널에이', '연합뉴스', '한국방송', '문화방송', '서울방송', '교육방송'];
for (const w of [...FORBIDDEN, ...BROADCASTERS]) {
  const bad = strings.filter(([, s]) => s.includes(w));
  check(!bad.length, `금지 낱말 '${w}' 없음(문구) ${bad.map((b) => b[0]).join(', ')}`);
  check(!src.includes(w), `금지 낱말 '${w}' 없음(파일)`);
}
check(T.app.station === '소리방송' && src.includes('「소리방송」'), '방송국은 가상의 「소리방송」');

// ── 3. 한자 없음(파일 전체) ──
const HAN = /\p{Script=Han}/u;
check(HAN.test('音') && !HAN.test('「소리방송」 ① ○ ·'), '한자 점검 자체가 동작');
const hanLines = src.split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => HAN.test(l));
check(!hanLines.length, `한자 없음(파일) ${hanLines.map(([n]) => n + '행').join(', ')}`);

// ── 4. 빗금 표기·대괄호·한 줄 ──
// 한글 자모(호환 자모 ㄱ-ㆎ, 조합용 자모)가 /x/ 꼴이 아닌 채로 나오면 실패. 완성된 음절(가-힣)은 상관없다.
const JAMO = '\\u3131-\\u318E\\u1100-\\u11FF';
const slashed = new RegExp(`/[${JAMO}]/`, 'g');
const lone = new RegExp(`[${JAMO}]`);
check(!lone.test('가/ㄱ/나'.replace(slashed, '')) && lone.test('ㄱ과 /ㅇ/'.replace(slashed, '')), '빗금 점검 자체가 동작');
for (const [p, s] of strings) {
  check(!lone.test(s.replace(slashed, '')), `빗금 없는 음운 표기: ${p} = ${s}`);
  check(!/[\[\]]/.test(s), `대괄호(발음 표시)는 문구에 쓰지 않음: ${p} = ${s}`);
  check(!/[\r\n]/.test(s), `문구는 한 줄: ${p}`);
  check(s.trim().length > 0, `빈 문구 없음: ${p}`);
}

// 한 줄 자리 문구 길이. 여러 줄을 써도 되는 곳(명세 §13): 게임 방법 창 본문, 조항 공개 머리 문장.
// 그 밖의 모든 문구(신호·안내·확인·단추·머리·이름표)는 한 줄 자리로 보고 대략 30자 이내로 쓴다.
// {이름} 자리는 채운 값이 대개 짧으므로 2자로 센다(예: {n} → '2'). 공백 포함.
const MAX = 30;
const MULTI_OK = [/^TEXT\.howto\.sections\./, /^TEXT\.reveal\.heading$/];
const len = (s) => [...s.replace(/\{\w+\}/g, '00')].length;
for (const [p, s] of strings) {
  if (MULTI_OK.some((r) => r.test(p))) continue;
  check(len(s) <= MAX, `한 줄 자리 ${MAX}자 이내: ${p} (${len(s)}자) ${s}`);
}

// ── 5. 명세가 정한 문구 ──
const eq = (a, b, m) => check(a === b, `${m}: '${a}' = '${b}'`);
// 신호 넷(원칙 4, §8-3) — 키는 G.rules.broadcast의 kind
const KINDS = ['diff', 'nonstandard', 'offrule', 'onair'];
eq(JSON.stringify(Object.keys(T.signal.line).sort()), JSON.stringify(KINDS), '신호 한 줄은 네 가지');
eq(JSON.stringify(Object.keys(T.signal.name).sort()), JSON.stringify(KINDS), '신호 이름은 네 가지');
check(T.signal.line.onair.includes('온에어 성공'), '온에어 성공');
check(T.signal.line.offrule.startsWith('결과는 맞지만 규칙 밖'), '결과는 맞지만 규칙 밖');
eq(H.signal('diff', { n: 2 }), '2곳이 달라요', 'n곳이 달라요');
eq(H.signal('nonstandard'), '표준 발음이 아니에요', '표준 아님');
eq(T.signal.board, '시청자 게시판', '시청자 게시판');
eq(T.signal.linking, '연음은 소리가 바뀐 것이 아니에요', '연음 안내');
// 도움(§8-4)
eq(T.help.needBroadcast, '먼저 송출해 보세요', '도움 ① 송출 전');
eq(T.help.noExample, '같은 풀이 예시가 없어요', '도움 ③ 예시 없음');
eq(JSON.stringify(Object.keys(T.help.steps)), JSON.stringify(['1', '2', '3']), '도움 사다리 세 칸');
// 넘김·덮어쓰기·지침·게임 방법 표시(§5, §7, §8-5)
eq(T.review.skip.ask, '송출하지 않고 넘길까요?', '넘김 확인');
check(T.start.overwrite.ask.startsWith('진행 중인 장이 지워져요'), '덮어쓰기 확인');
eq(H.t('guide.wrong', { n: 2 }), '2칸이 맞지 않아요', '틀린 칸 수');
eq(T.start.firstHint, '처음이라면 먼저 보세요', '처음이라면');
eq(T.rotate, '세로로 돌려 주세요', '세로로 돌려');
// 할 수 없는 교정 안내(원칙 3)
check(!!T.review.notice.noRoom && !!T.review.notice.notAdjacent, '할 수 없는 교정 안내 둘');
// 교정 부호 넷과 단추(§8-1)
eq(JSON.stringify(T.review.marks), JSON.stringify({ replace: '고침표', delete: '뺌표', insert: '넣음표', merge: '합침표' }), '교정 부호 넷');
for (const k of ['undo', 'broadcast', 'help', 'next', 'redo', 'howto']) check(!!T.review.buttons[k], `감수 단추 ${k}`);
for (const k of ['soundOn', 'soundOff']) check(!!T.common[k], `소리 켜기/끄기 ${k}`);
// 게임 방법 창: 두 학년 모두 '고칠 게 없으면 교정 없이 송출하세요'와 연음을 교정하지 않는다는 줄
for (const g of ['m3', 'h1']) {
  const lines = H.get('howto.sections', g).flatMap((s) => s.lines);
  check(H.get('howto.sections', g).every((s) => typeof s.title === 'string' && Array.isArray(s.lines) && s.lines.every((l) => typeof l === 'string')), `게임 방법 모양 ${g}`);
  check(lines.some((l) => l.includes('고칠 게 없으면 교정 없이 송출하세요')), `게임 방법: 교정 없이 송출 ${g}`);
  check(lines.some((l) => l.includes('연음은 교정하지 않아요')), `게임 방법: 연음 교정 안 함 ${g}`);
  check(lines.some((l) => l.includes('합침표') && l.includes('게임에서 만든')), `게임 방법: 합침표는 게임 설정 ${g}`);
}
// 장 이름 8개(기획안 3절, 3장 모음은 빗금)
const CH = ['첫 출근', '닮은 소리', '/ㅣ/ 앞에서', '세게', '자리가 하나', '덧나는 소리', '하나로', '생방송'];
CH.forEach((name, i) => eq(H.chapterName(i + 1), name, `${i + 1}장 이름`));
eq(H.chapterTitle(2), '2장 닮은 소리', '장 제목 꼴');
check(!!T.start.comingSoon && !!T.start.recommendM3, '준비 중·중3 추천');
eq(JSON.stringify(T.levels.name), JSON.stringify({ basic: '기본', deep: '심화' }), '단계 이름');
for (const ph of ['guide', 'review', 'reveal']) check(!!T.start.resume.summary[ph], `이어 하기 요약 ${ph}`);
eq(H.t('start.resume.summary.review', { chapter: H.chapterTitle(1), level: H.levelName('basic'), i: 3, n: 7 }),
  '1장 첫 출근 · 기본 단계 · 원고 3/7', '이어 하기 요약 꼴');
for (const k of ['bgm', 'sfx', 'volume', 'reduceMotion']) check(!!T.settings[k], `설정 ${k}`);
// 형태소 경계 이름표(명세 §8-1 표)
const CUTS = {
  m3: { formal: '뒤에 붙는 말', content: '뜻이 있는 말', sino: '한자어' },
  h1: { formal: '형식 형태소', content: '실질 형태소', sino: '한자어' },
};
for (const g of ['m3', 'h1']) {
  for (const k of Object.keys(CUTS[g])) eq(H.cutLabel(g, k), CUTS[g][k], `경계 이름표 ${g} ${k}`);
  eq(H.cutLabel(g, 'space'), '', `띄어쓰기는 이름표 없음 ${g}`);
  eq(H.cutLabel(g, null), '', `경계 없음은 이름표 없음 ${g}`);
}
// 장 결과(§10)
eq(JSON.stringify(Object.keys(T.result.outcome).sort()), JSON.stringify(['offrule', 'onair', 'skip']), '원고 결과 셋');
eq(H.outcome('onair') + H.outcome('offrule') + H.outcome('skip'), '온에어규칙 밖넘김', '원고 결과 이름');
for (const k of ['spelling', 'pron', 'outcome', 'broadcasts', 'help']) check(!!T.result.columns[k], `결과 칸 ${k}`);
for (const k of ['again', 'chapters', 'articles', 'totalsTitle', 'countLine']) check(!!T.result[k], `결과 ${k}`);
// 조항 공개(§9)
check(T.reveal.heading.includes('「표준 발음법」') && T.reveal.heading.includes('{articles}'), '조항 공개 머리 문장');
eq(T.common.original, '원문', '원문 표시');
// 그림 자리
for (const k of ['start', 'room', 'announcer']) check(!!T.images[k], `그림 자리 대체 글 ${k}`);

// ── 6. 학년별 용어(중3 = 우리말, 고1 = 우리말 + 한글 한자어) ──
const REQ = {
  axis: ['place', 'manner', 'strength', 'height', 'backness', 'lips', 'glide'],
  place: ['bilabial', 'alveolar', 'palatal', 'velar', 'glottal'],
  manner: ['stop', 'affricate', 'fricative', 'nasal', 'liquid'],
  strength: ['plain', 'tense', 'aspirated', 'none'],
  height: ['high', 'mid', 'low'],
  backness: ['front', 'back'],
  lips: ['unrounded', 'rounded'],
  column: ['front-unrounded', 'front-rounded', 'back-unrounded', 'back-rounded'],
  glide: ['j', 'w'],
  slot: ['on', 'gl', 'nu', 'co'],
  change: ['replace', 'delete', 'insert', 'merge'],
};
const REQ_LONG = { ...REQ, cut: ['formal', 'content', 'sino'], rule: ['coda', 'r-nasal-exc', 'r-nasal', 'nasal', 'lateral'] };
for (const [table, req] of [['terms', REQ_LONG], ['shortTerms', REQ]]) {
  for (const g of ['m3', 'h1']) for (const grp of Object.keys(req)) for (const id of req[grp]) {
    const v = T[table][g] && T[table][g][grp] && T[table][g][grp][id];
    check(typeof v === 'string' && v.length > 0, `${table}.${g}.${grp}.${id}`);
  }
}
const SINO = { bilabial: '양순음', alveolar: '치조음', palatal: '경구개음', velar: '연구개음', glottal: '후음' };
const NATIVE = { bilabial: '입술소리', alveolar: '잇몸소리', palatal: '센입천장소리', velar: '여린입천장소리', glottal: '목청소리' };
for (const id of Object.keys(SINO)) {
  eq(H.term('m3', 'place', id), NATIVE[id], `중3 위치 용어 ${id}`);
  const h = H.term('h1', 'place', id);
  check(h.includes(NATIVE[id]) && h.includes(SINO[id]), `고1 위치 용어 병기 ${id}: ${h}`);
}
// 변동 네 갈래와 규칙 이름: 고1만 한자어 용어
const SINO_CHANGE = { replace: '교체', delete: '탈락', insert: '첨가', merge: '축약' };
for (const op of Object.keys(SINO_CHANGE)) {
  check(H.change('h1', op).includes(SINO_CHANGE[op]) && H.change('h1', op, true) === SINO_CHANGE[op], `고1 변동 이름 ${op}`);
  check(!H.change('m3', op).includes(SINO_CHANGE[op]), `중3 변동 이름은 우리말 ${op}`);
}
for (const [id, w] of [['nasal', '비음화'], ['lateral', '유음화'], ['r-nasal', '비음화']]) {
  check(H.rule('h1', id).includes(w), `고1 규칙 이름 ${id}`);
  check(!H.rule('m3', id).includes(w), `중3 규칙 이름은 우리말 ${id}`);
}
eq(H.term('h1', 'slot', 'co'), '종성', '고1 자리 이름');
eq(H.term('m3', 'slot', 'co'), '끝소리', '중3 자리 이름');

// ── 7. 도우미 ──
eq(H.fill('{n}곳', { n: 3 }), '3곳', 'fill');
eq(H.fill('{n}곳', {}), '{n}곳', 'fill: 값이 없으면 자리 그대로');
eq(H.phoneme('ㄱ'), '/ㄱ/', 'phoneme'); eq(H.sound('j'), '/j/', 'sound(별칭)');
eq(H.pron('궁물'), '[궁물]', 'pron');
eq(H.circled(1) + H.circled(20) + H.circled(21), '①⑳(21)', 'circled');
eq(H.t('signal.line.diff', { n: 4 }), '4곳이 달라요', 't');
eq(H.t('없는.경로'), '', 't: 없는 경로');
eq(H.get('review.chart.consonant', 'h1'), T.review.chart.consonant.h1, 'get: 학년 꼴은 그 학년');
eq(H.get('review.chart.consonant', 'x'), T.review.chart.consonant.m3, 'get: 모르는 학년은 중3');
eq(H.get('terms.slot.co', 'h1'), '종성', 'get: 경로 중간의 학년 꼴');
eq(H.t('chapters.2.topic', null, 'h1'), T.chapters[2].topic.h1, 't: 학년');
eq(H.chapterTopic('m3', 1), T.chapters[1].topic.m3, 'chapterTopic');
check(T.chapters[1].topic && typeof T.chapters[1].topic === 'object', 'get이 원본을 바꾸지 않음');
eq(H.term('x', 'place', 'velar'), '여린입천장소리', '모르는 학년은 중3(term)');
eq(H.short('h1', 'manner', 'stop'), '파열', 'short');
eq(H.levelName('deep'), '심화', 'levelName');
eq(H.signalName('offrule'), '규칙 밖', 'signalName');
eq(H.articleName('18'), '제18항', 'articleName');
eq(H.articleName('20-다만'), '제20항 다만', 'articleName 다만');
eq(H.articleList(['18', '19', '20', '20-다만', '21']), '제18항·제19항·제20항·제20항 다만·제21항', 'articleList');
eq(H.fill(T.reveal.heading, { articles: H.articleList(['18']) }), '선생님이 채운 지침은 실제로 「표준 발음법」 제18항입니다', '조항 공개 머리 꼴');
eq(H.logLine(1, { op: 'replace', from: 'ㄷ', to: 'ㄴ' }), '① 고침 /ㄷ/→/ㄴ/', 'logLine 고침(명세 §8-1 예)');
eq(H.logLine(2, { op: 'delete', from: 'ㄹ' }), '② 뺌 /ㄹ/', 'logLine 뺌');
eq(H.logLine(3, { op: 'insert', to: 'j' }), '③ 넣음 /j/', 'logLine 넣음');
eq(H.logLine(4, { op: 'merge', from: ['ㅎ', 'ㄱ'], to: 'ㅋ' }), '④ 합침 /ㅎ/·/ㄱ/→/ㅋ/', 'logLine 합침');
eq(H.logLine(1, { op: 'nope' }), '', 'logLine 모르는 op');
// 도우미가 내놓은 문구도 빗금 표기를 지킨다
for (const s of [H.logLine(1, { op: 'replace', from: 'ㄱ', to: 'ㅇ' }), H.rule('m3', 'r-nasal'), H.chapterName(3)]) {
  check(!lone.test(s.replace(slashed, '')), `도우미 문구 빗금 표기: ${s}`);
}

done('check-text');
