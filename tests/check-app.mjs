// 앱 뼈대 G.app · 시작 화면 · 게임 방법 창 · 설정 점검(aside) — 명세 §4 · §5 · §11 · §14.
//   진짜 index.html을 크기별 틀(tests/pages/frame.html)에 띄우고 학생처럼 누른다(운전 도구 tests/lib/drive.mjs의 D).
//   1) 처음 쓰는 기기의 시작 화면: 학년 · 8장(모두 누름, 1·2장 중3 추천, 준비 중 없음) · 단계(3~8장 기본은 닮은 칸 없는 풀이) · 게임 방법(처음 표시) · 그림 자리
//   2) 마지막 선택 기억: 학년, 단계는 장마다
//   3) 감수 시작 → 진행 장 저장(지침 단계) → 새로 고침 → 이어 하기 카드 요약 → 저장된 단계 화면으로
//   4) 진행 장이 있을 때 새로 시작하면 "진행 중인 장이 지워져요"를 묻는다(그만두기 = 그대로, 새로 시작 = 덮어씀)
//   5) 게임 방법 창(학년별 문구, 닫기 셋, 처음 표시가 사라짐)
//   6) 설정(소리 · 움직임 줄이기)이 곧바로 적용되고 새로 고침 뒤에도 남음
//   7) 화면 등록: G.screens.<이름> = { mount(root, value), unmount() } — 등록이 없으면 자리 화면
//   8) 다섯 크기에서 가로 스크롤 없음 · 누르는 자리(가로 64px, 휴대폰 세로 48px), 눕힌 휴대폰은 '세로로 돌려 주세요'
//   모든 단계에서 페이지 오류(window.__gamsuErrors)가 없어야 한다.
import { step, frame } from './aside.mjs';
import { DRIVER } from './lib/drive.mjs';

const J = JSON.stringify;
const open = (v, w, h) => `
const ${v} = await openTab(${J(frame(w, h, 'index.html'))});
await ${v}.evaluate(() => frameReady);
await ${v}.evaluate(() => { ${DRIVER} });
`;
const fin = (v) => `
if (${v}.length) console.log('FAIL ' + ${v}.join('\\nFAIL '));
else console.log('PASS');
`;

