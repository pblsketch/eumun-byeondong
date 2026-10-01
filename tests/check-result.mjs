// 조항 공개 G.screens.reveal · 장 결과 G.screens.result 점검(aside) — 명세 §9 · §10 · §11 · §14 · §18.
//   감수 화면(js/game/review.js) 없이 점검한다: 점검 전용 조작 D.finishRun(tests/lib/runs.mjs)이 '원고 7개가 끝난 진행 장'을 저장소에 넣고
//   G.app.resume()으로 조항 공개 화면에 바로 간다(게임 화면에는 점검용 단추 · 글이 없다).
//   1) 조항 공개: 머리 문장 = 「표준 발음법」 + G.text.articleList(G.rules.revealArticles(지침, 뽑힌 원고)),
//      조항 카드 차례가 그 목록과 같음('20-다만'은 '20' 바로 뒤), 카드마다 '원문' 표시와 원문 문장 · 예시
//   2) 장 결과: 원고별 7줄(표기 · 표준 발음 · 결과 · 송출 · 도움), 정답 기준 숫자 = 7개 원고 데이터 change · count의 합
//      (학생 교정과 무관), 공개된 조항 목록, 장 결과에 닿으면 진행 장 저장이 지워짐
//   3) [장 고르기] → 시작 화면에 이어 하기 카드 없음 / [다시 하기] → 같은 장 · 단계 · 학년, 지침 없이 감수 화면
//   4) 다섯 크기에서 가로 스크롤 없음 · 누르는 자리(가로 64px, 휴대폰 세로 48px)
//   모든 단계에서 페이지 오류(window.__gamsuErrors)가 없어야 한다.
import { step, frame } from './aside.mjs';
import { DRIVER } from './lib/drive.mjs';
import { RUNS } from './lib/runs.mjs';

const J = JSON.stringify;
const open = (v, w, h) => `
const ${v} = await openTab(${J(frame(w, h, 'index.html'))});
await ${v}.evaluate(() => frameReady);
await ${v}.evaluate(() => { ${DRIVER} });
await ${v}.evaluate(() => { ${RUNS} });
`;
const fin = (v) => `
if (${v}.length) console.log('FAIL ' + ${v}.join('\\nFAIL '));
else console.log('PASS');
`;

// 조항 공개 화면을 확인하는 page 쪽 코드(장 ch, 학년 grade)
const CHECK_REVEAL = (ch, grade) => `{
    const T = D.T(), G = D.G(), w = D.w();
    if (!G.screens.reveal || !G.screens.result) D.bad('G.screens.reveal · result 등록 없음');
    const run = G.save.loadChapter();
    G.app.resume();
    await D.until(() => D.cur() === 'reveal' && D.$('.rv-art'), 3000, '조항 공개 화면');
    const by = {};
    w.SCRIPTS.forEach((s) => { by[s.id] = s; });
    const want = G.rules.revealArticles(w.GUIDES[${ch}], run.ids.map((id) => by[id]));
    const cards = D.$$('.rv-art');
    if (cards.map((c) => c.getAttribute('data-article')).join(',') !== want.join(',')) D.bad('조항 차례: ' + cards.map((c) => c.getAttribute('data-article')).join(',') + ' / ' + want.join(','));
    const i20 = want.indexOf('20'), i20d = want.indexOf('20-다만');
    if (i20d >= 0 && i20d !== i20 + 1) D.bad("'20-다만'이 '20' 바로 뒤가 아님");
    const head = D.$('.rv-heading');
    const wantHead = G.text.t('reveal.heading', { articles: G.text.articleList(want) });
    if (!head || head.textContent.replace(/\\s+/g, ' ').trim() !== wantHead) D.bad('머리 문장: ' + (head && head.textContent) + ' / ' + wantHead);
    if (D.$('.rv-title').textContent.trim() !== T.reveal.title) D.bad('제목');
    if (!D.$('.rv').textContent.includes(T.reveal.note)) D.bad('원문 표시 안내 없음');
    want.forEach((id) => {
      const c = D.$('.rv-art[data-article="' + id + '"]');
      const A = w.ARTICLES[id];
      if (!c || !A) { D.bad('조항 카드/데이터 없음 ' + id); return; }
      const orig = c.querySelector('.rv-orig');
      if (!orig || orig.textContent.trim() !== T.common.original) D.bad('원문 표시 없음 ' + id);
      if (!c.querySelector('.rv-art-name') || !c.querySelector('.rv-art-name').textContent.includes(A.name)) D.bad('조항 이름 ' + id);
      const txt = c.textContent;
      A.parts.forEach((p) => {
        if (p.text && !txt.includes(p.text)) D.bad('원문 문장 없음 ' + id + ': ' + p.text.slice(0, 20));
        if (p.label && !txt.includes(p.label)) D.bad('묶음 표시 없음 ' + id + ' ' + p.label);
        (p.examples || []).forEach((e) => {
          if (!txt.includes(e[0]) || !txt.includes(G.text.pron(e[1]))) D.bad('예시 없음 ' + id + ' ' + e[0]);
          if (e[2] && !txt.includes(G.text.pron(e[2]))) D.bad('틀린 발음 없음 ' + id + ' ' + e[0]);
        });
      });
    });
    // 원문은 게임 설정과 구분: 머리 문장(게임 쪽 말)에는 원문 표시가 없음
    if (head && head.querySelector('.rv-orig')) D.bad('머리 문장에 원문 표시');
    const nx = D.$('[data-act="reveal-next"]');
    if (!nx || nx.textContent.trim() !== T.reveal.next) D.bad('장 결과 보기 단추');
    // 아직 장 결과 전: 진행 장은 남아 있음(새로 고침하면 다시 조항 공개)
    if (!G.save.loadChapter() || G.save.loadChapter().phase !== 'reveal') D.bad('조항 공개에서 진행 장이 사라짐');
}`;

