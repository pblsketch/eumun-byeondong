// 음절 블록 · 형태소 경계 부품 G.blocks 점검(aside) — 명세 §8-1 · §8-2 · §14 · §18.
//   점검 전용 페이지 tests/pages/blocks.html(부품만 불러 띄움)을 크기별 틀(tests/pages/frame.html)에 띄운다.
//   1) 원고 376개 모두(1~8장, 기본 · 심화, 두 학년): 음절 · 자리(빈 초성 ○ · 반모음 · ㅢ 한 칸 · 겹받침) · 틈 수가 상태와 같고,
//      음운 · 틈을 누르면 엔진 자리(Pos)가 알맞게 온다. 화면 글에 빗금 없는 자모가 없다.
//   2) 형태소 경계: 기본 단계는 종류별 '+'와 학년별 이름표(G.text.cutLabel), 심화 단계는 '+' · 이름표 · 종류가 DOM · aria에 없다
//      (심화 블록 = 경계를 모두 지운 상태의 블록과 HTML이 똑같음 — 두 줄 나누기 자리로도 새지 않음).
//   3) 학생이 만든 이상한 상태(빈 중성, 받침만 바뀜, /ㄴ/ · j 넣음, 음절이 사라짐, 적을 수 없는 조합)도 오류 없이 그린다.
//   4) 다섯 크기에서 누르는 자리(가로 64px, 휴대폰 세로 48px) · 가로 스크롤 없음, 휴대폰 세로 두 줄 나누기와 줄 바뀌는 틈 누르기.
//   모든 단계에서 페이지 오류(window.__gamsuErrors)가 없어야 한다.
import { step, frame } from './aside.mjs';
import { DRIVER } from './lib/drive.mjs';

const J = JSON.stringify;
const PAGE = 'tests/pages/blocks.html';