step('시작 화면 — 처음 쓰는 기기', `
${open('a1', 1280, 800)}
try {
  const ea = [];
  ea.push(...await a1.evaluate(async () => { await D.fresh(); return D.take(); }));
  ea.push(...await a1.evaluate(async () => {
    const T = D.T(), G = D.G();
    if (D.cur() !== 'start') D.bad('첫 화면: ' + D.cur());
    if (D.d().documentElement.getAttribute('data-screen') !== 'start') D.bad('html data-screen');
    const h = D.$('.st-title');
    if (!h || h.textContent.trim() !== T.start.title) D.bad('제목: ' + (h && h.textContent));
    const gb = D.$$('[data-grade]');
    if (gb.length !== 2) D.bad('학년 단추 수 ' + gb.length);
    if (!D.$('[data-grade="m3"]') || D.$('[data-grade="m3"]').getAttribute('aria-pressed') !== 'true') D.bad('처음 학년이 중3이 아님');
    const cards = D.$$('.st-ch');
    if (cards.length !== 8) D.bad('장 수 ' + cards.length);
    for (let ch = 1; ch <= 8; ch++) {
      const c = D.$('.st-ch[data-ch="' + ch + '"]');
      if (!c) { D.bad(ch + '장 없음'); continue; }
      if (!c.textContent.includes(T.chapters[ch].name)) D.bad(ch + '장 이름 없음');
      if (!D.visible(c)) D.bad(ch + '장이 안 보임');
      // 1~8장 모두 시작할 수 있다(결정 0019). 중3 추천은 1 · 2장만
      if (c.tagName !== 'BUTTON' || c.disabled) D.bad(ch + '장을 누를 수 없음');
      if (c.textContent.includes(T.start.comingSoon)) D.bad(ch + '장에 준비 중');
      if (c.textContent.includes(T.start.recommendM3) !== (ch <= 2)) D.bad(ch + '장 중3 추천 표시가 틀림');
      if (!c.textContent.includes(G.text.chapterTopic('m3', ch))) D.bad(ch + '장 다루는 변동 없음');
    }
    if (D.$('.st-ch[data-ch="1"]').getAttribute('aria-pressed') !== 'true') D.bad('처음 고른 장이 1장이 아님');
    if (D.$('[data-level="basic"]').getAttribute('aria-pressed') !== 'true') D.bad('처음 단계가 기본이 아님');
    const hint = D.$('.st-level-hint');
    if (!hint || hint.textContent.trim() !== G.text.t('levels.hint.basic', null, 'm3')) D.bad('단계 풀이: ' + (hint && hint.textContent));
    const begin = D.$('[data-act="begin"]');
    if (!begin || begin.textContent.trim() !== T.start.begin) D.bad('감수 시작 단추');
    const hb = D.$('[data-act="howto"]');
    if (!hb || !hb.textContent.includes(T.start.howto) || !hb.textContent.includes(T.start.firstHint)) D.bad('게임 방법 단추 · 처음 표시');
    const sb = D.$('[data-act="settings"]');
    if (!sb || !sb.textContent.includes(T.start.settings)) D.bad('설정 단추');
    if (D.$('.st-resume')) D.bad('진행 장이 없는데 이어 하기 카드가 있음');
    const art = D.$('.st-art');
    if (!art || art.getAttribute('aria-label') !== T.images.start || art.getAttribute('role') !== 'img') D.bad('그림 자리');
    const rot = D.$('.app-rotate');
    if (!rot) D.bad('세로로 돌려 주세요 덮개 없음');
    else if (D.visible(rot)) D.bad('넓은 화면에서 세로로 돌려 주세요가 보임');
    if (/\\uAE00\\uC790/.test(D.d().body.textContent)) D.bad('금지 낱말이 화면에 있음'); // 명세 §3-6 — 이 파일에도 그 낱말을 쓰지 않으려고 부호(\\u)로 적음
    // 3~8장을 고르면 그 장이 골라지고, 기본 단계 풀이는 닮은 칸이 없는 문구(닮은 칸은 1 · 2장만)
    for (const ch of [3, 8]) {
      D.tapSel('.st-ch[data-ch="' + ch + '"]', ch + '장');
      if (D.$('.st-ch[data-ch="' + ch + '"]').getAttribute('aria-pressed') !== 'true' || D.cur() !== 'start') D.bad(ch + '장이 골라지지 않음');
      const h2 = D.$('.st-level-hint');
      if (!h2 || h2.textContent.trim() !== G.text.t('levels.hint.basicPlain', null, 'm3')) D.bad(ch + '장 단계 풀이: ' + (h2 && h2.textContent));
    }
    D.tapSel('.st-ch[data-ch="1"]', '1장으로');
    return D.take();
  }));
  ${fin('ea')}
} finally { await closeTab(a1); }
`);

