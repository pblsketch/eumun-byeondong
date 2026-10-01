// 모든 화면 × 다섯 크기 배치 점검과 캡처(aside) — 명세 §14 · §18 '다섯 크기에서 가로 스크롤 없음, 누르는 자리 크기, 한 줄 문구가 넘치지 않음'.
//   진짜 index.html을 크기별 틀(tests/pages/frame.html)에 띄워 화면마다
//     · 가로 스크롤 없음(화면 밖으로 나간 요소 포함 — D.noScroll)
//     · 누르는 자리: 가로 배치 64px, 휴대폰 세로 48px 이상(D.targets)
//     · 글이 제 상자 밖으로 넘치거나 말줄임 없이 잘리지 않음(한 줄 문구 · 단추 — D.textBox, tests/lib/flow.mjs)
//   을 보고, 화면마다 캡처를 tests/shots/(저장소 제외)에 남긴다: 크기-번호-화면.png(긴 화면은 아래 끝도 -end).
//   캡처 없이 재기만: SHOTS=0 npm test (캡처 한 장이 10초 넘게 걸리는 바쁜 aside에서 이 점검이 20분을 넘을 때)
//   화면: 시작 · 게임 방법 · 설정 · 감수 지침(처음 · 틀림 · 다 맞음) · 이어 하기 카드 · 덮어쓰기 확인 · 감수(처음 4음절 · 자음표 · 넣을 음운 ·
//   신호 · 도움 ①②③ · 넘김 확인) · 조항 공개 · 장 결과. 눕힌 휴대폰(844×390)은 어느 화면에서나 '세로로 돌려 주세요'.
//   화면별 세부 동작은 check-app · check-guide · check-review · check-result가 본다. 모든 단계에서 페이지 오류가 없어야 한다.
import { step, frame } from './aside.mjs';
import { DRIVER } from './lib/drive.mjs';
import { RUNS } from './lib/runs.mjs';
import { REVIEW } from './lib/review.mjs';
import { FLOW } from './lib/flow.mjs';

const J = JSON.stringify;
const SHOT_BUDGET = +(process.env.SHOT_BUDGET || 55000); // 조각 하나에서 캡처를 찍는 시간 예산(ms)
// SHOTS=0 이면 캡처 없이 재기만 한다(공용 aside가 바빠 캡처가 느릴 때 전체 점검 시간을 줄임 — 판정은 같음)
const NO_SHOTS = process.env.SHOTS === '0';
const open = (v, w, h) => `
const ${v} = await openTab(${J(frame(w, h, 'index.html'))});
await ${v}.evaluate(() => frameReady);
await ${v}.evaluate(() => { ${DRIVER} });
await ${v}.evaluate(() => { ${RUNS} });
await ${v}.evaluate(() => { ${REVIEW} });
await ${v}.evaluate(() => { ${FLOW} });
try { await fs.mkdir('./artifacts', { recursive: true }); } catch (e) { /* 있음 */ }
// 캡처: 틀 안 게임 화면만 잘라 찍는다(창보다 큰 틀은 축소되어 보임). end면 게임 창을 맨 아래로 내려 한 장 더.
// 캡처는 사람이 볼 증거 자료라 판정과 따로 둔다: 공용 aside가 바빠 한 장에 10~20초씩 걸리면 aside 한 번 부르기(120초)를 넘으므로
// 조각마다 시간 예산(SHOT_BUDGET)을 넘으면 남은 캡처는 건너뛰고 WARN으로 알린다(재기는 그대로 함). 캡처가 끝내 안 되면
// aside.mjs가 돌려주는 빈 그림으로 예전 캡처를 덮지 않는다.
const __t0 = Date.now();
const shot = async (name, end) => {
  if (${NO_SHOTS}) return;
  if (Date.now() - __t0 > ${SHOT_BUDGET}) { console.log('WARN 캡처 건너뜀(시간 예산): ${w}x${h}-' + name); return; }
  const sc = await ${v}.evaluate(() => Math.min(1, innerWidth / ${w}, innerHeight / ${h}));
  const clip = { x: 0, y: 0, width: Math.floor(${w} * sc), height: Math.floor(${h} * sc) };
  const one = async (file) => {
    let buf;
    try { buf = await ${v}.screenshot({ clip }); } catch (e) { buf = null; }
    if (!buf || buf.length < 1000) { console.log('WARN 캡처 실패: ' + file); return; }
    await fs.writeFile(file, buf);
    console.log('SHOTFILE:' + path.resolve(file));
  };
  await one('./artifacts/${w}x${h}-' + name + '.png');
  if (end && Date.now() - __t0 < ${SHOT_BUDGET} - 15000) {
    const tall = await ${v}.evaluate(() => { const w = frameWin(); const de = w.document.documentElement; if (de.scrollHeight <= w.innerHeight * 1.15) return false; w.scrollTo(0, de.scrollHeight); return true; });
    if (tall) { await sleep(150); await one('./artifacts/${w}x${h}-' + name + '-end.png'); await ${v}.evaluate(() => frameWin().scrollTo(0, 0)); }
  }
};
`;
const fin = (v) => `
if (${v}.length) console.log('FAIL ' + ${v}.join('\\nFAIL '));
else console.log('PASS');
`;

