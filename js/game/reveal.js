'use strict';
// ───────────────────────────────────────────────────────────────
// 조항 공개 화면 G.screens.reveal — "선생님이 채운 지침은 실제로 「표준 발음법」 제N항입니다"(명세 §9 · 결정 0001)
// ───────────────────────────────────────────────────────────────
//   불러오는 순서: util → data(scripts · articles · guides · text) → core(rules · audio · save) → game(이 파일 · app.js) → main.
//   모양: css/reveal.css   점검: tests/check-result.mjs
//   새로 만든 화면이다(음운 해전에는 같은 화면이 없음). 화면 등록 방식은 js/game/app.js 머리 주석.
//
// ── 들어오는 값 ─────────────────────────────────────────────────────────
//   G.app.go('reveal', { run })   run = 원고 7개가 끝난 진행 장(phase 'reveal', done 7개 — js/core/save.js 머리 주석).
//   감수 화면은 7번째 원고 다음에 phase를 'reveal'로 저장하고 이 화면으로 온다(그래서 새로 고침해도 이어 하기로 돌아옴).
//   값이 없으면 G.save.loadChapter()로 읽는다. 끝난 진행 장이 없으면 시작 화면으로 간다.
//
// ── 화면 ────────────────────────────────────────────────────────────────
//   [장 · 단계 | 조항 공개]  [머리 문장(게임 쪽 말) — 「표준 발음법」 제8항·제9항…]  [원문 표시 안내]
//     지침이 없는 장(8장)은 머리 문장이 reveal.headingNoGuide(감수한 원고의 근거 조항). 조항은 뽑힌 원고 7개의 것뿐이다.
//   조항 카드(조항 번호 순, '20-다만'은 '20' 바로 뒤): 「표준 발음법」 제N항 + '원문' 표시
//     원문 단락 차례대로 — 문장, 묶음 표시((1) · (2)), 예시 낱말 표기 [발음](제21항은 틀린 발음 (×[…])까지)
//   [장 결과 보기] → G.app.go('result', { run })
//
// ── 지킬 것 ─────────────────────────────────────────────────────────────
//   공개할 조항 목록은 G.rules.revealArticles(그 장 지침, 뽑힌 원고 7개)가 정한다(여기서 고르지 않음, 명세 §3-1 · §9).
//   조항 원문은 ARTICLES(js/data/articles.js) 그대로 — 고치지 않는다. 원문에는 '원문' 표시를 달아 게임 설정과 나눈다(결정 0001).
//   진행 장 저장은 지우지 않는다(지우는 것은 장 결과에 닿았을 때 — 명세 §10).
//   소리: 배경 음악 'result'(결과 — 조항 공개 · 장 결과, 명세 §15).
(function () {
  const U = G.util, el = U.el;
  const T = () => window.TEXT;

  const sound = U.sound, finished = U.finished; // finished: 끝난 진행 장인가(원고 모두 결과가 있음)

  function exampleItem(e) {
    return el('li', { class: 'rv-ex' }, [
      el('span', { class: 'rv-ex-text' }, e[0]),
      el('span', { class: 'rv-ex-pron' }, G.text.pron(e[1])),
      e[2] ? el('span', { class: 'rv-ex-wrong' }, '(×' + G.text.pron(e[2]) + ')') : null,
    ]);
  }

  function articleCard(id) {
    const A = window.ARTICLES && window.ARTICLES[id];
    const R = T().reveal;
    const parts = A ? A.parts.map((p) => el('div', { class: 'rv-part' }, [
      p.label ? el('p', { class: 'rv-part-label' }, p.label) : null,
      p.text ? el('p', { class: 'rv-part-text' }, p.text) : null,
      p.examples && p.examples.length ? el('ul', { class: 'rv-ex-list' }, p.examples.map(exampleItem)) : null,
    ])) : [];
    return el('article', { class: 'rv-art', 'data-article': id }, [
      el('header', { class: 'rv-art-head' }, [
        el('h2', { class: 'rv-art-name' }, [
          el('span', { class: 'rv-art-src' }, R.source),
          el('span', { class: 'rv-art-no' }, A ? A.name : G.text.articleName(id)),
        ]),
        el('span', { class: 'rv-orig' }, T().common.original),
      ]),
      el('div', { class: 'rv-art-body' }, parts),
    ]);
  }

  G.screens.reveal = {
    mount(root, value) {
      const run = (value && value.run) || G.save.loadChapter();
      if (!finished(run)) { G.app.go('start'); return null; }
      const R = T().reveal;
      sound(() => G.audio.play('result'));

      const byId = {};
      (window.SCRIPTS || []).forEach((s) => { byId[s.id] = s; });
      const scripts = run.ids.map((id) => byId[id]).filter(Boolean);
      const guides = window.GUIDES && window.GUIDES[run.ch];
      const ids = G.rules.revealArticles(guides, scripts);
      // 지침이 없는 장(8장, 결정 0019): 채운 지침이 없으므로 감수한 원고의 근거 조항이라고만 말한다
      const heading = Array.isArray(guides) && guides.length ? R.heading : R.headingNoGuide;

      root.appendChild(el('div', { class: 'rv' }, [
        el('header', { class: 'rv-head' }, [
          el('p', { class: 'rv-kicker' }, G.text.t('common.chapterLevel', { chapter: G.text.chapterTitle(run.ch), level: G.text.levelName(run.level) })),
          el('h1', { class: 'app-h1 rv-title' }, R.title),
        ]),
        el('p', { class: 'rv-heading' }, G.text.fill(heading, { articles: G.text.articleList(ids) })),
        el('p', { class: 'rv-note' }, [el('span', { class: 'rv-orig' }, T().common.original), el('span', null, R.note)]),
        el('div', { class: 'rv-list' }, ids.map(articleCard)),
        el('footer', { class: 'rv-foot' }, el('button', {
          type: 'button', class: 'app-btn is-primary is-big rv-next', 'data-act': 'reveal-next',
          onclick: () => G.app.go('result', { run }),
        }, [el('span', null, R.next), U.glyph('next', 'glyph rv-next-ico')])),
      ]));
      return null;
    },
    unmount() { /* 문서 이벤트 · 타이머를 쓰지 않는다 */ },
  };
})();