// 페이지 쪽 도우미 K(틀 바깥 창에 만든다 — D와 같은 자리). 문자열 안에서 달러+중괄호를 쓰지 않는다(바깥 템플릿과 겹침).
const HELPER = String.raw`
if (!window.K) {
  const K = (window.K = {});
  K.taps = [];
  K.b = null;
  // 블록 하나 새로 만들기(앞의 것은 치움)
  K.mk = (o) => {
    const G = D.G();
    if (K.b) K.b.destroy();
    K.taps = [];
    const host = D.$('#host');
    K.b = G.blocks.create(host, Object.assign({ onTap: (p) => K.taps.push(p) }, o || {}));
    return K.b;
  };
  K.posStr = (p) => p ? p.s + '.' + p.slot + (p.slot === 'co' ? p.k : '') : 'null';
  K.cutWords = () => {
    const T = D.T(), out = [];
    ['m3', 'h1'].forEach((g) => { ['formal', 'content', 'sino', 'stem'].forEach((c) => out.push(T.terms[g].cut[c])); });
    out.push(T.review.aria.cut.m3.split(':')[0], T.review.aria.cut.h1.split(':')[0], 'formal', 'content', 'sino', 'data-cut', 'bk-plus', 'bk-cut', 'is-stem');
    return out;
  };
  // 그려진 블록이 상태와 같은지 + 누르면 알맞은 자리가 오는지. 돌려줌: 없음(문제는 D.bad)
  K.verify = (st, o, tag) => {
    const G = D.G(), T = D.T();
    const root = K.b.el;
    const syls = D.$$('.bk-syl', root);
    if (syls.length !== st.syl.length) D.bad(tag + ': 음절 수 ' + syls.length + ' ≠ ' + st.syl.length);
    st.syl.forEach((y, s) => {
      const sy = D.$('.bk-syl[data-s="' + s + '"]', root);
      if (!sy) { D.bad(tag + ': ' + s + '번 음절 없음'); return; }
      if (sy.getAttribute('aria-label') !== G.text.t('review.aria.syllable', { n: s + 1 })) D.bad(tag + ': 음절 aria ' + sy.getAttribute('aria-label'));
      const slot = (sl, k) => D.$('.bk-slot[data-s="' + s + '"][data-slot="' + sl + '"]' + (sl === 'co' ? '[data-k="' + k + '"]' : ''), root);
      // 초성: 빈 자리는 ○
      const on = slot('on');
      if (!on) D.bad(tag + ': ' + s + '번 초성 칸 없음');
      else if (y.on == null) { if (!on.classList.contains('is-empty') || on.textContent.trim() !== '○') D.bad(tag + ': 빈 초성이 ○이 아님 ' + on.textContent); }
      else if (on.textContent.trim() !== '/' + y.on + '/' || on.classList.contains('is-empty')) D.bad(tag + ': 초성 ' + on.textContent);
      // 반모음: 있을 때만 따로
      const gl = slot('gl');
      if (!!gl !== !!y.gl) D.bad(tag + ': ' + s + '번 반모음 칸 ' + (gl ? '있음' : '없음') + ' / 상태 ' + y.gl);
      if (gl && gl.textContent.trim() !== '/' + y.gl + '/') D.bad(tag + ': 반모음 ' + gl.textContent);
      // 중성(ㅢ도 한 칸)
      const nus = D.$$('.bk-slot[data-s="' + s + '"][data-slot="nu"]', root);
      if (nus.length !== 1) D.bad(tag + ': 중성 칸 수 ' + nus.length);
      else if (y.nu == null) { if (!nus[0].classList.contains('is-empty') || nus[0].textContent.trim() !== '') D.bad(tag + ': 빈 중성 ' + nus[0].textContent); }
      else if (nus[0].textContent.trim() !== '/' + y.nu + '/') D.bad(tag + ': 중성 ' + nus[0].textContent);
      // 종성: 겹받침은 두 칸, 없으면 빈 칸 하나
      const cos = D.$$('.bk-slot[data-s="' + s + '"][data-slot="co"]', root);
      if (cos.length !== Math.max(1, y.co.length)) D.bad(tag + ': 종성 칸 수 ' + cos.length + ' / ' + y.co.length);
      y.co.forEach((c, k) => { const e = slot('co', k); if (!e || e.textContent.trim() !== '/' + c + '/') D.bad(tag + ': 종성 ' + k + ' ' + (e && e.textContent)); });
      if (!y.co.length && cos[0] && !cos[0].classList.contains('is-empty')) D.bad(tag + ': 빈 종성 표시');
    });
    // 틈
    const gaps = D.$$('.bk-gap', root);
    if (gaps.length !== Math.max(0, st.syl.length - 1)) D.bad(tag + ': 틈 수 ' + gaps.length);
    gaps.forEach((g) => {
      const i = +g.getAttribute('data-gap'), c = st.cuts[i];
      const label = g.getAttribute('aria-label') || '';
      if (!label.startsWith(G.text.t('review.aria.gap', { n: i + 1 }))) D.bad(tag + ': 틈 aria ' + label);
      if (g.classList.contains('is-space') !== (c === 'space')) D.bad(tag + ': 띄어쓰기 틈 표시 ' + i);
      const plus = D.$('.bk-plus', g), lab = D.$('.bk-cut', g);
      const shown = o.level === 'basic' && (c === 'formal' || c === 'content' || c === 'sino');
      // 어간 + 어미 표시(marks.stem)가 있는 형식 경계는 이름표만 'stem'(결정 0019)
      const stem = shown && c === 'formal' && ((st.marks && st.marks.stem) || []).indexOf(i) >= 0;
      if (g.classList.contains('is-stem') !== stem) D.bad(tag + ': ' + i + '번 틈 어간+어미 표시 ' + g.classList.contains('is-stem') + ' / ' + stem);
      if (shown) {
        const want = G.text.cutLabel(o.grade, stem ? 'stem' : c);
        if (!plus) D.bad(tag + ': ' + i + '번 틈에 + 없음(' + c + ')');
        if (!lab || lab.textContent.trim() !== want) D.bad(tag + ': 이름표 ' + (lab && lab.textContent) + ' ≠ ' + want);
        if (g.getAttribute('data-cut') !== c) D.bad(tag + ': data-cut ' + g.getAttribute('data-cut'));
        if (label.indexOf(G.text.t('review.aria.cut', { label: want }, o.grade)) < 0) D.bad(tag + ': 경계 aria 없음 ' + label);
      } else if (plus || lab || g.hasAttribute('data-cut')) D.bad(tag + ': ' + i + '번 틈에 경계가 그려짐(' + c + ', ' + o.level + ')');
    });
    // 화면 글에 빗금 없는 자모가 없다(음운은 /ㄱ/)
    const bare = root.textContent.replace(/\/[^/\s]{1,2}\//g, '');
    if (/[\u3131-\u318E]/.test(bare)) D.bad(tag + ': 빗금 없는 자모 ' + bare.trim().slice(0, 40));
    // 누르기: 음운 칸 → 엔진 자리 · 음운, 틈 → 틈 번호와 넣을 자리
    K.taps = [];
    const slots = D.$$('.bk-slot', root);
    slots.forEach((e) => e.click());
    if (K.taps.length !== slots.length) D.bad(tag + ': 칸 누름 알림 ' + K.taps.length + ' / ' + slots.length);
    K.taps.forEach((p, j) => {
      const e = slots[j];
      if (!p || p.type !== 'slot' || !p.at) { D.bad(tag + ': 칸 알림 모양 ' + JSON.stringify(p)); return; }
      const want = { s: +e.getAttribute('data-s'), slot: e.getAttribute('data-slot'), k: +(e.getAttribute('data-k') || 0) };
      if (K.posStr(p.at) !== K.posStr(want)) D.bad(tag + ': 칸 자리 ' + K.posStr(p.at) + ' ≠ ' + K.posStr(want));
      if (Object.keys(p.at).sort().join() !== 'k,s,slot') D.bad(tag + ': 자리 모양(Pos) ' + JSON.stringify(p.at));
      try { G.rules.pos(p.at); } catch (err) { D.bad(tag + ': 엔진이 자리를 못 읽음 ' + err.message); }
      const y = st.syl[p.at.s];
      const cur = p.at.slot === 'co' ? (y.co[p.at.k] || null) : (y[p.at.slot] || null);
      if ((p.id || null) !== cur) D.bad(tag + ': 칸 음운 ' + p.id + ' ≠ ' + cur);
      if (!!p.empty !== (cur == null)) D.bad(tag + ': 빈 자리 표시 ' + p.empty);
      if (p.el !== e) D.bad(tag + ': 알림의 el');
    });
    K.taps = [];
    gaps.forEach((e) => e.click());
    if (K.taps.length !== gaps.length) D.bad(tag + ': 틈 누름 알림 ' + K.taps.length + ' / ' + gaps.length);
    K.taps.forEach((p, j) => {
      const i = +gaps[j].getAttribute('data-gap');
      if (!p || p.type !== 'gap' || p.gap !== i) { D.bad(tag + ': 틈 알림 ' + JSON.stringify(p && { type: p.type, gap: p.gap })); return; }
      if (K.posStr(p.onset) !== (i + 1) + '.on' || K.posStr(p.glide) !== (i + 1) + '.gl') D.bad(tag + ': 넣을 자리 ' + K.posStr(p.onset) + ' ' + K.posStr(p.glide));
      if (p.cut !== undefined) D.bad(tag + ': 틈 알림에 경계 종류가 실림');
    });
    K.taps = [];
  };
  // 심화: 경계를 모두 지운 상태(띄어쓰기만 남김)와 HTML이 똑같아야 한다
  K.advSame = (st, o, tag) => {
    const html1 = K.b.el.outerHTML;
    const st2 = JSON.parse(JSON.stringify(st));
    st2.cuts = st2.cuts.map((c) => (c === 'space' ? 'space' : null));
    st2.marks = {};
    K.b.render(st2);
    const html2 = K.b.el.outerHTML;
    if (html1 !== html2) D.bad(tag + ': 심화 블록에 경계 정보가 남음(경계를 지운 상태와 HTML이 다름)');
    K.cutWords().forEach((w) => { if (html1.indexOf(w) >= 0) D.bad(tag + ': 심화 블록 DOM에 "' + w + '"'); });
    K.b.render(st);
  };
}
`;