step('마지막 선택 기억 — 학년 · 장마다 단계', `
${open('b1', 1280, 800)}
try {
  const eb = [];
  eb.push(...await b1.evaluate(async () => { await D.fresh(); return D.take(); }));
  eb.push(...await b1.evaluate(async () => {
    const T = D.T();
    D.tapSel('[data-grade="h1"]', '고1');
    if (D.$('[data-grade="h1"]').getAttribute('aria-pressed') !== 'true') D.bad('고1이 눌리지 않음');
    if (!D.$('.st-ch[data-ch="1"]').textContent.includes(T.chapters[1].topic.h1)) D.bad('고1 장 풀이가 아님');
    D.tapSel('.st-ch[data-ch="2"]', '2장');
    if (D.$('.st-ch[data-ch="2"]').getAttribute('aria-pressed') !== 'true') D.bad('2장이 골라지지 않음');
    D.tapSel('[data-level="advanced"]', '심화');
    if (D.$('[data-level="advanced"]').getAttribute('aria-pressed') !== 'true') D.bad('심화가 눌리지 않음');
    if (D.$('.st-level-hint').textContent.trim() !== D.G().text.t('levels.hint.advanced', null, 'h1')) D.bad('심화 풀이 문구');
    if (D.G().save.levelOf(2) !== 'advanced' || D.G().save.levelOf(1) !== 'basic') D.bad('장마다 단계 저장: ' + D.G().save.levelOf(1) + ' ' + D.G().save.levelOf(2));
    D.tapSel('.st-ch[data-ch="1"]', '1장');
    if (D.$('[data-level="basic"]').getAttribute('aria-pressed') !== 'true') D.bad('1장으로 돌아가면 기본이어야 함');
    return D.take();
  }));
  eb.push(...await b1.evaluate(async () => { await D.reload(); return D.take(); }));
  eb.push(...await b1.evaluate(async () => {
    const T = D.T(), G = D.G(), w = D.w();
    if (D.$('[data-grade="h1"]').getAttribute('aria-pressed') !== 'true') D.bad('새로 고침 뒤 학년이 남지 않음');
    D.tapSel('.st-ch[data-ch="2"]', '2장(새로 고침 뒤)');
    if (D.$('[data-level="advanced"]').getAttribute('aria-pressed') !== 'true') D.bad('새로 고침 뒤 2장 단계가 남지 않음');
    return D.take();
  }));
  ${fin('eb')}
} finally { await closeTab(b1); }
`);

