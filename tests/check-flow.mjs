// 한 판 끝까지(aside) — 명세 §4 · §7 · §8 · §9 · §10 · §11 · §18 '1장 · 2장을 지침부터 결과까지 끝까지 해 봄'.
//   진짜 index.html을 크기별 틀(tests/pages/frame.html)에 띄우고 학생처럼 누른다:
//   시작 화면(학년 · 장 · 단계) → 감수 지침(한 칸 틀리게 → 'n칸이 맞지 않아요' → 정답) → 원고 7개 → 조항 공개 → 장 결과.
//   원고는 데이터의 풀이 과정을 교정 부호로 눌러 푼다(tests/lib/flow.mjs). 한 원고는 점검 전용 G.review.debug.solve()로 푼다.
//   원고 결과를 일부러 섞는다: 넘김(송출 없이 넘김 확인) · 규칙 밖(첫 고침을 다른 음운을 거쳐 두 번에) · 다름 뒤 온에어(+ 도움 ①②③)
//   · 2장 감기는 표준 아님 뒤 되돌리기 · 온에어. 장 결과의 원고별 줄(결과 · 송출 수 · 도움)과 정답 기준 숫자를 맞춰 본다.
//   1장: 중3 · 기본 단계, 중간에 새로 고침 → 이어 하기로 같은 원고(교정까지). 2장: 고1 · 심화 단계, 장 결과 [다시 하기] → 지침 없이 감수.
//   장 결과 뒤 시작 화면에는 이어 하기가 없다(진행 장 저장이 지워짐). 모든 단계에서 페이지 오류(window.__gamsuErrors)가 없어야 한다.
import { step, frame } from './aside.mjs';
import { DRIVER } from './lib/drive.mjs';
import { RUNS } from './lib/runs.mjs';
import { REVIEW } from './lib/review.mjs';
import { FLOW } from './lib/flow.mjs';

const J = JSON.stringify;
const open = (v, w, h) => `
const ${v} = await openTab(${J(frame(w, h, 'index.html'))});
await ${v}.evaluate(() => frameReady);
await ${v}.evaluate(() => { ${DRIVER} });
await ${v}.evaluate(() => { ${RUNS} });
await ${v}.evaluate(() => { ${REVIEW} });
await ${v}.evaluate(() => { ${FLOW} });
`;
const fin = (v) => `
for (const __i of await page.evaluate(() => window.__infos || [])) console.log('INFO ' + __i);
if (${v}.length) console.log('FAIL ' + ${v}.join('\\nFAIL '));
else console.log('PASS');
`;

