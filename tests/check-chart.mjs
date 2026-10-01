// 조음 도표 부품 G.chart 점검(aside) — 명세 §8-2 · §14 · §18 · §19, 계획 T8.
//   점검 전용 페이지 tests/pages/chart.html(부품만 불러 띄움)을 크기별 틀(tests/pages/frame.html)에 띄운다.
//   1) 자음표는 SOUNDS 자질로 그린 체계표: 자음 19개가 모두 자기 자리(방법 줄 × 위치 열)에, 한 칸 안은 세기 차례,
//      국어에 없는 칸은 비어 있음. 모음표(높이 × 앞뒤·입술) 10개, 반모음 줄 /j/ · /w/. 머리글은 학년별 짧은 이름.
//   2) 지금 음운 칸은 누를 수 없음. 닮은 칸 표시는 넘겨 준 칸에만(도표는 판단하지 않음 — chart.js가 G.rules를 부르지 않음).
//   3) 칸을 누르면 그 음운 id를 알린다. 닫기 단추.
//   4) 다섯 크기에서 누르는 자리(가로 64px, 휴대폰 세로 48px) · 가로 스크롤 없음.
//   모든 단계에서 페이지 오류(window.__gamsuErrors)가 없어야 한다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { step, frame } from './aside.mjs';
import { DRIVER } from './lib/drive.mjs';

const J = JSON.stringify;
const PAGE = 'tests/pages/chart.html';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// 도표는 판단하지 않는다: 규칙 엔진을 부르지 않는다(닮은 칸은 감수 화면이 G.rules.similarCell로 정해 넘김)
{
  const f = path.join(ROOT, 'js/game/chart.js');
  const src = fs.existsSync(f) ? fs.readFileSync(f, 'utf8').replace(/^\s*\/\/.*$/gm, '') : '';
  const ok = src && !/G\.rules|G\.blocks/.test(src);
  console.log(`${ok ? 'ok  ' : 'FAIL'} chart.js가 규칙 엔진 · 블록 부품을 부르지 않음`);
  if (!ok) process.exitCode = 1;
}