step('감수 시작 → 진행 장 저장 → 이어 하기', `
${open('c1', 1280, 800)}
try {
  const ec = [];
  ec.push(...await c1.evaluate(async () => { await D.fresh(); return D.take(); }));
  ec.push(...await c1.evaluate(async () => {
    const T = D.T(), G = D.G(), w = D.w();
    D.tapSel('.st-ch[data-ch="2"]', '2장');
    D.tapSel('[data-level="advanced"]', '심화');
    D.tapSel('[data-act="begin"]', '감수 시작');
    await D.passWarmup(); await D.until(() => D.cur() === 'guide', 3000, '지침 화면');
    if (!D.$('.screen-guide')) D.bad('지침 화면 자리 없음');
    const info = G.save.chapterInfo();
    if (!info || info.ch !== 2 || info.level !== 'advanced' || info.grade !== 'm3' || info.phase !== 'guide' || info.no !== 0) D.bad('저장된 진행 장: ' + JSON.stringify(info));
    const run = G.save.loadChapter();
    const pool = w.SCRIPTS.filter((s) => s.ch === 2).map((s) => s.id);
    const ex = G.rules.exampleIds(w.GUIDES && w.GUIDES[2]);
    if (!run || run.ids.length !== 7 || new Set(run.ids).size !== 7) D.bad('뽑힌 원고: ' + JSON.stringify(run && run.ids));
    else {
      if (run.ids.some((id) => pool.indexOf(id) < 0)) D.bad('2장 원고가 아님');
      if (run.ids.some((id) => ex.indexOf(id) >= 0)) D.bad('지침 예시가 뽑힘');
      if (typeof run.seed !== 'number') D.bad('시드가 저장되지 않음');
      if (JSON.stringify(G.rules.draw(2, w.SCRIPTS, ex, run.seed)) !== JSON.stringify(run.ids)) D.bad('시드로 다시 뽑으면 같아야 함');
      if (run.guideDone !== false || run.done.length || run.cur !== null) D.bad('새 장 모양: ' + JSON.stringify(run));
    }
    // 새로 고침 → 시작 화면 + 이어 하기 카드
    return D.take();
  }));
  ec.push(...await c1.evaluate(async () => { await D.reload(); return D.take(); }));
  ec.push(...await c1.evaluate(async () => {
    const T = D.T(), G = D.G(), w = D.w();
    if (D.cur() !== 'start') D.bad('새로 고침 뒤 첫 화면: ' + D.cur());
    const sum = D.$('.st-resume-sum');
    const want = D.G().text.fill(T.start.resume.summary.guide, { chapter: D.G().text.chapterTitle(2), level: D.G().text.levelName('advanced') });
    if (!sum || sum.textContent.trim() !== want) D.bad('요약: ' + (sum && sum.textContent) + ' / ' + want);
    if (!D.$('.st-resume').textContent.includes(T.start.resume.title)) D.bad('이어 하기 제목');
    if (D.$('.st-ch[data-ch="2"]').getAttribute('aria-pressed') !== 'true') D.bad('이어 하기 장(2장)이 골라져 있지 않음');
    D.tapSel('[data-act="resume"]', '이어 하기');
    await D.passWarmup(); await D.until(() => D.cur() === 'guide', 3000, '이어 하기 → 지침');
    // 감수 단계(원고 3/7)로 저장된 장
    const G2 = D.G();
    const r2 = G2.save.loadChapter();
    r2.phase = 'review'; r2.guideDone = true;
    r2.done = r2.ids.slice(0, 2).map((id) => ({ id, result: 'skip', sends: 0, help: [] }));
    r2.cur = null;
    if (!G2.save.saveChapter(r2)) D.bad('감수 단계 저장 실패');
    G2.app.go('start');
    const want2 = G2.text.fill(T.start.resume.summary.review, { chapter: G2.text.chapterTitle(2), level: G2.text.levelName('advanced'), i: 3, n: 7 });
    if (D.$('.st-resume-sum').textContent.trim() !== want2) D.bad('감수 요약: ' + D.$('.st-resume-sum').textContent + ' / ' + want2);
    D.tapSel('[data-act="resume"]', '이어 하기(감수)');
    await D.until(() => D.cur() === 'review', 3000, '이어 하기 → 감수');
    if (!D.$('.screen-review')) D.bad('감수 화면 자리 없음');
    // 조항 공개 단계
    const r3 = G2.save.loadChapter();
    r3.phase = 'reveal';
    r3.done = r3.ids.map((id) => ({ id, result: 'skip', sends: 0, help: [] }));
    r3.cur = null;
    if (!G2.save.saveChapter(r3)) D.bad('조항 공개 단계 저장 실패');
    G2.app.go('start');
    const want3 = G2.text.fill(T.start.resume.summary.reveal, { chapter: G2.text.chapterTitle(2), level: G2.text.levelName('advanced') });
    if (D.$('.st-resume-sum').textContent.trim() !== want3) D.bad('공개 요약: ' + D.$('.st-resume-sum').textContent);
    D.tapSel('[data-act="resume"]', '이어 하기(공개)');
    await D.until(() => D.cur() === 'reveal', 3000, '이어 하기 → 조항 공개');
    // 망가진 진행 장은 조용히 버리고 시작 화면
    D.w().localStorage.setItem('eumun-byeondong:chapter', '{망가짐');
    return D.take();
  }));
  ec.push(...await c1.evaluate(async () => { await D.reload(); return D.take(); }));
  ec.push(...await c1.evaluate(async () => {
    const T = D.T(), G = D.G(), w = D.w();
    if (D.cur() !== 'start' || D.$('.st-resume')) D.bad('망가진 진행 장을 버리지 않음');
    return D.take();
  }));
  ${fin('ec')}
} finally { await closeTab(c1); }
`);

