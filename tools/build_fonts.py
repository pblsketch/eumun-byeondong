# -*- coding: utf-8 -*-
"""발음 감수실의 글꼴(woff2)과 css/fonts.css를 만든다(명세 §14).

    python tools/build_fonts.py        (저장소 맨 위 폴더에서)

출처: 「음운 해전」 pblsketch/sori-haejeon tools/build_fonts.py — 글자 모으기·이름 바꾸기·부분 글꼴 만들기를 가져와
      이 게임에 맞게 고쳤다(Pretendard 한 가지, 발음용 굵기는 한글 음절 전부, 내려받기 없음).

원본 글꼴(SIL Open Font License 1.1)은 tools/fonts_src/에 둔다(저장소에는 올리지 않음).
  선생님 PC의 음운 해전 tools/fonts_src/에서 아래 세 파일을 복사해 온다. 이 스크립트는 아무것도 내려받지 않는다.
  - Pretendard-Medium.otf   안내 글 500 → GamsuUI (게임에 쓰인 글자만)
  - Pretendard-Bold.otf     발음 표시 700 → GamsuPron (현대 한글 음절 11,172자 전부 + 호환 자모 + 기본 라틴 + 기호)
  - OFL-Pretendard.txt

만드는 것
  - assets/fonts/pron-700.woff2   GamsuPron Bold. 음절 블록·프롬프터·발음 표기·제목. 학생이 만든 어떤 음절도
                                  깨지지 않게 한글 음절을 모두 담는다. 안내 글의 굵은 글씨(600~900)도 이 파일을 함께 쓴다.
  - assets/fonts/ui-500.woff2     GamsuUI Medium. 안내 글(400~500). 게임 소스에 쓰인 글자만 담는다.
  - assets/fonts/OFL-Pretendard.txt, css/fonts.css

글자는 index.html의 글, js/ 아래 모든 .js의 문자열(주석 제외), css/ 아래 content 문자열에서 모은다.
화면 문구를 고쳐 새 글자가 생겼다면 이 스크립트를 다시 돌리세요(결과는 늘 같다).

OFL은 수정본(부분 글꼴 포함)이 원래 이름(예약 글꼴 이름 포함)을 글꼴 이름으로 쓰지 못하게 하므로
글꼴 이름을 Gamsu…로 바꾼다. 저작권 표시(name 0)와 라이선스 안내는 그대로 둔다.
"""
import os
import re
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'tools', 'fonts_src')
OUT = os.path.join(ROOT, 'assets', 'fonts')
CSS_OUT = os.path.join(ROOT, 'css', 'fonts.css')
NEEDED = ('Pretendard-Medium.otf', 'Pretendard-Bold.otf', 'OFL-Pretendard.txt')

# 원래 글꼴 이름(수정본의 이름 칸에 남으면 안 되는 말). Pretendard의 예약 글꼴 이름은 Pretendard·Source·Inter·M PLUS 1이다.
ORIGINAL_NAMES = ('Pretendard',)

# 늘 넣는 글자: ASCII 인쇄 문자, 문장 부호·기호, 장음 표시, 현대 한글 호환 자모(ㄱ~ㅎ 30자, ㅏ~ㅣ 21자)
ALWAYS = (
    set(chr(c) for c in range(0x20, 0x7F))
    | set('·…—–‘’“”「」『』〈〉《》→←↑↓○●◎△▲▼▶◀×✕✓ㆍːˑ\u00a0')
    | set(chr(c) for c in range(0x3131, 0x314F))   # ㄱ ~ ㅎ
    | set(chr(c) for c in range(0x314F, 0x3164))   # ㅏ ~ ㅣ
)
HANGUL_ALL = set(chr(c) for c in range(0xAC00, 0xD7A4))   # 현대 한글 음절 11,172자


def check_sources():
    miss = [n for n in NEEDED if not os.path.exists(os.path.join(SRC, n))]
    if miss:
        print('tools/fonts_src/에 원본이 없습니다:', ', '.join(miss))
        print('음운 해전 저장소의 tools/fonts_src/에서 복사해 오세요(내려받지 않습니다).')
        sys.exit(1)


