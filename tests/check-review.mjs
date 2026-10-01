// 감수 화면 G.screens.review 점검(aside) — 명세 §8 · §11 · §14 · §15 · §18 · §19.
//   진짜 index.html을 크기별 틀(tests/pages/frame.html)에 띄우고 학생처럼 누른다(교정 부호 → 음절 블록 → 조음 도표 · 넣을 음운).
//   감수 단계 진행 장은 점검 전용 조작 D.finishRun(tests/lib/runs.mjs, phase 'review')으로 만들고 G.app.resume()으로 들어간다.
//   지침 예시 원고(옷이 · 겉옷 · 닭이 · 먹는 …)는 뽑기에 나오지 않으므로 점검 전용 조작 G.review.debug.load(id)로 띄운다
//   (그 원고는 저장하지 않는 '연습 자리' — 게임 화면에는 점검용 단추 · 글이 없다).
//   1) 신호 넷(온에어 · 규칙 밖 · 다름 · 표준 아님), 할 수 없는 교정은 기록 안 됨(넣을 빈자리 없음 · 이웃 아님 · 같은 음운),
//      되돌리기 · 다시 감수, 넘김 확인(송출 전 [다음 원고]), 머리(원고 n/7 · 음운 수)
//   2) 연음 안내: 옷이 /ㅅ/ 고침 → 신호 뒤 안내, 겉옷 /ㅌ/ 고침 → 없음, 닭이 /ㄹ/ 뺌 → '표준 아님' 뒤 안내(배지는 남음)
//   3) 도움 사다리: ① 송출 전 '먼저 송출해 보세요'(도움으로 안 셈) → 다름 뒤 위치 표시, ② 지침, ③ 다른 낱말(이 원고 풀이 아님),
//      쌍둥이 없는 감기는 지침 + '같은 풀이 예시가 없어요', 연음 함정은 '교정 없이 송출'
//   4) 결과 전 표준 발음 · 함정 표시가 DOM · aria에 없음, 새로 고침 뒤 교정까지 복원, 7번째 원고 → 조항 공개 → 장 결과
//   5) 닮은 칸은 기본 단계만, 심화 단계는 경계가 DOM · aria에 없음
//   6) 다섯 크기: 가로 스크롤 없음 · 누르는 자리(가로 64px, 휴대폰 세로 48px) · 휴대폰 세로 4음절 두 줄 나누기
//   모든 단계에서 페이지 오류(window.__gamsuErrors)가 없어야 한다.
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
`;
const fin = (v) => `
if (${v}.length) console.log('FAIL ' + ${v}.join('\\nFAIL '));
else console.log('PASS');
`;
// 저장 값을 지우고 움직임 줄이기를 켠다(송출 연출 없이 곧바로 — 점검 시간을 줄임)
const FRESH = `async () => { await D.fresh(); D.G().save.setSettings({ reduceMotion: true }); return D.take(); }`;
// 새로 고친 뒤 시작 화면의 [이어 하기] → 감수 화면
const RESUME = `async () => {
  D.act('resume');
  await D.until(() => D.cur() === 'review' && D.$('.rw-blocks .bk-slot'), 5000, '이어 하기 → 감수');
  return D.take();
}`;

step('신호 넷 · 할 수 없는 교정 · 되돌리기 · 넘김 확인', `
${open('a1', 1280, 800)}
try {
  const ea = [];
  ea.push(...await a1.evaluate(${FRESH}));
  ea.push(...await a1.evaluate(async () => {
    const G = D.G(), T = D.T();
    if (!G.screens.review) { D.bad('G.screens.review 등록 없음'); return D.take(); }
    if (!G.review || !G.review.debug) { D.bad('G.review.debug 없음'); return D.take(); }
    const run = await D.toReview(2, { grade: 'h1', level: 'basic', seed: 11 });
    const by = D.byId();
    const sc = by[run.ids[0]];
    if (D.dbg().script().id !== sc.id) D.bad('첫 원고가 ids[0]이 아님');
    const head = D.$('.rw-head').textContent.replace(/\\s+/g, ' ');
    [G.text.t('review.header.script', { i: 1, n: 7 }), G.text.chapterTitle(2), G.text.t('levels.tag', { level: G.text.levelName('basic') }),
      G.text.t('review.header.countValue', { from: G.rules.phonemes(G.rules.start(sc)), now: G.rules.phonemes(G.rules.start(sc)) })]
      .forEach((x) => { if (head.indexOf(x) < 0) D.bad('머리에 없음: ' + x); });
    if (D.$('.rw-script-text').textContent.trim() !== sc.text) D.bad('원고 표기: ' + D.$('.rw-script-text').textContent);
    if (D.logN() !== 0 || !D.$('.rw-log').textContent.includes(T.review.log.empty)) D.bad('처음 감수 기록');
    if (D.kind() !== null) D.bad('송출 전에 신호 배지');
    D.leak('처음 원고');
    D.noBad('처음 원고');
    // 넘김 확인: 송출 없이 [다음 원고] → 한 번 묻는다
    D.act('rw-next');
    await D.until(() => D.$('.rw-confirm'), 2000, '넘김 확인 창');
    if (D.$('.rw-confirm') && !D.$('.rw-confirm').textContent.includes(T.review.skip.ask)) D.bad('넘김 확인 문구');
    D.act('rw-skip-no');
    await D.until(() => !D.$('.rw-confirm'), 2000, '넘김 확인 닫힘');
    if (G.save.loadChapter().done.length !== 0 || D.dbg().script().id !== sc.id) D.bad('더 감수하기인데 넘어감');
    D.act('rw-next');
    await D.until(() => D.$('.rw-confirm'), 2000, '넘김 확인 창(둘째)');
    D.act('rw-skip-yes');
    await D.until(() => G.save.loadChapter().done.length === 1 && D.dbg().script().id === run.ids[1], 3000, '넘김 저장');
    const r1 = G.save.loadChapter();
    if (r1.done[0].id !== sc.id || r1.done[0].result !== 'skip' || r1.done[0].sends !== 0 || r1.done[0].helped) D.bad('넘김 기록: ' + JSON.stringify(r1.done[0]));
    if (!r1.cur || r1.cur.corrections.length || r1.cur.sends) D.bad('다음 원고의 cur가 새것이 아님');
    if (!D.$('.rw-head').textContent.includes(G.text.t('review.header.script', { i: 2, n: 7 }))) D.bad('머리 2/7 아님');
    D.leak('둘째 원고');
    return D.take();
  }));
  ea.push(...await a1.evaluate(async () => {
    const G = D.G(), T = D.T();
    await D.load('먹는');
    // 다름: 교정 없이 송출 → [먹는] ≠ 표준 → 1곳
    if ((await D.send('다름')) !== 'diff') D.bad('다름 신호가 아님: ' + D.kind());
    if (!D.say().includes(G.text.signal('diff', { n: 1 }))) D.bad('다름 한 줄: ' + D.say());
    const bd = D.$('.rw-badge');
    if (!bd || !bd.querySelector('svg[data-glyph="diff"]') || !bd.textContent.includes(G.text.signalName('diff'))) D.bad('다름 배지(색 + 기호)');
    if (D.$('.rw-prompter').textContent.replace(/\\s+/g, '') !== '먹는') D.bad('프롬프터: ' + D.$('.rw-prompter').textContent);
    // 온에어: /ㄱ/ → /ㅇ/ (고침표 → 블록 → 도표)
    D.mark('replace');
    if (!D.say().includes(T.review.prompt.replace)) D.bad('고침표 안내: ' + D.say());
    D.slot('0.co');
    await D.until(() => D.sheet() && D.$('.rw-sheet .ch-cell'), 2000, '조음 도표');
    if (!D.$('.rw-sheet .ch-part[data-part="consonant"]') || D.$('.rw-sheet .ch-part[data-part="vowel"]')) D.bad('종성인데 자음표가 아님');
    const curCell = D.$('.rw-sheet .ch-cell[data-id="ㄱ"]');
    if (!curCell || !curCell.disabled) D.bad('지금 음운 칸이 꺼지지 않음');
    D.cell('ㅇ');
    if (D.logN() !== 1) D.bad('고침이 기록되지 않음');
    const li = D.$('.rw-log-item');
    if (li && li.textContent.replace(/\\s+/g, ' ').trim().indexOf(G.text.logLine(1, { op: 'replace', from: 'ㄱ', to: 'ㅇ' })) !== 0) D.bad('기록 줄: ' + li.textContent);
    if (D.sheet()) D.bad('고른 뒤에도 도표가 열려 있음');
    if (D.$('.rw-blocks .bk-slot[data-s="0"][data-slot="co"]').textContent.trim() !== '/ㅇ/') D.bad('블록에 반영 안 됨');
    if ((await D.send('온에어')) !== 'onair') D.bad('온에어가 아님: ' + D.kind());
    if (!D.say().includes(G.text.signal('onair'))) D.bad('온에어 한 줄: ' + D.say());
    const stamp = D.$('.rw-stamp');
    if (!stamp || !D.visible(stamp) || !stamp.textContent.includes(T.review.stamp)) D.bad('감수 도장 없음');
    if (!D.$('[data-act="rw-next"]').classList.contains('is-primary')) D.bad('온에어 뒤 다음 원고가 앞에 오지 않음');
    // 되돌리기
    D.act('rw-undo');
    if (D.logN() !== 0) D.bad('되돌리기 안 됨');
    if (D.$('.rw-blocks .bk-slot[data-s="0"][data-slot="co"]').textContent.trim() !== '/ㄱ/') D.bad('되돌리기가 블록에 반영 안 됨');
    D.act('rw-undo');
    if (D.say() !== T.review.notice.nothingToUndo) D.bad('되돌릴 것 없음 안내: ' + D.say());
    // 규칙 밖: /ㄱ/ → /ㄴ/ → /ㅇ/ (결과는 맞지만 규칙에 없는 교정)
    D.mark('replace'); D.slot('0.co'); await D.until(() => D.sheet(), 2000, '도표'); D.cell('ㄴ');
    D.slot('0.co'); await D.until(() => D.sheet(), 2000, '도표'); D.cell('ㅇ');
    if (D.logN() !== 2) D.bad('교정 둘이 기록되지 않음: ' + D.logN());
    if ((await D.send('규칙 밖')) !== 'offrule') D.bad('규칙 밖이 아님: ' + D.kind());
    if (!D.say().includes(G.text.signal('offrule'))) D.bad('규칙 밖 한 줄: ' + D.say());
    if (!D.$$('.rw-log-item.is-offrule').length || !D.$('.rw-log').textContent.includes(T.review.offruleMark)) D.bad('규칙 밖 교정 표시 없음');
    const redo = D.$('[data-act="rw-redo"]');
    if (!redo || !D.visible(redo) || !redo.classList.contains('is-primary')) D.bad('다시 감수가 앞에 오지 않음');
    D.act('rw-redo');
    if (D.logN() !== 0) D.bad('다시 감수가 교정을 지우지 않음');
    if (D.dbg().cur().sends !== 3 || D.dbg().cur().kinds.join() !== 'diff,onair,offrule') D.bad('다시 감수가 송출 기록을 지움: ' + JSON.stringify(D.dbg().cur()));
    // 할 수 없는 교정: 넣을 빈자리 없음(/는/의 초성) · 같은 음운 두 번 · 이웃 아님 — 기록 안 됨
    D.mark('insert');
    if (!D.say().includes(T.review.prompt.insert)) D.bad('넣음표 안내');
    D.gap(0); await D.until(() => D.sheet() && D.$('.rw-ins'), 2000, '넣을 음운 고르기');
    D.ins('ㄴ');
    if (D.say() !== T.review.notice.noRoom) D.bad('빈자리 없음 안내: ' + D.say());
    if (D.logN() !== 0) D.bad('빈자리 없는 넣음이 기록됨');
    D.mark('merge');
    D.slot('0.on'); D.slot('0.on');
    if (D.say() !== T.review.notice.samePick) D.bad('같은 음운 안내: ' + D.say());
    D.slot('1.nu');
    if (D.say() !== T.review.notice.notAdjacent) D.bad('이웃 아님 안내: ' + D.say());
    if (D.logN() !== 0 || D.sheet()) D.bad('이웃 아닌 합침이 기록됨 · 도표가 열림');
    // 할 수 있는 넣음(j)은 기록되고(오답을 막지 않음) 되돌릴 수 있다
    D.mark('insert'); D.gap(0); await D.until(() => D.sheet() && D.$('.rw-ins'), 2000, '넣을 음운'); D.ins('j');
    if (D.logN() !== 1 || !D.$('.rw-blocks .bk-slot[data-s="1"][data-slot="gl"]')) D.bad('j 넣음이 기록 · 반영 안 됨');
    const cnt = D.$('.rw-count').textContent;
    if (!cnt.includes(G.text.t('review.header.countValue', { from: 6, now: 7 }))) D.bad('음운 수가 바뀌지 않음: ' + cnt);
    D.act('rw-undo');
    // 합침표는 이웃한 두 음운이면 도표를 연다(결과는 학생이 고름)
    D.mark('merge'); D.slot('0.co'); D.slot('1.on');
    await D.until(() => D.sheet() && D.$('.rw-sheet .ch-cell'), 2000, '합침 도표');
    if (D.$('.rw-sheet .ch-cell.is-like')) D.bad('합침 도표에 닮은 칸');
    D.cell('ㅇ');
    if (D.logN() !== 1 || !D.$('.rw-log-item').textContent.includes(G.text.logLine(1, { op: 'merge', from: ['ㄱ', 'ㄴ'], to: 'ㅇ' }))) D.bad('합침 기록: ' + (D.$('.rw-log-item') || {}).textContent);
    D.act('rw-undo');
    // 표준 아님: 감기 /ㅁ/ → /ㅇ/
    await D.load('감기');
    D.leak('감기 송출 전');
    D.mark('replace'); D.slot('0.co'); await D.until(() => D.sheet(), 2000, '도표'); D.cell('ㅇ');
    if ((await D.send('표준 아님')) !== 'nonstandard') D.bad('표준 아님이 아님: ' + D.kind());
    if (!D.say().includes(G.text.signal('nonstandard')) || !D.say().includes(T.signal.board)) D.bad('표준 아님 한 줄(시청자 게시판): ' + D.say());
    if (!D.$('.rw-badge svg[data-glyph="nonstandard"]')) D.bad('표준 아님 기호');
    D.noBad('신호 넷');
    return D.take();
  }));
  ${fin('ea')}
} finally { await closeTab(a1); }
`);

step('연음 안내 — 옷이 · 겉옷 · 닭이 · 송출 연출', `
${open('b1', 1366, 768)}
try {
  const eb = [];
  eb.push(...await b1.evaluate(${FRESH}));
  eb.push(...await b1.evaluate(async () => {
    const G = D.G(), T = D.T();
    await D.toReview(1, { seed: 5 });
    // 옷이: 연음 자리 받침 /ㅅ/을 고침 → 신호 줄 먼저, 잠시 뒤 같은 자리가 연음 안내로(배지는 남음)
    await D.load('옷이');
    D.mark('replace'); D.slot('0.co'); await D.until(() => D.sheet(), 2000, '도표'); D.cell('ㄷ');
    D.act('rw-send');
    await D.until(() => D.kind() === 'diff', 3000, '옷이 신호');
    if (!D.say().includes(G.text.signal('diff', { n: 1 }))) D.bad('옷이: 신호 줄이 먼저가 아님: ' + D.say());
    await D.until(() => D.say().includes(T.signal.linking), 4000, '옷이 연음 안내');
    if (D.kind() !== 'diff') D.bad('연음 안내 뒤 배지가 사라짐');
    // 겉옷: /ㅌ/은 실질 형태소 앞(연음 자리 아님) → 안내 없음
    await D.load('겉옷');
    D.mark('replace'); D.slot('0.co'); await D.until(() => D.sheet(), 2000, '도표'); D.cell('ㄷ');
    await D.send('겉옷');
    await D.wait(2400);
    if (D.say().includes(T.signal.linking)) D.bad('겉옷에 연음 안내');
    // 닭이: 겹받침 앞 /ㄹ/을 뺌 → 표준 아님 신호 먼저, 그 뒤 연음 안내
    await D.load('닭이');
    D.mark('delete'); D.slot('0.co');
    if (D.logN() !== 1) D.bad('닭이 뺌이 기록되지 않음');
    D.act('rw-send');
    await D.until(() => D.kind() === 'nonstandard', 3000, '닭이 표준 아님');
    if (!D.say().includes(G.text.signal('nonstandard'))) D.bad('닭이: 표준 아님 줄이 먼저가 아님: ' + D.say());
    await D.until(() => D.say().includes(T.signal.linking), 4000, '닭이 연음 안내');
    if (D.kind() !== 'nonstandard') D.bad('닭이 연음 안내 뒤 배지');
    return D.take();
  }));
  eb.push(...await b1.evaluate(async () => {
    const G = D.G();
    // 송출 연출(움직임 줄이기 끔): 램프가 켜지고 프롬프터에 한 음절씩, 1.5초 안쪽 뒤 신호
    G.save.setSettings({ reduceMotion: false });
    await D.load('헛웃음');
    const t0 = Date.now();
    D.act('rw-send');
    await D.wait(60);
    const lamp = D.$('.rw-lamp');
    if (!lamp || !lamp.classList.contains('is-on')) D.bad('ON AIR 램프가 켜지지 않음');
    if (D.kind()) D.bad('연출 중인데 신호가 먼저 나옴');
    await D.until(() => D.kind() && !D.dbg().busy(), 4000, '연출 뒤 신호');
    const ms = Date.now() - t0;
    if (ms > 2200) D.bad('송출 연출이 김: ' + ms + 'ms');
    const rd = G.rules.reading(G.rules.start(D.dbg().script()));
    if (D.$('.rw-prompter').textContent.replace(/\\s+/g, '') !== rd) D.bad('프롬프터(연음은 저절로): ' + D.$('.rw-prompter').textContent + ' / ' + rd);
    // 헛웃음의 /ㅅ/(형식 형태소 앞, 1번 음절)을 고치면 연음 안내, 0번(실질 형태소 앞)은 아님
    G.save.setSettings({ reduceMotion: true });
    D.mark('replace'); D.slot('0.co'); await D.until(() => D.sheet(), 2000, '도표'); D.cell('ㄷ');
    if ((await D.send('헛웃음 0')) !== 'onair') D.bad('헛웃음 0번 고침 신호: ' + D.kind());
    await D.wait(2000);
    if (D.say().includes(D.T().signal.linking)) D.bad('헛웃음 0번 /ㅅ/ 고침에 연음 안내');
    D.slot('1.co'); await D.until(() => D.sheet(), 2000, '도표'); D.cell('ㄷ');
    D.act('rw-send');
    await D.until(() => D.say().includes(D.T().signal.linking), 5000, '헛웃음 1번 /ㅅ/ 연음 안내');
    return D.take();
  }));
  ${fin('eb')}
} finally { await closeTab(b1); }
`);

step('도움 사다리 — ① 송출 전 · ② 지침 · ③ 다른 낱말', `
${open('c1', 1280, 800)}
try {
  const ec = [];
  ec.push(...await c1.evaluate(${FRESH}));
  ec.push(...await c1.evaluate(async () => {
    const G = D.G(), T = D.T(), w = D.w();
    const by = D.byId();
    const ids = G.rules.draw(1, w.SCRIPTS, G.rules.exampleIds(w.GUIDES[1]), 21);
    const k = ids.findIndex((id) => by[id].steps.length > 0 && G.rules.twin(by[id], w.SCRIPTS, ids));
    if (k < 0) { D.bad('점검용 원고 없음'); return D.take(); }
    await D.toReview(1, { seed: 21, doneCount: k, grade: 'm3' });
    const sc = by[ids[k]];
    if (D.dbg().script().id !== sc.id) D.bad('원고가 다름');
    if (D.$('.rw-help') && D.visible(D.$('.rw-help'))) D.bad('도움이 처음부터 열려 있음');
    D.act('rw-help');
    await D.until(() => D.$('.rw-help') && D.visible(D.$('.rw-help')), 2000, '도움 열림');
    if (!D.$('.rw-help').textContent.includes(T.help.noPenalty)) D.bad('감점 없음 문구');
    const s2 = D.$('.rw-help-step[data-step="2"]'), s3 = D.$('.rw-help-step[data-step="3"]');
    if (!s2 || !s2.disabled || !s3 || !s3.disabled) D.bad('도움이 한 칸씩 열리지 않음(②③이 처음부터 열림)');
    D.tapSel('.rw-help-step[data-step="1"]', '도움 ①');
    if (!D.$('.rw-help-body').textContent.includes(T.help.needBroadcast)) D.bad('송출 전 ①: ' + D.$('.rw-help-body').textContent);
    if (G.save.loadChapter().cur.help.length) D.bad('먼저 송출해 보세요가 도움으로 셈');
    if (D.$$('.rw-psyl.is-diff').length) D.bad('송출 전 위치 표시');
    D.leak('도움 ① 송출 전');
    // 교정 없이 송출 → 다름 → ① 위치 표시
    if ((await D.send('도움용')) !== 'diff') D.bad('교정 없이 송출이 다름이 아님');
    const last = G.save.loadChapter().cur.last;
    D.tapSel('.rw-help-step[data-step="1"]', '도움 ①(송출 뒤)');
    if (!D.$('.rw-help-body').textContent.includes(T.help.diffMarked)) D.bad('① 표시 안내');
    const marks = D.$$('.rw-psyl.is-diff').map((n) => +n.getAttribute('data-i'));
    if (!last || marks.join() !== last.at.join() || !marks.length) D.bad('① 다른 음절 위치: ' + marks.join() + ' / ' + (last && last.at.join()));
    if (G.save.loadChapter().cur.help.join() !== '1') D.bad('① 저장: ' + G.save.loadChapter().cur.help.join());
    // ② 지침 다시 보기(채운 지침)
    D.tapSel('.rw-help-step[data-step="2"]', '도움 ②');
    const body2 = D.$('.rw-help-body').textContent;
    if (!body2.includes(T.help.guideTitle)) D.bad('② 제목');
    w.GUIDES[1].forEach((g) => Object.keys(g.blanks).forEach((b) => {
      const a = g.blanks[b].options[g.blanks[b].answer];
      if (!body2.includes(a)) D.bad('② 채운 칸 없음: ' + g.id + ' ' + b);
    }));
    if (body2.includes('{')) D.bad('② 빈칸 자리가 그대로 남음');
    // ③ 같은 규칙의 다른 낱말(이번에 뽑힌 7개 · 같은 발음은 뺌)
    D.tapSel('.rw-help-step[data-step="3"]', '도움 ③');
    const tw = by[G.rules.twin(sc, w.SCRIPTS, ids)];
    const body3 = D.$('.rw-help-body').textContent;
    if (!body3.includes(T.help.exampleTitle)) D.bad('③ 제목');
    const sp = D.$('.rw-ex-spell'), pr = D.$('.rw-ex-pron');
    if (!sp || sp.textContent.trim() !== tw.text) D.bad('③ 표기: ' + (sp && sp.textContent) + ' / ' + tw.text);
    if (!pr || pr.textContent.trim() !== G.text.pron(tw.pron)) D.bad('③ 발음: ' + (pr && pr.textContent));
    if (ids.indexOf(tw.id) >= 0 || tw.id === sc.id) D.bad('③이 이번에 뽑힌 원고');
    if (body3.includes(G.text.pron(sc.pron)) || (sp && sp.textContent.trim() === sc.text)) D.bad('③이 이 원고의 풀이를 보임');
    const steps = D.$$('.rw-ex-step');
    if (steps.length !== tw.steps.length) D.bad('③ 단계 수 ' + steps.length + ' / ' + tw.steps.length);
    const r = G.save.loadChapter();
    if (r.cur.help.join() !== '1,2,3' || !r.cur.helped) D.bad('③ 저장: ' + JSON.stringify(r.cur.help));
    // 새로 고침 없이 넘김 확인 없이 다음 원고(송출함) → 도움 받음이 끝난 원고 기록에
    D.act('rw-next');
    await D.until(() => G.save.loadChapter().done.length === k + 1, 3000, '다음 원고');
    const d = G.save.loadChapter().done[k];
    if (!d.helped || d.help.join() !== '1,2,3' || d.result !== 'skip' || d.sends !== 1) D.bad('끝난 원고 기록: ' + JSON.stringify(d));
    if (D.$('.rw-help') && D.visible(D.$('.rw-help'))) D.bad('다음 원고에 도움이 열린 채');
    return D.take();
  }));
  ec.push(...await c1.evaluate(async () => {
    const G = D.G(), T = D.T();
    // 연음 함정의 풀이 예시는 '교정 없이 송출'
    await D.load('꽃이');
    D.act('rw-help'); await D.until(() => D.$('.rw-help') && D.visible(D.$('.rw-help')), 2000, '도움 열림');
    ['1', '2', '3'].forEach((n) => D.tapSel('.rw-help-step[data-step="' + n + '"]', '도움 ' + n));
    if (!D.$('.rw-help-body').textContent.includes(T.help.noCorrection)) D.bad('연음 함정 ③에 교정 없이 송출이 없음');
    if (D.$('.rw-ex-spell') && D.$('.rw-ex-spell').textContent.trim() === '꽃이') D.bad('연음 함정 ③이 자기 원고');
    D.leak('꽃이 도움 ③');
    return D.take();
  }));
  ec.push(...await c1.evaluate(async () => {
    const G = D.G(), T = D.T();
    // 쌍둥이가 없는 감기: 지침 + '같은 풀이 예시가 없어요'
    await D.toReview(2, { seed: 9, grade: 'h1' });
    await D.load('감기');
    D.act('rw-help'); await D.until(() => D.$('.rw-help') && D.visible(D.$('.rw-help')), 2000, '도움 열림');
    ['1', '2', '3'].forEach((n) => D.tapSel('.rw-help-step[data-step="' + n + '"]', '도움 ' + n));
    const b = D.$('.rw-help-body').textContent;
    if (!b.includes(T.help.noExample) || !b.includes(T.help.guideTitle)) D.bad('감기 ③: ' + b.slice(0, 80));
    if (D.$('.rw-ex-spell')) D.bad('감기 ③에 풀이 예시가 있음');
    D.leak('감기 도움 ③');
    // 도움 닫기
    D.tapSel('.rw-help-close', '도움 닫기');
    if (D.visible(D.$('.rw-help'))) D.bad('도움이 닫히지 않음');
    return D.take();
  }));
  ${fin('ec')}
} finally { await closeTab(c1); }
`);

step('새로 고침 뒤 교정 복원 · 7번째 원고 → 조항 공개 → 장 결과', `
${open('d1', 1280, 800)}
try {
  const ed = [];
  ed.push(...await d1.evaluate(${FRESH}));
  let before = null;
  ed.push(...await d1.evaluate(async () => {
    const G = D.G(), T = D.T();
    const run = await D.toReview(2, { seed: 33, doneCount: 6, grade: 'h1' });
    if (!D.$('.rw-head').textContent.includes(G.text.t('review.header.script', { i: 7, n: 7 }))) D.bad('머리 7/7');
    const nx = D.$('[data-act="rw-next"]');
    if (!nx || !nx.textContent.includes(T.review.buttons.toReveal)) D.bad('7번째 원고의 다음 단추가 조항 공개로가 아님');
    // 첫 자음 칸을 다른 자음으로 고침 → 송출 → 한 번 더 고침
    const slot = D.$$('.rw-blocks .bk-slot:not(.is-empty)').find((b) => b.getAttribute('data-slot') === 'co' || b.getAttribute('data-slot') === 'on');
    const p = slot.getAttribute('data-s') + '.' + slot.getAttribute('data-slot') + (slot.getAttribute('data-slot') === 'co' ? slot.getAttribute('data-k') : '');
    D.mark('replace'); D.slot(p); await D.until(() => D.sheet(), 2000, '도표');
    const pick = () => D.$$('.rw-sheet .ch-cell').find((c) => !c.disabled && c.getAttribute('data-id') !== 'ㅇ');
    D.tap(pick(), '도표 칸');
    await D.send('복원용');
    D.slot(p); await D.until(() => D.sheet(), 2000, '도표'); D.tap(pick(), '도표 칸 2');
    if (D.logN() !== 2) D.bad('교정 둘: ' + D.logN());
    window.__before = { cs: JSON.stringify(D.dbg().cur().corrections), log: D.$$('.rw-log-item').map((n) => n.textContent).join('|'), sends: D.dbg().cur().sends };
    const saved = G.save.loadChapter().cur;
    if (JSON.stringify(saved.corrections) !== window.__before.cs) D.bad('교정이 저장되지 않음');
    return D.take();
  }));
  ed.push(...await d1.evaluate(async () => { await D.reload(); return D.take(); }));
  ed.push(...await d1.evaluate(async () => {
    const G = D.G(), T = D.T();
    if (D.cur() !== 'start' || !D.$('.st-resume')) D.bad('새로 고침 뒤 이어 하기 카드 없음');
    D.act('resume');
    await D.until(() => D.cur() === 'review' && D.$('.rw-blocks .bk-slot'), 4000, '이어 하기 → 감수');
    const b = window.__before;
    if (JSON.stringify(D.dbg().cur().corrections) !== b.cs) D.bad('교정이 복원되지 않음');
    if (D.$$('.rw-log-item').map((n) => n.textContent).join('|') !== b.log) D.bad('감수 기록이 복원되지 않음');
    if (D.dbg().cur().sends !== b.sends) D.bad('송출 횟수 복원');
    if (D.kind() !== D.dbg().cur().last.kind) D.bad('마지막 신호 배지 복원');
    // 7번째 원고 끝 → 조항 공개(송출했으므로 묻지 않음)
    const kinds = D.dbg().cur().kinds.slice();
    D.act('rw-next');
    await D.until(() => D.cur() === 'reveal' && D.$('.rv-art'), 4000, '조항 공개');
    if (D.$('.rw-confirm')) D.bad('송출했는데 넘김 확인');
    const r = G.save.loadChapter();
    if (!r || r.phase !== 'reveal' || r.cur !== null || r.done.length !== 7) D.bad('조항 공개 진행 장: ' + JSON.stringify(r && { phase: r.phase, n: r.done.length }));
    else if (r.done[6].result !== G.rules.scriptResult(kinds) || r.done[6].sends !== b.sends) D.bad('7번째 원고 기록: ' + JSON.stringify(r.done[6]));
    D.tapSel('[data-act="reveal-next"]', '장 결과 보기');
    await D.until(() => D.cur() === 'result' && D.$$('.rs-row').length === 7, 4000, '장 결과');
    return D.take();
  }));
  ${fin('ed')}
} finally { await closeTab(d1); }
`);

// 새로 고침 뒤에는 '마지막 송출의 모습'(cur.last — 그때 읽은 발음 · 신호 · 다른 음절 · 규칙 밖 교정 · 그때의 교정 수)을 그대로 보인다(명세 §8-3 · §8-4 · §11).
//   송출 뒤 교정을 바꾸고 다시 송출하지 않은 채 새로 고쳐도 프롬프터 · 배지 · 도움 ①은 그 송출 그대로, 규칙 밖 표시 · 감수 도장은
//   교정이 송출 때 그대로일 때만. 송출 전에 연 도움 ①('먼저 송출해 보세요' — 세지 않음)도 새로 고친 뒤 ②를 열어 둔다.
step('새로 고침 — 송출한 모습 그대로 · 연 도움 단계', `
${open('g1', 1280, 800)}
await g1.evaluate(() => { ${FLOW} });
try {
  const eg = [];
  eg.push(...await g1.evaluate(${FRESH}));
  eg.push(...await g1.evaluate(async () => {
    const G = D.G(), T = D.T(), w = D.w(), by = D.byId();
    const ids = G.rules.draw(2, w.SCRIPTS, G.rules.exampleIds(w.GUIDES[2]), 33);
    const k = ids.findIndex((id) => (by[id].steps || []).some((x) => x[1] === 'replace'));
    if (k < 0) { D.bad('점검용 원고(고침 단계 있음) 없음'); return D.take(); }
    await D.toReview(2, { seed: 33, doneCount: k, grade: 'h1' });
    // 송출 전 도움 ① → '먼저 송출해 보세요'(도움으로 세지 않음) → ②가 열림
    D.act('rw-help'); await D.until(() => D.$('.rw-help') && D.visible(D.$('.rw-help')), 2000, '도움 열림');
    D.tapSel('.rw-help-step[data-step="1"]', '도움 ①(송출 전)');
    if (!D.$('.rw-help-body').textContent.includes(T.help.needBroadcast)) D.bad('송출 전 ① 안내');
    const c = G.save.loadChapter().cur;
    if (c.help.length || c.helped || c.open !== 1) D.bad('송출 전 ① 저장(센 도움 없음 · open 1): ' + JSON.stringify({ help: c.help, helped: c.helped, open: c.open }));
    if (D.$('.rw-help-step[data-step="2"]').disabled) D.bad('송출 전 ① 뒤 ②가 잠김');
    return D.take();
  }));
  eg.push(...await g1.evaluate(async () => { await D.reload(); return D.take(); }));
  eg.push(...await g1.evaluate(${RESUME}));
  eg.push(...await g1.evaluate(async () => {
    const G = D.G(), T = D.T();
    D.act('rw-help'); await D.until(() => D.$('.rw-help') && D.visible(D.$('.rw-help')), 2000, '도움 열림(새로 고침 뒤)');
    const s2 = D.$('.rw-help-step[data-step="2"]'), s3 = D.$('.rw-help-step[data-step="3"]');
    if (!s2 || s2.disabled) D.bad('새로 고침 뒤 ②가 다시 잠김(① 연 것이 저장되지 않음)');
    if (!s3 || !s3.disabled) D.bad('새로 고침 뒤 ③이 열림');
    if (G.save.loadChapter().cur.helped) D.bad('세지 않은 ①이 도움 받음이 됨');
    D.tapSel('.rw-help-close', '도움 닫기');
    // 교정 없이 송출 → 다름. 그 뒤 교정을 하나 하고(다시 송출하지 않음) 새로 고친다
    if ((await D.send('다름')) !== 'diff') D.bad('교정 없이 송출이 다름이 아님: ' + D.kind());
    const last = G.save.loadChapter().cur.last;
    const shown = D.$('.rw-prompter').textContent.replace(/\\s+/g, '');
    if (!last || last.reading !== shown || last.n !== 0 || last.diff < 1 || !last.at.length) D.bad('송출 모습 저장: ' + JSON.stringify(last) + ' / ' + shown);
    const sc = D.dbg().script();
    const st = sc.steps.find((x) => x[1] === 'replace');
    await D.doStep(st);
    if (D.logN() !== 1) D.bad('교정 하나가 기록되지 않음');
    if (D.$('.rw-prompter').textContent.replace(/\\s+/g, '') !== shown) D.bad('교정했는데 프롬프터가 바뀜(송출 전)');
    if (G.save.loadChapter().cur.last.n !== null) D.bad('송출 뒤 교정이 바뀌었는데 n이 null이 아님');
    window.__snap = { reading: shown, at: last.at.slice(), now: G.rules.reading(D.dbg().state()) };
    if (window.__snap.now === shown) D.bad('점검 전제: 교정 뒤 읽기가 송출 때와 같음');
    return D.take();
  }));
  eg.push(...await g1.evaluate(async () => { await D.reload(); return D.take(); }));
  eg.push(...await g1.evaluate(${RESUME}));
  eg.push(...await g1.evaluate(async () => {
    const G = D.G(), T = D.T(), sn = window.__snap;
    const shown = D.$('.rw-prompter').textContent.replace(/\\s+/g, '');
    if (shown !== sn.reading) D.bad('새로 고침 뒤 프롬프터가 송출한 발음이 아님: ' + shown + ' / ' + sn.reading + ' (지금 교정대로는 ' + sn.now + ')');
    if (D.kind() !== 'diff') D.bad('새로 고침 뒤 배지: ' + D.kind());
    if (D.visible(D.$('.rw-stamp'))) D.bad('다름인데 감수 도장');
    if (D.logN() !== 1) D.bad('새로 고침 뒤 교정 수: ' + D.logN());
    // 도움 ①: 송출한 발음 위에 그때의 다른 음절 위치
    D.act('rw-help'); await D.until(() => D.$('.rw-help') && D.visible(D.$('.rw-help')), 2000, '도움 열림');
    D.tapSel('.rw-help-step[data-step="1"]', '도움 ①(새로 고침 뒤)');
    if (!D.$('.rw-help-body').textContent.includes(T.help.diffMarked)) D.bad('새로 고침 뒤 ① 표시 안내');
    const marks = D.$$('.rw-psyl.is-diff').map((n) => +n.getAttribute('data-i'));
    if (marks.join() !== sn.at.join() || !marks.length) D.bad('새로 고침 뒤 ① 위치: ' + marks.join() + ' / ' + sn.at.join());
    if (D.$('.rw-prompter').textContent.replace(/\\s+/g, '') !== sn.reading) D.bad('① 뒤 프롬프터가 바뀜');
    D.tapSel('.rw-help-close', '도움 닫기');
    // 규칙 밖: 교정을 지우고 다른 음운을 거쳐 고친 뒤 송출
    while (D.logN()) D.act('rw-undo');
    if (!(await D.offruleScript())) D.bad('규칙 밖 만들기 실패');
    if ((await D.send('규칙 밖')) !== 'offrule') D.bad('규칙 밖이 아님: ' + D.kind());
    window.__off = { n: D.$$('.rw-log-item.is-offrule').length, reading: D.$('.rw-prompter').textContent.replace(/\\s+/g, ''), log: D.logN() };
    if (!window.__off.n) D.bad('규칙 밖 표시 없음(새로 고침 전)');
    return D.take();
  }));
  eg.push(...await g1.evaluate(async () => { await D.reload(); return D.take(); }));
  eg.push(...await g1.evaluate(${RESUME}));
  eg.push(...await g1.evaluate(async () => {
    const o = window.__off;
    if (D.kind() !== 'offrule') D.bad('새로 고침 뒤 규칙 밖 배지: ' + D.kind());
    if (D.$$('.rw-log-item.is-offrule').length !== o.n || !D.visible(D.$('.rw-log-mark'))) D.bad('새로 고침 뒤 규칙 밖 표시: ' + D.$$('.rw-log-item.is-offrule').length + ' / ' + o.n);
    const redo = D.$('[data-act="rw-redo"]');
    if (!redo || !D.visible(redo) || !redo.classList.contains('is-primary')) D.bad('새로 고침 뒤 다시 감수가 앞에 오지 않음');
    // 되돌리기(다시 송출 안 함) → 표시가 지워지고, 새로 고쳐도 다시 나오지 않음
    D.act('rw-undo');
    if (D.$$('.rw-log-item.is-offrule').length) D.bad('되돌리기 뒤에도 규칙 밖 표시');
    return D.take();
  }));
  eg.push(...await g1.evaluate(async () => { await D.reload(); return D.take(); }));
  eg.push(...await g1.evaluate(${RESUME}));
  eg.push(...await g1.evaluate(async () => {
    const G = D.G(), o = window.__off;
    if (D.$$('.rw-log-item.is-offrule').length || D.visible(D.$('.rw-log-mark'))) D.bad('교정을 바꾼 뒤 새로 고쳤는데 규칙 밖 표시가 돌아옴');
    if (D.kind() !== 'offrule') D.bad('교정을 바꾼 뒤에도 배지는 남아야 함: ' + D.kind());
    if (D.$('.rw-prompter').textContent.replace(/\\s+/g, '') !== o.reading) D.bad('프롬프터가 규칙 밖 송출 발음이 아님');
    if (D.logN() !== o.log - 1) D.bad('되돌린 교정 수: ' + D.logN());
    // 온에어: 풀이대로 고쳐 송출 → 새로 고침 뒤 감수 도장. 되돌렸다 같은 교정을 다시 해도(다시 송출 안 함) 도장은 사라짐
    D.act('rw-redo');
    D.dbg().solve();
    if ((await D.send('온에어')) !== 'onair') D.bad('온에어가 아님: ' + D.kind());
    if (!D.visible(D.$('.rw-stamp'))) D.bad('온에어 도장(새로 고침 전)');
    return D.take();
  }));
  eg.push(...await g1.evaluate(async () => { await D.reload(); return D.take(); }));
  eg.push(...await g1.evaluate(${RESUME}));
  eg.push(...await g1.evaluate(async () => {
    const G = D.G();
    if (D.kind() !== 'onair' || !D.visible(D.$('.rw-stamp'))) D.bad('새로 고침 뒤 온에어 배지 · 감수 도장: ' + D.kind());
    if (D.$('.rw-prompter').textContent.replace(/\\s+/g, '') !== G.save.loadChapter().cur.last.reading) D.bad('새로 고침 뒤 온에어 프롬프터');
    D.act('rw-undo');
    D.dbg().solve();
    if (D.visible(D.$('.rw-stamp'))) D.bad('교정을 바꿨는데 도장이 남음(새로 고침 전)');
    return D.take();
  }));
  eg.push(...await g1.evaluate(async () => { await D.reload(); return D.take(); }));
  eg.push(...await g1.evaluate(${RESUME}));
  eg.push(...await g1.evaluate(async () => {
    if (D.visible(D.$('.rw-stamp'))) D.bad('송출 뒤 교정을 바꾸고 새로 고쳤는데 감수 도장이 돌아옴');
    if (D.kind() !== 'onair') D.bad('배지는 남아야 함: ' + D.kind());
    D.noBad('새로 고침 송출 모습');
    return D.take();
  }));
  ${fin('eg')}
} finally { await closeTab(g1); }
`);

// 묻기 창 · 게임 방법 창은 모달: 열린 동안 뒤 화면은 inert, Tab · Shift+Tab은 창 안에서 돌고, 닫으면 여는 단추로 초점(명세 §14).
//   감수 화면에서 연 게임 방법 창은 감수 화면을 떠나면 닫힌다.
step('모달 — 넘김 확인 · 게임 방법 · 설정(초점 가두기 · inert · 초점 돌려주기)', `
${open('h1', 1280, 800)}
try {
  const eh = [];
  eh.push(...await h1.evaluate(${FRESH}));
  eh.push(...await h1.evaluate(async () => {
    const G = D.G(), d = D.d(), w = D.w();
    const tab = (shift) => (d.activeElement || d.body).dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Tab', shiftKey: !!shift, bubbles: true, cancelable: true }));
    const esc = () => (d.activeElement || d.body).dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    // 가둔 창의 처음 · 마지막에서 Tab이 돈다(가운데에서는 브라우저에 맡김)
    const trap = (panel, tag) => {
      const list = Array.from(panel.querySelectorAll('button, [href], input, select, textarea')).filter((e) => !e.disabled && D.visible(e));
      if (list.length < 2) { D.bad(tag + ': 누를 것이 둘보다 적음'); return; }
      const first = list[0], last = list[list.length - 1];
      last.focus(); tab(false);
      if (d.activeElement !== first) D.bad(tag + ': 마지막에서 Tab → 처음이 아님(' + D.desc(d.activeElement) + ')');
      first.focus(); tab(true);
      if (d.activeElement !== last) D.bad(tag + ': 처음에서 Shift+Tab → 마지막이 아님(' + D.desc(d.activeElement) + ')');
      d.body.focus(); d.activeElement.blur && d.activeElement.blur(); tab(false);
      if (!panel.contains(d.activeElement)) D.bad(tag + ': 창 밖에서 Tab → 창 안으로 오지 않음');
    };
    await D.toReview(2, { seed: 5, grade: 'h1' });
    // 넘김 확인(송출 전 [다음 원고])
    const nx = D.$('[data-act="rw-next"]');
    nx.focus();
    D.act('rw-next');
    await D.until(() => D.$('.rw-confirm'), 2000, '넘김 확인');
    if (!D.$('.rw').hasAttribute('inert')) D.bad('넘김 확인: 뒤 화면(.rw)이 inert가 아님');
    if (!D.$('.rw-confirm').contains(d.activeElement)) D.bad('넘김 확인: 초점이 창 안이 아님');
    trap(D.$('.rw-confirm'), '넘김 확인');
    D.act('rw-skip-no');
    await D.until(() => !D.$('.rw-confirm'), 2000, '넘김 확인 닫힘');
    if (d.querySelector('[inert]')) D.bad('넘김 확인을 닫았는데 inert가 남음');
    if (d.activeElement !== D.$('[data-act="rw-next"]')) D.bad('넘김 확인을 닫은 뒤 초점이 [다음 원고]로 돌아오지 않음(' + D.desc(d.activeElement) + ')');
    // 게임 방법(감수 화면에서)
    const hb = D.$('.rw-howto');
    hb.focus();
    D.tap(hb, '게임 방법');
    await D.until(() => D.$('.howto'), 2000, '게임 방법 창');
    if (!d.getElementById('app').hasAttribute('inert')) D.bad('게임 방법: 뒤 화면(#app)이 inert가 아님');
    trap(D.$('.howto-panel'), '게임 방법');
    esc();
    await D.until(() => !D.$('.howto'), 2000, '게임 방법 닫힘(Esc)');
    if (d.querySelector('[inert]')) D.bad('게임 방법을 닫았는데 inert가 남음');
    if (d.activeElement !== D.$('.rw-howto')) D.bad('게임 방법을 닫은 뒤 초점이 여는 단추로 돌아오지 않음');
    // 게임 방법을 연 채 감수 화면을 떠나면 창이 닫힌다
    D.tap(D.$('.rw-howto'), '게임 방법(다시)');
    await D.until(() => D.$('.howto'), 2000, '게임 방법 창(다시)');
    G.app.go('start');
    await D.until(() => D.cur() === 'start' && D.$('.st-ch'), 3000, '시작 화면');
    if (D.$('.howto') || G.howto.current()) D.bad('감수 화면을 떠났는데 게임 방법 창이 남음');
    if (d.querySelector('[inert]')) D.bad('감수 화면을 떠난 뒤 inert가 남음');
    esc(); tab(false);
    // 설정 창(시작 화면)
    const sb = D.$('[data-act="settings"]');
    sb.focus();
    D.tap(sb, '설정');
    await D.until(() => D.$('.set-overlay'), 2000, '설정 창');
    if (!D.$('.st').hasAttribute('inert')) D.bad('설정: 뒤 화면(.st)이 inert가 아님');
    trap(D.$('.set-panel'), '설정');
    D.tapSel('[data-act="settings-close"]', '설정 닫기');
    if (d.querySelector('[inert]')) D.bad('설정을 닫았는데 inert가 남음');
    if (d.activeElement !== D.$('[data-act="settings"]')) D.bad('설정을 닫은 뒤 초점이 여는 단추로 돌아오지 않음');
    // 덮어쓰기 확인(진행 장이 있음)
    const bg = D.$('[data-act="begin"]');
    bg.focus();
    D.tap(bg, '감수 시작');
    await D.until(() => D.$('.st-confirm'), 2000, '덮어쓰기 확인');
    if (!D.$('.st').hasAttribute('inert')) D.bad('덮어쓰기 확인: 뒤 화면이 inert가 아님');
    trap(D.$('.st-confirm'), '덮어쓰기 확인');
    D.tapSel('[data-act="overwrite-no"]', '그만두기');
    if (d.querySelector('[inert]')) D.bad('덮어쓰기 확인을 닫았는데 inert가 남음');
    if (d.activeElement !== D.$('[data-act="begin"]')) D.bad('덮어쓰기 확인을 닫은 뒤 초점이 [감수 시작]으로 돌아오지 않음');
    return D.take();
  }));
  ${fin('eh')}
} finally { await closeTab(h1); }
`);

step('심화 단계 경계 없음 · 닮은 칸은 기본 단계만', `
${open('e1', 1280, 800)}
try {
  const ee = [];
  ee.push(...await e1.evaluate(${FRESH}));
  ee.push(...await e1.evaluate(async () => {
    const G = D.G(), T = D.T();
    const cutWords = [];
    ['m3', 'h1'].forEach((g) => ['formal', 'content', 'sino'].forEach((c) => cutWords.push(T.terms[g].cut[c])));
    cutWords.push(T.review.aria.cut.m3.split(':')[0], T.review.aria.cut.h1.split(':')[0]);
    const noCuts = (tag) => {
      const html = D.d().body.innerHTML;
      if (D.$('.bk-plus, .bk-cut, [data-cut]')) D.bad(tag + ': 심화인데 경계 요소');
      cutWords.forEach((x) => { if (html.indexOf(x) >= 0) D.bad(tag + ': 심화인데 경계 이름 ' + x); });
      if (/cut-(formal|content|sino)/.test(html)) D.bad(tag + ': 심화인데 경계 종류 클래스');
    };
    await D.toReview(2, { level: 'advanced', grade: 'h1', seed: 8 });
    if (!D.$('.rw-head').textContent.includes(G.text.t('levels.tag', { level: G.text.levelName('advanced') }))) D.bad('심화 단계 표시');
    noCuts('심화 처음');
    await D.load('의견란'); noCuts('심화 의견란');
    await D.load('먹는');
    D.mark('replace'); D.slot('0.co'); await D.until(() => D.sheet() && D.$('.rw-sheet .ch-cell'), 2000, '도표');
    if (D.$('.rw-sheet .ch-cell.is-like')) D.bad('심화인데 닮은 칸');
    noCuts('심화 도표');
    D.tapSel('.rw-sheet .ch-close', '도표 닫기');
    if (D.sheet()) D.bad('도표가 닫히지 않음');
    return D.take();
  }));
  ee.push(...await e1.evaluate(async () => {
    const G = D.G();
    await D.toReview(2, { level: 'basic', grade: 'h1', seed: 8 });
    await D.load('의견란');
    if (!D.$('.rw-blocks .bk-gap[data-cut="sino"]')) D.bad('기본 단계 의견란에 한자어 경계 없음');
    await D.load('먹는');
    D.mark('replace'); D.slot('0.co'); await D.until(() => D.sheet() && D.$('.rw-sheet .ch-cell'), 2000, '도표');
    const like = D.$$('.rw-sheet .ch-cell.is-like').map((c) => c.getAttribute('data-id'));
    if (like.join() !== 'ㅇ') D.bad('먹는 /ㄱ/ 닮은 칸: ' + like.join());
    D.tapSel('.rw-sheet .ch-close', '도표 닫기');
    await D.load('감기');
    D.mark('replace'); D.slot('0.co'); await D.until(() => D.sheet() && D.$('.rw-sheet .ch-cell'), 2000, '도표');
    if (D.$('.rw-sheet .ch-cell.is-like')) D.bad('감기 /ㅁ/에 닮은 칸');
    D.tapSel('.rw-sheet .ch-close', '도표 닫기');
    await D.load('막론');
    D.mark('replace'); D.slot('0.co'); await D.until(() => D.sheet() && D.$('.rw-sheet .ch-cell'), 2000, '도표');
    if (D.$('.rw-sheet .ch-cell.is-like')) D.bad('막론 /ㄱ/ 먼저에 닮은 칸');
    D.slot('1.on'); await D.until(() => D.$('.rw-sheet .ch-cell.is-like'), 2000, '막론 /ㄹ/ 닮은 칸');
    const l2 = D.$$('.rw-sheet .ch-cell.is-like').map((c) => c.getAttribute('data-id'));
    if (l2.join() !== 'ㄴ') D.bad('막론 /ㄹ/ 닮은 칸: ' + l2.join());
    // 중성을 누르면 모음표
    D.slot('0.nu'); await D.until(() => D.$('.rw-sheet .ch-part[data-part="vowel"]'), 2000, '모음표');
    if (D.$('.rw-sheet .ch-part[data-part="consonant"]')) D.bad('중성인데 자음표');
    D.tapSel('.rw-sheet .ch-close', '도표 닫기');
    return D.take();
  }));
  ${fin('ee')}
} finally { await closeTab(e1); }
`);

const SIZES = [[1280, 800], [1366, 768], [1920, 1080], [390, 844], [360, 740]];
SIZES.forEach(([W, H], k) => {
  const phone = W < 768;
  const min = phone ? 48 : 64;
  const v = 'f' + k;
  step(`감수 화면 크기 ${W}×${H} — 가로 스크롤 없음 · 누르는 자리 ${min}px${phone ? ' · 두 줄 나누기' : ''}`, `