const HELPER = String.raw`
if (!window.K) {
  const K = (window.K = {});
  K.picks = []; K.closed = 0; K.c = null;
  K.mk = (o) => {
    const G = D.G();
    if (K.c) K.c.destroy();
    K.picks = []; K.closed = 0;
    K.c = G.chart.create(D.$('#host'), Object.assign({ onPick: (p) => K.picks.push(p), onClose: () => { K.closed++; } }, o || {}));
    return K.c;
  };
  K.ids = (sel) => D.$$(sel || '.ch-cell', K.c.el).map((e) => e.getAttribute('data-id'));
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

step('체계표 — SOUNDS 자질로 그린 자음표 · 모음표 · 반모음 줄', `
${open('a1', 1280, 800)}
try {
  const ea = [];
  ea.push(...await a1.evaluate(async () => {
    const G = D.G(), w = D.w(), S = w.SOUNDS, T = D.T();
    if (!G || !G.chart || typeof G.chart.create !== 'function') { D.bad('G.chart.create 없음'); return D.take(); }
    const RANK = { plain: 0, tense: 1, aspirated: 2, none: 0 };
    for (const grade of ['m3', 'h1']) {
      K.mk({ grade });
      // 자음표
      K.c.show({ parts: ['consonant'] });
      const root = K.c.el;
      if (root.hidden || !D.visible(root)) D.bad(grade + ': show 뒤 안 보임');
      if (D.$('.ch-part[data-part="vowel"]', root) || D.$('.ch-part[data-part="glide"]', root)) D.bad(grade + ': 자음표만 달라 했는데 다른 표가 있음');
      const cons = D.$$('.ch-cell', root);
      if (cons.length !== S.consonants.length || cons.length !== 19) D.bad(grade + ': 자음 칸 ' + cons.length);
      const want = S.consonants.map((c) => c.id).sort().join();
      if (K.ids().sort().join() !== want) D.bad(grade + ': 자음 목록이 SOUNDS와 다름');
      S.consonants.forEach((c) => {
        const b = D.$('.ch-cell[data-id="' + c.id + '"]', root);
        if (!b) return;
        if (b.textContent.trim() !== '/' + c.id + '/') D.bad(grade + ': 칸 글 ' + b.textContent);
        if (b.getAttribute('aria-label') !== G.text.t('review.aria.cell', { phoneme: '/' + c.id + '/' })) D.bad(grade + ': 칸 aria ' + b.getAttribute('aria-label'));
        const td = b.closest('td');
        if (!td || td.getAttribute('data-row') !== c.manner || td.getAttribute('data-col') !== c.place) D.bad(grade + ': ' + c.id + ' 자리 ' + (td && td.getAttribute('data-row') + '×' + td.getAttribute('data-col')));
        if (b.disabled) D.bad(grade + ': ' + c.id + '가 꺼져 있음');
      });
      // 한 칸 안은 세기 차례(예사 → 된 → 거센)
      D.$$('td.ch-td', root).forEach((td) => {
        const ranks = D.$$('.ch-cell', td).map((b) => RANK[S.consonants.find((c) => c.id === b.getAttribute('data-id')).strength]);
        if (ranks.join() !== ranks.slice().sort().join()) D.bad(grade + ': 세기 차례 ' + td.textContent);
      });
      // 줄 · 열 = 방법 5 × 위치 5, 머리글은 학년별 짧은 이름
      const ths = D.$$('thead th[data-col]', root).map((t) => t.getAttribute('data-col'));
      if (ths.join() !== S.places.join()) D.bad(grade + ': 열 차례 ' + ths.join());
      S.places.forEach((p) => { const t = D.$('thead th[data-col="' + p + '"]', root); if (!t || t.textContent.trim() !== G.text.short(grade, 'place', p)) D.bad(grade + ': 열 이름 ' + p + ' ' + (t && t.textContent)); });
      const rhs = D.$$('tbody th[data-row]', root).map((t) => t.getAttribute('data-row'));
      if (rhs.join() !== S.manners.join()) D.bad(grade + ': 줄 차례 ' + rhs.join());
      S.manners.forEach((m) => { const t = D.$('tbody th[data-row="' + m + '"]', root); if (!t || t.textContent.trim() !== G.text.short(grade, 'manner', m)) D.bad(grade + ': 줄 이름 ' + m); });
      const tds = D.$$('td[data-row]', root);
      if (tds.length !== 25) D.bad(grade + ': 자음표 칸 수 ' + tds.length);
      const used = new Set(S.consonants.map((c) => c.manner + '×' + c.place));
      tds.forEach((td) => {
        const k = td.getAttribute('data-row') + '×' + td.getAttribute('data-col');
        const empty = td.classList.contains('ch-empty');
        if (empty === used.has(k)) D.bad(grade + ': 빈칸 표시 ' + k);
        if (empty && (D.$('button', td) || td.getAttribute('aria-label') !== T.review.chart.empty)) D.bad(grade + ': 국어에 없는 칸 ' + k);
      });
      const cap = D.$('.ch-part[data-part="consonant"] .ch-title', root);
      if (!cap || cap.textContent.trim() !== G.text.t('review.chart.consonant', null, grade)) D.bad(grade + ': 자음표 제목 ' + (cap && cap.textContent));
      // 모음표
      K.c.show({ parts: ['vowel'] });
      if (D.$('.ch-part[data-part="consonant"]', root)) D.bad(grade + ': 모음표만인데 자음표가 남음');
      if (K.ids().sort().join() !== S.vowels.map((v) => v.id).sort().join()) D.bad(grade + ': 모음 목록 ' + K.ids().join());
      S.vowels.forEach((v) => {
        const td = D.$('.ch-cell[data-id="' + v.id + '"]', root).closest('td');
        if (td.getAttribute('data-row') !== v.height || td.getAttribute('data-col') !== v.column) D.bad(grade + ': ' + v.id + ' 모음 자리');
      });
      const vcols = D.$$('thead th[data-col]', root);
      if (vcols.map((t) => t.getAttribute('data-col')).join() !== S.columns.join()) D.bad(grade + ': 모음 열');
      vcols.forEach((t) => { if (t.textContent.trim() !== G.text.short(grade, 'column', t.getAttribute('data-col'))) D.bad(grade + ': 모음 열 이름'); });
      D.$$('tbody th[data-row]', root).forEach((t) => { if (t.textContent.trim() !== G.text.short(grade, 'height', t.getAttribute('data-row'))) D.bad(grade + ': 모음 줄 이름'); });
      if (D.$$('td.ch-empty', root).length !== 2) D.bad(grade + ': 모음표 빈칸 ' + D.$$('td.ch-empty', root).length);
      const vcap = D.$('.ch-part[data-part="vowel"] .ch-title', root);
      if (!vcap || vcap.textContent.trim() !== G.text.t('review.chart.vowel', null, grade)) D.bad(grade + ': 모음표 제목');
      // 반모음 줄
      K.c.show({ parts: ['glide'] });
      if (K.ids().join() !== 'j,w') D.bad(grade + ': 반모음 줄 ' + K.ids().join());
      const gcap = D.$('.ch-part[data-part="glide"] .ch-title', root);
      if (!gcap || gcap.textContent.trim() !== T.review.chart.glide) D.bad(grade + ': 반모음 줄 제목');
      // 여러 표 함께(합침표 등)
      K.c.show({ parts: ['consonant', 'vowel', 'glide'] });
      if (K.ids().length !== 31) D.bad(grade + ': 세 표 함께 칸 수 ' + K.ids().length);
      // 화면 글에 빗금 없는 자모가 없다
      const bare = root.textContent.replace(/\\/[^/\\s]{1,2}\\//g, '');
      if (/[\\u3131-\\u318E]/.test(bare)) D.bad(grade + ': 빗금 없는 자모 ' + bare.replace(/\\s+/g, ' ').slice(0, 60));
      if (/\\uAE00\\uC790/.test(root.textContent)) D.bad('금지 낱말');
    }
    return D.take();
  }));
  ${fin('ea')}
} finally { await closeTab(a1); }
`);

step('지금 칸 · 닮은 칸(넘긴 칸만) · 누르면 음운 id · 닫기', `
${open('b1', 1280, 800)}
try {
  const eb = [];
  eb.push(...await b1.evaluate(async () => {
    const G = D.G(), T = D.T();
    K.mk({ grade: 'm3' });
    const root = K.c.el;
    // 지금 음운: 누를 수 없음
    K.c.show({ parts: ['consonant'], current: 'ㄱ' });
    const g = D.$('.ch-cell[data-id="ㄱ"]', root);
    if (!g.disabled || !g.classList.contains('is-current')) D.bad('지금 칸이 꺼지지 않음');
    if (g.getAttribute('aria-label') !== G.text.t('review.aria.cellCurrent', { phoneme: '/ㄱ/' })) D.bad('지금 칸 aria ' + g.getAttribute('aria-label'));
    if (D.$$('.ch-cell:disabled', root).length !== 1) D.bad('꺼진 칸이 하나가 아님');
    g.click();
    if (K.picks.length) D.bad('지금 칸을 누르니 알림이 옴');
    // 닮은 칸: 넘긴 칸에만
    if (D.$$('.is-like', root).length) D.bad('넘기지 않았는데 닮은 칸');
    K.c.show({ parts: ['consonant'], current: 'ㄹ', like: ['ㄴ'] });
    const likes = D.$$('.is-like', root).map((e) => e.getAttribute('data-id'));
    if (likes.join() !== 'ㄴ') D.bad('닮은 칸 ' + likes.join());
    const n = D.$('.ch-cell[data-id="ㄴ"]', root);
    if (n.getAttribute('aria-label') !== G.text.t('review.aria.cellLike', { phoneme: '/ㄴ/' })) D.bad('닮은 칸 aria ' + n.getAttribute('aria-label'));
    if (n.disabled) D.bad('닮은 칸이 꺼짐');
    K.c.setLike(['ㅁ', 'ㅇ']);
    if (D.$$('.is-like', root).map((e) => e.getAttribute('data-id')).sort().join() !== 'ㅁ,ㅇ') D.bad('setLike 뒤 닮은 칸');
    if (n.getAttribute('aria-label') !== G.text.t('review.aria.cell', { phoneme: '/ㄴ/' })) D.bad('닮은 칸에서 빠진 칸 aria');
    K.c.setLike(null);
    if (D.$$('.is-like', root).length) D.bad('setLike(null) 뒤에도 닮은 칸');
    K.c.show({ parts: ['vowel'], like: ['ㄴ', 'j'] }); // 보이지 않는 표의 칸은 아무것도 안 함
    if (D.$$('.is-like', root).length) D.bad('없는 칸을 닮은 칸으로');
    K.c.show({ parts: ['consonant'], current: 'ㅢ' }); // 표에 없는 지금 음운(ㅢ)도 깨지지 않음
    if (D.$$('.ch-cell:disabled', root).length) D.bad('표에 없는 지금 음운');
    // 누르면 음운 id
    K.c.show({ parts: ['consonant', 'vowel', 'glide'], current: null, like: [] });
    K.picks = [];
    const cells = D.$$('.ch-cell', root);
    cells.forEach((e) => e.click());
    if (K.picks.length !== cells.length) D.bad('알림 수 ' + K.picks.length);
    K.picks.forEach((p, i) => {
      const e = cells[i];
      if (!p || p.id !== e.getAttribute('data-id') || p.part !== e.closest('.ch-part').getAttribute('data-part') || p.el !== e) D.bad('알림 ' + JSON.stringify(p && { id: p.id, part: p.part }));
    });
    // 닫기
    const close = D.$('.ch-close', root);
    if (!close || !close.textContent.includes(T.review.chart.close)) D.bad('닫기 단추');
    else { close.click(); if (K.closed !== 1) D.bad('닫기 알림'); }
    K.c.hide();
    if (D.visible(root)) D.bad('hide 뒤에도 보임');
    K.c.show({ parts: ['glide'] });
    if (!D.visible(root)) D.bad('다시 show');
    // 닫기 알림을 받지 않으면 닫기 단추도 없다
    K.c.destroy(); K.c = null;
    const c2 = G.chart.create(D.$('#host'), { grade: 'h1', onPick: () => {} });
    c2.show({ parts: ['glide'] });
    if (D.$('.ch-close', c2.el)) D.bad('onClose 없는데 닫기 단추');
    c2.destroy();
    if (D.$('#host').children.length) D.bad('destroy 뒤에 남음');
    return D.take();
  }));
  ${fin('eb')}
} finally { await closeTab(b1); }
`);

const SIZES = [[1280, 800, 64], [1366, 768, 64], [1920, 1080, 64], [360, 740, 48], [390, 844, 48]];
for (const [W, H, MIN] of SIZES) {
  step(`다섯 크기 ${W}×${H} — 누르는 자리 ${MIN}px · 가로 스크롤`, `
${open('c1', W, H)}
try {
  const ec = [];
  ec.push(...await c1.evaluate(async () => {
    const MIN = ${MIN}, TAG = '${W}×${H}';
    for (const grade of ['m3', 'h1']) {
      K.mk({ grade });
      for (const parts of [['consonant'], ['vowel'], ['glide'], ['consonant', 'vowel', 'glide']]) {
        K.c.show({ parts, current: parts[0] === 'vowel' ? 'ㅏ' : parts[0] === 'glide' ? 'j' : 'ㄷ', like: ['ㄴ', 'ㅓ', 'w'] });
        await D.wait(30);
        const tag = TAG + ' ' + grade + ' ' + parts.join('+');
        D.targets(MIN, tag);
        D.noScroll(tag);
        const host = D.$('#host').getBoundingClientRect();
        D.$$('.ch-part, .ch-cell, th', K.c.el).forEach((e) => {
          const r = e.getBoundingClientRect();
          if (r.left < host.left - 1 || r.right > host.right + 1) D.bad(tag + ': 상자 밖 ' + D.desc(e));
        });
        // 실제로 눌러 보기(가운데 좌표에 다른 것이 없는지)
        K.picks = [];
        const live = D.$$('.ch-cell:not(:disabled)', K.c.el);
        const some = [live[0], live[Math.floor(live.length / 2)], live[live.length - 1]];
        some.forEach((e) => D.tap(e, tag + ' ' + e.getAttribute('data-id')));
        if (K.picks.map((p) => p.id).join() !== some.map((e) => e.getAttribute('data-id')).join()) D.bad(tag + ': 눌러 본 알림');
      }
    }
    return D.take();
  }));
  ${fin('ec')}
} finally { await closeTab(c1); }
`);
}