// 이 점검의 도우미: 원고 하나를 계획대로 끝낸다 → 기대 기록 { id, result, sends, helped }
const PLAN = String.raw`
if (!D.playScript) {
  // 원고 7개의 계획: 넘김 1 · 규칙 밖 1 · 다름 뒤 온에어 + 도움 1 · 점검용 solve 1 · 감기(있으면) 표준 아님 뒤 온에어 · 나머지 온에어
  D.planRun = (run) => {
    const by = D.byId();
    const sc = run.ids.map((id) => by[id]);
    const plan = sc.map(() => 'onair');
    const free = (i) => plan[i] === 'onair' && sc[i].id !== '감기';
    sc.forEach((s, i) => { if (s.id === '감기') plan[i] = 'nonstandard'; });
    const sk = sc.findIndex((s, i) => free(i));
    plan[sk] = 'skip';
    const off = sc.findIndex((s, i) => free(i) && (s.steps || []).some((x) => x[1] === 'replace'));
    if (off >= 0) plan[off] = 'offrule';
    const df = sc.findIndex((s, i) => free(i) && (s.steps || []).length > 0);
    if (df >= 0) plan[df] = 'diffhelp';
    const sv = sc.findIndex((s, i) => free(i) && (s.steps || []).length > 0);
    if (sv >= 0) plan[sv] = 'solve';
    return plan;
  };
  D.playScript = async (what) => {
    const G = D.G();
    const sc = D.dbg().script();
    const want = { id: sc.id, result: 'onair', sends: 1, helped: false };
    D.leak('원고 ' + sc.id + ' 처음');
    if (what === 'skip') {
      await D.skipScript();
      return Object.assign(want, { result: 'skip', sends: 0 });
    }
    if (what === 'offrule') {
      if (!(await D.offruleScript())) D.bad('규칙 밖으로 만들 고침 단계가 없음 ' + sc.id);
      const k = await D.send('규칙 밖 ' + sc.id);
      if (k !== 'offrule') D.bad(sc.id + ': 규칙 밖이 아님 ' + k);
      if (!D.$$('.rw-log-item.is-offrule').length) D.bad(sc.id + ': 규칙 밖 교정 표시 없음');
      await D.nextScript();
      return Object.assign(want, { result: 'offrule' });
    }
    if (what === 'nonstandard') {
      D.mark('replace'); D.slot('0.co');
      await D.until(() => D.sheet() && D.$('.rw-sheet .ch-cell'), 2000, '감기 도표');
      D.cell('ㅇ');
      const k1 = await D.send('감기 표준 아님');
      if (k1 !== 'nonstandard') D.bad('감기: 표준 아님이 아님 ' + k1);
      D.act('rw-undo');
      if (D.logN() !== 0) D.bad('감기: 되돌리기가 안 됨');
      const k2 = await D.send('감기 교정 없이');
      if (k2 !== 'onair') D.bad('감기: 교정 없이 송출이 온에어가 아님 ' + k2);
      await D.nextScript();
      return Object.assign(want, { sends: 2 });
    }
    let sends = 0;
    if (what === 'diffhelp') {
      const k0 = await D.send('교정 없이 ' + sc.id); sends++;
      if (k0 !== 'diff' && k0 !== 'nonstandard') D.bad(sc.id + ': 교정 없이 송출이 다름 · 표준 아님이 아님 ' + k0);
      D.act('rw-help');
      await D.until(() => D.$('.rw-help') && D.visible(D.$('.rw-help')), 2000, '도움 열림');
      ['1', '2', '3'].forEach((n) => D.tapSel('.rw-help-step[data-step="' + n + '"]', '도움 ' + n));
      D.tapSel('.rw-help-close', '도움 닫기');
      want.helped = true;
    }
    if (what === 'solve') { D.dbg().solve(); await D.until(() => D.logN() === (sc.steps || []).length, 2000, 'solve 반영'); }
    else await D.solveScript();
    const k = await D.send('온에어 ' + sc.id); sends++;
    if (k !== 'onair') D.bad(sc.id + ': 온에어가 아님 ' + k + ' (' + what + ')');
    if (!D.$('.rw-stamp') || !D.visible(D.$('.rw-stamp'))) D.bad(sc.id + ': 감수 도장 없음');
    await D.nextScript();
    return Object.assign(want, { sends });
  };
  // 장 결과 화면을 기대 기록과 맞춰 본다
  D.checkResult = (run, wants, grade) => {
    const G = D.G(), T = D.T();
    const by = D.byId();
    const rows = D.$$('.rs-row');
    if (rows.length !== 7) D.bad('장 결과 줄 수 ' + rows.length);
    wants.forEach((x, i) => {
      const row = rows[i];
      if (!row) return;
      const cell = (c) => { const n = row.querySelector('.rs-c-' + c); return n ? n.textContent.replace(/\s+/g, ' ').trim() : null; };
      if (cell('text') !== by[x.id].text) D.bad(i + ' 표기: ' + cell('text') + ' / ' + by[x.id].text);
      if (cell('pron') !== G.text.pron(by[x.id].pron)) D.bad(i + ' 표준 발음: ' + cell('pron'));
      if (row.querySelector('.rs-c-outcome').getAttribute('data-result') !== x.result || !cell('outcome').includes(G.text.outcome(x.result))) D.bad(i + ' 결과: ' + cell('outcome') + ' / ' + x.result + ' (' + x.id + ')');
      if (cell('sends') !== G.text.fill(T.common.timesN, { n: x.sends })) D.bad(i + ' 송출: ' + cell('sends') + ' / ' + x.sends + ' (' + x.id + ')');
      if (cell('help') !== (x.helped ? T.result.helpUsed : T.result.helpNone)) D.bad(i + ' 도움: ' + cell('help') + ' (' + x.id + ')');
    });
    const tot = G.rules.chapterTotals(run.ids.map((id) => by[id]));
    ['replace', 'delete', 'insert', 'merge'].forEach((op) => {
      const n = D.$('.rs-change[data-op="' + op + '"]');
      const line = G.text.fill(T.result.changeLine, { name: G.text.change(grade, op), n: tot.change[op] });
      if (!n || n.textContent.replace(/\s+/g, ' ').trim() !== line) D.bad('변동 ' + op + ': ' + (n && n.textContent));
    });
    const cnt = G.text.fill(T.result.countLine, { from: tot.count[0], to: tot.count[1] });
    if (D.$('.rs-count').textContent.replace(/\s+/g, ' ').trim() !== cnt) D.bad('음운 수: ' + D.$('.rs-count').textContent);
    const arts = G.text.articleList(G.rules.revealArticles(D.w().GUIDES[run.ch], run.ids.map((id) => by[id])));
    if (!D.$('.rs-articles').textContent.includes(arts)) D.bad('공개된 조항: ' + D.$('.rs-articles').textContent);
    if (G.save.hasChapter()) D.bad('장 결과인데 진행 장이 남음');
  };
}
`;

