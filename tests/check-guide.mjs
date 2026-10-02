// 감수 지침 화면 G.screens.guide 점검(aside) — 명세 §7 · §3-5 · §14 · §18.
//   진짜 index.html을 크기별 틀(tests/pages/frame.html)에 띄우고 학생처럼 누른다(운전 도구 tests/lib/drive.mjs의 D).
//   1) 1장 지침 화면 모양: 지침 3개 · 빈칸마다 보기 2~4개(빗금 표기) · 예시 원고(표기 → 표준 발음)
//      지침 빈칸의 정답이 DOM · aria 어디에도 없음(정답 보기와 다른 보기의 모양이 같음, 'answer' 낱말 없음)
//      뽑힌 원고 7개의 표준 발음이 화면에 없음
//   2) 채점(1~7장 — 8장은 지침이 없음): 여러 고른 값마다 "n칸이 맞지 않아요"의 n이 G.rules.gradeGuides(그리고 데이터로 직접 센 수)와 같음,
//      어느 칸이 틀렸는지 화면에 드러나지 않음(빈칸 · 보기의 모양이 모두 같음), 덜 고르면 '모두 골라 주세요'
//   3) 다 맞으면 '지침을 모두 채웠어요' + 저장(guideDone · 감수 단계) → [원고 감수 시작] → 감수 화면
//   4) 다섯 크기에서 가로 스크롤 없음 · 누르는 자리(가로 64px, 휴대폰 세로 48px) — 1 · 2장과 문장 · 보기가 가장 긴 4장
//   5) 8장(지침 없음)은 [감수 시작]에서 곧바로 감수 화면(지침 화면을 거치지 않음)
//   모든 단계에서 페이지 오류(window.__gamsuErrors)가 없어야 한다.
import { step, frame } from './aside.mjs';
import { DRIVER } from './lib/drive.mjs';

const J = JSON.stringify;
// 이 점검의 도우미(바깥 창의 D에 더함)
const GD = String.raw`
if (!D.gdPick) {
  // 지침 데이터를 차례로 돌며 fn(지침, 빈칸 id, 화면 전체 빈칸 번호) → 보기 번호(null이면 안 고름)를 실제로 누른다 → picks
  D.gdPick = (ch, fn, tag) => {
    const gs = D.w().GUIDES[ch];
    const picks = {};
    let n = 0;
    gs.forEach((g) => {
      picks[g.id] = {};
      Object.keys(g.blanks).forEach((b) => {
        const i = fn(g, b, n++);
        if (i == null) return;
        picks[g.id][b] = i;
        const sel = '.gd-card[data-guide="' + g.id + '"] .gd-blank[data-blank="' + b + '"] .gd-opt[data-i="' + i + '"]';
        D.tap(D.$(sel), (tag || '') + ' 보기 ' + g.id + '.' + b + '.' + i);
      });
    });
    return picks;
  };
  // 데이터로 직접 센 틀린 칸 수(고르지 않은 칸도 틀린 칸)
  D.gdWrong = (ch, picks) => {
    let n = 0;
    D.w().GUIDES[ch].forEach((g) => Object.keys(g.blanks).forEach((b) => { if ((picks[g.id] || {})[b] !== g.blanks[b].answer) n++; }));
    return n;
  };
  // 요소의 모양(속성 전부 — 빼라고 준 이름은 뺌)
  D.sig = (e, skip) => Array.from(e.attributes).filter((a) => (skip || []).indexOf(a.name) < 0).map((a) => a.name + '=' + a.value).sort().join(' ');
  // 정답이 새지 않았는지: 보기 단추끼리(aria-pressed · data-i 말고) 모양이 같고, 빈칸 묶음끼리 · 빈칸 자리끼리 모양이 같음
  D.gdNoLeak = (tag) => {
    const html = D.d().getElementById('app').innerHTML;
    if (/answer/i.test(html)) D.bad(tag + ': DOM에 answer 낱말');
    const opts = D.$$('.gd-opt');
    if (!opts.length) D.bad(tag + ': 보기 단추 없음');
    const os = new Set(opts.map((e) => D.sig(e, ['aria-pressed', 'data-i'])));
    if (os.size !== 1) D.bad(tag + ': 보기 단추 모양이 여러 가지 ' + JSON.stringify(Array.from(os)));
    const bs = new Set(D.$$('.gd-blank').map((e) => D.sig(e, ['aria-label', 'data-blank'])));
    if (bs.size !== 1) D.bad(tag + ': 빈칸 묶음 모양이 여러 가지 ' + JSON.stringify(Array.from(bs)));
    const ss = new Set(D.$$('.gd-slot').map((e) => D.sig(e, ['data-blank', 'data-n'])));
    if (ss.size > 2) D.bad(tag + ': 빈칸 자리 모양이 셋 이상 ' + JSON.stringify(Array.from(ss)));
    // aria에도 정답 보기가 따로 드러나지 않음: 보기의 aria-label이 있으면 보기 글과 같아야
    opts.forEach((e) => { const l = e.getAttribute('aria-label'); if (l && l !== e.textContent.trim()) D.bad(tag + ': 보기 aria-label이 글과 다름 ' + l); });
  };
  D.gdMsg = () => { const m = D.$('.gd-msg'); return m ? m.textContent.trim() : null; };
  D.gdCheck = (tag) => { D.tapSel('[data-act="guide-check"]', (tag || '') + ' 확인'); return D.gdMsg(); };
}
`;