${open(v, W, H)}
try {
  const r${v} = [];
  r${v}.push(...await ${v}.evaluate(${FRESH}));
  r${v}.push(...await ${v}.evaluate(async () => {
    const tag = '${W}×${H}', MIN = ${min}, PHONE = ${phone};
    const G = D.G();
    await D.toReview(2, { seed: 12, grade: 'h1' });
    D.targets(MIN, tag + ' 처음'); D.noScroll(tag + ' 처음'); D.noBad(tag);
    // 그림 자리(빈 틀 — 명세 §14): 감수실 · 아나운서. 글 없이 aria-label만, 휴대폰 세로에서는 숨김
    ['room', 'announcer'].forEach((k) => {
      const n = D.$('.rw-art-' + k);
      if (!n) { D.bad(tag + ': 그림 자리 없음 ' + k); return; }
      if (n.getAttribute('role') !== 'img' || n.getAttribute('aria-label') !== D.T().images[k] || n.textContent.trim()) D.bad(tag + ': 그림 자리 이름 · 글 ' + k);
      if (PHONE ? D.visible(n) : !D.visible(n)) D.bad(tag + ': 그림 자리 ' + k + (PHONE ? '가 휴대폰 세로에서 보임' : '가 안 보임'));
    });
    if (!PHONE) {
      const pr = D.box(D.$('.rw-prompter')), an = D.box(D.$('.rw-art-announcer'));
      if (pr.width < an.width * 2) D.bad(tag + ': 아나운서 그림 자리가 프롬프터 자리를 빼앗음 ' + Math.round(pr.width) + ' / ' + Math.round(an.width));
    }
    await D.load('맏며느리');
    const bk = D.$('.rw-blocks .bk');
    await D.wait(150);
    if (PHONE) {
      if (!bk.classList.contains('is-split') || D.$$('.rw-blocks .bk-line').length !== 2) D.bad(tag + ': 4음절 원고가 두 줄로 나뉘지 않음');
      const br = D.$('.rw-blocks .bk-gap.is-break');
      if (!br || !D.visible(br)) D.bad(tag + ': 줄 바뀌는 틈을 누를 수 없음');
    } else if (bk.classList.contains('is-split')) D.bad(tag + ': 가로 화면인데 두 줄');
    D.targets(MIN, tag + ' 4음절'); D.noScroll(tag + ' 4음절');
    // 고침표 도표
    D.mark('replace'); D.slot('0.co'); await D.until(() => D.sheet() && D.$('.rw-sheet .ch-cell'), 2000, tag + ' 도표');
    D.targets(MIN, tag + ' 도표'); D.noScroll(tag + ' 도표');
    D.cell('ㄴ');
    // 넣을 음운 고르기
    D.mark('insert'); D.gap(1); await D.until(() => D.sheet() && D.$('.rw-ins'), 2000, tag + ' 넣을 음운');
    D.targets(MIN, tag + ' 넣을 음운'); D.noScroll(tag + ' 넣을 음운');
    // '넣을 음운을 골라 주세요'는 한 줄 자리에 한 번만 보인다(고르기 묶음의 제목은 읽기 이름으로만)
    const ask = D.T().review.prompt.insertPick;
    const seen = D.$$('.rw *').filter((e) => !e.children.length && e.textContent.trim() === ask && D.visible(e) && !e.closest('.sr-only'));
    if (seen.length !== 1 || !seen[0].closest('.rw-say')) D.bad(tag + ': 넣을 음운 안내가 ' + seen.length + '번 보임');
    const pickBox = D.$('.rw-ins-pick'), lab = pickBox && D.d().getElementById(pickBox.getAttribute('aria-labelledby') || '');
    if (!lab || lab.textContent.trim() !== ask) D.bad(tag + ': 넣을 음운 고르기 묶음의 읽기 이름');
    D.tapSel('.rw-sheet .rw-sheet-close', tag + ' 넣을 음운 닫기');
    // 송출 · 도움
    await D.send(tag);
    D.act('rw-help'); await D.until(() => D.$('.rw-help') && D.visible(D.$('.rw-help')), 2000, tag + ' 도움');
    ['1', '2', '3'].forEach((n) => D.tapSel('.rw-help-step[data-step="' + n + '"]', tag + ' 도움 ' + n));
    D.targets(MIN, tag + ' 도움'); D.noScroll(tag + ' 도움');
    // 넘김 확인 창(새 원고)
    D.act('rw-next');
    await D.until(() => D.dbg().script().id !== '맏며느리', 3000, tag + ' 연습 원고에서 나옴');
    D.act('rw-next');
    await D.until(() => D.$('.rw-confirm'), 2000, tag + ' 넘김 확인');
    D.targets(MIN, tag + ' 넘김 확인'); D.noScroll(tag + ' 넘김 확인');
    D.act('rw-skip-no');
    D.noBad(tag + ' 끝');
    return D.take();
  }));
  ${fin('r' + v)}
} finally { await closeTab(${v}); }
`);
});