step('덮어쓰기 확인 — 진행 중인 장이 지워져요', `
${open('d1', 1280, 800)}
try {
  const ed = [];
  ed.push(...await d1.evaluate(async () => { await D.fresh(); return D.take(); }));
  ed.push(...await d1.evaluate(async () => {
    const T = D.T(), G = D.G();
    D.tapSel('[data-act="begin"]', '감수 시작(1장)');
    await D.passWarmup(); await D.until(() => D.cur() === 'guide', 3000, '지침 화면');
    const ids1 = JSON.stringify(G.save.loadChapter().ids);
    G.app.go('start');
    if (D.$('.st-confirm')) D.bad('묻기 창이 미리 떠 있음');
    D.tapSel('.st-ch[data-ch="2"]', '2장');
    D.tapSel('[data-act="begin"]', '감수 시작(2장)');
    const dlg = D.$('.st-confirm');
    if (!dlg || !D.visible(dlg)) D.bad('묻기 창이 안 뜸');
    else {
      if (dlg.getAttribute('role') !== 'dialog') D.bad('묻기 창 role');
      if (!dlg.textContent.includes(T.start.overwrite.ask)) D.bad('묻기 문구');
    }
    if (D.cur() !== 'start') D.bad('묻기 전에 넘어감');
    D.tapSel('[data-act="overwrite-no"]', '그만두기');
    if (D.$('.st-confirm')) D.bad('그만두기 뒤에도 창이 남음');
    const keep = G.save.loadChapter();
    if (!keep || keep.ch !== 1 || JSON.stringify(keep.ids) !== ids1) D.bad('그만두기인데 진행 장이 바뀜');
    D.tapSel('[data-act="begin"]', '감수 시작(2장, 다시)');
    D.tapSel('[data-act="overwrite-yes"]', '새로 시작');
    await D.passWarmup(); await D.until(() => D.cur() === 'guide', 3000, '새 장 지침 화면');
    const now = G.save.loadChapter();
    if (!now || now.ch !== 2 || now.phase !== 'guide') D.bad('새로 시작이 덮어쓰지 않음: ' + JSON.stringify(now && { ch: now.ch, phase: now.phase }));
    // 이어 하기 카드의 [새로 시작]도 같은 확인을 거친다(고른 장 = 진행 중인 2장)
    G.app.go('start');
    D.tapSel('[data-act="restart"]', '이어 하기 카드의 새로 시작');
    if (!D.$('.st-confirm')) D.bad('새로 시작에서 묻기 창이 안 뜸');
    D.tapSel('[data-act="overwrite-yes"]', '새로 시작(확인)');
    await D.passWarmup(); await D.until(() => D.cur() === 'guide', 3000, '다시 지침 화면');
    const again = G.save.loadChapter();
    if (!again || again.ch !== 2 || again.phase !== 'guide') D.bad('카드의 새로 시작: ' + JSON.stringify(again && again.ch));
    return D.take();
  }));
  ${fin('ed')}
} finally { await closeTab(d1); }
`);

step('게임 방법 창', `
${open('e1', 1280, 800)}
try {
  const ee = [];
  ee.push(...await e1.evaluate(async () => { await D.fresh(); return D.take(); }));
  ee.push(...await e1.evaluate(async () => {
    const T = D.T(), G = D.G();
    D.tapSel('[data-act="howto"]', '게임 방법');
    let hw = D.$('.howto');
    if (!hw || !D.visible(hw)) D.bad('게임 방법 창이 안 뜸');
    else {
      const panel = D.$('.howto-panel');
      if (!panel || panel.getAttribute('role') !== 'dialog') D.bad('창 role');
      if (D.$('.howto-title').textContent.trim() !== T.howto.title) D.bad('창 제목');
      const secs = G.text.get('howto.sections', 'm3');
      if (D.$$('.howto-card').length !== secs.length) D.bad('칸 수 ' + D.$$('.howto-card').length + ' / ' + secs.length);
      const all = D.$('.howto-body').textContent;
      secs.forEach((s) => { if (!all.includes(s.title)) D.bad('칸 제목 없음: ' + s.title); s.lines.forEach((l) => { if (!all.includes(l)) D.bad('줄 없음: ' + l); }); });
    }
    if (!G.save.seenHowto()) D.bad('연 적이 저장되지 않음');
    D.tapSel('.howto-ok', '알겠어요');
    if (D.$('.howto')) D.bad('알겠어요로 닫히지 않음');
    if (D.$('[data-act="howto"]').textContent.includes(T.start.firstHint)) D.bad('처음 표시가 남음');
    // Esc로 닫기
    D.tapSel('[data-act="howto"]', '게임 방법(두 번째)');
    D.d().dispatchEvent(new (D.w().KeyboardEvent)('keydown', { key: 'Escape', bubbles: true }));
    if (D.$('.howto')) D.bad('Esc로 닫히지 않음');
    // 고1이면 고1 문구, 닫기 단추
    D.tapSel('[data-grade="h1"]', '고1');
    D.tapSel('[data-act="howto"]', '게임 방법(고1)');
    const h1 = G.text.get('howto.sections', 'h1');
    const allH = D.$('.howto-body').textContent;
    h1.forEach((s) => s.lines.forEach((l) => { if (!allH.includes(l)) D.bad('고1 줄 없음: ' + l); }));
    if (D.$('.howto-x').getAttribute('aria-label') !== T.howto.closeX) D.bad('닫기 단추 이름');
    D.tapSel('.howto-x', '닫기');
    if (D.$('.howto')) D.bad('닫기로 닫히지 않음');
    return D.take();
  }));
  ee.push(...await e1.evaluate(async () => { await D.reload(); return D.take(); }));
  ee.push(...await e1.evaluate(async () => {
    const T = D.T(), G = D.G(), w = D.w();
    if (D.$('[data-act="howto"]').textContent.includes(T.start.firstHint)) D.bad('새로 고침 뒤 처음 표시가 되살아남');
    return D.take();
  }));
  ${fin('ee')}
} finally { await closeTab(e1); }
`);