const open = (v, w, h) => `
const ${v} = await openTab(${J(frame(w, h, 'index.html'))});
await ${v}.evaluate(() => frameReady);
await ${v}.evaluate(() => { ${DRIVER} });
await ${v}.evaluate(() => { ${GD} });
`;
const fin = (v) => `
if (${v}.length) console.log('FAIL ' + ${v}.join('\\nFAIL '));
else console.log('PASS');
`;

step('1장 지침 화면 — 모양 · 정답이 DOM에 없음', `
${open('a1', 1280, 800)}
try {
  const ea = [];
  ea.push(...await a1.evaluate(async () => { await D.fresh(); return D.take(); }));
  ea.push(...await a1.evaluate(async () => {
    const T = D.T(), G = D.G(), w = D.w();
    if (!G.screens.guide || typeof G.screens.guide.mount !== 'function') D.bad('G.screens.guide 등록 없음');
    D.tapSel('.st-ch[data-ch="1"]', '1장');
    D.tapSel('[data-act="begin"]', '감수 시작');
    await D.passWarmup(); await D.until(() => D.cur() === 'guide' && D.$('.gd-card'), 3000, '지침 화면');
    const run = G.save.loadChapter();
    const gs = w.GUIDES[1];
    if (D.$('.gd-title').textContent.trim() !== T.guide.title) D.bad('제목: ' + D.$('.gd-title').textContent);
    if (!D.$('.gd').textContent.includes(G.text.chapterTitle(1))) D.bad('장 이름 없음');
    if (!D.$('.gd').textContent.includes(T.guide.intro)) D.bad('안내 한 줄 없음');
    const cards = D.$$('.gd-card');
    if (cards.length !== gs.length) D.bad('지침 수 ' + cards.length + ' / ' + gs.length);
    const by = {};
    w.SCRIPTS.forEach((s) => { by[s.id] = s; });
    let total = 0;
    gs.forEach((g, gi) => {
      const c = D.$('.gd-card[data-guide="' + g.id + '"]');
      if (!c) { D.bad('지침 카드 없음 ' + g.id); return; }
      if (cards[gi] !== c) D.bad('지침 차례 ' + g.id);
      // 문장: 빈칸 자리를 뺀 나머지 글이 학년(중3) 문장과 같다
      const parts = g.text.m3.split(/\\{[A-Za-z0-9_-]+\\}/);
      const t = c.querySelector('.gd-text');
      const clone = t.cloneNode(true);
      clone.querySelectorAll('.gd-slot').forEach((s) => s.remove());
      if (clone.textContent.replace(/\\s+/g, '') !== parts.join('').replace(/\\s+/g, '')) D.bad('지침 문장 ' + g.id + ': ' + clone.textContent);
      Object.keys(g.blanks).forEach((b) => {
        total++;
        const bl = g.blanks[b];
        const slot = t.querySelector('.gd-slot[data-blank="' + b + '"]');
        if (!slot) D.bad('빈칸 자리 없음 ' + g.id + '.' + b);
        const grp = c.querySelector('.gd-blank[data-blank="' + b + '"]');
        if (!grp) { D.bad('빈칸 보기 없음 ' + g.id + '.' + b); return; }
        if (grp.getAttribute('role') !== 'group' || !grp.getAttribute('aria-label')) D.bad('빈칸 묶음 role/aria ' + b);
        const ob = Array.from(grp.querySelectorAll('.gd-opt'));
        if (ob.length !== bl.options.length || ob.length < 2 || ob.length > 4) D.bad('보기 수 ' + g.id + '.' + b + ' ' + ob.length);
        ob.forEach((o, i) => {
          if (o.textContent.trim() !== bl.options[i]) D.bad('보기 글 ' + g.id + '.' + b + '.' + i + ': ' + o.textContent);
          if (o.getAttribute('aria-pressed') !== 'false') D.bad('처음부터 눌린 보기 ' + g.id + '.' + b + '.' + i);
        });
      });
      // 예시 원고: 표기 → 표준 발음(G.text.pron) — 지침에 고정된 예시만, 차례대로
      const rows = Array.from(c.querySelectorAll('.gd-ex-row'));
      if (rows.length !== g.examples.length) D.bad('예시 수 ' + g.id + ' ' + rows.length);
      g.examples.forEach((ex, i) => {
        const want = G.text.fill(T.guide.exampleRow, { text: by[ex.id].text, pron: G.text.pron(by[ex.id].pron) });
        if (!rows[i] || rows[i].textContent.replace(/\\s+/g, ' ').trim() !== want) D.bad('예시 ' + g.id + ' ' + i + ': ' + (rows[i] && rows[i].textContent) + ' / ' + want);
      });
    });
    if (D.$$('.gd-blank').length !== total) D.bad('빈칸 묶음 수 ' + D.$$('.gd-blank').length + ' / ' + total);
    // 화면 전체 빈칸 번호(①~)는 차례대로 겹치지 않음
    const ns = D.$$('.gd-slot').map((s) => s.getAttribute('data-n'));
    if (ns.join(',') !== ns.map((x, i) => String(i + 1)).join(',')) D.bad('빈칸 번호: ' + ns.join(','));
    D.gdNoLeak('처음');
    // 뽑힌 원고 7개의 표준 발음이 화면 · DOM에 없음(장 결과 전, 명세 §3-5)
    const html = D.d().getElementById('app').innerHTML;
    run.ids.forEach((id) => { const p = G.text.pron(by[id].pron); if (html.includes(p)) D.bad('뽑힌 원고 발음이 DOM에: ' + id + ' ' + p); });
    if (D.$('[data-act="guide-go"]')) D.bad('다 맞기 전에 감수 시작 단추가 있음');
    if (D.gdMsg()) D.bad('처음부터 한 줄 안내: ' + D.gdMsg());
    // 금지 낱말(명세 §3-6) — 이 파일에도 그 낱말을 쓰지 않으려고 부호로 적음
    if (/\\uAE00\\uC790/.test(D.d().body.textContent)) D.bad('금지 낱말이 화면에 있음');
    // 보기를 하나 고르면 그 보기만 눌리고 빈칸 자리에 그 보기가 들어감 · 다른 보기를 고르면 바뀜
    const g0 = gs[0], b0 = Object.keys(g0.blanks)[0];
    const sel = (i) => '.gd-card[data-guide="' + g0.id + '"] .gd-blank[data-blank="' + b0 + '"] .gd-opt[data-i="' + i + '"]';
    D.tapSel(sel(1), '보기 고르기');
    const slot0 = D.$('.gd-card[data-guide="' + g0.id + '"] .gd-slot[data-blank="' + b0 + '"]');
    if (D.$(sel(1)).getAttribute('aria-pressed') !== 'true' || D.$(sel(0)).getAttribute('aria-pressed') !== 'false') D.bad('고른 보기 표시');
    if (!slot0.textContent.includes(g0.blanks[b0].options[1])) D.bad('빈칸 자리에 고른 보기가 없음: ' + slot0.textContent);
    D.tapSel(sel(2), '다른 보기 고르기');
    if (D.$(sel(1)).getAttribute('aria-pressed') !== 'false' || !slot0.textContent.includes(g0.blanks[b0].options[2])) D.bad('다시 고르기');
    D.gdNoLeak('하나 고른 뒤');
    return D.take();
  }));
  ${fin('ea')}
} finally { await closeTab(a1); }
`);