// 화면 하나를 재는 page 쪽 코드
const MEASURE = (tag, min) => `D.targets(${min}, ${J(tag)}); D.noScroll(${J(tag)}); D.textBox(${J(tag)});`;

const SIZES = [[1280, 800], [1366, 768], [1920, 1080], [390, 844], [360, 740]];
// 한 크기를 네 조각으로 나눠 돈다(aside 한 번 부르기 120초 · 공용 aside가 바쁠 때도 넉넉하게)
const PARTS = [
  ['시작 · 게임 방법 · 설정', (v, m) => `
  e${v}.push(...await ${v}.evaluate(async () => { await D.fresh(); D.G().save.setSettings({ reduceMotion: true }); ${m('시작')} return D.take(); }));
  await shot('01-start');
  e${v}.push(...await ${v}.evaluate(async () => { D.tapSel('[data-act="howto"]', '게임 방법'); await D.until(() => D.$('.howto'), 2000, '게임 방법 창'); ${m('게임 방법')} return D.take(); }));
  await shot('02-howto');
  e${v}.push(...await ${v}.evaluate(async () => { D.tapSel('.howto-ok', '알겠어요'); D.tapSel('[data-act="settings"]', '설정'); ${m('설정')} return D.take(); }));
  await shot('03-settings');
`],
  ['감수 지침 · 이어 하기 · 덮어쓰기 확인', (v, m) => `
  e${v}.push(...await ${v}.evaluate(async () => {
    await D.fresh(); D.G().save.setSettings({ reduceMotion: true });
    await D.startChapter({ ch: 1, grade: 'h1', level: 'basic' });
    ${m('지침')} return D.take(); }));
  await shot('04-guide', true);
  e${v}.push(...await ${v}.evaluate(async () => {
    let first = true;
    D.pickGuide(1, (g, b) => { const a = g.blanks[b].answer; if (first) { first = false; return (a + 1) % g.blanks[b].options.length; } return a; });
    D.tapSel('[data-act="guide-check"]', '확인');
    D.$('.gd-foot').scrollIntoView({ block: 'end' });
    ${m('지침 틀림')} return D.take(); }));
  await shot('05-guide-wrong');
  e${v}.push(...await ${v}.evaluate(async () => {
    await D.solveGuide(1);
    D.$('.gd-foot').scrollIntoView({ block: 'end' });
    ${m('지침 다 맞음')} return D.take(); }));
  await shot('06-guide-done');
  e${v}.push(...await ${v}.evaluate(async () => {
    D.G().app.go('start');
    await D.until(() => D.$('.st-resume'), 2000, '이어 하기 카드');
    ${m('이어 하기')} return D.take(); }));
  await shot('07-start-resume');
  e${v}.push(...await ${v}.evaluate(async () => {
    D.tapSel('[data-act="begin"]', '감수 시작(덮어쓰기)');
    await D.until(() => D.$('.st-confirm'), 2000, '덮어쓰기 확인');
    ${m('덮어쓰기 확인')} return D.take(); }));
  await shot('08-overwrite');
`],
  ['감수(4음절 · 자음표 · 넣을 음운 · 신호)', (v, m) => `
  e${v}.push(...await ${v}.evaluate(async () => {
    await D.fresh(); D.G().save.setSettings({ reduceMotion: true });
    await D.toReview(2, { seed: 12, grade: 'h1', level: 'basic' });
    await D.load('맏며느리');
    await D.wait(150);
    ${m('감수 4음절')} return D.take(); }));
  await shot('09-review', true);
  e${v}.push(...await ${v}.evaluate(async () => {
    D.mark('replace'); D.slot('0.co');
    await D.until(() => D.sheet() && D.$('.rw-sheet .ch-cell'), 2000, '자음표');
    ${m('자음표')} return D.take(); }));
  await shot('10-review-chart', true);
  e${v}.push(...await ${v}.evaluate(async () => {
    D.cell('ㄴ');
    D.mark('insert'); D.gap(1);
    await D.until(() => D.sheet() && D.$('.rw-ins'), 2000, '넣을 음운');
    ${m('넣을 음운')} return D.take(); }));
  await shot('11-review-insert');
  e${v}.push(...await ${v}.evaluate(async () => {
    D.tapSel('.rw-sheet .rw-sheet-close', '넣을 음운 닫기');
    await D.send('신호');
    D.$('.rw-say').scrollIntoView({ block: 'center' });
    ${m('신호')} return D.take(); }));
  await shot('12-review-signal');
`],
  ['도움 · 넘김 확인 · 조항 공개 · 장 결과', (v, m) => `
  e${v}.push(...await ${v}.evaluate(async () => {
    await D.fresh(); D.G().save.setSettings({ reduceMotion: true });
    await D.toReview(2, { seed: 12, grade: 'h1', level: 'basic' });
    await D.load('맏며느리');
    await D.send('다름');
    D.act('rw-help');
    await D.until(() => D.$('.rw-help') && D.visible(D.$('.rw-help')), 2000, '도움');
    ['1', '2', '3'].forEach((x) => D.tapSel('.rw-help-step[data-step="' + x + '"]', '도움 ' + x));
    D.$('.rw-help').scrollIntoView({ block: 'start' });
    ${m('도움')} return D.take(); }));
  await shot('13-review-help', true);
  e${v}.push(...await ${v}.evaluate(async () => {
    D.tapSel('.rw-help-close', '도움 닫기');
    D.act('rw-next');
    await D.until(() => D.dbg().script().id !== '맏며느리', 3000, '연습 원고에서 나옴');
    D.w().scrollTo(0, 0);
    D.act('rw-next');
    await D.until(() => D.$('.rw-confirm'), 2000, '넘김 확인');
    ${m('넘김 확인')} return D.take(); }));
  await shot('14-review-skip');
  e${v}.push(...await ${v}.evaluate(async () => {
    D.act('rw-skip-no');
    D.finishRun(2, { grade: 'h1', level: 'basic', seed: 12 });
    D.G().app.resume();
    await D.until(() => D.cur() === 'reveal' && D.$('.rv-art'), 3000, '조항 공개');
    ${m('조항 공개')} return D.take(); }));
  await shot('15-reveal', true);
  e${v}.push(...await ${v}.evaluate(async () => {
    D.tapSel('[data-act="reveal-next"]', '장 결과 보기');
    await D.until(() => D.cur() === 'result' && D.$$('.rs-row').length === 7, 3000, '장 결과');
    ${m('장 결과')} return D.take(); }));
  await shot('16-result', true);
`],
];