step('설정 — 곧바로 적용 · 기기에 저장', `
${open('f1', 1280, 800)}
try {
  const ef = [];
  ef.push(...await f1.evaluate(async () => { await D.fresh(); return D.take(); }));
  ef.push(...await f1.evaluate(async () => {
    const T = D.T();
    D.tapSel('[data-act="settings"]', '설정');
    const p = D.$('.set-panel');
    if (!p || !D.visible(p)) { D.bad('설정 창이 안 뜸'); return D.take(); }
    if (p.getAttribute('role') !== 'dialog') D.bad('설정 창 role');
    if (!p.textContent.includes(T.settings.title) || !p.textContent.includes(T.settings.savedHint)) D.bad('설정 창 문구');
    D.tapSel('[data-key="bgmOn"] [data-v="off"]', '배경 음악 끄기');
    D.tapSel('[data-key="sfxOn"] [data-v="off"]', '효과음 끄기');
    D.tapSel('[data-key="reduceMotion"] [data-v="on"]', '움직임 줄이기 켜기');
    const set = (key, v) => { const i = D.$('input[data-key="' + key + '"]'); i.value = String(v); i.dispatchEvent(new (D.w().Event)('input', { bubbles: true })); i.dispatchEvent(new (D.w().Event)('change', { bubbles: true })); };
    set('bgmVolume', 30); set('sfxVolume', 45);
    const a = D.G().audio.state();
    if (a.bgmOn !== false || a.sfxOn !== false) D.bad('켜기/끄기가 소리 장치에 반영 안 됨: ' + JSON.stringify(a));
    if (Math.abs(a.bgmVolume - 0.3) > 1e-6 || Math.abs(a.sfxVolume - 0.45) > 1e-6) D.bad('음량 반영: ' + a.bgmVolume + ' ' + a.sfxVolume);
    if (!D.d().documentElement.classList.contains('reduce-motion')) D.bad('움직임 줄이기 클래스 없음');
    const raw = JSON.parse(D.w().localStorage.getItem('eumun-byeondong:settings') || '{}');
    if (raw.bgmOn !== false || raw.sfxOn !== false || raw.reduceMotion !== true || raw.bgmVolume !== 0.3 || raw.sfxVolume !== 0.45) D.bad('저장 값: ' + JSON.stringify(raw));
    const pr = (sel) => D.$(sel).getAttribute('aria-pressed');
    if (pr('[data-key="bgmOn"] [data-v="off"]') !== 'true' || pr('[data-key="bgmOn"] [data-v="on"]') !== 'false') D.bad('켜기/끄기 단추 표시');
    if (!D.$('input[data-key="bgmVolume"]').closest('.set-row').classList.contains('is-off')) D.bad('끈 줄의 음량이 흐려지지 않음');
    D.tapSel('[data-act="settings-close"]', '닫기');
    if (D.$('.set-panel')) D.bad('설정 창이 닫히지 않음');
    return D.take();
  }));
  ef.push(...await f1.evaluate(async () => { await D.reload(); return D.take(); }));
  ef.push(...await f1.evaluate(async () => {
    const pr = (sel) => D.$(sel).getAttribute('aria-pressed');
    const b = D.G().audio.state();
    if (b.bgmOn !== false || b.sfxOn !== false || Math.abs(b.bgmVolume - 0.3) > 1e-6) D.bad('새로 고침 뒤 소리 설정: ' + JSON.stringify(b));
    if (!D.d().documentElement.classList.contains('reduce-motion')) D.bad('새로 고침 뒤 움직임 줄이기');
    D.tapSel('[data-act="settings"]', '설정(새로 고침 뒤)');
    if (D.$('input[data-key="bgmVolume"]').value !== '30') D.bad('음량 막대 값: ' + D.$('input[data-key="bgmVolume"]').value);
    if (pr('[data-key="reduceMotion"] [data-v="on"]') !== 'true') D.bad('움직임 줄이기 단추 표시');
    D.tapSel('[data-key="reduceMotion"] [data-v="off"]', '움직임 줄이기 끄기');
    D.tapSel('[data-key="bgmOn"] [data-v="on"]', '배경 음악 켜기');
    if (D.d().documentElement.classList.contains('reduce-motion') || D.G().audio.state().bgmOn !== true) D.bad('다시 켜기/끄기');
    // 바깥(어두운 덮개)을 누르면 닫힘
    const ov = D.$('.set-overlay');
    if (ov) ov.dispatchEvent(new (D.w().MouseEvent)('click', { bubbles: true }));
    if (D.$('.set-panel')) D.bad('바깥을 눌러도 닫히지 않음');
    return D.take();
  }));
  ${fin('ef')}
} finally { await closeTab(f1); }
`);

