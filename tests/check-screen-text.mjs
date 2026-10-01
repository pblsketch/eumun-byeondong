// 실제 화면 글 점검(aside) — 명세 §3-6 · §13 · §18 '화면 글 금지 낱말 없음'.
//   문구 파일 · 지침 · 조항 데이터는 Node 점검(check-text · check-data · check-rules)이 이미 본다. 여기서는 진짜 화면을 돌며
//   화면에 실제로 나온 글(숨긴 글 포함 textContent) + aria-label · title · alt · placeholder + 문서 제목을 모아 본다:
//     · 금지 낱말(tests/lib/words.mjs — 음운 해전과 같은 목록, '글자' · '게임오버' 포함)과 실제 방송사 이름이 없음
//     · 한자가 없음
//     · 음운은 빗금 표기(/ㄱ/): 빗금 없이 홀로 쓴 자모가 없음 — 조항 원문(.rv-art-body)만 원문 그대로라 뺀다(명세 §13)
//     · 채우지 않은 {이름} 자리 · undefined · null · NaN이 없음
//   도는 화면: 시작(이어 하기 카드 · 덮어쓰기 확인) · 게임 방법 · 설정 · 감수 지침(틀림 · 다 맞음) · 감수(도표 · 넣을 음운 · 도움 ①②③ ·
//   신호 넷 · 연음 안내 · 넘김 확인 · 게임 방법) · 조항 공개 · 장 결과 · 세로로 돌려 주세요 — 중3 · 기본, 고1 · 심화 두 번.
import { step, frame } from './aside.mjs';
import { DRIVER } from './lib/drive.mjs';
import { RUNS } from './lib/runs.mjs';
import { REVIEW } from './lib/review.mjs';
import { FLOW } from './lib/flow.mjs';
import { FORBIDDEN, BROADCASTERS } from './lib/words.mjs';

const J = JSON.stringify;
const SCAN = String.raw`
if (!D.scanText) {
  D.scanned = 0;
  D.scanText = (tag) => {
    D.scanned++;
    const d = D.d();
    const all = D.screenText();
    WORDS.forEach((x) => { if (all.indexOf(x) >= 0) D.bad(tag + ': 금지 낱말 · 방송사 이름이 화면에 — ' + x); });
    const han = all.match(/\p{Script=Han}/u);
    if (han) D.bad(tag + ': 한자가 화면에 — ' + han[0]);
    const hole = all.match(/\{\w+\}/);
    if (hole) D.bad(tag + ': 채우지 않은 자리 ' + hole[0]);
    const junk = all.match(/\b(undefined|null|NaN)\b/);
    if (junk) D.bad(tag + ': 화면에 ' + junk[0]);
    // 빗금 표기: 조항 원문을 뺀 화면 글과 속성
    const clone = d.body.cloneNode(true);
    clone.querySelectorAll('.rv-art-body, script, style').forEach((n) => n.remove());
    const attrs = [];
    clone.querySelectorAll('[aria-label], [title], [alt], [placeholder]').forEach((e) => ['aria-label', 'title', 'alt', 'placeholder'].forEach((a) => { if (e.hasAttribute(a)) attrs.push(e.getAttribute(a)); }));
    const txt = clone.textContent + '\n' + attrs.join('\n');
    const lone = txt.replace(/\/[ㄱ-ㆎ]\//g, '').match(/.{0,8}[ㄱ-ㆎᄀ-ᇿ].{0,8}/);
    if (lone) D.bad(tag + ': 빗금 없이 쓴 음운 — "' + lone[0].replace(/\s+/g, ' ') + '"');
  };
}
`.replace('WORDS', J([...FORBIDDEN, ...BROADCASTERS]));

const open = (v, w, h) => `
const ${v} = await openTab(${J(frame(w, h, 'index.html'))});
await ${v}.evaluate(() => frameReady);
await ${v}.evaluate(() => { ${DRIVER} });
await ${v}.evaluate(() => { ${RUNS} });
await ${v}.evaluate(() => { ${REVIEW} });
await ${v}.evaluate(() => { ${FLOW} });
await ${v}.evaluate(() => { ${SCAN} });
`;
const fin = (v) => `
for (const __i of await page.evaluate(() => window.__infos || [])) console.log('INFO ' + __i);
if (${v}.length) console.log('FAIL ' + ${v}.join('\\nFAIL '));
else console.log('PASS');
`;

