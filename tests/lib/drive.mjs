// 진짜 index.html을 크기별 틀(tests/pages/frame.html) 안에 띄우고 학생처럼 누르는 운전 도구(aside 점검 공용).
//   출처: 「음운 해전」 pblsketch/sori-haejeon tests/lib/drive.mjs 의 공용 부분(기다리기·새로고침·누르기·크기 재기)을 가져왔다.
//   바꾼 것: 오류 모음 이름(window.__gamsuErrors), 저장 접두사('eumun-byeondong:'), 화면 이름(G.app.current()),
//   그 게임의 판 조작 도우미는 뺐다. 이 게임의 화면 조작 도우미는 각 점검 작업이 여기에 더한다.
//
//   aside 대본 안에서:
//     const t = await openTab(frame(1280, 800, 'index.html'));
//     await t.evaluate(() => frameReady);
//     await t.evaluate(() => { ${DRIVER} });          ← 틀 페이지(바깥 창)에 window.D를 만든다
//     const errs = await t.evaluate(async () => { await D.fresh(); … return D.take(); });   ← 빈 배열이면 통과
//   D는 바깥 창에 있으므로 틀 안 게임을 새로고침해도(D.reload) 남는다. 게임 창은 늘 D.w()로 새로 얻는다.
//   누르기는 가운데 좌표에 다른 것이 덮여 있지 않은지(elementFromPoint) 확인한 뒤 누른다.
//   CDP 한 번의 evaluate는 30초 안에 끝나야 한다 → 긴 흐름은 evaluate를 나눠 부른다.
export const DRIVER = String.raw`
if (!window.D) {
  const D = (window.D = {});
  D.errs = [];
  D.bad = (m) => { D.errs.push(String(m)); };
  D.take = () => { D.noErr(); const e = D.errs.slice(); D.errs.length = 0; return e; };
  D.w = () => frameWin();
  D.d = () => frameWin().document;
  D.G = () => frameWin().G;
  D.T = () => frameWin().TEXT;
  D.$ = (s, r) => (r || D.d()).querySelector(s);
  D.$$ = (s, r) => Array.from((r || D.d()).querySelectorAll(s));
  D.wait = (ms) => new Promise((res) => setTimeout(res, ms));
  D.until = async (fn, ms, what) => {
    const t0 = Date.now();
    while (Date.now() - t0 < (ms || 10000)) { try { if (fn()) return true; } catch (e) { /* 넘어가는 중 */ } await D.wait(40); }
    D.bad('기다려도 안 됨: ' + what); return false;
  };
  D.box = (n) => n.getBoundingClientRect();
  D.visible = (n) => {
    if (!n || !n.getClientRects || !n.getClientRects().length) return false;
    const cs = D.w().getComputedStyle(n);
    if (cs.visibility === 'hidden' || cs.display === 'none') return false;
    const b = D.box(n);
    return b.width > 0 && b.height > 0;
  };
  // 게임 창의 페이지 오류(js/core/util.js가 모음). 새로고침하면 새 창이라 다시 0부터 센다
  D.errSeen = 0;
  D.noErr = (tag) => {
    const w = D.w();
    const e = (w && w.__gamsuErrors) || ['오류 모음 없음(js/core/util.js가 안 불림)'];
    if (w && w.__gamsuErrWin !== true) { w.__gamsuErrWin = true; D.errSeen = 0; }
    if (e.length > D.errSeen) { D.bad('페이지 오류' + (tag ? '(' + tag + ')' : '') + ': ' + e.slice(D.errSeen).join(' | ')); D.errSeen = e.length; }
  };
  D.cur = () => D.G().app.current();
  // 이 게임의 저장 값만 지운다(같은 주소의 다른 값은 건드리지 않음)
  D.clearStore = () => {
    try { Object.keys(localStorage).filter((k) => k.indexOf('eumun-byeondong:') === 0).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* 막힘 */ }
  };
  // 틀 안 게임을 새로고침(진짜 location.reload) → 새 게임 창이 첫 화면을 열 때까지
  D.reload = async () => {
    // 틀의 첫 열기가 아직 끝나지 않았으면 먼저 기다린다(빈 틀을 새로 고치면 게임 페이지 열기가 취소됨)
    await D.until(() => { const x = D.w(); return x && x.G && x.G.app && x.G.app.current(); }, 20000, '첫 화면(새로 고침 전)');
    D.noErr('새로고침 전');
    const w = D.w();
    w.__old = true;
    w.location.reload();
    await D.until(() => { const x = D.w(); return x && !x.__old && x.document.readyState !== 'loading' && x.G && x.G.app && x.G.app.current(); }, 20000, '새로고침 뒤 첫 화면');
    D.errSeen = 0;
    await D.wait(150);
  };
  // 저장 값을 모두 지우고 새로 연다(처음 쓰는 기기처럼)
  D.fresh = async () => { D.clearStore(); await D.reload(); };
  // 틀 크기 바꾸기(같은 게임 창 그대로)
  D.resize = async (w, h) => {
    const f = document.getElementById('game');
    f.style.width = w + 'px'; f.style.height = h + 'px';
    dispatchEvent(new Event('resize'));
    await D.wait(300);
  };

  // ── 누르기 ──
  // 누르는 곳의 가운데 좌표에 그 요소가 맨 위에 있는지, 게임 화면 안인지 확인한다(밖이면 먼저 스크롤해 보인다)
  D.tapPoint = (n, what) => {
    let b = D.box(n);
    const w = D.w(), d = D.d();
    if (b.top < 0 || b.bottom > w.innerHeight) { n.scrollIntoView({ block: 'center' }); b = D.box(n); }
    const x = b.left + b.width / 2, y = b.top + b.height / 2;
    if (x < 0 || y < 0 || x > w.innerWidth || y > w.innerHeight) D.bad(what + ': 화면 밖(' + Math.round(x) + ',' + Math.round(y) + ')');
    const hit = d.elementFromPoint(x, y);
    const svgHost = n.ownerSVGElement;
    const ok = hit && (hit === n || n.contains(hit) || (svgHost && (svgHost === hit || svgHost.contains(hit))));
    if (!ok) D.bad(what + ': 가운데를 누르면 다른 것이 눌림(' + (hit ? D.desc(hit) : 'null') + ')');
    return { x, y };
  };
  D.tap = (n, what) => {
    if (!n) { D.bad('없음: ' + what); return false; }
    if (!D.visible(n)) { D.bad('안 보임: ' + what); return false; }
    if (n.disabled) { D.bad('꺼져 있음: ' + what); return false; }
    D.tapPoint(n, what);
    n.click();
    return true;
  };
  D.tapSel = (sel, what) => D.tap(D.$(sel), what || sel);

  // ── 크기·배치 ──
  D.desc = (e) => {
    const c = e.className && e.className.baseVal != null ? e.className.baseVal : e.className;
    return (e.tagName || '').toLowerCase() + '.' + String(c || '').split(' ').filter(Boolean).slice(0, 2).join('.') + ' "' + (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 16) + '"';
  };
  // 보이는 누르는 것(단추·링크·입력)이 모두 min px 이상인지. 돌려줌: 잰 개수
  D.targets = (min, tag) => {
    const els = D.$$('button, [role="button"], a[href], input, select').filter((e) => D.visible(e) && !e.closest('[aria-hidden="true"], .app-rotate'));
    els.forEach((e) => {
      const b = D.box(e);
      if (Math.min(b.width, b.height) < min - 0.5) D.bad(tag + ': 터치 목표 ' + Math.round(b.width) + '×' + Math.round(b.height) + ' < ' + min + 'px — ' + D.desc(e));
    });
    return els.length;
  };
  // 가로 스크롤 없음(+ vertical이면 세로 스크롤도 없음)
  D.noScroll = (tag, vertical) => {
    const de = D.d().documentElement, b = D.d().body;
    const sw = Math.max(de.scrollWidth, b.scrollWidth);
    if (sw > de.clientWidth + 1) D.bad(tag + ': 가로 스크롤 ' + sw + ' > ' + de.clientWidth);
    // 화면 밖으로 삐져나간 요소(가로)도 찾는다(overflow: hidden으로 가려진 넘침)
    const W = D.w().innerWidth;
    D.$$('#app *').filter((e) => D.visible(e)).forEach((e) => {
      const r = D.box(e);
      if (r.right > W + 1 || r.left < -1) D.bad(tag + ': 화면 밖으로 나감 ' + Math.round(r.left) + '~' + Math.round(r.right) + ' / ' + W + ' — ' + D.desc(e));
    });
    if (vertical) {
      const sh = Math.max(de.scrollHeight, b.scrollHeight);
      if (sh > de.clientHeight + 1) D.bad(tag + ': 세로 스크롤 ' + sh + ' > ' + de.clientHeight);
    }
  };
}
`;
