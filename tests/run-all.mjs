// 점검 전체 실행: tests/ 안의 check-*.mjs를 이름 순서대로 모두 돌린다. 하나라도 실패하면 1로 끝난다.
//   cd tests && npm test            (전체)
//   npm test -- rules                (이름에 rules가 들어간 점검만)
// 음운 해전 tests/run-all.mjs와 같은 방식. 브라우저 점검(aside)이 생기면 그때 점검용 서버를 더한다.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const only = process.argv.slice(2);
const files = fs.readdirSync(DIR).filter((f) => /^check-.*\.mjs$/.test(f)).sort()
  .filter((f) => !only.length || only.some((o) => f.includes(o)));
if (!files.length) { console.log('점검 파일이 없습니다.'); process.exit(0); }

const results = [];
for (const f of files) {
  const t0 = Date.now();
  console.log(`\n=== ${f} ===`);
  const p = spawnSync(process.execPath, [path.join(DIR, f)], { cwd: DIR, stdio: 'inherit' });
  results.push({ f, code: p.status, sec: ((Date.now() - t0) / 1000).toFixed(1) });
}
console.log('\n── 결과 ──');
for (const r of results) console.log(`${r.code === 0 ? '통과' : '실패'}  ${r.f}  (${r.sec}초)`);
const bad = results.filter((r) => r.code !== 0);
console.log(bad.length ? `실패 ${bad.length}개` : '모두 통과');
process.exit(bad.length ? 1 : 0);