step('화면 등록 — G.screens · 자리 화면', `
${open('g1', 1280, 800)}
try {
  const eg = [];
  eg.push(...await g1.evaluate(async () => { await D.fresh(); return D.take(); }));
  eg.push(...await g1.evaluate(async () => {
    const w = D.w(), G = D.G();
    if (!G.screens || typeof G.screens !== 'object') D.bad('G.screens 없음');
    if (JSON.stringify(G.app.NAMES) !== JSON.stringify(['start', 'guide', 'review', 'reveal', 'result'])) D.bad('화면 이름: ' + JSON.stringify(G.app.NAMES));
    const calls = [];
    G.screens.reveal = {
      mount(root, v) { calls.push('mount:' + root.className + ':' + (v && v.x)); const p = w.document.createElement('p'); p.className = 't-reveal'; root.appendChild(p); },
      unmount() { calls.push('unmount'); },
    };
    G.app.go('reveal', { x: 5 });
    if (D.cur() !== 'reveal') D.bad('등록한 화면으로 안 감');
    if (!D.$('#app > .screen.screen-reveal .t-reveal')) D.bad('mount가 그린 것이 없음');
    if (D.d().documentElement.getAttribute('data-screen') !== 'reveal') D.bad('data-screen');
    G.app.go('start');
    if (JSON.stringify(calls) !== JSON.stringify(['mount:screen screen-reveal:5', 'unmount'])) D.bad('부른 차례: ' + JSON.stringify(calls));
    if (D.$('.t-reveal')) D.bad('떠난 화면이 남음');
    delete G.screens.reveal;
    // 등록이 없으면 자리 화면 + 처음으로
    for (const nm of ['guide', 'review', 'reveal', 'result']) {
      if (G.screens[nm]) continue;
      G.app.go(nm, {});
      if (D.cur() !== nm || !D.$('.screen-' + nm + ' .screen-stub')) D.bad(nm + ' 자리 화면 없음');
    }
    D.tapSel('[data-act="home"]', '처음으로');
    if (D.cur() !== 'start') D.bad('자리 화면에서 처음으로 안 감');
    G.app.go('없는이름');
    if (D.cur() !== 'start') D.bad('모르는 이름이면 시작 화면이어야 함');
    return D.take();
  }));
  ${fin('eg')}
} finally { await closeTab(g1); }
`);

