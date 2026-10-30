from PIL import Image, ImageDraw, ImageFilter
import random
import os

# ------------------------------------------------------------
# Arte pixel art "FUJA DA SETEC"
# Resolução lógica 640x360, exportada em 1920x1080 (pixels 3x)
# ------------------------------------------------------------

FONT = {
    "F": ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
    "U": ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
    "J": ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
    "A": ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
    "D": ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
    "S": ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
    "E": ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
    "T": ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
    "C": ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
}

W, H = 640, 360
BG = (7, 10, 31)
OUTLINE = (3, 5, 15)
SHADOW = (1, 2, 8)

def paint_stars(base):
    draw = ImageDraw.Draw(base)
    rng = random.Random(7)
    for _ in range(90):
        x, y = rng.randrange(W), rng.randrange(H)
        tone = rng.choice([(16, 22, 48), (23, 31, 66), (34, 46, 92), (52, 67, 124)])
        draw.point((x, y), fill=tone)
    for _ in range(18):
        x, y = rng.randrange(W), rng.randrange(H)
        draw.rectangle([x, y, x + 1, y + 1], fill=(44, 58, 110))


def glyph_cells(ch):
    rows = FONT[ch]
    return [(cx, cy) for cy, row in enumerate(rows) for cx, bit in enumerate(row) if bit == "1"]


def shift_color(col, delta):
    return tuple(max(0, min(255, c + delta)) for c in col)


# ------------------------- texturas escolares -------------------------

