# -*- coding: utf-8 -*-
"""assets/raw/audio/*(내려받은 원본)를 게임이 읽는 assets/audio/*.mp3로 만든다(결정 0020 — 음원 고르기는 에이전트가 함).

    python tools/process_audio.py          # 모두 만들기 + 점검
    python tools/process_audio.py --check  # 만든 파일 점검만

ffmpeg · ffprobe가 PATH에 있어야 한다. 원본 목록 · 출처는 assets/audio/CREDITS.md.
- 배경 음악: 원곡에서 반복 구간을 고른다(앞뒤 2초 창의 소리 결(스펙트럼)이 가장 닮은 두 지점 → 파형 상관으로 샘플 단위 맞춤),
  끝 다음 CROSS초를 처음 CROSS초에 등전력으로 겹쳐 끝 → 처음이 이어지게 한다. 음량 -18 LUFS, 44.1 kHz 스테레오 128 kbps.
- 효과음: 앞 무음을 자르고 정해진 길이로 자른 뒤 끝을 줄여 끄고, 최댓값을 자리마다 정한 크기로 맞춘다. 44.1 kHz 모노 96 kbps.
  자주 울리는 교정 소리는 작게, 송출 · 신호는 또렷하게, '표준 아님' 삐 소리는 귀가 따갑지 않게 낮춘다.
"""
import os
import subprocess
import sys
import tempfile
import wave
import shutil
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, 'assets', 'raw', 'audio')
OUT = os.path.join(ROOT, 'assets', 'audio')
# ffmpeg 찾기: PATH → 환경 변수 FFMPEG_DIR → 사용자 폴더의 ffmpeg/bin(선생님 PC)
_dirs = [os.environ.get('FFMPEG_DIR', ''), os.path.join(os.path.expanduser('~'), 'ffmpeg', 'bin')]
FFMPEG = shutil.which('ffmpeg') or next((os.path.join(d, 'ffmpeg.exe') for d in _dirs if d and os.path.exists(os.path.join(d, 'ffmpeg.exe'))), 'ffmpeg')
SR = 44100
CROSS = 0.9

# 배경 음악: (게임 파일, 원본, 반복 구간 길이 범위(초))
BGM = [
    ('bgm-review.mp3', 'bgm_local_forecast.mp3', (100, 150)),
    ('bgm-result.mp3', 'bgm_inspired.mp3', (90, 140)),
]
# 효과음: (게임 파일, 원본, 최대 길이(초), 끝 줄이기(초), 최댓값 dBFS)
SFX = [
    ('sfx-mark.mp3', 'fs_181052.mp3', 0.5, 0.12, -9.0),
    ('sfx-send.mp3', 'fs_321905.mp3', 0.55, 0.12, -5.0),
    ('sfx-onair.mp3', 'fs_456965.mp3', 1.9, 0.6, -3.0),
    ('sfx-offrule.mp3', 'fs_380482.mp3', 0.4, 0.12, -5.0),
    ('sfx-diff.mp3', 'fs_478191.mp3', 0.3, 0.08, -6.0),
    ('sfx-nonstandard.mp3', 'fs_586975.mp3', 0.35, 0.08, -13.0),
    ('sfx-guide-ok.mp3', 'fs_243701.mp3', 0.35, 0.1, -5.0),
    ('sfx-guide-wrong.mp3', 'fs_243700.mp3', 0.3, 0.1, -6.0),
]


def run(args):
    r = subprocess.run(args, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if r.returncode != 0:
        raise RuntimeError(' '.join(args) + '\n' + r.stderr[-800:])
    return r


def decode(path, ch):
    tmp = tempfile.mktemp(suffix='.wav')
    run([FFMPEG, '-y', '-v', 'error', '-i', path, '-ac', str(ch), '-ar', str(SR), '-af', 'lowpass=f=16000', '-c:a', 'pcm_s16le', tmp])
    with wave.open(tmp, 'rb') as w:
        a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
    os.remove(tmp)
    return a.reshape(-1, ch)


def encode(a, path, ch, kbps, af=None):
    tmp = tempfile.mktemp(suffix='.wav')
    with wave.open(tmp, 'wb') as w:
        w.setnchannels(ch); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(a, -1, 1) * 32767).astype(np.int16).tobytes())
    args = [FFMPEG, '-y', '-v', 'error', '-i', tmp]
    if af:
        args += ['-af', af]
    args += ['-ar', str(SR), '-ac', str(ch), '-c:a', 'libmp3lame', '-b:a', f'{kbps}k', path]
    run(args)
    os.remove(tmp)


def measure_lufs(a, ch):
    tmp = tempfile.mktemp(suffix='.wav')
    with wave.open(tmp, 'wb') as w:
        w.setnchannels(ch); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(a, -1, 1) * 32767).astype(np.int16).tobytes())
    r = subprocess.run([FFMPEG, '-hide_banner', '-nostats', '-i', tmp, '-af', 'ebur128', '-f', 'null', '-'],
                       capture_output=True, text=True, encoding='utf-8', errors='replace')
    os.remove(tmp)
    import re
    m = re.findall(r'I:\s*(-?[\d.]+) LUFS', r.stderr)
    return float(m[-1]) if m else -18.0


