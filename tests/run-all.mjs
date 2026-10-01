// 점검 전체 실행: tests/ 안의 check-*.mjs를 이름 순서대로 모두 돌린다. 하나라도 실패하면 1로 끝난다.
//   cd tests && npm test            (전체 — 브라우저 점검용 정적 서버를 이 프로세스가 띄움)
//   npm test -- rules                (이름에 rules가 들어간 점검만)
//   BASE=http://… npm test           (그 주소를 점검 — 브라우저 점검만 주소를 씀, 서버를 띄우지 않음)
//   출처: 「음운 해전」 pblsketch/sori-haejeon tests/run-all.mjs 를 가져왔다(바꾼 것: 결과 줄 문구는 이 저장소의 것 그대로).
//   Node 점검(check-rules·data·save·text·audio-load)은 서버를 쓰지 않는다. 브라우저 점검(aside)은 환경 변수 BASE로 서버 주소를 받는다.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { startServer } from './server.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const only = process.argv.slice(2);
const files = fs.readdirSync(DIR).filter((f) => /^check-.*\.mjs$/.test(f)).sort()
  .filter((f) => !only.length || only.some((o) => f.includes(o)));
if (!files.length) { console.log('점검 파일이 없습니다.'); process.exit(0); }

let server = null;
const env = { ...process.env };
if (!env.BASE) {
  // 다른 점검이 같은 포트를 쓰고 있으면 다음 포트로 넘어간다
  let port = +(env.PORT || 8791);
  for (let i = 0; i < 20 && !server; i++, port++) {
    try { server = await startServer(port); } catch (e) { if (e.code !== 'EADDRINUSE') throw e; }
  }
  if (!server) throw new Error('점검용 서버를 띄울 포트가 없습니다');
  env.BASE = server.base;
}

const results = [];
for (const f of files) {
  const t0 = Date.now();
  console.log(`\n=== ${f} ===`);
  // 서버가 이 프로세스 안에서 돌기 때문에 spawnSync로 막으면 응답을 못 한다 → 비동기로 기다린다
  const code = await new Promise((resolve) => {
    const p = spawn(process.execPath, [path.join(DIR, f)], { cwd: DIR, env, stdio: 'inherit' });
    p.on('close', (c) => resolve(c));
  });
  results.push({ f, code, sec: ((Date.now() - t0) / 1000).toFixed(1) });
}
if (server) server.srv.close();
console.log('\n── 결과 ──');
for (const r of results) console.log(`${r.code === 0 ? '통과' : '실패'}  ${r.f}  (${r.sec}초)`);
const bad = results.filter((r) => r.code !== 0);
console.log(bad.length ? `실패 ${bad.length}개` : '모두 통과');
process.exit(bad.length ? 1 : 0);