# ── 글자 모으기 (음운 해전과 같음) ─────────────────────────────

def _unescape_js(s):
    """JS 문자열 속 \\uXXXX, \\u{…}, \\xXX 이스케이프를 실제 글자로 바꾼다(모르는 이스케이프는 그대로)."""
    def rep(m):
        g = m.group(1) or m.group(2) or m.group(3)
        try:
            return chr(int(g, 16))
        except ValueError:
            return m.group(0)
    return re.sub(r'\\u\{([0-9a-fA-F]+)\}|\\u([0-9a-fA-F]{4})|\\x([0-9a-fA-F]{2})', rep, s)


def js_strings(src):
    """JS 소스에서 주석을 건너뛰고 문자열('…', "…", `…`)과 정규식 리터럴 속 글자만 돌려준다.
    완전한 파서는 아니지만 이 프로젝트의 평범한 스크립트에는 충분하다."""
    out = []
    i, n = 0, len(src)
    prev = ''  # 공백이 아닌 바로 앞 글자(정규식/나눗셈 구분용)
    while i < n:
        c = src[i]
        if src.startswith('//', i):
            j = src.find('\n', i)
            i = n if j < 0 else j
            continue
        if src.startswith('/*', i):
            j = src.find('*/', i + 2)
            i = n if j < 0 else j + 2
            continue
        if c in '\'"`':
            j = i + 1
            buf = []
            while j < n and src[j] != c:
                if src[j] == '\\' and j + 1 < n:
                    buf.append(src[j:j + 2])
                    j += 2
                    continue
                if c != '`' and src[j] == '\n':
                    break
                buf.append(src[j])
                j += 1
            out.append(_unescape_js(''.join(buf)))
            i = j + 1
            prev = c
            continue
        if c == '/' and (prev == '' or prev in '(,=:[!&|?{};+-*%<>~^'):
            # 정규식 리터럴: 안의 글자(한글 범위 등)도 모아 둔다
            j = i + 1
            in_cls = False
            while j < n and src[j] != '\n':
                if src[j] == '\\':
                    j += 2
                    continue
                if src[j] == '[':
                    in_cls = True
                elif src[j] == ']':
                    in_cls = False
                elif src[j] == '/' and not in_cls:
                    break
                j += 1
            out.append(_unescape_js(src[i + 1:j]))
            i = j + 1
            prev = '/'
            continue
        if not c.isspace():
            prev = c
        i += 1
    return out


def html_text(src):
    """HTML에서 주석·스크립트·스타일을 빼고, 태그 밖 글과 사람이 읽는 속성 값을 돌려준다."""
    src = re.sub(r'<!--.*?-->', '', src, flags=re.S)
    src = re.sub(r'<(script|style)\b[^>]*>.*?</\1>', '', src, flags=re.S | re.I)
    out = re.findall(r'\b(?:title|content|alt|placeholder|aria-label|value|label)\s*=\s*"([^"]*)"', src)
    out.append(re.sub(r'<[^>]*>', ' ', src))
    return out


def _unescape_css(s):
    return re.sub(r'\\([0-9a-fA-F]{1,6})\s?', lambda m: chr(int(m.group(1), 16)), s)


def css_content(src):
    """CSS에서 content: "…" 문자열만 돌려준다(주석 제외)."""
    src = re.sub(r'/\*.*?\*/', '', src, flags=re.S)
    return [_unescape_css(a or b) for a, b in re.findall(r'content\s*:[^;{}]*?(?:"([^"]*)"|\'([^\']*)\')', src)]


def walk(folder, ext):
    base = os.path.join(ROOT, folder)
    for d, _, files in sorted(os.walk(base)):
        for f in sorted(files):
            if f.endswith(ext):
                yield os.path.join(d, f)


def used_chars():
    texts = []
    with open(os.path.join(ROOT, 'index.html'), encoding='utf-8') as f:
        texts += html_text(f.read())
    for p in walk('js', '.js'):
        with open(p, encoding='utf-8') as f:
            texts += js_strings(f.read())
    for p in walk('css', '.css'):
        if os.path.abspath(p) == os.path.abspath(CSS_OUT):
            continue
        with open(p, encoding='utf-8') as f:
            texts += css_content(f.read())
    found = set(''.join(texts))
    keep = lambda c: ord(c) >= 0x20 and not (0x7F <= ord(c) < 0xA0)
    return {c for c in found | ALWAYS if keep(c)}, {c for c in found if keep(c)}


