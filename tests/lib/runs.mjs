// 점검 전용 조작: '원고 7개가 끝난 진행 장'을 저장소에 바로 넣는다(감수 화면 T9를 거치지 않고 조항 공개 · 장 결과를 점검).
//   게임 코드에는 아무것도 더하지 않는다 — 게임의 공개 함수(G.rules.draw · G.save.saveChapter)만 부른다(명세 §18: 점검용 조작은
//   점검 대본에서만, 게임 화면에 단추 · 글로 드러내지 않음).
//
//   aside 대본 안에서 DRIVER 다음에 넣는다:
//     await t.evaluate(() => { ${DRIVER} });
//     await t.evaluate(() => { ${RUNS} });
//     const run = await t.evaluate(() => D.finishRun(2, { grade: 'h1', level: 'advanced', seed: 7 }));
//     → 저장된 진행 장(phase 'reveal', done 7개). 그다음 D.G().app.resume()이면 조항 공개 화면으로 간다.
//
//   D.finishRun(장, 옵션) → 저장된 ChapterRun(G.save.loadChapter()의 정리본) | null(저장 실패 — D.bad에 적힘)
//     옵션 seed     원고 뽑기 시드(기본 20261001) — 같은 시드면 같은 원고 7개
//          grade    'm3' | 'h1'(기본 'm3'),  level 'basic' | 'advanced'(기본 'basic')
//          results  원고 결과를 차례로 돌려 쓰는 목록(기본 ['onair', 'offrule', 'skip'])
//          sends    송출 횟수를 차례로 돌려 쓰는 목록(기본 [1, 3, 0, 2, 1, 4, 0]) — 'skip'이 아닌데 0이면 1로 올림
//          help     도움 단계 목록을 차례로 돌려 쓰는 목록(기본 [[1, 2], [], [3], [], [], [1], []])
//          phase    'reveal'(기본) | 'review'(앞의 done 개수만큼 끝난 감수 단계 — doneCount로 개수)
//   D.finishedSummary(run) → [{ id, text, pron, result, sends, helped }] 점검이 화면과 맞춰 볼 원고별 기대값
export const RUNS = String.raw`
if (window.D && !D.finishRun) {
  D.finishRun = (ch, o) => {
    o = o || {};
    const G = D.G(), w = D.w();
    const seed = typeof o.seed === 'number' ? o.seed : 20261001;
    const ids = G.rules.draw(ch, w.SCRIPTS, G.rules.exampleIds(w.GUIDES && w.GUIDES[ch]), seed);
    const results = o.results || ['onair', 'offrule', 'skip'];
    const sends = o.sends || [1, 3, 0, 2, 1, 4, 0];
    const help = o.help || [[1, 2], [], [3], [], [], [1], []];
    const phase = o.phase || 'reveal';
    const n = phase === 'reveal' ? ids.length : (typeof o.doneCount === 'number' ? o.doneCount : 0);
    const done = ids.slice(0, n).map((id, i) => {
      const result = results[i % results.length];
      let s = sends[i % sends.length];
      if (result !== 'skip' && s < 1) s = 1;
      return { id, result, sends: s, help: help[i % help.length].slice() };
    });
    const run = {
      grade: o.grade || 'm3', ch, level: o.level || 'basic', seed, ids,
      phase, guideDone: true, done, cur: null,
    };
    if (!G.save.saveChapter(run)) { D.bad('점검용 진행 장 저장 실패: ' + JSON.stringify(run)); return null; }
    return G.save.loadChapter();
  };
  D.finishedSummary = (run) => {
    const w = D.w();
    const by = {};
    w.SCRIPTS.forEach((s) => { by[s.id] = s; });
    return run.ids.map((id, i) => ({
      id, text: by[id].text, pron: by[id].pron,
      result: run.done[i].result, sends: run.done[i].sends, helped: run.done[i].help.length > 0,
    }));
  };
}
`;
