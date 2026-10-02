// 한 판을 진짜 화면으로 끝까지 해 보는 도우미(틀 바깥 창의 D에 더한다) — check-flow · check-leak · check-layout · check-screen-text가 함께 쓴다.
//   DRIVER(tests/lib/drive.mjs) · RUNS(tests/lib/runs.mjs) · REVIEW(tests/lib/review.mjs) 다음에 넣는다.
//     await t.evaluate(() => { ${FLOW} });
//   점검용 조작은 점검 대본에만 있다(명세 §18). 게임 코드에는 아무것도 더하지 않는다 — 학생처럼 누르고, 정답은 데이터(GUIDES · SCRIPTS)에서 읽는다.
//
//   D.startChapter({ ch, grade, level })  시작 화면에서 학년 · 장 · 단계를 눌러 고르고 [감수 시작](진행 장이 있으면 [새로 시작]) → 지침 화면
//                                         (지침이 없는 장 — 8장 — 은 곧바로 감수 화면)
//   D.pickGuide(ch, fn)    지침 빈칸마다 fn(지침, 빈칸 id, 화면 차례 번호) → 보기 번호를 눌러 고른다 → 고른 값
//   D.solveGuide(ch)       정답 보기를 모두 누르고 [확인] → [원고 감수 시작]이 나올 때까지
//   D.enterReview()        [원고 감수 시작] → 감수 화면
//   D.doSteps(steps, from) 원고 풀이 과정(SCRIPTS의 steps)을 교정 부호로 누른다(고침 · 뺌 · 넣음 · 합침). from부터
//   D.solveScript()        지금 원고의 풀이 과정을 모두 누른다
//   D.offruleScript()      첫 고침 단계를 다른 음운을 거쳐 두 번에 고친다(결과는 맞지만 규칙 밖) — 고침 단계가 없으면 false
//   D.skipScript()         송출 없이 [다음 원고] → 넘김 확인 [넘기기]
//   D.nextScript()         [다음 원고](송출한 원고) → 다음 원고 또는 조항 공개
//   D.textBox(태그)        보이는 글이 제 상자 밖으로 넘치거나 잘리지 않았는지(한 줄 문구 · 단추) — 넘친 것을 D.bad로
//   D.screenText()         지금 화면의 글(숨긴 것 포함 textContent) + aria-label · title · alt · placeholder + 문서 제목
// 문자열 안에서 달러+중괄호를 쓰지 않는다(바깥 템플릿과 겹침).
export const FLOW = String.raw`
if (window.D && D.toReview && !D.startChapter) {
  D.startChapter = async (o) => {
    if (D.cur() !== 'start') D.G().app.go('start');
    await D.until(() => D.$('.st-ch'), 3000, '시작 화면');
    D.tapSel('[data-grade="' + o.grade + '"]', '학년 ' + o.grade);
    D.tapSel('.st-ch[data-ch="' + o.ch + '"]', o.ch + '장');
    D.tapSel('[data-level="' + o.level + '"]', '단계 ' + o.level);
    D.tapSel('[data-act="begin"]', '감수 시작');
    if (D.$('.st-confirm')) D.tapSel('[data-act="overwrite-yes"]', '새로 시작');
    // o.keepWarmup: 1장 몸풀기 원고(결정 0021)를 넘기지 않고 감수 화면에서 돌려준다
    if (D.w().GUIDES[o.ch] && o.keepWarmup && D.G().save.WARMUP[o.ch]) await D.until(() => D.cur() === 'review' && D.$('.rw-blocks .bk-slot'), 4000, '몸풀기 감수 화면');
    else if (D.w().GUIDES[o.ch]) { await D.passWarmup(); await D.until(() => D.cur() === 'guide' && D.$('.gd-card'), 4000, '지침 화면'); }
    else await D.until(() => D.cur() === 'review' && D.$('.rw-blocks .bk-slot'), 4000, '감수 화면(지침 없는 장)');
    return D.G().save.loadChapter();
  };
  D.pickGuide = (ch, fn) => {
    const picks = {};
    let n = 0;
    D.w().GUIDES[ch].forEach((g) => {
      picks[g.id] = {};
      Object.keys(g.blanks).forEach((b) => {
        const i = fn(g, b, n++);
        if (i == null) return;
        picks[g.id][b] = i;
        D.tapSel('.gd-card[data-guide="' + g.id + '"] .gd-blank[data-blank="' + b + '"] .gd-opt[data-i="' + i + '"]', '보기 ' + g.id + '.' + b + '.' + i);
      });
    });
    return picks;
  };
  D.solveGuide = async (ch) => {
    D.pickGuide(ch, (g, b) => g.blanks[b].answer);
    D.tapSel('[data-act="guide-check"]', '지침 확인');
    await D.until(() => D.$('[data-act="guide-go"]'), 3000, '지침 다 맞음');
  };
  D.enterReview = async () => {
    D.tapSel('[data-act="guide-go"]', '원고 감수 시작');
    await D.until(() => D.cur() === 'review' && D.$('.rw-blocks .bk-slot'), 4000, '감수 화면');
  };
  // 교정 하나를 화면으로: 풀이 과정 한 단계 [규칙, op, 자리, 음운]
  D.doStep = async (x) => {
    const op = x[1], at = x[2], to = x[3];
    if (op === 'replace') {
      D.mark('replace'); D.slot(at);
      await D.until(() => D.sheet() && D.$('.rw-sheet .ch-cell'), 2000, '조음 도표 ' + at);
      D.cell(to);
    } else if (op === 'delete') {
      D.mark('delete'); D.slot(at);
    } else if (op === 'insert') {
      D.mark('insert'); D.gap(+String(at).split('.')[0] - 1);
      await D.until(() => D.sheet() && D.$('.rw-ins'), 2000, '넣을 음운');
      D.ins(to);
    } else if (op === 'merge') {
      const ab = Array.isArray(at) ? at : String(at).split('+');
      D.mark('merge'); D.slot(ab[0]); D.slot(ab[1]);
      await D.until(() => D.sheet() && D.$('.rw-sheet .ch-cell'), 2000, '합침 도표');
      D.cell(to);
    } else D.bad('모르는 교정 ' + op);
  };
  D.doSteps = async (steps, from) => {
    for (let i = from || 0; i < steps.length; i++) await D.doStep(steps[i]);
  };
  D.solveScript = async () => {
    const sc = D.dbg().script();
    const n0 = D.logN();
    await D.doSteps(sc.steps || []);
    if (D.logN() !== n0 + (sc.steps || []).length) D.bad('풀이 과정이 다 기록되지 않음 ' + sc.id + ': ' + D.logN());
  };
  D.offruleScript = async () => {
    const sc = D.dbg().script();
    const steps = sc.steps || [];
    const k = steps.findIndex((x) => x[1] === 'replace');
    if (k < 0) return false;
    await D.doSteps(steps.slice(0, k));
    const x = steps[k];
    const now = D.dbg().state();
    const m = /^(\d+)\.(on|gl|nu|co)(\d)?$/.exec(x[2]);
    const y = now.syl[+m[1]];
    const cur = m[2] === 'co' ? y.co[+(m[3] || 0)] : y[m[2]];
    const via = ['ㅁ', 'ㅂ', 'ㄱ', 'ㅅ'].find((c) => c !== cur && c !== x[3]);
    await D.doStep([x[0], 'replace', x[2], via]);
    await D.doStep(x);
    await D.doSteps(steps, k + 1);
    return true;
  };
  D.skipScript = async () => {
    const n0 = D.G().save.loadChapter().done.length;
    D.act('rw-next');
    await D.until(() => D.$('.rw-confirm'), 2000, '넘김 확인');
    D.act('rw-skip-yes');
    await D.until(() => { const r = D.G().save.loadChapter(); return r && r.done.length === n0 + 1; }, 3000, '넘김 저장');
  };
  D.nextScript = async () => {
    const n0 = D.G().save.loadChapter().done.length;
    D.act('rw-next');
    await D.until(() => { const r = D.G().save.loadChapter(); return r && r.done.length === n0 + 1; }, 3000, '다음 원고 저장');
    // 몸풀기 마지막 원고 뒤에는 지침 화면으로 간다(결정 0021)
    if (n0 + 1 < 7) await D.until(() => (D.cur() === 'guide' && D.$('.gd-card')) || (D.cur() === 'review' && D.dbg().script() && D.$('.rw-blocks .bk-slot') && D.logN() === 0), 3000, '다음 원고');
  };

  // ── 넘치는 글 ──
  //   글 조각(텍스트 노드)마다 그 글을 담은 상자(인라인이 아닌 가장 가까운 조상)를 넘는지, 그리고 넘침을 가리는 상자
  //   (overflow가 visible이 아닌 것)의 scrollWidth가 clientWidth보다 큰지(말줄임 없이 잘림)를 본다.
  D.textBox = (tag) => {
    const w = D.w(), d = D.d();
    const seen = new Set();
    const roots = [d.getElementById('app'), d.querySelector('.app-rotate'), d.querySelector('.howto')].filter(Boolean);
    // 화면에서 일부러 가린 것(clip · clip-path — 읽기 도구용 숨김)은 넘침으로 보지 않는다
    const clipped = (e) => {
      for (; e && e !== d.body; e = e.parentElement) {
        const cs = w.getComputedStyle(e);
        if ((cs.clip && cs.clip !== 'auto') || (cs.clipPath && cs.clipPath !== 'none')) return true;
      }
      return false;
    };
    const blockOf = (e) => {
      while (e && e !== d.body) {
        const ds = w.getComputedStyle(e).display;
        if (ds !== 'inline' && ds !== 'contents') return e;
        e = e.parentElement;
      }
      return null;
    };
    roots.forEach((root) => {
      const tw = d.createTreeWalker(root, w.NodeFilter.SHOW_TEXT);
      let n;
      while ((n = tw.nextNode())) {
        if (!n.nodeValue.trim()) continue;
        const p = n.parentElement;
        if (!p || p.closest('svg, .sr-only, [hidden]') || clipped(p)) continue;
        const box = blockOf(p);
        if (!box || !D.visible(box) || seen.has(n)) continue;
        seen.add(n);
        const r = d.createRange(); r.selectNodeContents(n);
        const rr = r.getBoundingClientRect();
        if (!rr.width || !rr.height) continue;
        const b = box.getBoundingClientRect();
        const cs = w.getComputedStyle(box);
        const pl = parseFloat(cs.borderLeftWidth) || 0, pr = parseFloat(cs.borderRightWidth) || 0;
        // 음운 표기(/ㄱ/)와 발음 표기([궁물])는 줄에서 끊기면 안 된다('/' 다음에서 줄이 바뀌어 'ㅁ/'이 다음 줄로 가는 것)
        const re = /\/[ㄱ-ㆎ]\/|\[[^\]\s]{1,12}\]/g;
        let mm;
        while ((mm = re.exec(n.nodeValue))) {
          const rg = d.createRange(); rg.setStart(n, mm.index); rg.setEnd(n, mm.index + mm[0].length);
          const rs = Array.from(rg.getClientRects()).filter((x) => x.width > 0);
          if (rs.length > 1 && Math.max(...rs.map((x) => x.top)) - Math.min(...rs.map((x) => x.top)) > rs[0].height / 2) {
            D.bad(tag + ': 표기가 줄에서 끊김 "' + mm[0] + '" — ' + D.desc(box));
          }
        }
        if (rr.right > b.right - pr + 2 || rr.left < b.left + pl - 2) {
          D.bad(tag + ': 글이 상자 밖으로 넘침 ' + Math.round(rr.left) + '~' + Math.round(rr.right) + ' / 상자 ' + Math.round(b.left) + '~' + Math.round(b.right) + ' — ' + D.desc(box) + ' "' + n.nodeValue.trim().slice(0, 20) + '"');
        }
      }
    });
    // 번호가 겹쳐 보이는 목록: 줄마다 ①②…을 이미 단 목록에 1. 2. 번호가 또 붙으면 안 됨
    D.$$('#app ol, #app ul').filter((l) => D.visible(l)).forEach((l) => {
      const li = l.querySelector(':scope > li');
      if (!li || w.getComputedStyle(li).display !== 'list-item' || w.getComputedStyle(l).listStyleType === 'none') return;
      if (/^[①-⑳]/.test(li.textContent.trim())) D.bad(tag + ': 번호가 두 번 붙은 목록 "' + li.textContent.trim().slice(0, 16) + '" — ' + D.desc(l));
    });
    // 넘침을 가리는 상자: 말줄임(text-overflow: ellipsis)이 아니면 잘린 글이 있으면 안 됨
    D.$$('#app *').filter((e) => D.visible(e) && !e.closest('svg, .sr-only') && !clipped(e)).forEach((e) => {
      const cs = w.getComputedStyle(e);
      if (cs.overflowX === 'visible' || !e.textContent.trim()) return;
      if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') {
        if (e.scrollWidth > e.clientWidth + 1) D.bad(tag + ': 안에서 가로 스크롤 ' + e.scrollWidth + ' > ' + e.clientWidth + ' — ' + D.desc(e));
        return;
      }
      if (e.scrollWidth > e.clientWidth + 1 && cs.textOverflow !== 'ellipsis') D.bad(tag + ': 글이 잘림(말줄임 없음) ' + e.scrollWidth + ' > ' + e.clientWidth + ' — ' + D.desc(e));
    });
  };

  // ── 화면 글 모으기 ──
  D.screenText = () => {
    const d = D.d();
    const parts = [d.title, d.body.textContent];
    d.querySelectorAll('[aria-label], [title], [alt], [placeholder], [aria-description], [aria-valuetext]').forEach((e) => {
      ['aria-label', 'title', 'alt', 'placeholder', 'aria-description', 'aria-valuetext'].forEach((a) => { if (e.hasAttribute(a)) parts.push(e.getAttribute(a)); });
    });
    d.querySelectorAll('svg title, svg desc').forEach((e) => parts.push(e.textContent));
    return parts.join('\n');
  };
}
`;