def tex_notebook(d, x, y, c, gx, gy):
    base = (46, 111, 216) if (gx + gy) % 3 else (56, 128, 236)
    d.rectangle([x, y, x + c - 1, y + c - 1], fill=base)
    d.line([x, y, x + c - 1, y], fill=(104, 174, 255))
    d.line([x, y + c - 1, x + c - 1, y + c - 1], fill=(25, 69, 150))
    # linhas de caderno
    if gy % 2 == 1:
        d.line([x, y + c - 2, x + c - 1, y + c - 2], fill=(190, 226, 255))
    # espiral na borda esquerda
    if gx == 0:
        d.rectangle([x, y + 1, x + 2, y + c - 2], fill=(224, 234, 246))
        d.point((x + 1, y + c // 2), fill=(94, 108, 128))


def tex_pencil(d, x, y, c, gx, gy):
    d.rectangle([x, y, x + c - 1, y + c - 1], fill=(246, 201, 69))
    d.line([x, y, x + c - 1, y], fill=(255, 231, 128))
    d.line([x, y + c - 1, x + c - 1, y + c - 1], fill=(210, 148, 33))
    d.line([x + 1, y, x + 1, y + c - 1], fill=(255, 236, 150))
    d.line([x, y + 2, x + c - 1, y + 2], fill=(122, 83, 25))
    if gy == 6 and 1 <= gx <= 3:
        d.rectangle([x, y + c - 2, x + c - 1, y + c - 1], fill=(214, 158, 92))


def tex_ruler(d, x, y, c, gx, gy):
    d.rectangle([x, y, x + c - 1, y + c - 1], fill=(217, 160, 90))
    d.line([x, y, x + c - 1, y], fill=(243, 195, 130))
    d.line([x, y + 1, x + c - 1, y + 1], fill=(243, 195, 130))
    d.line([x, y + c - 1, x + c - 1, y + c - 1], fill=(157, 105, 48))
    tick = (103, 67, 27)
    mid = x + c // 2
    d.line([mid, y, mid, y + 1], fill=tick)
    if gx % 2 == 0:
        d.line([mid, y + c - 2, mid, y + c - 1], fill=tick)
    else:
        d.point((mid, y + c - 2), fill=tick)


def tex_eraser(d, x, y, c, gx, gy):
    if gy == 3:
        d.rectangle([x, y, x + c - 1, y + c - 1], fill=(59, 111, 209))
        d.line([x, y, x + c - 1, y], fill=(111, 158, 245))
        d.line([x, y + c - 1, x + c - 1, y + c - 1], fill=(34, 71, 150))
    else:
        d.rectangle([x, y, x + c - 1, y + c - 1], fill=(244, 127, 159))
        d.line([x, y, x + c - 1, y], fill=(255, 179, 200))
        d.line([x, y + c - 1, x + c - 1, y + c - 1], fill=(190, 79, 114))
        d.point((x + 1, y + 1), fill=(255, 208, 221))


def tex_scissors(d, x, y, c, gx, gy):
    if gy >= 6:
        base, hi, lo = (214, 64, 69), (248, 128, 128), (150, 38, 46)
    else:
        base = (197, 206, 216) if (gx + gy) % 4 else (181, 191, 203)
        hi, lo = (238, 243, 248), (141, 154, 169)
    d.rectangle([x, y, x + c - 1, y + c - 1], fill=base)
    d.line([x, y, x + c - 1, y], fill=hi)
    d.line([x, y + c - 1, x + c - 1, y + c - 1], fill=lo)
    if gy < 6:
        d.line([x + 1, y, x + 1, y + c - 1], fill=(228, 235, 243))
    if gy == 6 and gx in (0, 3):
        d.point((x + 2, y + 2), fill=(255, 150, 150))


def tex_pen(d, x, y, c, gx, gy):
    if gy == 0:
        d.rectangle([x, y, x + c - 1, y + c - 1], fill=(28, 34, 66))
        d.line([x, y, x + c - 1, y], fill=(74, 84, 124))
    elif gy == 1:
        d.rectangle([x, y, x + c - 1, y + c - 1], fill=(232, 185, 62))
        d.line([x, y, x + c - 1, y], fill=(255, 223, 127))
    else:
        d.rectangle([x, y, x + c - 1, y + c - 1], fill=(36, 75, 156))
        d.line([x, y, x + c - 1, y], fill=(79, 127, 224))
        d.line([x, y + c - 1, x + c - 1, y + c - 1], fill=(21, 44, 99))
        if gx == 0:
            d.line([x + 1, y, x + 1, y + c - 1], fill=(223, 231, 242))


MATERIALS = {
    "notebook": tex_notebook,
    "pencil": tex_pencil,
    "ruler": tex_ruler,
    "eraser": tex_eraser,
    "scissors": tex_scissors,
    "pen": tex_pen,
}


def add_row(base, text, cell, y, materials):
    units = len(text) * 5 + (len(text) - 1)
    x0 = (W - units * cell) // 2
    x_cursor = x0
    li = 0
    for ch in text:
        if ch == " ":
            x_cursor += 6 * cell
            continue
        cells = glyph_cells(ch)
        gw = 5 * cell
        gh = 7 * cell
        pad = 8
        tile = Image.new("RGBA", (gw + pad * 2, gh + pad * 2), (0, 0, 0, 0))
        td = ImageDraw.Draw(tile)
        tex = MATERIALS[materials[li]]
        for gx, gy in cells:
            tex(td, pad + gx * cell, pad + gy * cell, cell, gx, gy)

        alpha = tile.split()[3].point(lambda a: 255 if a > 128 else 0)
        outline = alpha.filter(ImageFilter.MaxFilter(3))
        shadow = Image.new("L", tile.size, 0)
        shadow.paste(outline, (4, 4))

        layer = Image.new("RGBA", tile.size, (0, 0, 0, 0))
        sh = Image.new("RGBA", tile.size, SHADOW + (255,))
        layer.paste(sh, (0, 0), shadow)
        ol = Image.new("RGBA", tile.size, OUTLINE + (255,))
        layer.paste(ol, (0, 0), outline)
        layer.alpha_composite(tile)
        base.alpha_composite(layer, (x_cursor - pad, y - pad))
        x_cursor += (5 + 1) * cell
        li += 1
    return x_cursor


# ------------------------- blocos 8-bit -------------------------

BLOCK_PALETTE = [
    (255, 77, 94), (255, 159, 28), (255, 225, 77), (155, 255, 77),
    (46, 204, 113), (53, 224, 224), (77, 125, 255), (160, 92, 255),
    (255, 106, 213), (255, 61, 154),
]


def choose_colors(text):
    rnd = random.Random(42)
    result = []
    for li, ch in enumerate(text):
        cells = glyph_cells(ch)
        cell_colors = {}
        for gx, gy in cells:
            choices = list(BLOCK_PALETTE)
            left = cell_colors.get((gx - 1, gy))
            up = cell_colors.get((gx, gy - 1))
            if left:
                choices = [c for c in choices if c != left]
            if up:
                choices = [c for c in choices if c != up]
            cell_colors[(gx, gy)] = rnd.choice(choices)
        result.append(cell_colors)
    return result


def add_blocks(base, text, cell, y):
    units = len(text) * 5 + (len(text) - 1)
    x0 = (W - units * cell) // 2
    colors = choose_colors(text)
    x_cursor = x0
    for li, ch in enumerate(text):
        cells = glyph_cells(ch)
        gw = 5 * cell
        gh = 7 * cell
        pad = 9
        tile = Image.new("RGBA", (gw + pad * 2, gh + pad * 2), (0, 0, 0, 0))
        td = ImageDraw.Draw(tile)
        for gx, gy in cells:
            x = pad + gx * cell
            yy = pad + gy * cell
            col = colors[li][(gx, gy)]
            td.rectangle([x, yy, x + cell - 1, yy + cell - 1], fill=(8, 11, 26))
            td.rectangle([x + 1, yy + 1, x + cell - 2, yy + cell - 2], fill=col)
            td.line([x + 1, yy + 1, x + cell - 2, yy + 1], fill=shift_color(col, 55))
            td.line([x + 1, yy + 1, x + 1, yy + cell - 2], fill=shift_color(col, 35))
            td.line([x + 1, yy + cell - 2, x + cell - 2, yy + cell - 2], fill=shift_color(col, -50))
            td.line([x + cell - 2, yy + 1, x + cell - 2, yy + cell - 2], fill=shift_color(col, -35))
            td.point((x + 2, yy + 2), fill=shift_color(col, 85))

        alpha = tile.split()[3].point(lambda a: 255 if a > 128 else 0)
        shadow = Image.new("L", tile.size, 0)
        shadow.paste(alpha, (5, 5))
        layer = Image.new("RGBA", tile.size, (0, 0, 0, 0))
        sh = Image.new("RGBA", tile.size, SHADOW + (255,))
        layer.paste(sh, (0, 0), shadow)
        layer.alpha_composite(tile)
        base.alpha_composite(layer, (x_cursor - pad, y - pad))
        x_cursor += (5 + 1) * cell


# ------------------------- composição -------------------------

def draw_title(base):
    add_row(base, "FUJA DA", 8, 95, ["notebook", "pencil", "ruler", "eraser", "scissors", "pen"])
    add_blocks(base, "SETEC", 10, 188)


def make_art():
    base = Image.new("RGBA", (W, H), BG + (255,))
    paint_stars(base)
    draw_title(base)
    return base.convert("RGB").resize((W * 3, H * 3), Image.NEAREST)


def make_logo():
    base = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw_title(base)
    bbox = base.getbbox()
    pad = 10
    left = max(0, bbox[0] - pad)
    top = max(0, bbox[1] - pad)
    right = min(W, bbox[2] + pad)
    bottom = min(H, bbox[3] + pad)
    base = base.crop((left, top, right, bottom))
    return base.resize((base.width * 3, base.height * 3), Image.NEAREST)


folder = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Img")
os.makedirs(folder, exist_ok=True)

art_path = os.path.join(folder, "fuja_da_setec_pixel_art.png")
logo_path = os.path.join(folder, "logo_fuja_da_setec.png")

art = make_art()
logo = make_logo()
art.save(art_path)
logo.save(logo_path)
print(art_path, art.size)
print(logo_path, logo.size)