// 크기별: 시작 화면(이어 하기 카드 포함) · 덮어쓰기 확인 · 설정 창 · 게임 방법 창
const SIZES = [[1280, 800], [1366, 768], [1920, 1080], [390, 844], [360, 740]];
SIZES.forEach(([W, H], k) => {
  const phone = W < 768;
  const min = phone ? 48 : 64;
  const v = 'h' + k;
  step(`크기 ${W}×${H} — 가로 스크롤 없음 · 누르는 자리 ${min}px`, `
${open(v, W, H)}
try {
  const r${v} = [];
  r${v}.push(...await ${v}.evaluate(async () => { await D.fresh(); return D.take(); }));
  r${v}.push(...await ${v}.evaluate(async () => {
    const tag = '${W}×${H}', MIN = ${min}, PHONE = ${phone};
    const G = D.G();
    if (G.app.isPortrait() !== PHONE) D.bad(tag + ' 세로 배치 판단: ' + G.app.isPortrait());
    if (G.app.isLowLandscape()) D.bad(tag + ' 낮은 가로로 봄');
    D.targets(MIN, tag + ' 시작'); D.noScroll(tag + ' 시작');
    D.tapSel('[data-act="begin"]', tag + ' 감수 시작');
    await D.passWarmup(); await D.until(() => D.cur() === 'guide', 3000, tag + ' 지침');
    G.app.go('start');
    if (!D.$('.st-resume')) D.bad(tag + ' 이어 하기 카드 없음');
    D.targets(MIN, tag + ' 시작+이어 하기'); D.noScroll(tag + ' 시작+이어 하기');
    for (let ch = 1; ch <= 8; ch++) if (!D.visible(D.$('.st-ch[data-ch="' + ch + '"]'))) D.bad(tag + ' ' + ch + '장 안 보임');
    D.tapSel('.st-ch[data-ch="2"]', tag + ' 2장');
    D.tapSel('[data-act="begin"]', tag + ' 감수 시작(덮어쓰기)');
    if (!D.$('.st-confirm')) D.bad(tag + ' 묻기 창 없음');
    D.targets(MIN, tag + ' 묻기 창'); D.noScroll(tag + ' 묻기 창');
    D.tapSel('[data-act="overwrite-no"]', tag + ' 그만두기');
    D.tapSel('[data-act="settings"]', tag + ' 설정');
    D.targets(MIN, tag + ' 설정 창'); D.noScroll(tag + ' 설정 창');
    D.tapSel('[data-act="settings-close"]', tag + ' 설정 닫기');
    D.tapSel('[data-act="howto"]', tag + ' 게임 방법');
    D.targets(MIN, tag + ' 게임 방법 창'); D.noScroll(tag + ' 게임 방법 창');
    D.tapSel('.howto-ok', tag + ' 알겠어요');
    if (D.visible(D.$('.app-rotate'))) D.bad(tag + ' 세로로 돌려 주세요가 보임');
    if (PHONE && D.visible(D.$('.st-art'))) D.bad(tag + ' 휴대폰 세로에서 그림 자리가 자리를 차지함');
    return D.take();
  }));
  ${fin('r' + v)}
} finally { await closeTab(${v}); }
`);
});

step('눕힌 휴대폰 844×390 — 세로로 돌려 주세요', `
${open('i1', 844, 390)}
try {
  const ei = [];
  ei.push(...await i1.evaluate(async () => { await D.fresh(); return D.take(); }));
  ei.push(...await i1.evaluate(async () => {
    const G = D.G(), T = D.T();
    if (!G.app.isLowLandscape()) D.bad('낮은 가로로 보지 않음');
    const rot = D.$('.app-rotate');
    if (!rot || !D.visible(rot)) D.bad('세로로 돌려 주세요가 안 보임');
    else if (rot.textContent.trim() !== T.rotate) D.bad('문구: ' + rot.textContent);
    return D.take();
  }));
  ${fin('ei')}
} finally { await closeTab(i1); }
`);