// 장 결과 화면을 확인하는 page 쪽 코드(조항 공개에서 [장 결과 보기]를 누른 뒤)
const CHECK_RESULT = (ch, grade, level) => `{
    const T = D.T(), G = D.G(), w = D.w();
    const run = G.save.loadChapter();
    const sum = D.finishedSummary(run);
    const by = {};
    w.SCRIPTS.forEach((s) => { by[s.id] = s; });
    D.tapSel('[data-act="reveal-next"]', '장 결과 보기');
    await D.until(() => D.cur() === 'result' && D.$('.rs-row'), 3000, '장 결과 화면');
    // 장 결과에 닿으면 진행 장 저장을 지움(명세 §10)
    if (G.save.loadChapter() !== null || G.save.hasChapter()) D.bad('장 결과인데 진행 장이 남음');
    if (w.localStorage.getItem('eumun-byeondong:chapter') !== null) D.bad('저장소에 진행 장 값이 남음');
    if (D.$('.rs-title').textContent.trim() !== T.result.title) D.bad('제목');
    const sub = G.text.fill(T.result.subtitle, { chapter: G.text.chapterTitle(${ch}), level: G.text.levelName('${level}') });
    if (!D.$('.rs').textContent.includes(sub)) D.bad('부제: ' + sub);
    // 원고별 7줄
    const rows = D.$$('.rs-row');
    if (rows.length !== 7) D.bad('줄 수 ' + rows.length);
    sum.forEach((r, i) => {
      const row = rows[i];
      if (!row) return;
      const cell = (c) => { const n = row.querySelector('.rs-c-' + c); return n ? n.textContent.replace(/\\s+/g, ' ').trim() : null; };
      if (cell('text') !== r.text) D.bad(i + ' 표기: ' + cell('text') + ' / ' + r.text);
      if (cell('pron') !== G.text.pron(r.pron)) D.bad(i + ' 표준 발음: ' + cell('pron') + ' / ' + G.text.pron(r.pron));
      if (!cell('outcome') || !cell('outcome').includes(G.text.outcome(r.result))) D.bad(i + ' 결과: ' + cell('outcome') + ' / ' + r.result);
      const oc = row.querySelector('.rs-c-outcome');
      if (!oc || oc.getAttribute('data-result') !== r.result) D.bad(i + ' 결과 표시 data-result');
      if (r.result !== 'skip' && !oc.querySelector('svg[data-glyph="' + r.result + '"]')) D.bad(i + ' 결과 기호(색 + 기호) 없음');
      if (cell('sends') !== G.text.fill(T.common.timesN, { n: r.sends })) D.bad(i + ' 송출: ' + cell('sends'));
      if (cell('help') !== (r.helped ? T.result.helpUsed : T.result.helpNone)) D.bad(i + ' 도움: ' + cell('help'));
    });
    // 정답 기준 숫자 — 7개 원고 데이터의 합(엔진을 쓰지 않고 데이터로 직접 셈)
    const ch0 = { replace: 0, delete: 0, insert: 0, merge: 0 }, cn = [0, 0];
    run.ids.forEach((id) => { const s = by[id]; Object.keys(ch0).forEach((op) => { ch0[op] += (s.change && s.change[op]) || 0; }); cn[0] += s.count[0]; cn[1] += s.count[1]; });
    const tot = G.rules.chapterTotals(run.ids.map((id) => by[id]));
    if (JSON.stringify(tot) !== JSON.stringify({ change: ch0, count: cn })) D.bad('엔진 합계와 데이터 합이 다름');
    Object.keys(ch0).forEach((op) => {
      const n = D.$('.rs-change[data-op="' + op + '"]');
      const wantLine = G.text.fill(T.result.changeLine, { name: G.text.change('${grade}', op), n: ch0[op] });
      if (!n || n.textContent.replace(/\\s+/g, ' ').trim() !== wantLine) D.bad('변동 ' + op + ': ' + (n && n.textContent) + ' / ' + wantLine);
    });
    const cnt = D.$('.rs-count');
    const wantCnt = G.text.fill(T.result.countLine, { from: cn[0], to: cn[1] });
    if (!cnt || cnt.textContent.replace(/\\s+/g, ' ').trim() !== wantCnt) D.bad('음운 수: ' + (cnt && cnt.textContent) + ' / ' + wantCnt);
    if (!D.$('.rs').textContent.includes(G.text.t('result.changeTitle', null, '${grade}'))) D.bad('변동 제목(학년)');
    if (!D.$('.rs').textContent.includes(T.result.totalsNote)) D.bad('정답 기준 안내 없음');
    // 공개된 조항 목록
    const arts = G.rules.revealArticles(w.GUIDES[${ch}], run.ids.map((id) => by[id]));
    const al = D.$('.rs-articles');
    if (!al || !al.textContent.includes(G.text.articleList(arts))) D.bad('공개된 조항: ' + (al && al.textContent) + ' / ' + G.text.articleList(arts));
    const ag = D.$('[data-act="again"]'), cs = D.$('[data-act="chapters"]');
    if (!ag || ag.textContent.trim() !== T.result.again) D.bad('다시 하기 단추');
    if (!cs || cs.textContent.trim() !== T.result.chapters) D.bad('장 고르기 단추');
    if (/\\uAE00\\uC790/.test(D.d().body.textContent)) D.bad('금지 낱말이 화면에 있음');
}`;