def spec_frames(mono, hop=0.25, win=2.0):
    """0.25초마다 2초 창의 크기 스펙트럼(로그, 64칸) — 반복 지점 고르기용."""
    n, h = int(win * SR), int(hop * SR)
    idx = range(0, len(mono) - n, h)
    out, lev = [], []
    for i in idx:
        s = np.abs(np.fft.rfft(mono[i:i + n:4] * np.hanning(len(mono[i:i + n:4]))))
        bands = np.array_split(s[: len(s) // 2], 64)
        v = np.log1p(np.array([b.mean() for b in bands]))
        out.append(v / (np.linalg.norm(v) + 1e-9))
        lev.append(20 * np.log10(np.sqrt((mono[i:i + int(0.2 * SR)] ** 2).mean()) + 1e-9))  # 창 앞 0.2초의 크기
    return np.array(out), np.array(lev), h


def make_bgm(dst, src, rng):
    a = decode(os.path.join(RAW, src), 2)
    mono = a.mean(axis=1)
    F, LV, h = spec_frames(mono)
    best = (-1, 0, 0)
    lo, hi = int(rng[0] * SR / h), int(rng[1] * SR / h)
    start_max = min(len(F) - lo - 1, int(40 * SR / h))
    for s in range(int(4 * SR / h), max(int(4 * SR / h) + 1, start_max)):
        e = F[s + lo: min(len(F), s + hi)]
        if not len(e):
            break
        # 소리 결이 닮고(코사인) 크기도 비슷해야(1 dB 차마다 0.02 깎음) 이음새가 들리지 않는다
        sim = e @ F[s] - 0.02 * np.abs(LV[s + lo: s + lo + len(e)] - LV[s])
        j = int(np.argmax(sim))
        if sim[j] > best[0]:
            best = (float(sim[j]), s, s + lo + j)
    sim, s, e = best
    s0, e0 = s * h, e * h
    # 샘플 단위 맞춤: 끝 지점 근처(±40 ms)에서 처음 50 ms와 파형 상관이 가장 큰 곳
    L, R = int(0.05 * SR), int(0.04 * SR)
    ref = mono[s0:s0 + L]
    cands = [(float(np.dot(ref, mono[k:k + L])), k) for k in range(e0 - R, e0 + R)]
    e0 = max(cands)[1]
    c = int(CROSS * SR)
    body = a[s0:e0].copy()
    tail = a[e0:e0 + c]
    t = np.linspace(0, np.pi / 2, c)[:, None]
    body[:c] = body[:c] * np.sin(t) + tail * np.cos(t)
    path = os.path.join(OUT, dst)
    # 음량: 한 번에 하는 loudnorm은 시간에 따라 이득을 바꿔 반복 이음새의 앞뒤 크기가 달라진다 →
    #   먼저 재고(통합 음량) 고정 이득(volume) + 최댓값 제한(alimiter)만 건다
    gain = -18.0 - measure_lufs(body, 2)
    encode(body, path, 2, 128, af=f'volume={gain:.2f}dB,alimiter=limit=0.84:level=false')
    print(f'  {dst}: 원곡 {s0 / SR:.2f}–{e0 / SR:.2f}초({(e0 - s0) / SR:.1f}초, 닮음 {sim:.3f}), 크로스페이드 {CROSS}초, 이득 {gain:+.1f} dB(-18 LUFS), 128 kbps')
    return s0 / SR, e0 / SR


def make_sfx(dst, src, maxlen, fade, peak_db):
    a = decode(os.path.join(RAW, src), 1)[:, 0]
    thr = 10 ** (-45 / 20) * max(1e-6, np.abs(a).max())
    nz = np.nonzero(np.abs(a) > thr)[0]
    a = a[(nz[0] if len(nz) else 0):]
    a = a[: int(maxlen * SR)].copy()
    f = min(len(a), int(fade * SR))
    if f:
        a[-f:] *= np.linspace(1, 0, f) ** 2
    a *= 10 ** (peak_db / 20) / max(1e-6, np.abs(a).max())
    encode(a[:, None], os.path.join(OUT, dst), 1, 96)
    print(f'  {dst}: {len(a) / SR:.2f}초, 최댓값 {peak_db} dBFS')


def check():
    ok = True
    for dst, *_ in BGM + SFX:
        p = os.path.join(OUT, dst)
        if not os.path.exists(p):
            print('  없음', dst); ok = False; continue
        ch = 2 if dst.startswith('bgm') else 1
        a = decode(p, ch)
        dur = len(a) / SR
        peak = 20 * np.log10(max(1e-9, np.abs(a).max()))
        note = ''
        if dst.startswith('bgm'):
            # 반복 이음새: 게임(js/core/audio.js loopBounds)처럼 앞뒤 완전 무음(인코더 틈, 60 ms까지)을 뺀 뒤
            #   끝 20 ms와 처음 20 ms의 소리 크기 차
            lim = int(0.06 * SR)
            q = np.abs(a).max(axis=1) <= 1e-4
            s0 = 0
            while s0 < lim and q[s0]: s0 += 1
            e0 = len(a)
            while len(a) - e0 < lim and q[e0 - 1]: e0 -= 1
            a = a[s0:e0]
            n = int(0.02 * SR)
            rms = lambda x: 20 * np.log10(np.sqrt((x ** 2).mean()) + 1e-9)
            gap = abs(rms(a[-n:]) - rms(a[:n]))
            note = f' 이음새 크기 차 {gap:.1f} dB'
            if gap > 6:
                ok = False; note += ' (큼)'
        elif dur > 2.0:
            ok = False; note = ' 2초 넘음'
        if peak > -0.5:
            ok = False; note += ' 클리핑 위험'
        print(f'  {dst} {dur:.2f}초 최댓값 {peak:.1f} dBFS {os.path.getsize(p) // 1024}KB{note}')
    print('점검 통과' if ok else '점검 실패')
    return ok


if __name__ == '__main__':
    if '--check' not in sys.argv:
        os.makedirs(OUT, exist_ok=True)
        for dst, src, rng in BGM:
            make_bgm(dst, src, rng)
        for row in SFX:
            make_sfx(*row)
    sys.exit(0 if check() else 1)
