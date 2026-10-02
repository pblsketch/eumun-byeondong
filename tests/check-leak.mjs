// 답이 새지 않는지(aside) — 명세 §3-5 · §7-4 · §8-1 · §18 '표준 발음 · 정답이 결과 전에 화면 글 · DOM에 없음', '심화 단계에서 경계가 DOM · aria에 없음'.
//   진짜 index.html로 한 판을 학생처럼 해 가며(tests/lib/flow.mjs) 지침 화면과 감수 화면의 DOM 전체(글 · 속성 · aria)를 본다.
//   결과 전에 없어야 하는 것
//     · 뽑힌 원고 7개의 표준 발음([…]과 장음 뺀 꼴, 표기와 다르면 대괄호 없는 꼴)과 비표준 발음 — 송출한 원고는 학생이 프롬프터에
//       직접 만든 발음이므로 그 원고만 뺀다(송출 뒤)
//     · 지금 원고의 풀이 과정(도움 ③의 '고침 … (규칙)' 줄) — 도움 ③을 열기 전
//     · 함정 표시 · 원고 갈래(trap · data-kind="link|exception|…")
//     · 지침 빈칸의 정답: 지침 화면에서 정답 보기와 다른 보기의 모양(속성)이 같고 'answer' 낱말이 없음,
//       정답으로 채운 지침 문장이 지침 화면(다 맞기 전)과 감수 화면(도움 ② 전)에 없음
//     · 심화 단계: 형태소 경계 요소 · 경계 종류 · 경계 이름표(학년 둘 모두)가 감수 화면 DOM · aria에 없음
//   장 결과에는 표준 발음이 모두 보인다. 1 · 2장은 두 단계(기본 · 심화) × 두 학년, 3~8장은 다섯 장(3 · 5 · 6 · 7 · 8장)을 학년 · 단계 ·
//   크기를 섞어 돈다(8장은 지침이 없어 감수부터).
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
await ${v}.evaluate(() => { ${LEAK} });
`;
const fin = (v) => `
if (${v}.length) console.log('FAIL ' + ${v}.join('\\nFAIL '));
else console.log('PASS');
`;

const LEAK = String.raw`
if (!D.secrets) {
  // 진행 장의 뽑힌 원고들에서 결과 전에 없어야 하는 낱말 → [{ w, id, what }]
  D.secrets = (run, except) => {
    const G = D.G(), strip = G.rules.strip, by = D.byId();
    const out = [];
    run.ids.forEach((id) => {
      if (except && except.indexOf(id) >= 0) return;
      const s = by[id];
      const add = (w, what) => { if (w && !out.some((o) => o.w === w)) out.push({ w, id, what }); };
      add(G.text.pron(s.pron), '표준 발음');
      add(G.text.pron(strip(s.pron)), '표준 발음(장음 뺌)');
      // 대괄호 없는 꼴은 두 음절 이상만(한 음절은 '입'술소리처럼 다른 낱말 안에 흔히 있음)
      if (strip(s.pron) !== strip(s.text).replace(/\s+/g, '') && strip(s.pron).length > 1) { add(s.pron, '표준 발음(대괄호 없음)'); add(strip(s.pron), '표준 발음(대괄호 · 장음 없음)'); }
      (s.nonstandard || []).forEach((ns) => { add(G.text.pron(ns[0]), '비표준 발음'); add(G.text.pron(strip(ns[0])), '비표준 발음'); });
    });
    return out;
  };
  // 정답으로 채운 지침 문장(학년) — 빈칸 자리를 정답 보기로 바꾼 글(띄어쓰기 없앰)
  D.filledGuides = (ch, grade) => (D.w().GUIDES[ch] || []).map((g) => {
    let t = g.text[grade];
    Object.keys(g.blanks).forEach((b) => { t = t.split('{' + b + '}').join(g.blanks[b].options[g.blanks[b].answer]); });
    return t.replace(/\s+/g, '');
  });
  D.cutWords = () => {
    const T = D.T(), out = [];
    ['m3', 'h1'].forEach((g) => ['formal', 'content', 'sino', 'stem'].forEach((c) => out.push(T.terms[g].cut[c])));
    out.push(T.review.aria.cut.m3.split(':')[0], T.review.aria.cut.h1.split(':')[0]);
    return out;
  };
  // 지금 문서에서 결과 전 비밀이 보이는지(글 · 속성 · aria 모두 — innerHTML)
  D.noSecret = (tag, run, o) => {
    o = o || {};
    const d = D.d();
    const html = d.body.innerHTML + '\n' + d.title;
    const flat = d.body.textContent.replace(/\s+/g, '');
    D.secrets(run, o.except).forEach((x) => { if (html.indexOf(x.w) >= 0) D.bad(tag + ': 결과 전인데 ' + x.what + ' ' + x.w + ' (' + x.id + ')'); });
    if (/trap/i.test(html)) D.bad(tag + ': trap 낱말이 DOM에');
    if (/data-kind="(link|exception|blocked|contrast|coda|nasal|r-nasal|lateral|palatal|tense[a-z-]*|simplify|h-drop|n-insert|glide-insert|aspirate)"/.test(html)) D.bad(tag + ': 원고 갈래 · 함정 표시가 DOM에');
    if (o.guides) D.filledGuides(run.ch, run.grade).forEach((t, i) => { if (flat.indexOf(t) >= 0) D.bad(tag + ': 정답으로 채운 지침 ' + (i + 1) + '이 화면에'); });
    if (o.steps) {
      const G = D.G(), H = D.T().help, sc = D.dbg().script();
      let st = G.rules.start(sc);
      const at1 = (p) => { const a = G.rules.pos(p), y = st.syl[a.s]; return a.slot === 'co' ? y.co[a.k] : y[a.slot]; };
      (sc.steps || []).map((x) => G.rules.parseStep(x)).forEach((c, i) => {
        // 감수 기록 한 줄과 같은 꼴(합침은 두 음운, 넣음은 넣은 음운만 — js/game/review.js의 logInfo)
        const info = c.op === 'merge' ? { op: 'merge', from: c.at.map(at1), to: c.to } : c.op === 'insert' ? { op: 'insert', to: c.to }
          : c.op === 'delete' ? { op: 'delete', from: at1(c.at) } : { op: c.op, from: at1(c.at), to: c.to };
        const line = G.text.fill(H.exampleStep, { line: G.text.logLine(i + 1, info), rule: G.text.rule(run.grade, c.rule) });
        if (d.body.textContent.indexOf(line) >= 0) D.bad(tag + ': 이 원고의 풀이 과정이 화면에 ' + line);
        st = G.rules.apply(st, c);
      });
    }
    if (o.advanced) {
      if (D.$('.bk-plus, .bk-cut, [data-cut]')) D.bad(tag + ': 심화인데 경계 요소');
      if (/cut-(formal|content|sino)|is-stem/.test(html)) D.bad(tag + ': 심화인데 경계 종류 클래스');
      const outside = Array.from(d.body.querySelectorAll('*')).filter((e) => !e.closest('.rw-help-body')).map((e) => Array.from(e.attributes).map((a) => a.value).join(' ')).join(' ')
        + ' ' + Array.from(d.body.querySelectorAll('.rw-blocks, .rw-head, .rw-desk')).map((e) => e.textContent).join(' ');
      D.cutWords().forEach((x) => { if (outside.indexOf(x) >= 0) D.bad(tag + ': 심화인데 경계 이름 ' + x); });
    }
  };
  // 지침 화면: 정답 보기를 가려낼 수 있는 표시가 없음
  D.guideNoAnswer = (tag) => {
    const html = D.d().getElementById('app').innerHTML;
    if (/answer|correct|is-right/i.test(html)) D.bad(tag + ': 정답 표시 낱말이 DOM에');
    const sig = (e, skip) => Array.from(e.attributes).filter((a) => skip.indexOf(a.name) < 0).map((a) => a.name + '=' + a.value).sort().join(' ');
    const os = new Set(D.$$('.gd-opt').map((e) => sig(e, ['aria-pressed', 'data-i'])));
    if (os.size !== 1) D.bad(tag + ': 보기 단추 모양이 여러 가지 ' + JSON.stringify(Array.from(os)));
  };
  // 한 판: 지침(정답 전 · 한 칸 틀린 뒤) → 감수 원고 7개(처음 · 도표 · 넣을 음운 · 도움 ①, 송출 뒤 도움 ② · ③) → 결과
  D.leakGuide = async (o) => {
    const tag = o.ch + '장 ' + o.grade + ' ' + o.level;
    const warm = (D.G().save.WARMUP || {})[o.ch] || 0;
    const run = await D.startChapter(Object.assign({ keepWarmup: true }, o));
    window.__from = 0;
    if (!D.w().GUIDES[o.ch]) return run; // 지침이 없는 장(8장): 곧바로 감수
    // 1장 몸풀기(결정 0021): 원고 몇 개를 먼저 감수한 뒤 지침 화면
    if (warm) {
      await D.leakScripts(o, run, 0, warm);
      await D.until(() => D.cur() === 'guide' && D.$('.gd-card'), 4000, tag + ' 몸풀기 뒤 지침');
      window.__from = warm;
    }
    D.noSecret(tag + ' 지침 처음', run, { guides: true });
    D.guideNoAnswer(tag + ' 지침 처음');
    let first = true;
    D.pickGuide(o.ch, (g, b) => { const a = g.blanks[b].answer; if (first) { first = false; return (a + 1) % g.blanks[b].options.length; } return a; });
    D.tapSel('[data-act="guide-check"]', '확인');
    D.noSecret(tag + ' 지침 한 칸 틀림', run, {});
    D.guideNoAnswer(tag + ' 지침 한 칸 틀림');
    await D.solveGuide(o.ch);
    await D.enterReview();
    return run;
  };
  D.leakScripts = async (o, run, from, to) => {
    const tag = o.ch + '장 ' + o.grade + ' ' + o.level;
    const adv = o.level === 'advanced';
    const sent = window.__sent || (window.__sent = []);
    for (let i = from; i < to; i++) {
      const sc = D.dbg().script();
      const t = tag + ' 원고 ' + (i + 1) + ' ' + sc.id;
      D.noSecret(t + ' 처음', run, { except: sent, guides: true, steps: true, advanced: adv });
      // 고침표 도표
      D.mark('replace'); D.tapSel('.rw-blocks .bk-slot:not(.is-empty)', t + ' 첫 음운');
      await D.until(() => D.sheet() && D.$('.rw-sheet .ch-cell'), 2000, t + ' 도표');
      D.noSecret(t + ' 도표', run, { except: sent, guides: true, steps: true, advanced: adv });
      D.tapSel('[data-act="rw-sheet-close"]', t + ' 도표 닫기');
      // 넣을 음운(2음절 이상)
      if (D.$('.rw-blocks .bk-gap[data-gap="0"]')) {
        D.mark('insert'); D.gap(0);
        await D.until(() => D.sheet() && D.$('.rw-ins'), 2000, t + ' 넣을 음운');
        D.noSecret(t + ' 넣을 음운', run, { except: sent, guides: true, steps: true, advanced: adv });
        D.tapSel('.rw-sheet .rw-sheet-close', t + ' 넣을 음운 닫기');
      }
      // 도움 ①(송출 전)
      D.act('rw-help');
      await D.until(() => D.$('.rw-help') && D.visible(D.$('.rw-help')), 2000, t + ' 도움');
      D.tapSel('.rw-help-step[data-step="1"]', t + ' 도움 ①');
      D.noSecret(t + ' 도움 ① 송출 전', run, { except: sent, guides: true, steps: true, advanced: adv });
      // 교정 없이 송출 → 이 원고는 학생이 만든 발음이 프롬프터에 나옴(그 원고만 빼고 계속 봄)
      await D.send(t);
      sent.push(sc.id);
      D.tapSel('.rw-help-step[data-step="1"]', t + ' 도움 ①(송출 뒤)');
      D.noSecret(t + ' 송출 뒤', run, { except: sent, guides: true, steps: true, advanced: adv });
      D.tapSel('.rw-help-step[data-step="2"]', t + ' 도움 ②');
      D.noSecret(t + ' 도움 ②', run, { except: sent, steps: true });
      D.tapSel('.rw-help-step[data-step="3"]', t + ' 도움 ③');
      D.noSecret(t + ' 도움 ③', run, { except: sent });
      D.tapSel('.rw-help-close', t + ' 도움 닫기');
      await D.nextScript();
    }
  };
  D.leakResult = async (o, run) => {
    const tag = o.ch + '장 ' + o.grade + ' ' + o.level;
    await D.until(() => D.cur() === 'reveal' && D.$('.rv-art'), 4000, tag + ' 조항 공개');
    D.tapSel('[data-act="reveal-next"]', tag + ' 장 결과 보기');
    await D.until(() => D.cur() === 'result' && D.$$('.rs-row').length === 7, 4000, tag + ' 장 결과');
    const G = D.G(), by = D.byId();
    const txt = D.$('.rs').textContent;
    run.ids.forEach((id) => { const p = G.text.pron(by[id].pron); if (txt.indexOf(p) < 0) D.bad(tag + ': 장 결과에 표준 발음이 없음 ' + p); });
    window.__sent = [];
  };
}
`;

const CASES = [
  { ch: 1, grade: 'm3', level: 'basic', size: [1280, 800] },
  { ch: 2, grade: 'h1', level: 'advanced', size: [1366, 768] },
  { ch: 1, grade: 'h1', level: 'advanced', size: [390, 844] },
  { ch: 2, grade: 'm3', level: 'basic', size: [1920, 1080] },
  { ch: 3, grade: 'h1', level: 'basic', size: [1280, 800] },
  { ch: 5, grade: 'm3', level: 'advanced', size: [360, 740] },
  { ch: 6, grade: 'h1', level: 'basic', size: [1366, 768] },
  { ch: 7, grade: 'm3', level: 'advanced', size: [1920, 1080] },
  { ch: 8, grade: 'h1', level: 'basic', size: [390, 844] },
];
CASES.forEach((c, k) => {
  const v = 'l' + k;
  const o = J({ ch: c.ch, grade: c.grade, level: c.level });
  step(`${c.ch}장 · ${c.grade} · ${c.level === 'basic' ? '기본' : '심화'} — 결과 전 답이 DOM · aria에 없음, 결과에는 있음`, `
${open(v, c.size[0], c.size[1])}
try {
  const e${v} = [];
  e${v}.push(...await ${v}.evaluate(async () => { await D.fresh(); D.G().save.setSettings({ reduceMotion: true }); window.__sent = []; return D.take(); }));
  // 한 번의 evaluate가 CDP 30초 안에 끝나게 잘게(공용 aside가 바쁠 때 — docs/engineering-notes.md)
  e${v}.push(...await ${v}.evaluate(async () => { window.__run = await D.leakGuide(${o}); await D.leakScripts(${o}, window.__run, Math.min(window.__from, 2), 2); return D.take(); }));
  e${v}.push(...await ${v}.evaluate(async () => { await D.leakScripts(${o}, window.__run, 2, 4); return D.take(); }));
  e${v}.push(...await ${v}.evaluate(async () => { await D.leakScripts(${o}, window.__run, 4, 6); return D.take(); }));
  e${v}.push(...await ${v}.evaluate(async () => { await D.leakScripts(${o}, window.__run, 6, 7); await D.leakResult(${o}, window.__run); return D.take(); }));
  ${fin('e' + v)}
} finally { await closeTab(${v}); }
`);
});