SIZES.forEach(([W, H], k) => {
  const phone = W < 768;
  const min = phone ? 48 : 64;
  const t = `${W}×${H}`;
  const m = (name) => MEASURE(`${t} ${name}`, min);
  PARTS.forEach(([title, body], j) => {
    const v = 'p' + k + j;
    step(`${t} — ${title}`, `
${open(v, W, H)}
try {
  const e${v} = [];
  ${body(v, m)}
  ${fin('e' + v)}
} finally { await closeTab(${v}); }
`);
  });
});

// 눕힌 휴대폰: 덮개가 화면을 다 덮고 가운데에 덮개가 보임(page 쪽 코드)
const ROT = (nm) => `er0.push(...await r0.evaluate(async () => {
    const G = D.G(), T = D.T(), nm = ${J(nm)};
    if (!G.app.isLowLandscape()) D.bad(nm + ': 낮은 가로로 보지 않음');
    const r = D.$('.app-rotate');
    if (!r || !D.visible(r)) D.bad(nm + ': 세로로 돌려 주세요가 안 보임');
    else {
      if (r.textContent.trim() !== T.rotate) D.bad(nm + ': 문구 ' + r.textContent);
      const b = D.box(r);
      if (b.left > 0 || b.top > 0 || b.right < D.w().innerWidth || b.bottom < D.w().innerHeight) D.bad(nm + ': 덮개가 화면을 다 덮지 않음');
      const hit = D.d().elementFromPoint(D.w().innerWidth / 2, D.w().innerHeight / 2);
      if (!hit || !r.contains(hit)) D.bad(nm + ': 가운데에 덮개가 아닌 것이 보임');
    }
    D.textBox(nm);
    return D.take();
  }));`;

step('눕힌 휴대폰 844×390 — 어느 화면에서나 세로로 돌려 주세요', `
${open('r0', 844, 390)}
try {
  const er0 = [];
  er0.push(...await r0.evaluate(async () => { await D.fresh(); D.G().save.setSettings({ reduceMotion: true }); return D.take(); }));
  ${ROT('시작')} await shot('00-rotate-start');
  er0.push(...await r0.evaluate(async () => { D.G().app.beginChapter({ ch: 1, grade: 'm3', level: 'basic' }); await D.until(() => D.cur() === 'guide' && D.$('.gd-card'), 3000, '지침'); return D.take(); }));  // 덮개 아래라 누르지 않고 바로 연다
  ${ROT('지침')} await shot('00-rotate-guide');
  er0.push(...await r0.evaluate(async () => { await D.toReview(2, { seed: 4 }); return D.take(); }));
  ${ROT('감수')} await shot('00-rotate-review');
  ${fin('er0')}
} finally { await closeTab(r0); }
`);