# ── 글꼴 만들기 ────────────────────────────────────────────────

def rename(font, family, style):
    """이름 칸을 새 이름으로 바꾼다. 1·2는 family/style, 4·6은 전체 이름, 16·17·21·22·25는 지운다."""
    ps = family.replace(' ', '') + '-' + style.replace(' ', '')
    full = family + ('' if style == 'Regular' else ' ' + style)
    name = font['name']
    name.names = [r for r in name.names if r.nameID not in (16, 17, 21, 22, 25)]
    for r in name.names:
        if r.nameID == 1:
            r.string = family
        elif r.nameID == 2:
            r.string = style
        elif r.nameID == 3:
            r.string = ps + ';subset'
        elif r.nameID == 4:
            r.string = full
        elif r.nameID == 6:
            r.string = ps
    # 남은 이름 칸(저작권 0, 상표 7, 제작 8·9, 설명 10, 주소 11·12, 라이선스 13·14 제외)에 원래 이름이 남았는지 확인
    for r in name.names:
        if r.nameID in (0, 7, 8, 9, 10, 11, 12, 13, 14):
            continue
        s = r.toUnicode()
        if any(o in s for o in ORIGINAL_NAMES):
            r.string = s.replace('Pretendard', family)
    if 'CFF ' in font:
        font['CFF '].cff.fontNames = [ps]


def build(src, out_name, unicodes, family, style):
    font = TTFont(src)
    cmap = font.getBestCmap()
    missing = sorted(c for c in unicodes if c not in cmap and chr(c) not in ' \u00a0')
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['*']
    opts.name_IDs = ['*']
    opts.name_languages = ['*']
    opts.notdef_outline = True
    opts.hinting = False
    opts.drop_tables += ['STAT']
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=sorted(unicodes))
    sub.subset(font)
    rename(font, family, style)
    font.flavor = 'woff2'
    font.recalcTimestamp = False  # 수정 시각을 원본 그대로 둬서 다시 돌려도 같은 파일이 나오게
    out = os.path.join(OUT, out_name)
    font.save(out)
    kept = font.getBestCmap()
    hangul = sum(1 for c in kept if 0xAC00 <= c <= 0xD7A3)
    print(f'  {out_name:18s} {family} {style:7s} 글자 {len(kept):5d}개(한글 음절 {hangul:5d})  '
          f'{os.path.getsize(out) / 1024:7.1f} KB')
    return missing


# (파일, 원본, 새 family, style, 담을 글자 'all'|'used', @font-face 묶음[(family, font-weight 설명자)])
#   pron-700은 GamsuPron(700, 600~900을 모두 받음)이면서 GamsuUI의 굵은 글씨(600~900)도 맡는다 — 파일 하나로 두 역할.
def plan():
    return [
        ('pron-700.woff2', 'Pretendard-Bold.otf', 'GamsuPron', 'Bold', 'all',
         [('GamsuPron', '400 900'), ('GamsuUI', '600 900')]),
        ('ui-500.woff2', 'Pretendard-Medium.otf', 'GamsuUI', 'Medium', 'used',
         [('GamsuUI', '400 500')]),
    ]


def write_license():
    with open(os.path.join(SRC, 'OFL-Pretendard.txt'), encoding='utf-8') as lic:
        text = lic.read().replace('\r\n', '\n').rstrip() + '\n'
    with open(os.path.join(OUT, 'OFL-Pretendard.txt'), 'w', encoding='utf-8', newline='\n') as f:
        f.write('assets/fonts의 pron-700.woff2(GamsuPron)와 ui-500.woff2(GamsuUI)는 Pretendard(SIL Open Font License 1.1)에서\n'
                '이 게임에 필요한 글자만 남긴 수정본이다. OFL 규칙에 따라 글꼴 이름을 바꾸었다.\n'
                '아래는 원 글꼴의 저작권 표시와 라이선스 전문(원문 그대로)이다.\n'
                + '=' * 72 + '\n' + text)
    print('  OFL-Pretendard.txt')