step('2장 조항 공개 → 장 결과 → 장 고르기(이어 하기 없음)', `
${open('a1', 1280, 800)}
try {
  const ea = [];
  ea.push(...await a1.evaluate(async () => { await D.fresh(); return D.take(); }));
  ea.push(...await a1.evaluate(async () => {
    D.finishRun(2, { grade: 'h1', level: 'advanced', seed: 7 });
    ${CHECK_REVEAL(2, 'h1')}
    return D.take();
  }));
  // 조항 공개에서 새로 고침 → 이어 하기 → 다시 조항 공개
  ea.push(...await a1.evaluate(async () => { await D.reload(); return D.take(); }));
  ea.push(...await a1.evaluate(async () => {
    const G = D.G();
    const info = G.save.chapterInfo();
    if (!info || info.phase !== 'reveal') D.bad('새로 고침 뒤 조항 공개 단계가 아님: ' + JSON.stringify(info));
    D.tapSel('[data-act="resume"]', '이어 하기(공개)');
    await D.until(() => D.cur() === 'reveal' && D.$('.rv-art'), 3000, '이어 하기 → 조항 공개');
    ${CHECK_RESULT(2, 'h1', 'advanced')}
    D.tapSel('[data-act="chapters"]', '장 고르기');
    await D.until(() => D.cur() === 'start', 3000, '시작 화면');
    if (D.$('.st-resume')) D.bad('장 결과 뒤에 이어 하기 카드가 남음');
    return D.take();
  }));
  ${fin('ea')}
} finally { await closeTab(a1); }
`);

