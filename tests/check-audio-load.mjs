// 소리 장치 불러오기 점검(브라우저 없이) — js/core/audio.js가 웹 오디오도 <audio>도 없는 곳에서
// 예외 없이 뜨고, 공개 함수가 있으며, 불러도 던지지 않고 조용한지만 본다.
//   node tests/check-audio-load.mjs
// 실제 재생·크로스페이드·음원 없음 상태의 콘솔은 브라우저 점검(T12 check-audio-engine)에서 본다.
import fs from 'node:fs';
import path from 'node:path';
import { loadScripts, check, done, ROOT } from './lib/load.mjs';

// 콘솔 흉내: warn·error를 센다(util.js가 console.error를 감싸므로 그 아래에서 센다)
const seen = { warn: [], error: [] };
const fakeConsole = {
  log: (...a) => console.log(...a),
  info: () => {},
  warn: (...a) => { seen.warn.push(a.map(String).join(' ')); },
  error: (...a) => { seen.error.push(a.map(String).join(' ')); },
};

let ctx;
try {
  // AudioContext·Audio·document·location 없음: 가장 메마른 창
  ctx = loadScripts(['js/core/util.js', 'js/core/audio.js'], { console: fakeConsole });
} catch (e) {
  check(false, '스크립트 불러오기 실패: ' + e.message);
  done('소리 장치 불러오기 점검');
}
const A = ctx.G && ctx.G.audio;
if (!A) { check(false, 'G.audio 없음'); done('소리 장치 불러오기 점검'); }

// 1. 공개 함수
for (const fn of ['play', 'sfx', 'stop', 'configure', 'unlock', 'preload', 'state', 'setBase', 'files',
  'setBgmOn', 'setBgmVolume', 'setSfxOn', 'setSfxVolume']) {
  check(typeof A[fn] === 'function', `G.audio.${fn} 함수 있음`);
}

// 2. 소리 자리(명세 §15)와 파일 이름
const J = (x) => JSON.stringify(x);
const BGM = ['review', 'result'];
const SFX = ['mark', 'send', 'onair', 'offrule', 'diff', 'nonstandard', 'guideOk', 'guideWrong'];
check(J(A.tracks) === J(BGM), '배경 음악 자리: ' + J(A.tracks));
check(J(A.effects) === J(SFX), '효과음 자리: ' + J(A.effects));
const files = A.files();
const all = [...Object.values(files.bgm), ...Object.values(files.sfx)];
check(all.length === 10 && new Set(all).size === 10, '파일 이름 10개, 겹침 없음');
check(all.every((f) => /^(bgm|sfx)-[a-z0-9-]+\.mp3$/.test(f)), '파일 이름은 소문자 bgm-/sfx-…mp3: ' + J(all));
check(files.bgm.review === 'bgm-review.mp3' && files.bgm.result === 'bgm-result.mp3', '배경 음악 파일 이름');
files.bgm.review = 'x.mp3';
check(A.files().bgm.review === 'bgm-review.mp3', 'files()는 복사본(바깥에서 못 바꿈)');

// assets/audio/README.md가 파일 이름을 모두 적었는지
const readme = path.join(ROOT, 'assets', 'audio', 'README.md');
const readmeText = fs.existsSync(readme) ? fs.readFileSync(readme, 'utf8') : '';
check(!!readmeText, 'assets/audio/README.md 있음');
for (const f of all) check(readmeText.includes(f), 'README에 ' + f);
// 이번 단계에서는 음원을 하나도 넣지 않는다(명세 §15, 인수인계 관문 5)
const audioFiles = fs.readdirSync(path.join(ROOT, 'assets', 'audio')).filter((f) => /\.(mp3|ogg|wav|m4a|flac)$/i.test(f));
check(audioFiles.length === 0, '음원 파일 없음: ' + J(audioFiles));

// 3. 잠기기 전: 기억만 하고 조용함
const quiet = (fn, msg) => { try { fn(); check(true, msg); } catch (e) { check(false, msg + ' — 던짐: ' + e.message); } };
quiet(() => check(A.play('review') === true, '잠기기 전 play는 기억(true)'), 'play 던지지 않음');
quiet(() => check(A.sfx('onair') === false, '잠기기 전 sfx는 울리지 않음(false)'), 'sfx 던지지 않음');
check(A.state().track === 'review' && A.state().playing === null, '원하는 곡은 기억, 실제로는 조용');
check(A.state().backend === 'none', '소리 틀 없음: ' + A.state().backend);

// 4. 설정 반영(준 것만 바꿈, 0~1로 자름, 이상한 값은 무시)
let st;
quiet(() => { st = A.configure({ bgmOn: false, bgmVolume: 2, sfxVolume: -1 }); }, 'configure 던지지 않음');
check(st && st.bgmOn === false && st.bgmVolume === 1 && st.sfxVolume === 0 && st.sfxOn === true, 'configure 반영: ' + J(st));
quiet(() => { st = A.configure({ bgmOn: 'yes', bgmVolume: NaN, sfxVolume: 0.5 }); }, 'configure 이상한 값 던지지 않음');
check(st.bgmOn === false && st.bgmVolume === 1 && st.sfxVolume === 0.5, '이상한 값은 무시: ' + J(st));
quiet(() => A.configure(null), 'configure(null) 던지지 않음');
quiet(() => A.configure({ bgmOn: true, bgmVolume: 0.6, sfxOn: true, sfxVolume: 0.8 }), 'configure 되돌림');

// 5. 잠금 풀기: 소리 틀이 없으니 파일마다 warn 한 번만, error는 없음
quiet(() => A.unlock(), 'unlock 던지지 않음');
quiet(() => { A.play('result'); A.play('review'); A.play('review'); }, '곡 바꾸기 던지지 않음');
quiet(() => { for (const n of SFX) { A.sfx(n); A.sfx(n); } }, '효과음 전부 두 번씩 던지지 않음');
quiet(() => A.preload('result', 'onair', '없는것'), 'preload 던지지 않음');
quiet(() => check(A.play('없는곡') === false && A.sfx('없는소리') === false, '모르는 이름은 false'), '모르는 이름 던지지 않음');
quiet(() => { A.stop(); A.setBgmVolume(0.3); A.setSfxOn(false); A.setBase('elsewhere'); }, 'stop·set… 던지지 않음');

// 약속(Promise)으로 도는 불러오기가 끝나기를 기다렸다가 콘솔을 본다
await new Promise((r) => setTimeout(r, 50));
check(seen.error.length === 0, 'console.error 없음: ' + J(seen.error));
const perKey = {};
for (const w of seen.warn) perKey[w] = (perKey[w] || 0) + 1;
check(Object.values(perKey).every((n) => n === 1), '같은 경고는 한 번만: ' + J(perKey));
check(seen.warn.length <= all.length + 3, '경고 수가 파일 수(+모르는 이름) 이내: ' + seen.warn.length);
check(A.state().unlocked === true && A.state().playing === null, '풀렸지만 소리 없음(조용히)');

done('소리 장치 불러오기 점검');