const SETUP = (v) => `
await ${v}.evaluate(() => { ${PLAN} });
`;

step('1장 · 중3 · 기본 — 지침 → 원고 7개(중간 새로 고침) → 조항 공개 → 장 결과', `
${open('a1', 1280, 800)}
${SETUP('a1')}
try {
  const ea = [];
  ea.push(...await a1.evaluate(async () => { await D.fresh(); D.G().save.setSettings({ reduceMotion: true }); return D.take(); }));
  ea.push(...await a1.evaluate(async () => {
    const G = D.G(), T = D.T();
    const run = await D.startChapter({ ch: 1, grade: 'm3', level: 'basic' });
    if (!run || run.ch !== 1 || run.grade !== 'm3' || run.level !== 'basic' || run.phase !== 'guide') D.bad('시작한 진행 장: ' + JSON.stringify(run && { ch: run.ch, g: run.grade, l: run.level, p: run.phase }));
    // 한 칸만 틀리게 → 수만 알림
    let first = true;
    D.pickGuide(1, (g, b) => { const a = g.blanks[b].answer; if (first) { first = false; return (a + 1) % g.blanks[b].options.length; } return a; });
    D.tapSel('[data-act="guide-check"]', '확인(한 칸 틀림)');
    const msg = D.$('.gd-msg').textContent.trim();
    if (msg !== G.text.fill(T.guide.wrong, { n: 1 })) D.bad('틀린 칸 안내: ' + msg);
    if (D.$('[data-act="guide-go"]')) D.bad('틀렸는데 감수 시작 단추');
    await D.solveGuide(1);
    const r2 = G.save.loadChapter();
    if (!r2.guideDone || r2.phase !== 'review') D.bad('지침 완료 저장: ' + JSON.stringify({ d: r2.guideDone, p: r2.phase }));
    await D.enterReview();
    window.__plan = D.planRun(r2);
    window.__wants = [];
    for (let i = 0; i < 3; i++) window.__wants.push(await D.playScript(window.__plan[i]));
    // 4번째 원고에 교정 하나를 해 두고 새로 고침
    const sc = D.dbg().script();
    if (sc.steps && sc.steps.length) await D.doStep(sc.steps[0]);
    window.__mid = { id: sc.id, cs: JSON.stringify(D.dbg().cur().corrections) };
    return D.take();
  }));
  ea.push(...await a1.evaluate(async () => { await D.reload(); return D.take(); }));
  ea.push(...await a1.evaluate(async () => {
    const G = D.G(), T = D.T();
    const sum = D.$('.st-resume-sum');
    const want = G.text.fill(T.start.resume.summary.review, { chapter: G.text.chapterTitle(1), level: G.text.levelName('basic'), i: 4, n: 7 });
    if (!sum || sum.textContent.trim() !== want) D.bad('이어 하기 요약: ' + (sum && sum.textContent) + ' / ' + want);
    D.act('resume');
    await D.until(() => D.cur() === 'review' && D.$('.rw-blocks .bk-slot'), 4000, '이어 하기 → 감수');
    if (D.dbg().script().id !== window.__mid.id || JSON.stringify(D.dbg().cur().corrections) !== window.__mid.cs) D.bad('새로 고침 뒤 원고 · 교정이 그대로가 아님');
    while (D.logN() > 0) D.act('rw-undo');
    for (let i = 3; i < 7; i++) window.__wants.push(await D.playScript(window.__plan[i]));
    await D.until(() => D.cur() === 'reveal' && D.$('.rv-art'), 4000, '조항 공개');
    const r = G.save.loadChapter();
    if (!r || r.phase !== 'reveal' || r.done.length !== 7) D.bad('조항 공개 저장');
    window.__run = r;
    D.tapSel('[data-act="reveal-next"]', '장 결과 보기');
    await D.until(() => D.cur() === 'result' && D.$$('.rs-row').length === 7, 4000, '장 결과');
    D.checkResult(window.__run, window.__wants, 'm3');
    (window.__infos = window.__infos || []).push('1장 계획 ' + window.__plan.join(',') + ' → ' + window.__wants.map((x) => x.result + '/' + x.sends + (x.helped ? '+도움' : '')).join(','));
    D.tapSel('[data-act="chapters"]', '장 고르기');
    await D.until(() => D.cur() === 'start', 3000, '시작 화면');
    if (D.$('.st-resume')) D.bad('장 결과 뒤에도 이어 하기가 있음');
    return D.take();
  }));
  ea.push(...await a1.evaluate(async () => { await D.reload(); return D.take(); }));
  ea.push(...await a1.evaluate(async () => {
    if (D.$('.st-resume') || D.G().save.hasChapter()) D.bad('새로 고침 뒤에 이어 하기가 되살아남');
    return D.take();
  }));
  ${fin('ea')}
} finally { await closeTab(a1); }
`);