step('1장 장 결과 → 다시 하기(지침 건너뜀) · 새로 고침', `
${open('b1', 1366, 768)}
try {
  const eb = [];
  eb.push(...await b1.evaluate(async () => { await D.fresh(); return D.take(); }));
  eb.push(...await b1.evaluate(async () => {
    const before = D.finishRun(1, { grade: 'm3', level: 'basic', seed: 99, results: ['skip', 'onair'], help: [[], [2, 3]] });
    ${CHECK_REVEAL(1, 'm3')}
    ${CHECK_RESULT(1, 'm3', 'basic')}
    // [다시 하기] → 같은 장 · 단계 · 학년을 새로 뽑아 감수부터(지침 건너뜀)
    D.tapSel('[data-act="again"]', '다시 하기');
    await D.until(() => D.cur() === 'review', 3000, '다시 하기 → 감수 화면');
    const r = D.G().save.loadChapter();
    if (!r || r.ch !== 1 || r.level !== 'basic' || r.grade !== 'm3' || r.phase !== 'review' || r.guideDone !== true || r.done.length) D.bad('다시 하기 진행 장: ' + JSON.stringify(r));
    if (r && r.seed === before.seed) D.bad('다시 하기가 같은 시드');
    if (D.$('.gd-card')) D.bad('다시 하기인데 지침 화면');
    return D.take();
  }));
  eb.push(...await b1.evaluate(async () => {
    const G = D.G();
    // 장 결과에서 새로 고침하면 시작 화면이고 이어 하기가 없음
    D.finishRun(1, { seed: 4 });
    G.app.resume();
    await D.until(() => D.cur() === 'reveal' && D.$('.rv-art'), 3000, '조항 공개');
    D.tapSel('[data-act="reveal-next"]', '장 결과 보기');
    await D.until(() => D.cur() === 'result' && D.$('.rs-row'), 3000, '장 결과');
    return D.take();
  }));
  eb.push(...await b1.evaluate(async () => { await D.reload(); return D.take(); }));
  eb.push(...await b1.evaluate(async () => {
    const G = D.G();
    if (D.cur() !== 'start' || D.$('.st-resume')) D.bad('장 결과 뒤 새로 고침: ' + D.cur());
    // 값 없이 장 결과 · 조항 공개로 가면(진행 장 없음) 시작 화면
    G.app.go('result');
    await D.until(() => D.cur() === 'start', 3000, '값 없는 장 결과 → 시작');
    G.app.go('reveal');
    await D.until(() => D.cur() === 'start', 3000, '값 없는 조항 공개 → 시작');
    return D.take();
  }));
  ${fin('eb')}
} finally { await closeTab(b1); }
`);

const SIZES = [[1280, 800], [1366, 768], [1920, 1080], [390, 844], [360, 740]];
SIZES.forEach(([W, H], k) => {
  const phone = W < 768;
  const min = phone ? 48 : 64;
  const v = 'c' + k;
  step(`조항 공개 · 장 결과 크기 ${W}×${H} — 가로 스크롤 없음 · 누르는 자리 ${min}px`, `
${open(v, W, H)}
try {
  const r${v} = [];
  r${v}.push(...await ${v}.evaluate(async () => { await D.fresh(); return D.take(); }));
  r${v}.push(...await ${v}.evaluate(async () => {
    const tag = '${W}×${H}', MIN = ${min};
    const G = D.G();
    for (const [ch, grade] of [[2, 'h1'], [1, 'm3']]) {
      D.finishRun(ch, { grade, seed: 31 + ch });
      G.app.resume();
      await D.until(() => D.cur() === 'reveal' && D.$('.rv-art'), 3000, tag + ' 조항 공개 ' + ch);
      D.targets(MIN, tag + ' 조항 공개 ' + ch); D.noScroll(tag + ' 조항 공개 ' + ch);
      D.tapSel('[data-act="reveal-next"]', tag + ' 장 결과 보기');
      await D.until(() => D.cur() === 'result' && D.$('.rs-row'), 3000, tag + ' 장 결과 ' + ch);
      D.targets(MIN, tag + ' 장 결과 ' + ch); D.noScroll(tag + ' 장 결과 ' + ch);
      D.$$('.rs-row').forEach((row) => { if (!D.visible(row)) D.bad(tag + ' 줄이 안 보임'); });
    }
    return D.take();
  }));
  ${fin('r' + v)}
} finally { await closeTab(${v}); }
`);
});
