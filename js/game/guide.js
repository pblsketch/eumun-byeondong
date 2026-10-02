'use strict';
// ───────────────────────────────────────────────────────────────
// 감수 지침 화면 G.screens.guide — 예시 원고를 보고 지침의 빈칸을 골라 한 번에 확인한다(명세 §7 · §4 · §11)
// ───────────────────────────────────────────────────────────────
//   불러오는 순서: util → data(scripts · guides · text) → core(rules · audio · save) → game(이 파일 · app.js) → main.
//   모양: css/guide.css   점검: tests/check-guide.mjs
//   새로 만든 화면이다(음운 해전에는 같은 화면이 없음). 화면 등록 방식은 js/game/app.js 머리 주석.
//
// ── 들어오는 값 ─────────────────────────────────────────────────────────
//   G.app.go('guide', { run })   run = 진행 장(js/core/save.js 머리 주석의 ChapterRun, 지침 단계).
//   값이 없으면 G.save.loadChapter()로 읽는다. 진행 장이 없으면 시작 화면으로 간다.
//
// ── 화면 ────────────────────────────────────────────────────────────────
//   [장 · 단계 | 감수 지침 | 선배 감수관이 남긴 지침]  [안내 한 줄]
//   지침 카드(그 장 GUIDES 차례대로, 한 화면에 모두):
//     지침 문장(학년 문장 — {빈칸} 자리에 빈칸 번호 ①② … 와 고른 보기)
//     빈칸마다 보기 단추 2~4개(빗금 표기, 누른 보기만 aria-pressed="true")
//     예시 원고(지침 데이터에 고정된 3~4개): 표기 → [표준 발음](G.text.pron)
//   [한 줄 안내(role=status)] [확인] → 다 맞으면 [원고 감수 시작]
//   빈칸 번호는 화면 전체에서 1부터 차례대로 센다(지침마다 b1이 있어도 겹치지 않게).
//
// ── 지킬 것 ─────────────────────────────────────────────────────────────
//   채점은 G.rules.gradeGuides(지침들, 고른 값) — 여기서 다시 세지 않는다(명세 §3-1).
//   지침 빈칸의 정답은 DOM · aria 어디에도 두지 않는다(명세 §3-5): 보기 단추는 차례 번호(data-i)만 갖고,
//     정답 보기와 다른 보기는 모양이 똑같다. 틀리면 틀린 칸의 '수'만 알린다 — 어느 칸인지, 정답이 무엇인지는 알리지 않는다.
//   다 맞을 때까지 다시 고른다. 몇 번 틀렸는지는 세지도 저장하지도 않는다(명세 §7-4).
//   예시 원고의 표준 발음은 지침 데이터에 고정된 예시만 보인다(뽑힌 감수 원고는 예시에서 빠진다 — G.rules.exampleIds).
//   다 맞으면: guideDone · 감수 단계로 저장(지침 완료 = 저장 시점, 명세 §11) → [원고 감수 시작]을 누르면 감수 화면.
//   소리: 배경 음악 'review'(감수 — 지침 · 감수 화면), 효과음 guideOk(다 맞음) · guideWrong(틀림)(명세 §15).
//   문구는 모두 TEXT.guide · TEXT.common.chapterLevel(js/data/text.js), 지침 문장 · 보기는 GUIDES(js/data/guides.js).
(function () {
  const U = G.util, el = U.el;
  const T = () => window.TEXT;

  const sound = U.sound, fillNodes = U.fillNodes;
  const keepPh = (s) => U.keepPh(s, 'gd-ph'); // 음운 표기(/ㄱ/)를 줄에서 끊지 않는 덩어리로

  const SCREEN = {
    mount(root, value) {
      const run = (value && value.run) || G.save.loadChapter();
      if (!run) { G.app.go('start'); return null; }
      const guides = (window.GUIDES && window.GUIDES[run.ch]) || [];
      const grade = run.grade === 'h1' ? 'h1' : 'm3';
      const TG = T().guide;
      sound(() => G.audio.play('review'));

      const byId = {};
      (window.SCRIPTS || []).forEach((s) => { byId[s.id] = s; });

      const picks = {};        // { 지침 id: { 빈칸 id: 보기 번호 } } — G.rules.gradeGuides의 고른 값
      const blanks = [];       // [{ g, b, slot, val, opts }] 화면 차례
      let done = false;

      // ── 지침 카드 ──
      const cards = guides.map((g, gi) => {
        picks[g.id] = {};
        const text = (g.text && g.text[grade]) || '';
        const mine = {}; // 빈칸 id → 빈칸 정보
        const slotNodes = {};
        // 빈칸 번호는 문장에 나오는 차례대로(문장에 없는 빈칸은 뒤에)
        const keys = Object.keys(g.blanks || {});
        const inText = (text.match(/\{(\w+)\}/g) || []).map((x) => x.slice(1, -1)).filter((b, i, a) => keys.indexOf(b) >= 0 && a.indexOf(b) === i);
        inText.concat(keys.filter((b) => inText.indexOf(b) < 0)).forEach((b) => {
          const n = blanks.length + 1;
          const val = el('span', { class: 'gd-slot-val' }, el('span', { class: 'sr-only' }, TG.choose));
          const slot = el('span', { class: 'gd-slot', 'data-blank': b, 'data-n': String(n) }, [
            el('span', { class: 'gd-slot-no', 'aria-hidden': 'true' }, G.text.circled(n)),
            val,
          ]);
          const info = { g, b, n, slot, val, opts: [] };
          mine[b] = info;
          slotNodes[b] = slot;
          blanks.push(info);
        });
        const sentence = el('p', { class: 'gd-text' }, fillNodes(text, slotNodes).map((x) => (typeof x === 'string' ? keepPh(x) : x)));
        // 빈칸마다 보기 단추(문장 속 빈칸 차례대로)
        const order = Object.keys(slotNodes).sort((x, y) => mine[x].n - mine[y].n);
        const pickers = order.map((b) => {
          const info = mine[b];
          const opts = (g.blanks[b].options || []).map((o, i) => el('button', {
            type: 'button', class: 'gd-opt', 'data-i': String(i), 'aria-pressed': 'false',
            onclick: () => pick(info, i),
          }, o));
          info.opts = opts;
          return el('div', { class: 'gd-blank', role: 'group', 'data-blank': b, 'aria-label': G.text.fill(TG.blankAria, { n: info.n }) }, [
            el('span', { class: 'gd-blank-no', 'aria-hidden': 'true' }, G.text.circled(info.n)),
            el('div', { class: 'gd-opts' }, opts),
          ]);
        });
        // 예시 원고: 표기 → [표준 발음]
        const exRows = (g.examples || []).map((ex) => {
          const s = byId[ex.id];
          if (!s) return null;
          return el('li', { class: 'gd-ex-row' }, fillNodes(TG.exampleRow, {
            text: el('span', { class: 'gd-ex-text' }, s.text),
            pron: el('span', { class: 'gd-ex-pron' }, G.text.pron(s.pron)),
          }));
        });
        return el('section', { class: 'gd-card', 'data-guide': g.id }, [
          el('div', { class: 'gd-card-main' }, [
            el('span', { class: 'gd-card-num', 'aria-hidden': 'true' }, String(gi + 1)),
            el('div', { class: 'gd-card-body' }, [sentence, el('div', { class: 'gd-blanks' }, pickers)]),
          ]),
          el('div', { class: 'gd-ex' }, [
            el('h3', { class: 'gd-ex-h' }, [U.glyph('script', 'glyph gd-ex-ico'), TG.examples]),
            el('ul', { class: 'gd-ex-list' }, exRows),
          ]),
        ]);
      });

      // ── 한 줄 안내 · 확인 ──
      const msg = el('p', { class: 'gd-msg', role: 'status', 'aria-live': 'polite' });
      const checkBtn = el('button', {
        type: 'button', class: 'app-btn is-primary is-big gd-check', 'data-act': 'guide-check', onclick: () => check(),
      }, [U.glyph('check', 'glyph gd-check-ico'), el('span', null, TG.check)]);
      const foot = el('footer', { class: 'gd-foot' }, [msg, checkBtn]);

      // 선배 감수관(그림 + 말풍선): 처음 · 틀렸을 때 · 다 맞았을 때 한 줄씩 바뀐다(정답에 관한 말은 하지 않음)
      const seniorSay = el('p', { class: 'gd-senior-say' }, TG.senior);
      const wrap = el('div', { class: 'gd' }, [
        el('header', { class: 'gd-head' }, [
          el('div', { class: 'gd-head-text' }, [
            el('p', { class: 'gd-kicker' }, G.text.t('common.chapterLevel', { chapter: G.text.chapterTitle(run.ch), level: G.text.levelName(run.level) })),
            el('h1', { class: 'app-h1 gd-title' }, TG.title),
            el('p', { class: 'gd-from' }, TG.from),
          ]),
          el('div', { class: 'gd-senior' }, [
            el('img', { class: 'gd-senior-img', src: 'assets/img/senior.webp', alt: T().images.senior, draggable: 'false', decoding: 'async' }),
            el('div', { class: 'gd-senior-bubble' }, [el('span', { class: 'gd-senior-name' }, TG.seniorName), seniorSay]),
          ]),
        ]),
        el('p', { class: 'gd-intro' }, TG.intro),
        el('div', { class: 'gd-list' }, cards),
        foot,
      ]);
      root.appendChild(wrap);

      function say(text, kind) {
        msg.textContent = text || '';
        msg.className = 'gd-msg' + (kind ? ' is-' + kind : '');
      }

      function pick(info, i) {
        if (done) return;
        picks[info.g.id][info.b] = i;
        info.opts.forEach((o, k) => o.setAttribute('aria-pressed', String(k === i)));
        U.clear(info.val);
        U.append(info.val, keepPh(info.g.blanks[info.b].options[i]));
        info.slot.classList.add('is-filled');
        if (msg.textContent) say('');
      }

      function check() {
        if (done) return;
        const all = blanks.every((x) => picks[x.g.id][x.b] !== undefined);
        if (!all) { say(TG.notAll); return; }
        const wrong = G.rules.gradeGuides(guides, picks);
        if (wrong > 0) {
          say(G.text.fill(TG.wrong, { n: wrong }), 'wrong');
          seniorSay.textContent = TG.seniorWrong;
          sound(() => G.audio.sfx('guideWrong'));
          return;
        }
        finish();
      }

      // 다 맞음: 저장(지침 완료 → 감수 단계) → [원고 감수 시작]
      function finish() {
        done = true;
        sound(() => G.audio.sfx('guideOk'));
        const next = Object.assign({}, run, { phase: 'review', guideDone: true, done: [], cur: null });
        G.save.saveChapter(next);
        blanks.forEach((x) => x.opts.forEach((o) => { o.disabled = true; }));
        say(TG.allRight, 'ok');
        seniorSay.textContent = TG.seniorOk;
        const goBtn = el('button', {
          type: 'button', class: 'app-btn is-primary is-big gd-go', 'data-act': 'guide-go',
          onclick: () => G.app.go('review', { run: G.save.loadChapter() || next }),
        }, [el('span', null, TG.go), U.glyph('next', 'glyph gd-go-ico')]);
        checkBtn.replaceWith(goBtn);
        try { goBtn.focus({ preventScroll: true }); } catch (e) { /* 무시 */ }
      }

      // 지침 데이터가 없는 장이면 지침을 건너뛴다(지침이 없는 8장은 G.app.beginChapter가 감수부터 시작해 여기 오지 않는다 — 망가진 값을 위한 안전장치)
      if (!guides.length) { finish(); }

      return null;
    },
    unmount() { /* 문서 이벤트 · 타이머를 쓰지 않는다 */ },
  };

  G.screens.guide = SCREEN;
})();
