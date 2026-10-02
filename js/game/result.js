'use strict';
// ───────────────────────────────────────────────────────────────
// 장 결과 화면 G.screens.result — 원고별 줄 · 정답 기준 숫자 · 공개된 조항 · 다시 하기 / 장 고르기(명세 §10 · §4 · §11)
// ───────────────────────────────────────────────────────────────
//   불러오는 순서: util → data(scripts · guides · text) → core(rules · audio · save) → game(이 파일 · app.js) → main.
//   모양: css/result.css   점검: tests/check-result.mjs
//   새로 만든 화면이다(음운 해전에는 같은 화면이 없음). 화면 등록 방식은 js/game/app.js 머리 주석.
//
// ── 들어오는 값(이 화면이 정함 — js/game/app.js 머리 주석의 'result' 약속) ──────────
//   G.app.go('result', { run })   run = 원고 7개가 끝난 진행 장(phase 'reveal', done 7개). 조항 공개 화면이 넘겨준다.
//   값이 없으면 G.save.loadChapter()로 읽는다. 끝난 진행 장이 없으면(이미 지워짐 등) 시작 화면으로 간다.
//   이 화면에 닿으면 진행 장 저장을 지운다(G.save.clearChapter — 명세 §10). 그래서 새로 고침하면 시작 화면이고 이어 하기도 없다.
//
// ── 화면 ────────────────────────────────────────────────────────────────
//   [장 결과 | 장 · 단계]
//   원고별 7줄(감수 차례): 표기 · 표준 발음(여기서 처음 보임) · 결과(온에어 · 규칙 밖 · 넘김 — 색 + 기호) · 송출 n번 · 도움
//   이번 장 원고의 정답 기준: 변동 유형별 횟수(교체 · 탈락 · 첨가 · 축약) · 음운 수(표기 → 발음)
//   공개된 조항: 제8항·제9항…
//   [다시 하기] = 같은 장 · 같은 단계 · 같은 학년을 새로 뽑아 지침 없이 감수부터(G.app.beginChapter({ …, skipGuide: true }))
//   [장 고르기] = 시작 화면
//
// ── 지킬 것 ─────────────────────────────────────────────────────────────
//   숫자는 G.rules.chapterTotals(뽑힌 원고 7개) — 원고 데이터의 정답 기준이다. 학생이 한 교정은 세지 않는다(명세 §10 · §19).
//   공개된 조항은 G.rules.revealArticles(조항 공개 화면과 같은 목록). 원고 결과 값은 감수 화면이 G.rules.scriptResult로 정해 저장한 것.
//   소리: 배경 음악 'result'(결과 — 조항 공개 · 장 결과, 명세 §15).
(function () {
  const U = G.util, el = U.el;
  const T = () => window.TEXT;
  const OPS = ['replace', 'delete', 'insert', 'merge'];
  const OUTCOME_GLYPH = { onair: 'onair', offrule: 'offrule', skip: 'next' }; // 넘김은 신호가 아니라서 '다음' 기호

  const sound = U.sound, finished = U.finished, fillNodes = U.fillNodes;

  G.screens.result = {
    mount(root, value) {
      const run = (value && value.run) || G.save.loadChapter();
      if (!finished(run)) { G.app.go('start'); return null; }
      G.save.clearChapter(); // 장 결과에 닿음 → 진행 중인 장 저장을 지운다(명세 §10)
      sound(() => G.audio.play('result'));

      const R = T().result;
      const grade = run.grade === 'h1' ? 'h1' : 'm3';
      const byId = {};
      (window.SCRIPTS || []).forEach((s) => { byId[s.id] = s; });
      const scripts = run.ids.map((id) => byId[id]).filter(Boolean);

      // ── 원고별 줄 ──
      const C = R.columns;
      const head = el('thead', null, el('tr', null, [
        el('th', { scope: 'col', class: 'rs-h-text' }, C.spelling),
        el('th', { scope: 'col', class: 'rs-h-pron' }, C.pron),
        el('th', { scope: 'col', class: 'rs-h-outcome' }, C.outcome),
        el('th', { scope: 'col', class: 'rs-h-sends' }, C.broadcasts),
        el('th', { scope: 'col', class: 'rs-h-help' }, C.help),
      ]));
      const rows = run.ids.map((id, i) => {
        const s = byId[id] || { text: id, pron: '' };
        const d = run.done[i] || { result: 'skip', sends: 0, help: [] };
        const helped = Array.isArray(d.help) ? d.help.length > 0 : !!d.helped;
        return el('tr', { class: 'rs-row', 'data-i': String(i) }, [
          el('th', { scope: 'row', class: 'rs-c-text' }, s.text),
          el('td', { class: 'rs-c-pron' }, G.text.pron(s.pron)),
          el('td', { class: 'rs-c-outcome', 'data-result': d.result }, el('span', { class: 'rs-badge' }, [
            U.glyph(OUTCOME_GLYPH[d.result] || 'next', 'glyph rs-badge-ico'),
            el('span', null, G.text.outcome(d.result)),
          ])),
          el('td', { class: 'rs-c-sends', 'data-label': C.broadcasts }, G.text.fill(T().common.timesN, { n: d.sends })),
          el('td', { class: 'rs-c-help' + (helped ? ' is-used' : ''), 'data-label': C.help }, helped ? R.helpUsed : R.helpNone),
        ]);
      });
      const table = el('table', { class: 'rs-table' }, [head, el('tbody', null, rows)]);

      // ── 정답 기준 숫자(원고 데이터의 합) ──
      const tot = G.rules.chapterTotals(scripts);
      const changeList = el('ul', { class: 'rs-change-list' }, OPS.map((op) => el('li', {
        class: 'rs-change' + (tot.change[op] ? '' : ' is-zero'), 'data-op': op,
      }, fillNodes(R.changeLine, {
        name: el('span', { class: 'rs-change-name' }, G.text.change(grade, op)),
        n: el('b', { class: 'rs-num' }, String(tot.change[op])),
      }))));
      const count = el('p', { class: 'rs-count' }, fillNodes(R.countLine, {
        from: el('b', { class: 'rs-num' }, String(tot.count[0])),
        to: el('b', { class: 'rs-num' }, String(tot.count[1])),
      }));

      // ── 공개된 조항 ──
      const arts = G.rules.revealArticles(window.GUIDES && window.GUIDES[run.ch], scripts);

      const again = el('button', {
        type: 'button', class: 'app-btn is-primary is-big rs-again', 'data-act': 'again',
        onclick: () => G.app.beginChapter({ ch: run.ch, level: run.level, grade: run.grade, skipGuide: true }),
      }, R.again);
      const chapters = el('button', {
        type: 'button', class: 'app-btn is-big rs-chapters', 'data-act': 'chapters', onclick: () => G.app.go('start'),
      }, R.chapters);

      // 방송 마무리: 모두 온에어면 활짝 웃는 아나운서 + '사고 없이', 아니면 기다리는 아나운서 + '수고했어요'
      const onairN = run.done.filter((d) => d && d.result === 'onair').length;
      // 모두 온에어 + 모두 첫 송출에 → '사고 없이', 모두 온에어지만 다시 송출한 원고가 있음 → '끝까지 고쳐서'
      const allOn = onairN === run.ids.length;
      const clean = allOn && run.done.every((d) => d && d.sends === 1);
      const mood = allOn ? 'happy' : 'idle';
      root.appendChild(el('div', { class: 'rs' }, [
        el('header', { class: 'rs-head' }, [
          el('div', { class: 'rs-head-text' }, [
            el('div', { class: 'app-titlebar' }, [U.art('ic_trophy', 'app-title-ico'), el('h1', { class: 'app-h1 rs-title' }, R.title)]),
            el('p', { class: 'rs-sub' }, G.text.fill(R.subtitle, { chapter: G.text.chapterTitle(run.ch), level: G.text.levelName(run.level) })),
          ]),
          el('div', { class: 'rs-wrap' + (allOn ? ' is-clean' : '') }, [
            el('img', { class: 'rs-wrap-img', src: 'assets/img/anchors_' + mood + '.webp', alt: T().images.anchors[mood], draggable: 'false', decoding: 'async' }),
            el('div', { class: 'rs-wrap-text' }, [
              el('p', { class: 'rs-wrap-line' }, clean ? R.wrap.clean : allOn ? R.wrap.fixed : R.wrap.done),
              el('p', { class: 'rs-wrap-count' }, [U.glyph('onair', 'glyph rs-wrap-ico'), G.text.fill(R.onairCount, { n: onairN, total: run.ids.length })]),
            ]),
          ]),
        ]),
        el('div', { class: 'rs-main' }, [
          el('section', { class: 'rs-box rs-scripts' }, table),
          el('div', { class: 'rs-side' }, [
            el('section', { class: 'rs-box rs-totals' }, [
              el('h2', { class: 'rs-h2' }, R.totalsTitle),
              el('p', { class: 'rs-note' }, R.totalsNote),
              el('h3', { class: 'rs-h3' }, G.text.t('result.changeTitle', null, grade)),
              changeList,
              el('h3', { class: 'rs-h3' }, R.countTitle),
              count,
            ]),
            el('section', { class: 'rs-box rs-arts' }, [
              el('h2', { class: 'rs-h2' }, R.articles),
              el('p', { class: 'rs-articles' }, G.text.articleList(arts)),
            ]),
          ]),
        ]),
        el('footer', { class: 'rs-foot' }, [again, chapters]),
      ]));
      return null;
    },
    unmount() { /* 문서 이벤트 · 타이머를 쓰지 않는다 */ },
  };
})();
