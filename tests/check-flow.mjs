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

step('1장 · 중3 · 기본 — 몸풀기 2개 → 지침 → 원고 5개(중간 새로 고침) → 조항 공개 → 장 결과', `
${open('a1', 1280, 800)}
${SETUP('a1')}
try {
  const ea = [];
  ea.push(...await a1.evaluate(async () => { await D.fresh(); D.G().save.setSettings({ reduceMotion: true }); return D.take(); }));
  ea.push(...await a1.evaluate(async () => {
    const G = D.G(), T = D.T();
    const run = await D.startChapter({ ch: 1, grade: 'm3', level: 'basic', keepWarmup: true });
    if (!run || run.ch !== 1 || run.grade !== 'm3' || run.level !== 'basic' || run.phase !== 'review' || run.guideDone) D.bad('시작한 진행 장(몸풀기): ' + JSON.stringify(run && { ch: run.ch, g: run.grade, l: run.level, p: run.phase, d: run.guideDone }));
    // 몸풀기 원고 2개(결정 0021) → 지침 화면
    window.__plan = D.planRun(run);
    window.__wants = [];
    for (let i = 0; i < 2; i++) window.__wants.push(await D.playScript(window.__plan[i]));
    await D.until(() => D.cur() === 'guide' && D.$('.gd-card'), 4000, '몸풀기 뒤 지침 화면');
    const rw = G.save.loadChapter();
    if (rw.phase !== 'guide' || rw.done.length !== 2 || rw.guideDone) D.bad('몸풀기 뒤 저장: ' + JSON.stringify({ p: rw.phase, n: rw.done.length, d: rw.guideDone }));
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
    if (r2.done.length !== 2) D.bad('지침 뒤 몸풀기 기록이 남지 않음: ' + r2.done.length);
    await D.enterReview();
    for (let i = 2; i < 3; i++) window.__wants.push(await D.playScript(window.__plan[i]));
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

// ───────────── 3~8장(결정 0019) — 장마다 한 번씩 지침부터(8장은 지침 없이) 장 결과까지 ─────────────
//   학년 · 단계를 번갈아(기본 · 심화 모두). 원고 결과는 1 · 2장과 같은 계획(넘김 · 규칙 밖 · 다름 뒤 온에어 + 도움 · solve · 온에어).
//   장마다 덧붙여 보는 것(연습 자리 — 점검 전용 G.review.debug.load, 저장하지 않음):
//     4장 심화: 어간 + 어미 경계 이름표가 없음 · 5장 기본: 어간 + 어미 경계 이름표(학년별)
//     6장: /ㄴ/ 넣음(솜이불) · 반모음 /j/ 넣음(피어 — 허용 발음, 넣지 않아도 온에어) 끝까지
//     7장: 합침표로 /ㅋ/ · /ㅌ/ · /ㅍ/ · /ㅊ/ 만들기 — 자음 도표만 열림
//     8장: 지침 화면 없이 감수, 조항 공개 머리 문장은 지침 없는 장의 문장(도움 ②의 한 줄은 check-review가 봄)
const LATER = [
  { ch: 3, grade: 'h1', level: 'basic', size: [1280, 800] },
  { ch: 4, grade: 'm3', level: 'advanced', size: [1366, 768] },
  { ch: 5, grade: 'h1', level: 'basic', size: [1280, 800] },
  { ch: 6, grade: 'm3', level: 'advanced', size: [1366, 768] },
  { ch: 7, grade: 'h1', level: 'basic', size: [1280, 800] },
  { ch: 8, grade: 'm3', level: 'advanced', size: [1366, 768] },
];
// 연습 자리 원고 하나로 교정 몇 개를 해 보고 송출 신호를 확인한 뒤 원래 원고로 돌아온다
const SAND = String.raw`
if (!D.sandSend) {
  D.sandSend = async (id, steps, want, tag) => {
    const back = D.dbg().script().id;
    await D.load(id);
    await D.doSteps(steps);
    const k = await D.send(tag + ' ' + id);
    if (k !== want) D.bad(tag + ' ' + id + ': 신호 ' + k + ' / ' + want);
    D.dbg().exit();
    await D.until(() => D.dbg().script().id === back && D.$('.rw-blocks .bk-slot'), 3000, tag + ' 원래 원고로');
  };
  D.stemLabel = (gap) => {
    const g = D.$('.rw-blocks .bk-gap[data-gap="' + gap + '"]');
    return g ? { stem: g.classList.contains('is-stem'), cut: (g.querySelector('.bk-cut') || {}).textContent || null, aria: g.getAttribute('aria-label') } : null;
  };
}
`;
LATER.forEach((c) => {
  const v = 'f' + c.ch;
  const o = J({ ch: c.ch, grade: c.grade, level: c.level });
  step(`${c.ch}장 · ${c.grade} · ${c.level === 'basic' ? '기본' : '심화'} — ${c.ch === 8 ? '지침 없이 ' : '지침 → '}원고 7개 → 조항 공개 → 장 결과`, `
${open(v, c.size[0], c.size[1])}
${SETUP(v)}
await ${v}.evaluate(() => { ${SAND} });
try {
  const e${v} = [];
  e${v}.push(...await ${v}.evaluate(async () => { await D.fresh(); D.G().save.setSettings({ reduceMotion: true }); return D.take(); }));
  e${v}.push(...await ${v}.evaluate(async () => {
    const G = D.G(), T = D.T(), o = ${o};
    const run = await D.startChapter(o);
    if (!run || run.ch !== o.ch || run.grade !== o.grade || run.level !== o.level) D.bad('시작한 진행 장');
    if (o.ch === 8) {
      if (run.phase !== 'review' || !run.guideDone || run.guides !== null) D.bad('8장은 지침 없이 감수부터: ' + JSON.stringify({ p: run.phase, d: run.guideDone, g: run.guides }));
    } else {
      if (run.phase !== 'guide') D.bad(o.ch + '장이 지침부터가 아님');
      let first = true;
      D.pickGuide(o.ch, (g, b) => { const a = g.blanks[b].answer; if (first) { first = false; return (a + 1) % g.blanks[b].options.length; } return a; });
      D.tapSel('[data-act="guide-check"]', '확인(한 칸 틀림)');
      const msg = D.$('.gd-msg').textContent.trim();
      if (msg !== G.text.fill(T.guide.wrong, { n: 1 })) D.bad('틀린 칸 안내: ' + msg);
      await D.solveGuide(o.ch);
      await D.enterReview();
    }
    const kicker = D.$('.rw-kicker').textContent.trim();
    if (kicker !== G.text.t('common.chapterLevel', { chapter: G.text.chapterTitle(o.ch), level: G.text.levelName(o.level) })) D.bad('감수 화면 머리: ' + kicker);
    if (o.level === 'advanced' && D.$('.rw-blocks .bk-plus, .rw-blocks .bk-cut, .rw-blocks [data-cut], .rw-blocks .is-stem')) D.bad('심화인데 경계가 보임');
    return D.take();
  }));
  // 장마다 덧붙여 보는 것(연습 자리)
  e${v}.push(...await ${v}.evaluate(async () => {
    const T = D.T(), o = ${o};
    if (o.ch === 4) {
      await D.load('신고');
      const l = D.stemLabel(0);
      if (!l || l.stem || l.cut) D.bad('4장 심화: 어간 + 어미 경계 이름표가 보임 ' + JSON.stringify(l));
      D.dbg().exit();
    }
    if (o.ch === 5) {
      await D.load('앉다');
      const l = D.stemLabel(0), want = T.terms[o.grade].cut.stem;
      if (!l || !l.stem || l.cut !== want || l.aria.indexOf(want) < 0) D.bad('5장 기본: 어간 + 어미 경계 이름표 ' + JSON.stringify(l) + ' / ' + want);
      await D.load('넋과');
      const f = D.stemLabel(0);
      if (!f || f.stem || f.cut !== T.terms[o.grade].cut.formal) D.bad('5장 기본: 어간 표시가 없는 형식 경계는 그대로 ' + JSON.stringify(f));
      D.dbg().exit();
    }
    if (o.ch === 6) {
      await D.sandSend('솜이불', [['n-insert', 'insert', '1.on', 'ㄴ']], 'onair', '/ㄴ/ 넣음');
      await D.sandSend('피어', [['glide-insert', 'insert', '1.gl', 'j']], 'onair', '/j/ 넣음(허용)');
      await D.sandSend('피어', [], 'onair', '교정 없이(원칙)');
      await D.sandSend('솜이불', [['n-insert', 'insert', '1.gl', 'j']], 'diff', '/j/를 잘못 넣음');
    }
    if (o.ch === 7) {
      for (const [id, at, to] of [['놓고', '0.co+1.on', 'ㅋ'], ['좋던', '0.co+1.on', 'ㅌ'], ['좁히다', '0.co+1.on', 'ㅍ'], ['쌓지', '0.co+1.on', 'ㅊ']]) {
        const back = D.dbg().script().id;
        await D.load(id);
        const ab = at.split('+');
        D.mark('merge'); D.slot(ab[0]); D.slot(ab[1]);
        await D.until(() => D.sheet() && D.$('.rw-sheet .ch-cell'), 2000, '합침 도표 ' + id);
        const parts = D.$$('.rw-sheet .ch-part').map((p) => p.getAttribute('data-part'));
        if (JSON.stringify(parts) !== '["consonant"]') D.bad(id + ' 합침: 자음 도표만 열려야 함 ' + JSON.stringify(parts));
        D.cell(to);
        const k = await D.send('합침 ' + id);
        if (k !== 'onair') D.bad(id + ' 합침 /' + to + '/: ' + k);
        D.dbg().exit();
        await D.until(() => D.dbg().script().id === back, 3000, '원래 원고로');
      }
    }
    return D.take();
  }));
  e${v}.push(...await ${v}.evaluate(async () => {
    const r = D.G().save.loadChapter();
    window.__plan = D.planRun(r);
    window.__wants = [];
    for (let i = 0; i < 3; i++) window.__wants.push(await D.playScript(window.__plan[i]));
    return D.take();
  }));
  e${v}.push(...await ${v}.evaluate(async () => {
    for (let i = 3; i < 5; i++) window.__wants.push(await D.playScript(window.__plan[i]));
    return D.take();
  }));
  e${v}.push(...await ${v}.evaluate(async () => {
    const G = D.G(), T = D.T(), o = ${o};
    for (let i = 5; i < 7; i++) window.__wants.push(await D.playScript(window.__plan[i]));
    await D.until(() => D.cur() === 'reveal' && D.$('.rv-art'), 4000, '조항 공개');
    window.__run = G.save.loadChapter();
    const by = D.byId();
    const arts = G.rules.revealArticles(D.w().GUIDES[o.ch], window.__run.ids.map((id) => by[id]));
    const cards = D.$$('.rv-art').map((a) => a.getAttribute('data-article'));
    if (JSON.stringify(cards) !== JSON.stringify(arts)) D.bad('조항 공개 카드 ' + JSON.stringify(cards) + ' / ' + JSON.stringify(arts));
    const head = D.$('.rv-heading').textContent.trim();
    const want = G.text.fill(o.ch === 8 ? T.reveal.headingNoGuide : T.reveal.heading, { articles: G.text.articleList(arts) });
    if (head !== want) D.bad('조항 공개 머리 문장: ' + head);
    D.tapSel('[data-act="reveal-next"]', '장 결과 보기');
    await D.until(() => D.cur() === 'result' && D.$$('.rs-row').length === 7, 4000, '장 결과');
    D.checkResult(window.__run, window.__wants, o.grade);
    (window.__infos = window.__infos || []).push(o.ch + '장 원고 ' + window.__run.ids.join(',') + ' · 계획 ' + window.__plan.join(',') + ' → ' + window.__wants.map((x) => x.result + '/' + x.sends + (x.helped ? '+도움' : '')).join(','));
    return D.take();
  }));
  ${fin('e' + v)}
} finally { await closeTab(${v}); }
`);
});
