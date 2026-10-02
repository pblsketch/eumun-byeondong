# -*- coding: utf-8 -*-
"""assets/raw/*.png(Codex 생성 원본, 화풍 B)를 게임이 읽는 assets/img/*.webp로 만든다.

    python tools/process_assets.py            # 모두 만들기
    python tools/process_assets.py --check    # 만든 파일의 크기·투명도만 점검

출처: 자홍 배경 지우기(key_out)·여백 자르기(trim)는 「음운 해전」 pblsketch/sori-haejeon tools/process_assets.py를 가져왔다.

- anchors_<상태>(idle·read·oops·happy·puzzled): 자홍(#FF00FF) 배경을 지워 투명하게 → 책상(아래쪽 가장 넓은 불투명 줄)의
  왼쪽 · 오른쪽 끝이 판의 같은 자리에 오도록 크기를 맞춘다 → 같은 크기의 판(가로 1200)에 '아래 가운데'를 맞춰 놓는다.
  상태를 바꿔 끼워도 책상이 움직이지 않게(종이가 책상 밖으로 삐져나와도 책상 폭으로 맞춤).
- senior: 배경을 지우고 여백을 잘라 가로 640 이하.
- studio_bg: 3:2 그대로 1280×853.
- title: 2:3 그대로 768×1152(시작 화면 오른쪽 그림).
원본(assets/raw/)은 저장소에 올리지 않는다. 프롬프트는 tools/prompts/<이름>.txt, 기록은 design/style-samples.md '게임 그림'.
"""
import os
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, 'assets', 'raw')
OUT = os.path.join(ROOT, 'assets', 'img')

ANCHORS = ['idle', 'read', 'oops', 'happy', 'puzzled']
KEY = np.array([255, 0, 255], dtype=np.float32)


def raw(name):
    return Image.open(os.path.join(RAW, name + '.png')).convert('RGB')


def save_webp(im, name, q=82):
    path = os.path.join(OUT, name + '.webp')
    if im.mode == 'RGBA':
        im.save(path, 'WEBP', quality=q, method=6, exact=False)
    else:
        im.convert('RGB').save(path, 'WEBP', quality=q, method=6)
    print(f'  {name}.webp {im.size[0]}x{im.size[1]} {im.mode} {os.path.getsize(path) // 1024}KB')


def key_out(im):
    """자홍 배경을 투명하게. 한 점 = (1-f)·본래 색 + f·자홍 으로 보고 f = (min(R,B) - G) / 255.
    사람·옷·책상(남색·회색·청록·살색)은 min(R,B) <= G 이거나 아주 작아 지워지지 않고, 머리카락 가장자리처럼
    자홍이 섞인 곳은 본래 색으로 되돌리며 반투명이 된다."""
    a = np.asarray(im, dtype=np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    f = np.clip((np.minimum(r, b) - g) / 255.0, 0, 1)
    f = np.where(f < 0.06, 0.0, f)          # 압축 잡티 · 살색의 붉은 기운은 무시
    f = np.where(f > 0.80, 1.0, f)          # 거의 순수한 자홍은 완전히 투명
    alpha = 1 - f
    al = np.clip(alpha, 1e-3, 1)[..., None]
    rgb = np.clip((a - f[..., None] * KEY) / al, 0, 255)
    rgb = np.where(alpha[..., None] > 0, rgb, 0)
    solid = alpha > 0.1
    lab, n = ndimage.label(solid)
    if n:
        sizes = ndimage.sum(solid, lab, range(1, n + 1))
        tiny = np.isin(lab, np.nonzero(sizes < 40)[0] + 1)
        alpha = np.where(tiny, 0.0, alpha)
    out = np.dstack([rgb, alpha[..., None] * 255]).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')


def trim(im, pad=8):
    bbox = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    if not bbox:
        return im
    l, t, r, b = bbox
    return im.crop((max(0, l - pad), max(0, t - pad), min(im.width, r + pad), min(im.height, b + pad)))


def fit_width(im, w):
    if im.width <= w:
        return im
    h = round(im.height * w / im.width)
    return im.resize((w, h), Image.LANCZOS)


def desk_fit(im, desk_w):
    """책상 윗면 높이(아래에서 25% 줄)의 불투명 구간을 책상 폭으로 보고, 그 폭이 desk_w가 되게 줄인다.
    돌려주는 값: (그림, 줄인 그림에서 책상 왼쪽 끝 x)"""
    a = np.asarray(im.getchannel('A')) > 128
    row = a[int(im.height * 0.75)]
    xs = np.nonzero(row)[0]
    l, r = (int(xs[0]), int(xs[-1])) if len(xs) else (0, im.width - 1)
    k = desk_w / max(1, r - l)
    out = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    return out, round(l * k)


def build():
    os.makedirs(OUT, exist_ok=True)
    # 아나운서 다섯 상태: 같은 판(가로 W)에 아래 가운데를 맞춘다
    W = 1200
    cut = []
    for s in ANCHORS:
        p = os.path.join(RAW, 'anchors_' + s + '.png')
        if not os.path.exists(p):
            print('  (없음) anchors_' + s)
            continue
        im_, left_ = desk_fit(trim(key_out(raw('anchors_' + s)), pad=0), W - 24)
        cut.append((s, im_, left_))
    if cut:
        H = max(im.height for _, im, _ in cut)
        for s, im, left in cut:
            board = Image.new('RGBA', (W, H), (0, 0, 0, 0))
            board.alpha_composite(im, (12 - left, H - im.height))
            save_webp(board, 'anchors_' + s)
    if os.path.exists(os.path.join(RAW, 'senior.png')):
        save_webp(fit_width(trim(key_out(raw('senior'))), 640), 'senior')
    if os.path.exists(os.path.join(RAW, 'studio_bg.png')):
        save_webp(raw('studio_bg').resize((1280, 853), Image.LANCZOS), 'studio_bg', q=78)
    if os.path.exists(os.path.join(RAW, 'title.png')):
        save_webp(raw('title').resize((768, 1152), Image.LANCZOS), 'title', q=80)


def check():
    ok = True
    for f in sorted(os.listdir(OUT)):
        im = Image.open(os.path.join(OUT, f))
        kb = os.path.getsize(os.path.join(OUT, f)) // 1024
        note = ''
        if f.startswith(('anchors_', 'senior')):
            a = np.asarray(im.convert('RGBA'))[..., 3]
            corner = int(a[:4, :4].max())
            if corner > 0:
                ok = False
                note = ' 모서리가 투명하지 않음'
            # 남은 자홍 점
            rgb = np.asarray(im.convert('RGBA'), dtype=np.int32)
            pink = ((rgb[..., 0] > 200) & (rgb[..., 2] > 200) & (rgb[..., 1] < 80) & (rgb[..., 3] > 128)).sum()
            if pink > 50:
                ok = False
                note += f' 자홍 점 {pink}개'
        if kb > 400:
            ok = False
            note += ' 400KB 넘음'
        print(f'  {f} {im.size[0]}x{im.size[1]} {im.mode} {kb}KB{note}')
    print('점검 통과' if ok else '점검 실패')
    return ok


if __name__ == '__main__':
    if '--check' in sys.argv:
        sys.exit(0 if check() else 1)
    build()
    check()