const open = (v, w, h) => `
const ${v} = await openTab(${J(frame(w, h, PAGE))});
await ${v}.evaluate(() => frameReady);
await ${v}.evaluate(() => { ${DRIVER} });
await ${v}.evaluate(() => { ${HELPER} });
`;
const fin = (v) => `
if (${v}.length) console.log('FAIL ' + ${v}.join('\\nFAIL '));
else console.log('PASS');
`;

// ── 1) 원고 376개 모두 ─────────────────────────────────────
//   CDP 한 번의 evaluate는 30초 안에 끝나야 하므로 단계 · 학년마다 나눠 부른다.
const LEVELS = [{ level: 'basic', grade: 'm3' }, { level: 'basic', grade: 'h1' }, { level: 'advanced', grade: 'm3' }, { level: 'advanced', grade: 'h1' }];
step('원고 376개 모두 — 자리 · 경계 · 누르면 자리', `
${open('a1', 1280, 800)}
try {
  const ea = [];
  ea.push(...await a1.evaluate(async () => {
    const G = D.G(), w = D.w();
    if (!G || !G.blocks || typeof G.blocks.create !== 'function') D.bad('G.blocks.create 없음');
    if (w.SCRIPTS.length !== 376) D.bad('원고 수 ' + w.SCRIPTS.length + ' (376이어야 함 — 임진란은 결정 0020으로 뺌)');
    K.seen = { emptyOn: 0, glide: 0, double: 0, ui: 0, formal: 0, content: 0, sino: 0, space: 0, stem: 0 };
    return D.take();
  }));
  // 원고 50개씩 나눠 부른다(원고 376개 — 공용 aside가 바빠도 CDP 한 번 30초 안)
  if (!ea.length) for (const lv of ${J(LEVELS)}) for (let from = 0; from < 400; from += 50) {
    ea.push(...await a1.evaluate(async (o) => {
      const G = D.G(), w = D.w();
      K.mk(o);
      for (const s of w.SCRIPTS.slice(o.from, o.from + 50)) {
        const st = G.rules.start(s);
        K.b.render(st);
        const tag = s.id + '(' + o.level + '·' + o.grade + ')';
        K.verify(st, o, tag);
        if (o.level === 'advanced') K.advSame(st, o, tag);
        if (o.level === 'basic' && o.grade === 'm3') {
          st.syl.forEach((y) => {
            if (y.on == null) K.seen.emptyOn++;
            if (y.gl) K.seen.glide++;
            if (y.co.length === 2) K.seen.double++;
            if (y.nu === 'ㅢ') K.seen.ui++;
          });
          st.cuts.forEach((c) => { if (c) K.seen[c]++; });
          K.seen.stem += ((st.marks && st.marks.stem) || []).length;
        }
      }
      return D.take();
    }, Object.assign({ from }, lv)));
  }
  const seen = await a1.evaluate(() => K.seen);
  Object.keys(seen).forEach((k) => { if (!seen[k]) ea.push('원고에서 본 적 없음: ' + k); });
  console.log('INFO 본 것 ' + JSON.stringify(seen));
  ${fin('ea')}
} finally { await closeTab(a1); }
`);