def write_css(rows):
    faces = []
    for out_name, _, _, _, _, faces_of in rows:
        for family, weight_desc in faces_of:
            faces.append(f"@font-face {{ font-family: '{family}'; src: url('../assets/fonts/{out_name}') format('woff2'); "
                         f"font-weight: {weight_desc}; font-style: normal; font-display: swap; }}")
    css = (
        '/* 이 파일은 tools/build_fonts.py가 만든다. 손으로 고치지 말고 스크립트를 다시 돌리세요.\n'
        ' * 글꼴: Pretendard(OFL 1.1)에서 이름을 바꾼 두 파일(예약 글꼴 이름을 쓰지 않음).\n'
        ' *   GamsuPron = pron-700(700, 현대 한글 음절 11,172자 전부): 음절 블록·프롬프터·발음 표기·제목.\n'
        ' *   GamsuUI   = ui-500(500, 쓰인 글자만) + 굵은 글씨(600~900)는 pron-700을 함께 쓴다.\n'
        ' * 쓰는 법: index.html에서 css/base.css 다음에 이 파일을 불러온다.\n'
        ' *   base.css의 :root가 --font-body/--font-title/--font-pron을 기기 글꼴로 먼저 정하고,\n'
        ' *   아래 :root가 같은 변수를 덮어써 동봉 글꼴을 맨 앞에 더한다(뒤에 불러온 쪽이 이김). 변수의 주인은 base.css다.\n'
        ' * 굵기 설명자를 범위로 두어 적힌 굵기 밖의 값에서도 가짜 굵게가 생기지 않게 했다. */\n'
        + '\n'.join(faces) + '\n'
        ':root {\n'
        "  --font-body: 'GamsuUI', 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', sans-serif;\n"
        "  --font-title: 'GamsuPron', 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', sans-serif;\n"
        "  --font-pron: 'GamsuPron', 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', sans-serif;\n"
        '}\n'
    )
    with open(CSS_OUT, 'w', encoding='utf-8', newline='\n') as f:
        f.write(css)
    print('  css/fonts.css')


def main():
    check_sources()
    os.makedirs(OUT, exist_ok=True)
    chars, found = used_chars()
    used = {ord(c) for c in chars}
    full = used | {ord(c) for c in HANGUL_ALL}
    print(f'게임 소스에서 모은 글자 {len(found)}개, 안내 글꼴 {len(used)}개, 발음 글꼴 {len(full)}개')

    # 예전 결과물 지우기(이름이 바뀐 파일이 남지 않게)
    for f in os.listdir(OUT):
        if f.endswith('.woff2'):
            os.remove(os.path.join(OUT, f))

    rows = plan()
    missing_all = {}
    for out_name, src, family, style, scope, _ in rows:
        miss = build(os.path.join(SRC, src), out_name, full if scope == 'all' else used, family, style)
        if miss:
            missing_all[f'{family} {style}'] = miss
    write_license()
    write_css(rows)

    # 게임 소스에서 모은 글자가 빠지면 문제(기기 글꼴로 보임). 늘 넣는 기호가 빠진 것은 참고로만 알린다.
    src_cps = {ord(c) for c in found}
    fmt = lambda miss: ' '.join(f'{chr(c)}(U+{c:04X})' for c in miss)
    bad = {k: [c for c in v if c in src_cps] for k, v in missing_all.items()}
    bad = {k: v for k, v in bad.items() if v}
    info = {k: [c for c in v if c not in src_cps] for k, v in missing_all.items()}
    info = {k: v for k, v in info.items() if v}
    if bad:
        print('게임 글자 중 원본 글꼴에 없는 글자(기기 글꼴로 보임):')
        for k, miss in bad.items():
            print(f'  {k}: {len(miss)}개  {fmt(miss)}')
    else:
        print('게임 글자 중 원본 글꼴에 없는 글자: 없음')
    if info:
        print('참고 — 늘 넣는 기호 중 원본에 없어 빠진 것:')
        for k, miss in info.items():
            print(f'  {k}: {fmt(miss)}')


if __name__ == '__main__':
    main()