const walk = (v, ch, grade, level) => {
  const o = J({ ch, grade, level });
  const g = J(grade);
  return `
  e${v}.push(...await ${v}.evaluate(async () => { await D.fresh(); D.G().save.setSettings({ reduceMotion: true }); return D.take(); }));
  e${v}.push(...await ${v}.evaluate(async () => {
    const tag = ${J(`${ch}장 ${grade} ${level}`)};
    D.tapSel('[data-grade=' + ${J(J(grade))} + ']', '학년');
    D.scanText(tag + ' 시작');
    D.tapSel('[data-act="howto"]', '게임 방법'); D.scanText(tag + ' 게임 방법'); D.tapSel('.howto-ok', '알겠어요');
    D.tapSel('[data-act="settings"]', '설정'); D.scanText(tag + ' 설정'); D.tapSel('[data-act="settings-close"]', '설정 닫기');
    await D.startChapter(${o});
    D.scanText(tag + ' 지침');
    D.tapSel('[data-act="guide-check"]', '확인(덜 고름)'); D.scanText(tag + ' 지침 덜 고름');
    let first = true;
    D.pickGuide(${ch}, (gd, b) => { const a = gd.blanks[b].answer; if (first) { first = false; return (a + 1) % gd.blanks[b].options.length; } return a; });
    D.tapSel('[data-act="guide-check"]', '확인(한 칸 틀림)'); D.scanText(tag + ' 지침 틀림');
    await D.solveGuide(${ch}); D.scanText(tag + ' 지침 다 맞음');
    await D.enterReview(); D.scanText(tag + ' 감수 처음');
    D.act('rw-next'); await D.until(() => D.$('.rw-confirm'), 2000, '넘김 확인'); D.scanText(tag + ' 넘김 확인'); D.act('rw-skip-no');
    D.tapSel('.rw-howto', '감수 화면 게임 방법'); await D.until(() => D.$('.howto'), 2000, '게임 방법 창'); D.scanText(tag + ' 감수 게임 방법'); D.tapSel('.howto-ok', '알겠어요');
    return D.take();
  }));
  e${v}.push(...await ${v}.evaluate(async () => {
    const tag = ${J(`${ch}장 ${grade} ${level}`)};
    await D.load('먹는');
    D.mark('replace'); D.slot('0.co'); await D.until(() => D.sheet() && D.$('.rw-sheet .ch-cell'), 2000, '도표'); D.scanText(tag + ' 자음표');
    D.tapSel('.rw-sheet .ch-close', '도표 닫기');
    D.slot('0.nu'); await D.until(() => D.$('.rw-sheet .ch-part[data-part="vowel"]'), 2000, '모음표'); D.scanText(tag + ' 모음표');
    D.tapSel('.rw-sheet .ch-close', '도표 닫기');
    D.mark('insert'); D.gap(0); await D.until(() => D.sheet() && D.$('.rw-ins'), 2000, '넣을 음운'); D.scanText(tag + ' 넣을 음운');
    D.ins('ㄴ'); D.scanText(tag + ' 빈자리 없음');
    D.mark('merge'); D.slot('0.on'); D.slot('1.nu'); D.scanText(tag + ' 이웃 아님');
    D.act('rw-help'); await D.until(() => D.$('.rw-help') && D.visible(D.$('.rw-help')), 2000, '도움');
    D.tapSel('.rw-help-step[data-step="1"]', '도움 ①'); D.scanText(tag + ' 도움 ① 송출 전');
    await D.send('다름'); D.scanText(tag + ' 다름');
    D.tapSel('.rw-help-step[data-step="1"]', '도움 ①'); D.scanText(tag + ' 도움 ①');
    D.tapSel('.rw-help-step[data-step="2"]', '도움 ②'); D.scanText(tag + ' 도움 ②');
    D.tapSel('.rw-help-step[data-step="3"]', '도움 ③'); D.scanText(tag + ' 도움 ③');
    D.tapSel('.rw-help-close', '도움 닫기');
    D.mark('replace'); D.slot('0.co'); await D.until(() => D.sheet(), 2000, '도표'); D.cell('ㄴ');
    D.slot('0.co'); await D.until(() => D.sheet(), 2000, '도표'); D.cell('ㅇ');
    await D.send('규칙 밖'); D.scanText(tag + ' 규칙 밖');
    D.act('rw-redo');
    D.mark('replace'); D.slot('0.co'); await D.until(() => D.sheet(), 2000, '도표'); D.cell('ㅇ');
    await D.send('온에어'); D.scanText(tag + ' 온에어');
    await D.load('감기');
    D.act('rw-help'); await D.until(() => D.$('.rw-help') && D.visible(D.$('.rw-help')), 2000, '도움');
    ['1', '2', '3'].forEach((n) => D.tapSel('.rw-help-step[data-step="' + n + '"]', '도움 ' + n)); D.scanText(tag + ' 감기 도움 ③');
    D.tapSel('.rw-help-close', '도움 닫기');
    D.mark('replace'); D.slot('0.co'); await D.until(() => D.sheet(), 2000, '도표'); D.cell('ㅇ');
    await D.send('표준 아님'); D.scanText(tag + ' 표준 아님');
    await D.load('옷이');
    D.act('rw-help'); await D.until(() => D.$('.rw-help') && D.visible(D.$('.rw-help')), 2000, '도움');
    ['1', '2', '3'].forEach((n) => D.tapSel('.rw-help-step[data-step="' + n + '"]', '도움 ' + n)); D.scanText(tag + ' 연음 함정 도움 ③');
    D.tapSel('.rw-help-close', '도움 닫기');
    D.mark('replace'); D.slot('0.co'); await D.until(() => D.sheet(), 2000, '도표'); D.cell('ㄷ');
    D.act('rw-send');
    await D.until(() => D.say().includes(D.T().signal.linking), 4000, '연음 안내'); D.scanText(tag + ' 연음 안내');
    await D.load('의견란'); D.scanText(tag + ' 의견란');
    D.dbg().exit();
    return D.take();
  }));
  e${v}.push(...await ${v}.evaluate(async () => {
    const tag = ${J(`${ch}장 ${grade} ${level}`)};
    const G = D.G();
    D.finishRun(${ch}, { grade: ${g}, level: ${J(level)}, seed: 77 });
    G.app.resume();
    await D.until(() => D.cur() === 'reveal' && D.$('.rv-art'), 3000, '조항 공개'); D.scanText(tag + ' 조항 공개');
    D.tapSel('[data-act="reveal-next"]', '장 결과 보기');
    await D.until(() => D.cur() === 'result' && D.$('.rs-row'), 3000, '장 결과'); D.scanText(tag + ' 장 결과');
    D.tapSel('[data-act="chapters"]', '장 고르기');
    await D.startChapter(${o});
    G.app.go('start');
    await D.until(() => D.$('.st-resume'), 2000, '이어 하기 카드'); D.scanText(tag + ' 이어 하기 카드');
    D.tapSel('[data-act="begin"]', '감수 시작(덮어쓰기)'); await D.until(() => D.$('.st-confirm'), 2000, '덮어쓰기 확인'); D.scanText(tag + ' 덮어쓰기 확인');
    D.tapSel('[data-act="overwrite-no"]', '그만두기');
    (window.__infos = window.__infos || []).push(tag + ' 본 화면 ' + D.scanned);
    return D.take();
  }));
`;
};

step('화면 글 — 중3 · 1장 · 기본', `
${open('a1', 1280, 800)}
try {
  const ea1 = [];
  ${walk('a1', 1, 'm3', 'basic')}
  ${fin('ea1')}
} finally { await closeTab(a1); }
`);

step('화면 글 — 고1 · 2장 · 심화', `
${open('b1', 1366, 768)}
try {
  const eb1 = [];
  ${walk('b1', 2, 'h1', 'advanced')}
  ${fin('eb1')}
} finally { await closeTab(b1); }
`);

step('화면 글 — 세로로 돌려 주세요(눕힌 휴대폰)', `
${open('c1', 844, 390)}
try {
  const ec1 = [];
  ec1.push(...await c1.evaluate(async () => {
    await D.fresh();
    if (!D.visible(D.$('.app-rotate'))) D.bad('세로로 돌려 주세요가 안 보임');
    D.scanText('눕힌 휴대폰');
    return D.take();
  }));
  ${fin('ec1')}
} finally { await closeTab(c1); }
`);