// ── 2) 학생이 만든 이상한 상태 ────────────────────────────
step('이상한 상태 — 빈 중성 · 받침만 · /ㄴ/ · j 넣음 · 음절 사라짐', `
${open('b1', 1280, 800)}
try {
  const eb = [];
  eb.push(...await b1.evaluate(async () => {
    const G = D.G(), w = D.w();
    const S = (id) => w.SCRIPTS.find((x) => x.id === id);
    const run = (id, cs) => cs.reduce((st, c) => G.rules.apply(st, c), G.rules.start(S(id)));
    const cases = [
      ['빈 중성', '옷', [{ op: 'delete', at: '0.nu' }]],
      ['모두 뺌', '옷', [{ op: 'delete', at: '0.nu' }, { op: 'delete', at: '0.on' }, { op: 'delete', at: '0.co' }]],
      ['받침만 바뀜', '국물', [{ op: 'replace', at: '0.co', to: 'ㅇ' }]],
      ['/ㄴ/ 넣음', '옷이', [{ op: 'insert', at: '1.on', to: 'ㄴ' }]],
      ['j 넣음(적을 수 없음)', '옷이', [{ op: 'insert', at: '1.gl', to: 'j' }]],
      ['w 넣음(적을 수 없음)', '꽃이', [{ op: 'insert', at: '1.gl', to: 'w' }]],
      ['겹받침 하나 뺌', '닭이', [{ op: 'delete', at: '0.co1' }]],
      ['반모음 뺌', '협력', [{ op: 'delete', at: '1.gl' }]],
      ['중성을 ㅢ로', '국물', [{ op: 'replace', at: '1.nu', to: 'ㅢ' }]],
      ['합쳐서 음절 사라짐', '깎아', [{ op: 'merge', at: ['0.co', '1.nu'], to: 'ㄱ' }]],
      ['가운데 음절 사라짐', '물난리', [{ op: 'delete', at: '1.on' }, { op: 'delete', at: '1.nu' }, { op: 'delete', at: '1.co' }]],
      ['반모음만 남음', '협력', [{ op: 'delete', at: '1.nu' }]],
      ['받침 셋째 자리 넣기(할 수 없음)', '닭이', [{ op: 'insert', at: '0.co1', to: 'ㄴ' }]],
      ['띄어쓰기 원고 받침 바뀜', '책 넣는다', [{ op: 'replace', at: '0.co', to: 'ㅇ' }, { op: 'insert', at: '1.on', to: 'ㄴ' }]],
    ];
    for (const o of [{ level: 'basic', grade: 'h1' }, { level: 'advanced', grade: 'm3' }]) {
      K.mk(o);
      for (const [name, id, cs] of cases) {
        if (!S(id)) { D.bad('원고 없음 ' + id); continue; }
        let st;
        try { st = run(id, cs); } catch (err) { D.bad(name + ': 엔진 오류 ' + err.message); continue; }
        try { K.b.render(st); } catch (err) { D.bad(name + ': 그리기 오류 ' + err.message); continue; }
        K.verify(st, o, name + '(' + o.level + ')');
        if (o.level === 'advanced') K.advSame(st, o, name);
      }
    }
    // 같은 블록에 차례로 다시 그려도(교정마다) 남는 것이 없다
    K.mk({ level: 'basic', grade: 'm3' });
    let st = G.rules.start(S('물난리'));
    K.b.render(st);
    st = G.rules.apply(st, { op: 'replace', at: '1.on', to: 'ㄹ' });
    K.b.render(st);
    if (D.$('.bk-slot[data-s="1"][data-slot="on"]', K.b.el).textContent.trim() !== '/ㄹ/') D.bad('교정 뒤 다시 그리기가 반영 안 됨');
    if (D.$$('.bk-syl', K.b.el).length !== 3) D.bad('다시 그리니 음절이 늘어남');
    // 고른 자리 표시(합침표 첫 음운 등)
    K.b.setPicked([{ s: 0, slot: 'co', k: 0 }, '1.on']);
    const picked = D.$$('.bk-slot.is-picked', K.b.el).map((e) => e.getAttribute('data-s') + '.' + e.getAttribute('data-slot'));
    if (picked.join() !== '0.co,1.on') D.bad('고른 자리 표시: ' + picked.join());
    K.b.setPicked(null);
    if (D.$$('.is-picked', K.b.el).length) D.bad('고른 자리 지우기');
    K.b.setMode('gap');
    if (!K.b.el.classList.contains('is-mode-gap')) D.bad('틈 고르기 모양 표시');
    K.b.setMode(null);
    if (K.b.el.classList.contains('is-mode-gap')) D.bad('모양 표시 지우기');
    K.b.destroy();
    if (D.$('#host').children.length) D.bad('destroy 뒤에 남음');
    K.b = null;
    // 너비가 바뀌면 다시 나눈다(split: 'auto')
    K.mk({ level: 'basic', grade: 'm3', split: 'auto' });
    K.b.render(G.rules.start(S('맏며느리')));
    if (K.b.lines() !== 1) D.bad('넓은 화면인데 ' + K.b.lines() + '줄');
    await D.resize(360, 740);
    await D.until(() => K.b.lines() === 2, 5000, '좁아졌는데 두 줄이 아님(' + K.b.lines() + '줄)');
    await D.resize(1280, 800);
    await D.until(() => K.b.lines() === 1, 5000, '다시 넓어졌는데 한 줄이 아님');
    return D.take();
  }));
  ${fin('eb')}
} finally { await closeTab(b1); }
`);

