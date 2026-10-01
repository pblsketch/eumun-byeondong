// 소리 장치 브라우저 점검(aside) — 명세 §15 · §5-6 · §11 · §18 '시작 화면이 콘솔 오류 없이 뜸(음원 파일 없음 상태 포함)'.
//   음원 파일이 하나도 없는 지금 상태(assets/audio/에 README만)로 진짜 index.html을 돌린다:
//   1) 첫 터치(pointerdown)로 잠금이 풀리고, 배경 음악 자리(지침 · 감수 = review, 조항 공개 · 장 결과 = result)와
//      효과음(교정 · 송출 · 신호 · 지침 맞음/틀림)을 모두 불러도 페이지 오류가 0, 실제로 울리는 소리는 없음(조용히 넘어감),
//      같은 파일 경고는 한 번만, console.error 없음 — 점검 서버(웹 오디오)와 file://(오디오 요소) 둘 다
//   2) 설정(배경 음악 · 효과음 켜기/끄기 · 음량 · 움직임 줄이기)이 G.audio 상태와 <html>.reduce-motion에 곧바로 반영되고
//      새로 고침 뒤에도 남음. 감수 화면의 소리 켜기/끄기 단추도 같은 설정을 바꾼다. 움직임 줄이기면 송출 연출 없이 곧바로 신호.
//   3) 네트워크: 불러온 것은 모두 같은 곳(점검 서버 또는 file://)의 파일뿐(명세 §3-7)
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { step, frame } from './aside.mjs';
import { DRIVER } from './lib/drive.mjs';
import { RUNS } from './lib/runs.mjs';
import { REVIEW } from './lib/review.mjs';
import { FLOW } from './lib/flow.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = pathToFileURL(path.join(ROOT, 'index.html')).href;
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
if (${v}.length) console.log('FAIL ' + ${v}.join('\\nFAIL '));
else console.log('PASS');
`;

// 게임 창의 console.warn · console.error를 세는 감시(새로 고침하면 다시 붙인다)
const SPY = String.raw`
if (!D.spy) {
  D.spy = () => {
    const w = D.w();
    if (w.__spy) return w.__spy;
    const s = (w.__spy = { warn: [], error: [] });
    const ow = w.console.warn.bind(w.console), oe = w.console.error.bind(w.console);
    w.console.warn = (...a) => { s.warn.push(a.map(String).join(' ')); ow(...a); };
    w.console.error = (...a) => { s.error.push(a.map(String).join(' ')); oe(...a); };
    return s;
  };
  // 같은 경고가 두 번 이상이면 안 됨, console.error는 0
  D.spyCheck = (tag) => {
    const s = D.spy();
    if (s.error.length) D.bad(tag + ': console.error ' + s.error.join(' | '));
    const per = {};
    s.warn.forEach((x) => { per[x] = (per[x] || 0) + 1; });
    Object.keys(per).forEach((k) => { if (per[k] > 1) D.bad(tag + ': 같은 경고가 ' + per[k] + '번 — ' + k); });
    return s.warn.length;
  };
  // 불러온 자원이 모두 같은 곳(점검 서버 · file://)인지
  D.sameOrigin = (tag) => {
    const w = D.w();
    const here = w.location.protocol === 'file:' ? 'file:' : w.location.origin;
    w.performance.getEntriesByType('resource').forEach((e) => {
      const ok = here === 'file:' ? e.name.indexOf('file:') === 0 : e.name.indexOf(here + '/') === 0;
      if (!ok) D.bad(tag + ': 바깥 주소를 불러옴 ' + e.name);
    });
  };
  // 첫 터치(잠금 풀기)
  D.touch = () => { const w = D.w(); w.dispatchEvent(new w.PointerEvent('pointerdown', { bubbles: true })); };
}
`;

step('음원 없음 — 잠금 풀기 · 소리 자리 전부 · 페이지 오류 0 · 조용함', `
${open('a1', 1280, 800)}
await a1.evaluate(() => { ${SPY} });
try {
  const ea = [];
  ea.push(...await a1.evaluate(async () => { await D.fresh(); D.spy(); D.G().save.setSettings({ reduceMotion: true }); return D.take(); }));
  ea.push(...await a1.evaluate(async () => {
    const G = D.G(), A = G.audio;
    if (A.state().unlocked) D.bad('터치 전에 잠금이 풀림');
    D.touch();
    if (!A.state().unlocked) D.bad('첫 터치로 잠금이 풀리지 않음');
    // 지침(배경 음악 review · 지침 틀림/맞음)
    await D.startChapter({ ch: 1, grade: 'm3', level: 'basic' });
    if (A.state().track !== 'review') D.bad('지침 화면 배경 음악 자리: ' + A.state().track);
    D.pickGuide(1, (g, b) => (g.blanks[b].answer + 1) % g.blanks[b].options.length);
    D.tapSel('[data-act="guide-check"]', '확인(틀림)');
    await D.solveGuide(1);
    await D.enterReview();
    if (A.state().track !== 'review') D.bad('감수 화면 배경 음악 자리: ' + A.state().track);
    // 교정 · 송출 · 신호 넷
    await D.load('먹는');
    await D.send('다름');
    D.mark('replace'); D.slot('0.co'); await D.until(() => D.sheet(), 2000, '도표'); D.cell('ㄴ');
    D.slot('0.co'); await D.until(() => D.sheet(), 2000, '도표'); D.cell('ㅇ');
    await D.send('규칙 밖');
    D.act('rw-redo');
    D.mark('replace'); D.slot('0.co'); await D.until(() => D.sheet(), 2000, '도표'); D.cell('ㅇ');
    await D.send('온에어');
    await D.load('감기');
    D.mark('replace'); D.slot('0.co'); await D.until(() => D.sheet(), 2000, '도표'); D.cell('ㅇ');
    await D.send('표준 아님');
    D.dbg().exit();
    // 조항 공개 · 장 결과(배경 음악 result)
    D.finishRun(1, { seed: 3 });
    G.app.resume();
    await D.until(() => D.cur() === 'reveal', 3000, '조항 공개');
    if (A.state().track !== 'result') D.bad('조항 공개 배경 음악 자리: ' + A.state().track);
    D.tapSel('[data-act="reveal-next"]', '장 결과 보기');
    await D.until(() => D.cur() === 'result', 3000, '장 결과');
    if (A.state().track !== 'result') D.bad('장 결과 배경 음악 자리: ' + A.state().track);
    // 모든 효과음 이름을 직접 한 번 더(없는 파일을 다시 부르면 조용히 false)
    A.effects.forEach((n) => A.sfx(n));
    await D.wait(1500); // 불러오기 실패가 다 끝나기를
    const st = A.state();
    if (st.playing !== null) D.bad('음원이 없는데 재생 중: ' + st.playing);
    if (st.sfxPlayed !== 0) D.bad('음원이 없는데 효과음이 울림: ' + st.sfxPlayed);
    if (st.missing.indexOf('bgm-review.mp3') < 0 || st.missing.indexOf('bgm-result.mp3') < 0) D.bad('없는 배경 음악을 없다고 적지 않음: ' + JSON.stringify(st.missing));
    const nw = D.spyCheck('점검 서버');
    window.__infos = ['점검 서버: 소리 틀 ' + st.backend + ', 없는 파일 ' + st.missing.length + '개, 경고 ' + nw + '줄'];
    D.tapSel('[data-act="chapters"]', '장 고르기');
    await D.until(() => D.cur() === 'start', 2000, '시작 화면');
    if (A.state().track !== null) D.bad('시작 화면인데 배경 음악 자리: ' + A.state().track);
    D.sameOrigin('점검 서버');
    return D.take();
  }));
  for (const i of await a1.evaluate(() => window.__infos || [])) console.log('INFO ' + i);
  ${fin('ea')}
} finally { await closeTab(a1); }
`);

step('설정 반영 — G.audio · reduce-motion · 새로 고침 뒤에도 · 감수 화면 소리 단추', `
${open('b1', 1366, 768)}
await b1.evaluate(() => { ${SPY} });
try {
  const eb = [];
  eb.push(...await b1.evaluate(async () => { await D.fresh(); return D.take(); }));
  eb.push(...await b1.evaluate(async () => {
    const G = D.G(), A = G.audio;
    const s0 = A.state(), d = G.save.getSettings();
    if (s0.bgmOn !== d.bgmOn || s0.sfxOn !== d.sfxOn || Math.abs(s0.bgmVolume - d.bgmVolume) > 1e-6 || Math.abs(s0.sfxVolume - d.sfxVolume) > 1e-6) D.bad('처음 설정이 소리 장치와 다름: ' + JSON.stringify([s0, d]));
    D.tapSel('[data-act="settings"]', '설정');
    D.tapSel('[data-key="bgmOn"] [data-v="off"]', '배경 음악 끄기');
    D.tapSel('[data-key="sfxOn"] [data-v="off"]', '효과음 끄기');
    D.tapSel('[data-key="reduceMotion"] [data-v="on"]', '움직임 줄이기');
    const set = (key, v) => { const i = D.$('input[data-key="' + key + '"]'); i.value = String(v); i.dispatchEvent(new (D.w().Event)('input', { bubbles: true })); i.dispatchEvent(new (D.w().Event)('change', { bubbles: true })); };
    set('bgmVolume', 20); set('sfxVolume', 0);
    const a = A.state();
    if (a.bgmOn || a.sfxOn || Math.abs(a.bgmVolume - 0.2) > 1e-6 || a.sfxVolume !== 0) D.bad('설정이 곧바로 반영되지 않음: ' + JSON.stringify(a));
    if (!D.d().documentElement.classList.contains('reduce-motion')) D.bad('움직임 줄이기 클래스 없음');
    D.touch();
    if (A.sfx('mark') !== false) D.bad('효과음을 껐는데 울리려 함');
    D.tapSel('[data-act="settings-close"]', '설정 닫기');
    return D.take();
  }));
  eb.push(...await b1.evaluate(async () => { await D.reload(); D.spy(); return D.take(); }));
  eb.push(...await b1.evaluate(async () => {
    const G = D.G(), A = G.audio;
    const a = A.state();
    if (a.bgmOn || a.sfxOn || Math.abs(a.bgmVolume - 0.2) > 1e-6 || a.sfxVolume !== 0) D.bad('새로 고침 뒤 소리 설정: ' + JSON.stringify(a));
    if (!D.d().documentElement.classList.contains('reduce-motion')) D.bad('새로 고침 뒤 움직임 줄이기');
    // 움직임 줄이기: 송출하면 연출 없이 곧바로 신호
    await D.toReview(1, { seed: 6 });
    D.act('rw-send');
    if (!D.kind() || D.dbg().busy()) D.bad('움직임 줄이기인데 송출 연출이 있음');
    // 감수 화면의 소리 단추: 켜기 → 배경 음악 · 효과음 모두 켜짐(저장)
    const sb = D.$('[data-act="rw-sound"]');
    if (sb.getAttribute('aria-pressed') !== 'true') D.bad('소리를 껐는데 소리 단추가 꺼짐 표시가 아님');
    D.act('rw-sound');
    const b = A.state();
    if (!b.bgmOn || !b.sfxOn || !G.save.getSettings().bgmOn || !G.save.getSettings().sfxOn) D.bad('소리 단추로 켜지지 않음: ' + JSON.stringify(b));
    if (b.track !== 'review') D.bad('감수 화면 배경 음악 자리: ' + b.track);
    return D.take();
  }));
  eb.push(...await b1.evaluate(async () => { await D.reload(); D.spy(); return D.take(); }));
  eb.push(...await b1.evaluate(async () => {
    const G = D.G(), A = G.audio;
    if (!A.state().bgmOn || !A.state().sfxOn) D.bad('새로 고침 뒤 소리 단추 설정이 남지 않음');
    G.save.setSettings({ reduceMotion: false });
    if (D.d().documentElement.classList.contains('reduce-motion')) D.bad('움직임 줄이기를 꺼도 클래스가 남음');
    D.act('resume');
    await D.until(() => D.cur() === 'review' && D.$('.rw-blocks .bk-slot'), 3000, '이어 하기');
    D.act('rw-send');
    await D.wait(40);
    if (!D.dbg().busy() && D.$$('.rw-psyl').length > 1) D.bad('움직임 줄이기를 껐는데 송출 연출이 없음');
    await D.until(() => !D.dbg().busy(), 4000, '연출 끝');
    D.spyCheck('설정');
    D.sameOrigin('설정');
    return D.take();
  }));
  ${fin('eb')}
} finally { await closeTab(b1); }
`);

// aside는 openTab(file://…)을 거절하므로 빈 탭에서 goto로 연다(check-00-smoke와 같음)
step('음원 없음 — file:// 더블클릭(오디오 요소)', `
const c1 = await openTab('about:blank');
try {
  await c1.goto(${J(FILE)});
  await sleep(600);
  const r = await c1.evaluate(async () => {
    const bad = [];
    const spy = { warn: [], error: [] };
    const ow = console.warn.bind(console), oe = console.error.bind(console);
    console.warn = (...a) => { spy.warn.push(a.map(String).join(' ')); ow(...a); };
    console.error = (...a) => { spy.error.push(a.map(String).join(' ')); oe(...a); };
    if (location.protocol !== 'file:') bad.push('file 주소가 아님: ' + location.protocol);
    window.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    const A = G.audio;
    if (!A.state().unlocked) bad.push('잠금이 풀리지 않음');
    A.play('review');
    A.effects.forEach((n) => A.sfx(n));
    A.play('result');
    await new Promise((res) => setTimeout(res, 2500));
    const st = A.state();
    if (st.playing !== null) bad.push('음원이 없는데 재생 중: ' + st.playing);
    if ((window.__gamsuErrors || ['오류 모음 없음']).length) bad.push('페이지 오류: ' + (window.__gamsuErrors || ['오류 모음 없음']).join(' | '));
    if (spy.error.length) bad.push('console.error ' + spy.error.join(' | '));
    const per = {};
    spy.warn.forEach((x) => { per[x] = (per[x] || 0) + 1; });
    Object.keys(per).forEach((k) => { if (per[k] > 1) bad.push('같은 경고가 ' + per[k] + '번 — ' + k); });
    performance.getEntriesByType('resource').forEach((e) => { if (e.name.indexOf('file:') !== 0) bad.push('바깥 주소를 불러옴 ' + e.name); });
    return { bad, info: 'file://: 소리 틀 ' + st.backend + ', 배경 음악 방식 ' + st.bgmMode + ', 없는 파일 ' + st.missing.length + '개, 경고 ' + spy.warn.length + '줄' };
  });
  console.log('INFO ' + r.info);
  ${fin('r.bad')}
} finally { await closeTab(c1); }
`);