// 채점: 장마다 여러 고른 값(모두 틀림 · 하나만 틀림 · 섞임 …)
const SETS = [
  ['모두 첫 보기', 'first'],
  ['하나만 틀림', 'oneOff'],
  ['섞임 1', 'mix1'],
  ['섞임 2', 'mix2'],
  ['정답이 아닌 보기만', 'allWrong'],
];
[[1, 'm3'], [2, 'h1'], [3, 'm3'], [4, 'h1'], [5, 'm3'], [6, 'h1'], [7, 'm3']].forEach(([ch, grade]) => {
  step(`${ch}장 지침 채점 — 틀린 칸 수만 (${grade})`, `
${open('b' + ch, 1366, 768)}
try {
  const eb = [];
  eb.push(...await b${ch}.evaluate(async () => { await D.fresh(); return D.take(); }));
  eb.push(...await b${ch}.evaluate(async () => {
    const T = D.T(), G = D.G(), w = D.w();
    const CH = ${ch};
    G.app.beginChapter({ ch: CH, grade: '${grade}', level: 'basic', seed: 11 });
    await D.passWarmup(); await D.until(() => D.cur() === 'guide' && D.$('.gd-card'), 3000, '지침 화면');
    const gs = w.GUIDES[CH];
    // 고1 문장
    gs.forEach((g) => {
      const t = D.$('.gd-card[data-guide="' + g.id + '"] .gd-text').cloneNode(true);
      t.querySelectorAll('.gd-slot').forEach((s) => s.remove());
      if (t.textContent.replace(/\\s+/g, '') !== g.text['${grade}'].split(/\\{[A-Za-z0-9_-]+\\}/).join('').replace(/\\s+/g, '')) D.bad('학년 문장 ' + g.id);
    });
    // 덜 고르고 확인 → '빈칸을 모두 골라 주세요'(채점하지 않음)
    D.gdPick(CH, (g, b, n) => (n === 0 ? 0 : null), '덜 고름');
    const m0 = D.gdCheck('덜 고름');
    if (m0 !== T.guide.notAll) D.bad('덜 고른 안내: ' + m0);
    if (G.save.loadChapter().phase !== 'guide') D.bad('덜 고른 채로 넘어감');
    const strat = {
      first: () => 0,
      oneOff: (g, b, n) => (n === 2 ? (g.blanks[b].answer + 1) % g.blanks[b].options.length : g.blanks[b].answer),
      mix1: (g, b, n) => (n % 2 ? g.blanks[b].answer : (g.blanks[b].answer + 1) % g.blanks[b].options.length),
      // 셋째마다 정답, 나머지는 정답 바로 앞 보기(늘 오답 — 장마다 정답 자리가 달라도 '모두 정답'이 되지 않게)
      mix2: (g, b, n) => (n % 3 === 0 ? g.blanks[b].answer : (g.blanks[b].answer + g.blanks[b].options.length - 1) % g.blanks[b].options.length),
      allWrong: (g, b) => (g.blanks[b].answer + 1) % g.blanks[b].options.length,
    };
    const seen = [];
    ${J(SETS)}.forEach(([name, key]) => {
      const picks = D.gdPick(CH, strat[key], name);
      const want = G.rules.gradeGuides(gs, picks);
      const mine = D.gdWrong(CH, picks);
      if (want !== mine) D.bad(name + ': 엔진 채점 ' + want + ' / 데이터로 센 수 ' + mine);
      const msg = D.gdCheck(name);
      seen.push(want);
      if (want === 0) D.bad(name + ': 고른 값이 모두 정답(점검 고른 값을 바꿀 것)');
      else if (msg !== G.text.t('guide.wrong', { n: want })) D.bad(name + ': 안내 ' + msg + ' / ' + G.text.t('guide.wrong', { n: want }));
      // 어느 칸이 틀렸는지 · 정답이 무엇인지 드러나지 않음
      D.gdNoLeak(name);
      if (D.$$('.gd-msg').length !== 1) D.bad(name + ': 한 줄 안내 자리가 하나가 아님');
      const lv = D.$('.gd-msg');
      if (lv.getAttribute('role') !== 'status' && lv.getAttribute('aria-live') !== 'polite') D.bad('안내 자리 role/aria-live');
      gs.forEach((g) => Object.keys(g.blanks).forEach((b) => { if (msg.includes(g.blanks[b].options[g.blanks[b].answer])) D.bad(name + ': 안내에 보기 글'); }));
      if (D.cur() !== 'guide' || G.save.loadChapter().phase !== 'guide' || G.save.loadChapter().guideDone) D.bad(name + ': 틀렸는데 넘어감');
      if (D.$('[data-act="guide-go"]')) D.bad(name + ': 틀렸는데 감수 시작 단추');
    });
    if (new Set(seen).size < 3) D.bad('고른 값들의 틀린 칸 수가 너무 비슷함: ' + seen.join(','));
    // 고른 값은 확인 뒤에도 남는다(다시 고르기)
    const lastOpt = D.$$('.gd-opt[aria-pressed="true"]').length;
    if (lastOpt !== D.$$('.gd-blank').length) D.bad('확인 뒤 고른 값이 사라짐 ' + lastOpt);
    return D.take();
  }));
  ${fin('eb')}
} finally { await closeTab(b${ch}); }
`);
});

