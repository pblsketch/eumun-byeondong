// 감수 화면 조작 도우미(틀 바깥 창의 D에 더한다) — 감수 화면 점검(check-review)과 전체 점검(check-flow · check-layout ·
//   check-leak · check-screen-text · check-audio-engine)이 함께 쓴다. DRIVER(tests/lib/drive.mjs)와 RUNS(tests/lib/runs.mjs) 다음에 넣는다.
//     await t.evaluate(() => { ${DRIVER} }); await t.evaluate(() => { ${RUNS} }); await t.evaluate(() => { ${REVIEW} });
//   D.toReview(장, 옵션)  감수 단계 진행 장을 저장하고 감수 화면으로(옵션은 D.finishRun과 같음, doneCount 기본 0)
//   D.load(id)            아무 원고나 연습 자리로(점검 전용 G.review.debug.load)
//   D.mark · D.slot('0.co') · D.cell(id) · D.gap(i) · D.ins(id) · D.act(data-act) · D.send() · D.say() · D.kind() · D.logN()
//   D.leak(태그)          지금 원고의 표준 발음 · 비표준 발음 · 함정 표시가 DOM에 없는지
// 문자열 안에서 달러+중괄호를 쓰지 않는다(바깥 템플릿과 겹침).
export const REVIEW = String.raw`
if (window.D && !D.toReview) {
  D.dbg = () => D.G().review.debug;
  D.byId = () => { const m = {}; D.w().SCRIPTS.forEach((s) => { m[s.id] = s; }); return m; };
  // 감수 단계 진행 장(앞의 doneCount개는 끝남)을 저장하고 감수 화면으로
  D.toReview = async (ch, o) => {
    const run = D.finishRun(ch, Object.assign({ phase: 'review', doneCount: 0 }, o || {}));
    D.G().app.resume();
    await D.until(() => D.cur() === 'review' && D.$('.rw-blocks .bk-slot'), 5000, '감수 화면');
    return run;
  };
  D.load = async (id) => {
    D.dbg().load(id);
    await D.until(() => D.dbg().script().id === id && D.$('.rw-blocks .bk-slot'), 3000, '연습 원고 ' + id);
  };
  // 음운 먼저(결정 0024): 화면에는 교정 부호 단추가 없다. D.mark(op)는 '이 다음 음운을 누르면 판에서 무엇을 고를지'만 기억한다
  //   (replace = 판의 도표를 그대로 둠, delete = 판의 [빼기], merge = 판의 [옆 음운과 합치기] → 다음 D.slot이 둘째 음운, insert = 틈은 언제나 넣을 음운 판).
  D.mark = (m) => { D._op = m; return true; };
  D.sheetKind = () => { const s = D.sheet(); return s ? s.getAttribute('data-sheet') : null; };
  D.slotSel = (p) => {
    const m = /^(\d+)\.(on|gl|nu|co)(\d)?$/.exec(p);
    return '.rw-blocks .bk-slot[data-s="' + m[1] + '"][data-slot="' + m[2] + '"]' + (m[2] === 'co' ? '[data-k="' + (m[3] || 0) + '"]' : '');
  };
  D.slot = (p) => {
    const waiting = D.sheetKind() === 'merge-wait'; // 합칠 옆 음운을 기다리는 중이면 이 칸이 둘째 음운
    const ok = D.tapSel(D.slotSel(p), '칸 ' + p);
    if (!ok || waiting || D.sheetKind() !== 'slot') return ok;
    if (D._op === 'delete') return D.tapSel('[data-act="rw-op-delete"]', '판의 빼기');
    if (D._op === 'merge') return D.tapSel('[data-act="rw-op-merge"]', '판의 합치기');
    return ok;
  };
  D.sheet = () => { const s = D.$('.rw-sheet'); return s && !s.hidden ? s : null; };
  D.cell = (id) => D.tapSel('.rw-sheet .ch-cell[data-id="' + id + '"]', '도표 칸 ' + id);
  D.gap = (i) => D.tapSel('.rw-blocks .bk-gap[data-gap="' + i + '"]', '틈 ' + i);
  D.ins = (id) => D.tapSel('.rw-sheet .rw-ins[data-id="' + id + '"]', '넣을 음운 ' + id);
  D.act = (a) => D.tapSel('[data-act="' + a + '"]', a);
  D.say = () => { const n = D.$('.rw-say'); return n ? n.textContent.replace(/\s+/g, ' ').trim() : ''; };
  D.logN = () => D.$$('.rw-log-item').length;
  D.kind = () => { const b = D.$('.rw-badge'); return b && !b.hidden ? b.getAttribute('data-kind') : null; };
  // 송출하고 신호가 나올 때까지
  D.send = async (what) => {
    const n0 = D.dbg().cur().sends;
    D.act('rw-send');
    await D.until(() => D.dbg().cur().sends === n0 + 1 && !D.dbg().busy() && D.kind(), 5000, '송출 신호 ' + (what || ''));
    return D.kind();
  };
  // 아직 얻지 않은 답(지금 원고의 표준 발음 · 비표준 발음 · 함정 표시)이 DOM · aria에 없는지
  D.leak = (tag) => {
    const G = D.G();
    const sc = D.dbg().script();
    const html = D.d().body.innerHTML;
    const strip = G.rules.strip;
    const words = [G.text.pron(sc.pron), G.text.pron(strip(sc.pron))];
    // 대괄호 없는 꼴은 두 음절 이상만(한 음절은 '입'술소리처럼 다른 낱말 안에 흔히 있음 — check-leak과 같음: 잎 → 입)
    if (sc.pron !== sc.text && strip(sc.pron).length > 1) words.push(sc.pron);
    if (strip(sc.pron) !== strip(sc.text) && strip(sc.pron).length > 1) words.push(strip(sc.pron));
    (sc.nonstandard || []).forEach((ns) => { words.push(G.text.pron(ns[0]), strip(ns[0])); });
    // 대괄호 없는 발음은 앞뒤가 한글이 아닐 때만 셈 — 잎[입]이 도표 머리글 '입술소리'에 걸리지 않게
    const H = (c) => !!c && c >= '가' && c <= '힣';
    const found = (x) => {
      if (x.charAt(0) === '[') return html.indexOf(x) >= 0;
      for (let k = html.indexOf(x); k >= 0; k = html.indexOf(x, k + 1)) {
        if (!H(html.charAt(k - 1)) && !H(html.charAt(k + x.length))) return true;
      }
      return false;
    };
    words.forEach((x) => { if (found(x)) D.bad(tag + ': 아직 얻지 않은 발음이 DOM에 있음 ' + x + ' (' + sc.id + ')'); });
    if (/trap|data-kind="(link|exception|blocked|contrast|coda|nasal|r-nasal|lateral|palatal|tense[a-z-]*|simplify|h-drop|n-insert|glide-insert|aspirate)"/.test(html)) D.bad(tag + ': 함정 · 갈래 표시가 DOM에 있음');
  };
  D.noBad = (tag) => {
    const t = D.d().body.textContent;
    ['글자', '게임오버'].forEach((x) => { if (t.indexOf(x) >= 0) D.bad(tag + ': 금지 낱말이 화면에 있음'); });
  };
}
`;