step('2장 · 고1 · 심화 — 지침 → 원고 7개(감기 표준 아님) → 조항 공개 → 장 결과 → 다시 하기', `
${open('b1', 1366, 768)}
${SETUP('b1')}
try {
  const eb = [];
  eb.push(...await b1.evaluate(async () => { await D.fresh(); D.G().save.setSettings({ reduceMotion: true }); return D.take(); }));
  eb.push(...await b1.evaluate(async () => {
    const G = D.G();
    const run = await D.startChapter({ ch: 2, grade: 'h1', level: 'advanced' });
    if (!run || run.ch !== 2 || run.grade !== 'h1' || run.level !== 'advanced') D.bad('시작한 진행 장');
    await D.solveGuide(2);
    await D.enterReview();
    if (D.$('.rw-blocks .bk-plus, .rw-blocks .bk-cut, .rw-blocks [data-cut]')) D.bad('심화인데 경계가 보임');
    const r = G.save.loadChapter();
    if (r.ids.indexOf('감기') < 0) D.bad('2장에 감기가 뽑히지 않음');
    window.__plan = D.planRun(r);
    window.__wants = [];
    for (let i = 0; i < 4; i++) window.__wants.push(await D.playScript(window.__plan[i]));
    return D.take();
  }));
  eb.push(...await b1.evaluate(async () => {
    const G = D.G();
    for (let i = 4; i < 7; i++) window.__wants.push(await D.playScript(window.__plan[i]));
    await D.until(() => D.cur() === 'reveal' && D.$('.rv-art'), 4000, '조항 공개');
    window.__run = G.save.loadChapter();
    D.tapSel('[data-act="reveal-next"]', '장 결과 보기');
    await D.until(() => D.cur() === 'result' && D.$$('.rs-row').length === 7, 4000, '장 결과');
    D.checkResult(window.__run, window.__wants, 'h1');
    (window.__infos = window.__infos || []).push('2장 계획 ' + window.__plan.join(',') + ' → ' + window.__wants.map((x) => x.result + '/' + x.sends + (x.helped ? '+도움' : '')).join(','));
    // [다시 하기]: 같은 장 · 단계 · 학년을 새로 뽑아 지침 없이 감수부터
    D.tapSel('[data-act="again"]', '다시 하기');
    await D.until(() => D.cur() === 'review' && D.$('.rw-blocks .bk-slot'), 4000, '다시 하기 → 감수');
    const again = G.save.loadChapter();
    if (!again || again.ch !== 2 || again.level !== 'advanced' || again.grade !== 'h1' || again.phase !== 'review' || !again.guideDone || again.done.length) D.bad('다시 하기 진행 장: ' + JSON.stringify(again && { ch: again.ch, l: again.level, g: again.grade, p: again.phase }));
    return D.take();
  }));
  ${fin('eb')}
} finally { await closeTab(b1); }
`);