step('지침 다 맞음 → 저장 · 감수로', `
${open('c1', 1280, 800)}
try {
  const ec = [];
  ec.push(...await c1.evaluate(async () => { await D.fresh(); return D.take(); }));
  ec.push(...await c1.evaluate(async () => {
    const T = D.T(), G = D.G(), w = D.w();
    G.app.beginChapter({ ch: 2, grade: 'h1', level: 'advanced', seed: 5 });
    await D.passWarmup(); await D.until(() => D.cur() === 'guide' && D.$('.gd-card'), 3000, '지침 화면');
    const before = G.save.loadChapter();
    // 한 번 틀린 뒤 다 맞게
    D.gdPick(2, () => 0, '틀림');
    D.gdCheck('틀림');
    D.gdPick(2, (g, b) => g.blanks[b].answer, '정답');
    const msg = D.gdCheck('정답');
    if (msg !== T.guide.allRight) D.bad('다 맞음 안내: ' + msg);
    const run = G.save.loadChapter();
    if (!run || run.phase !== 'review' || run.guideDone !== true || run.done.length || JSON.stringify(run.ids) !== JSON.stringify(before.ids)
      || run.ch !== 2 || run.grade !== 'h1' || run.level !== 'advanced') D.bad('다 맞은 뒤 저장: ' + JSON.stringify(run));
    if (JSON.stringify(Object.keys(run)).includes('wrong') || JSON.stringify(run).includes('tries')) D.bad('틀린 횟수가 저장됨');
    const go = D.$('[data-act="guide-go"]');
    if (!go || go.textContent.trim() !== T.guide.go) D.bad('감수 시작 단추: ' + (go && go.textContent));
    D.tapSel('[data-act="guide-go"]', '원고 감수 시작');
    await D.until(() => D.cur() === 'review', 3000, '감수 화면');
    return D.take();
  }));
  // 새로 고침 → 이어 하기는 감수 단계(지침을 다시 하지 않음)
  ec.push(...await c1.evaluate(async () => { await D.reload(); return D.take(); }));
  ec.push(...await c1.evaluate(async () => {
    const G = D.G();
    const info = G.save.chapterInfo();
    if (!info || info.phase !== 'review' || info.no !== 1) D.bad('이어 하기 단계: ' + JSON.stringify(info));
    D.tapSel('[data-act="resume"]', '이어 하기');
    await D.until(() => D.cur() === 'review', 3000, '이어 하기 → 감수');
    return D.take();
  }));
  ${fin('ec')}
} finally { await closeTab(c1); }
`);