// ── 3) 다섯 크기: 누르는 자리 · 가로 스크롤 · 두 줄 나누기 ─────────
const SIZES = [[1280, 800, 64], [1366, 768, 64], [1920, 1080, 64], [360, 740, 48], [390, 844, 48]];
const LONG = ['맏며느리', '책 만들다', '책 넣는다', '상견례', '대관령', '권력', '협력', '여덟을', '의견란', '물난리', '받는다'];
for (const [W, H, MIN] of SIZES) {
  const portrait = W < H;
  step(`다섯 크기 ${W}×${H} — 누르는 자리 ${MIN}px · 가로 스크롤 · 두 줄`, `
${open('c1', W, H)}
try {
  const ec = [];
  for (const lv of [{ level: 'basic', grade: 'h1', split: 'auto' }, { level: 'advanced', grade: 'm3', split: 'auto' }]) ec.push(...await c1.evaluate(async (o) => {
    const G = D.G(), w = D.w();
    const S = (id) => w.SCRIPTS.find((x) => x.id === id);
    const long = ${J(LONG)}, portrait = ${portrait}, MIN = ${MIN}, TAG = '${W}×${H}';
    {
      K.mk(o);
      for (const id of long) {
        const st = G.rules.start(S(id));
        K.b.render(st);
        await D.wait(30);
        const tag = TAG + ' ' + id + '(' + o.level + ')';
        D.targets(MIN, tag);
        D.noScroll(tag);
        // 블록이 담는 상자 밖으로 나가지 않음
        const host = D.$('#host').getBoundingClientRect();
        D.$$('.bk-syl, .bk-gap', K.b.el).forEach((e) => {
          const r = e.getBoundingClientRect();
          if (r.left < host.left - 1 || r.right > host.right + 1) D.bad(tag + ': 상자 밖 ' + D.desc(e));
        });
        const lines = D.$$('.bk-line', K.b.el).length;
        if (!portrait && lines !== 1) D.bad(tag + ': 넓은 화면인데 ' + lines + '줄');
        if (portrait && st.syl.length >= 4 && lines < 2) D.bad(tag + ': 휴대폰 세로 4음절인데 한 줄');
        if (lines > 1) {
          if (!K.b.el.classList.contains('is-split')) D.bad(tag + ': 나눈 표시(is-split) 없음');
          // 줄이 바뀌는 곳의 틈도 누를 수 있다(두 줄 사이에 가로로)
          const first = D.$('.bk-line', K.b.el);
          const brk = first.nextElementSibling;
          if (lines > 2) D.bad(tag + ': ' + lines + '줄(원고는 두 줄이어야 함)');
          if (!brk || !brk.classList.contains('bk-gap') || !brk.classList.contains('is-break')) D.bad(tag + ': 두 줄 사이가 틈이 아님');
          else {
            K.taps = [];
            D.tap(brk, tag + ' 줄 바뀌는 틈');
            if (!K.taps[0] || K.taps[0].type !== 'gap' || K.taps[0].gap !== +brk.getAttribute('data-gap')) D.bad(tag + ': 줄 바뀌는 틈 알림 ' + JSON.stringify(K.taps[0] && K.taps[0].gap));
          }
          // 줄마다 띄어쓰기가 있으면 거기서 먼저 나눔(들어가는 경우)
        }
        // 실제로 눌러 보기(가운데 좌표에 다른 것이 없는지): 첫 음절 초성 · 마지막 종성 · 첫 틈
        K.taps = [];
        D.tap(D.$('.bk-slot[data-s="0"][data-slot="on"]', K.b.el), tag + ' 첫 초성');
        const n = st.syl.length - 1;
        D.tap(D.$('.bk-slot[data-s="' + n + '"][data-slot="co"]', K.b.el), tag + ' 끝 종성');
        if (n > 0) D.tap(D.$('.bk-gap[data-gap="0"]', K.b.el), tag + ' 첫 틈');
        if (K.taps.length !== (n > 0 ? 3 : 2)) D.bad(tag + ': 눌러 본 알림 수 ' + K.taps.length);
        if (o.level === 'advanced') K.advSame(st, o, tag);
      }
    }
    return D.take();
  }, lv));
  ec.push(...await c1.evaluate(async () => {
    const G = D.G(), w = D.w();
    const S = (id) => w.SCRIPTS.find((x) => x.id === id);
    const portrait = ${portrait}, TAG = '${W}×${H}';
    // 나누기 선택: false = 언제나 한 줄, true = 2음절 이상이면 두 줄
    K.mk({ level: 'basic', grade: 'm3', split: false });
    K.b.render(G.rules.start(S('국물')));
    if (D.$$('.bk-line', K.b.el).length !== 1) D.bad(TAG + ': split false인데 여러 줄');
    K.b.setSplit(true);
    if (D.$$('.bk-line', K.b.el).length !== 2) D.bad(TAG + ': split true인데 ' + D.$$('.bk-line', K.b.el).length + '줄');
    K.b.render(G.rules.start(S('옷')));
    if (D.$$('.bk-line', K.b.el).length !== 1) D.bad(TAG + ': 1음절은 한 줄');
    if (portrait) {
      // 띄어쓰기에서 먼저 나눔: 책 넣는다는 띄어쓰기 자리로 나누면 들어가지 않으면 다른 자리. 옷 위는 띄어쓰기에서 나눔
      K.mk({ level: 'basic', grade: 'm3', split: true });
      K.b.render(G.rules.start(S('옷 위')));
      const brk = D.$('.bk-line', K.b.el).nextElementSibling;
      if (!brk || !brk.classList.contains('is-space')) D.bad(TAG + ': 옷 위는 띄어쓰기에서 나눠야 함');
    }
    return D.take();
  }));
  ${fin('ec')}
} finally { await closeTab(c1); }
`);
}