const SIZES = [[1280, 800], [1366, 768], [1920, 1080], [390, 844], [360, 740]];
SIZES.forEach(([W, H], k) => {
  const phone = W < 768;
  const min = phone ? 48 : 64;
  const v = 'd' + k;
  step(`지침 화면 크기 ${W}×${H} — 가로 스크롤 없음 · 누르는 자리 ${min}px`, `
${open(v, W, H)}
try {
  const r${v} = [];
  r${v}.push(...await ${v}.evaluate(async () => { await D.fresh(); return D.take(); }));
  r${v}.push(...await ${v}.evaluate(async () => {
    const tag = '${W}×${H}', MIN = ${min};
    const G = D.G();
    for (const [ch, grade] of [[1, 'm3'], [2, 'h1'], [4, 'm3']]) {
      G.app.beginChapter({ ch, grade, level: 'basic', seed: 3 });
      await D.passWarmup(); await D.until(() => D.cur() === 'guide' && D.$('.gd-card'), 3000, tag + ' 지침 ' + ch);
      D.targets(MIN, tag + ' ' + ch + '장 처음'); D.noScroll(tag + ' ' + ch + '장 처음');
      D.gdPick(ch, () => 0, tag);
      const m = D.gdCheck(tag);
      const line = D.$('.gd-msg');
      if (line && line.scrollWidth > line.clientWidth + 1) D.bad(tag + ' 안내 한 줄이 넘침: ' + m);
      D.targets(MIN, tag + ' ' + ch + '장 틀림'); D.noScroll(tag + ' ' + ch + '장 틀림');
      D.gdPick(ch, (g, b) => g.blanks[b].answer, tag);
      D.gdCheck(tag);
      if (!D.$('[data-act="guide-go"]')) D.bad(tag + ' 다 맞았는데 감수 시작 단추 없음');
      D.targets(MIN, tag + ' ' + ch + '장 다 맞음'); D.noScroll(tag + ' ' + ch + '장 다 맞음');
    }
    return D.take();
  }));
  ${fin('r' + v)}
} finally { await closeTab(${v}); }
`);
});

step('8장 — 지침 없이 곧바로 감수', `
${open('e1', 1280, 800)}
try {
  const ee = [];
  ee.push(...await e1.evaluate(async () => { await D.fresh(); return D.take(); }));
  ee.push(...await e1.evaluate(async () => {
    const G = D.G(), w = D.w();
    if (w.GUIDES[8]) D.bad('8장 지침이 있음');
    G.app.go('start');
    await D.until(() => D.$('.st-ch[data-ch="8"]'), 3000, '시작 화면');
    D.tapSel('.st-ch[data-ch="8"]', '8장');
    D.tapSel('[data-act="begin"]', '감수 시작');
    await D.until(() => D.cur() === 'review' && D.$('.rw-blocks .bk-slot'), 4000, '8장 → 감수 화면');
    if (D.$('.gd-card')) D.bad('8장에 지침 카드');
    const run = G.save.loadChapter();
    if (!run || run.ch !== 8 || run.phase !== 'review' || run.guideDone !== true || run.guides !== null) D.bad('8장 진행 장: ' + JSON.stringify(run && { ch: run.ch, p: run.phase, d: run.guideDone, g: run.guides }));
    return D.take();
  }));
  ${fin('ee')}
} finally { await closeTab(e1); }
`);
