from __future__ import annotations

import json
import math
import os
import re
import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ART_ROOT = ROOT / "assets" / "card-art-v2"
LEGACY_ART_ROOT = ROOT / "assets" / "card-art"
TRIAL_ROOT = ROOT / "assets" / "generated-cards" / "imagegen-trial"
OUTPUT_ROOT = ROOT / "assets" / "generated-cards" / "imagegen-us-v1"
FACTION_MARK = ROOT / "assets" / "common-card-ui" / "faction" / "usa.png"

W, H = 1024, 1536
GOLD = (244, 190, 96, 255)
PALE_GOLD = (255, 229, 173, 255)
WHITE = (246, 243, 234, 255)
INK = (5, 6, 7, 255)

FONT_CANDIDATES = [
    Path(r"C:\Windows\Fonts\NotoSansSC-VF.ttf"),
    Path(r"C:\Windows\Fonts\SourceHanSansCN-Normal.ttf"),
    Path(r"C:\Windows\Fonts\msyh.ttc"),
    Path(r"C:\Windows\Fonts\simhei.ttf"),
]
BOLD_FONT_CANDIDATES = [
    Path(r"C:\Windows\Fonts\NotoSansSC-VF.ttf"),
    Path(r"C:\Windows\Fonts\SourceHanSansCN-Normal.ttf"),
    Path(r"C:\Windows\Fonts\msyhbd.ttc"),
    Path(r"C:\Windows\Fonts\simhei.ttf"),
]

LINE_LABELS = {
    "frontline": "前线区",
    "support": "支援区",
    "instant": "即时",
}

TYPE_LABELS = {
    "unit": "单位",
    "tactic": "战术牌",
    "strategy": "战略牌",
}

RARITY_STARS = {
    "common": 1,
    "uncommon": 2,
    "rare": 3,
    "epic": 4,
    "legendary": 5,
}

EFFECT_OVERRIDES = {
    "us_decoy_position": "【诱饵阵地】：在场上支援阵地部署一个无战力且隐蔽部署的诱饵目标。",
}


def font_path(candidates: list[Path]) -> str:
    for path in candidates:
        if path.exists():
            return str(path)
    return str(Path(r"C:\Windows\Fonts\arial.ttf"))


BODY_FONT = font_path(FONT_CANDIDATES)
TITLE_FONT = font_path(BOLD_FONT_CANDIDATES)


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(TITLE_FONT if bold else BODY_FONT, size=size)


def read_usa_cards() -> list[dict]:
    js = """
import { CARD_LIBRARY } from './src/game-data.js';
const rarityStars = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 };
const cards = Object.values(CARD_LIBRARY)
  .filter((card) => card.faction === 'usa')
  .map((card) => ({
    id: card.id,
    name: card.name,
    power: card.power,
    type: card.type,
    tags: card.tags,
    line: card.line,
    lines: card.lines,
    rarity: card.rarity,
    stars: rarityStars[card.rarity] || 1,
    art: card.art,
    effect: card.effect,
  }));
console.log(JSON.stringify(cards));
"""
    node = os.environ.get("NODE_EXE", "node")
    result = subprocess.run(
        [node, "--input-type=module", "-e", js],
        cwd=ROOT,
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        encoding="utf-8",
    )
    cards = json.loads(result.stdout)
    for card in cards:
        if card["id"] in EFFECT_OVERRIDES:
            card["effect"] = EFFECT_OVERRIDES[card["id"]]
    return cards


def cover_image(img: Image.Image, size: tuple[int, int] = (W, H)) -> Image.Image:
    img = img.convert("RGB")
    src_w, src_h = img.size
    dst_w, dst_h = size
    scale = max(dst_w / src_w, dst_h / src_h)
    resized = img.resize((math.ceil(src_w * scale), math.ceil(src_h * scale)), Image.Resampling.LANCZOS)
    left = (resized.width - dst_w) // 2
    top = (resized.height - dst_h) // 2
    return resized.crop((left, top, left + dst_w, top + dst_h)).convert("RGBA")


def get_source_art(card: dict) -> Path:
    trial_art = TRIAL_ROOT / f"{card['id']}-art.png"
    if trial_art.exists():
        return trial_art
    modern = ART_ROOT / f"{card.get('art') or card['id']}.jpg"
    if modern.exists():
        return modern
    legacy = LEGACY_ART_ROOT / f"{card.get('art') or card['id']}.jpg"
    if legacy.exists():
        return legacy
    raise FileNotFoundError(f"No art source for {card['id']}")


def grade_art(base: Image.Image) -> Image.Image:
    base = ImageEnhance.Contrast(base).enhance(1.08)
    base = ImageEnhance.Color(base).enhance(0.92)
    base = ImageEnhance.Sharpness(base).enhance(1.08)
    return base


def add_linear_gradient(img: Image.Image, top_alpha: int = 124, bottom_alpha: int = 186) -> None:
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    px = overlay.load()
    for y in range(H):
        top = max(0, 1 - y / 430)
        bottom = max(0, (y - 820) / 716)
        alpha = int(top * top_alpha + bottom * bottom_alpha)
        if alpha:
            for x in range(W):
                px[x, y] = (0, 0, 0, min(230, alpha))
    img.alpha_composite(overlay)


def draw_glow_line(draw: ImageDraw.ImageDraw, xy: tuple[int, int, int, int], fill=GOLD, width: int = 2) -> None:
    x1, y1, x2, y2 = xy
    draw.line((x1, y1, x2, y2), fill=(255, 221, 155, 74), width=width + 5)
    draw.line((x1, y1, x2, y2), fill=fill, width=width)


def draw_border(draw: ImageDraw.ImageDraw) -> None:
    inset = 18
    cut = 32
    points = [
        (inset + cut, inset), (W - inset - cut, inset), (W - inset, inset + cut),
        (W - inset, H - inset - cut), (W - inset - cut, H - inset),
        (inset + cut, H - inset), (inset, H - inset - cut), (inset, inset + cut),
    ]
    draw.line(points + [points[0]], fill=(223, 177, 101, 170), width=2, joint="curve")
    inner = 30
    points2 = [
        (inner + cut, inner), (W - inner - cut, inner), (W - inner, inner + cut),
        (W - inner, H - inner - cut), (W - inner - cut, H - inner),
        (inner + cut, H - inner), (inner, H - inner - cut), (inner, inner + cut),
    ]
    draw.line(points2 + [points2[0]], fill=(255, 232, 177, 60), width=1, joint="curve")


def fit_font(draw: ImageDraw.ImageDraw, text: str, max_width: int, start: int, minimum: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    for size in range(start, minimum - 1, -2):
        font = load_font(size, bold=bold)
        if draw.textlength(text, font=font) <= max_width:
            return font
    return load_font(minimum, bold=bold)


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    text = re.sub(r"\s+", " ", text.strip())
    lines: list[str] = []
    current = ""
    for ch in text:
        trial = current + ch
        if draw.textlength(trial, font=font) <= max_width or not current:
            current = trial
        else:
            lines.append(current.rstrip())
            current = ch.lstrip()
    if current:
        lines.append(current.rstrip())
    return lines


def parse_skills(effect: str) -> list[tuple[str, str]]:
    matches = list(re.finditer(r"【([^】]+)】：(.*?)(?=【[^】]+】：|$)", effect))
    skills: list[tuple[str, str]] = []
    for match in matches:
        title = match.group(1).strip()
        body = match.group(2).strip(" 。")
        skills.append((title, body + "。"))
    if skills:
        return skills[:2]
    return [("战术效果", effect)]


def line_label(card: dict) -> str:
    if card.get("line") == "instant":
        return "即时"
    lines = card.get("lines") or [card.get("line")]
    return "/".join(LINE_LABELS.get(line, line) for line in lines if line)


def draw_badge(draw: ImageDraw.ImageDraw, x: int, y: int, label: str, icon: str) -> int:
    font = load_font(38, bold=True)
    label_w = int(draw.textlength(label, font=font))
    w = max(180, label_w + 112)
    h = 66
    slant = 16
    poly = [(x + slant, y), (x + w - slant, y), (x + w, y + h // 2), (x + w - slant, y + h), (x + slant, y + h), (x, y + h // 2)]
    draw.polygon(poly, fill=(12, 13, 12, 146), outline=(255, 230, 178, 190))
    draw.line(poly + [poly[0]], fill=(255, 230, 178, 210), width=2)
    draw.text((x + 34, y + 16), icon, font=load_font(34, bold=True), fill=WHITE, stroke_width=1, stroke_fill=(0, 0, 0, 180))
    draw.text((x + 82, y + 13), label, font=font, fill=WHITE, stroke_width=2, stroke_fill=(0, 0, 0, 190))
    return w


def icon_kind(title: str, body: str, tags: list[str]) -> str:
    content = title + body + "".join(tags)
    if any(word in content for word in ["维修", "修复", "回收", "补给"]):
        return "repair"
    if any(word in content for word in ["防空", "拦截", "地空", "直升机", "战斗机", "轰炸机"]):
        return "air"
    if any(word in content for word in ["侦", "暴露", "引导", "指示", "坐标", "渗透", "电子"]):
        return "recon"
    if any(word in content for word in ["装甲", "突击", "压制", "伏击", "导弹", "火力", "炮击", "空袭", "轰炸"]):
        return "strike"
    return "support"


def draw_skill_icon(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], kind: str) -> None:
    x1, y1, x2, y2 = box
    cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
    r = min(x2 - x1, y2 - y1) // 3
    draw.rounded_rectangle(box, radius=28, outline=(255, 230, 178, 170), width=2, fill=(9, 10, 10, 96))
    if kind == "repair":
        draw.line((cx - 28, cy + 22, cx + 26, cy - 32), fill=WHITE, width=7)
        draw.line((cx - 38, cy - 18, cx - 12, cy + 8), fill=WHITE, width=6)
        draw.line((cx - 32, cy + 32, cx + 34, cy + 32), fill=PALE_GOLD, width=5)
    elif kind == "air":
        draw.polygon([(cx, cy - 42), (cx + 48, cy + 26), (cx + 8, cy + 12), (cx, cy + 44), (cx - 8, cy + 12), (cx - 48, cy + 26)], outline=WHITE, fill=None)
        draw.line((cx, cy - 42, cx, cy + 42), fill=WHITE, width=3)
        draw.arc((cx - 54, cy - 54, cx + 54, cy + 54), 210, 330, fill=PALE_GOLD, width=3)
    elif kind == "recon":
        for radius in (18, 36, 54):
            draw.arc((cx - radius, cy - radius, cx + radius, cy + radius), 210, 330, fill=WHITE if radius == 18 else PALE_GOLD, width=3)
        draw.line((cx, cy, cx + 48, cy - 28), fill=WHITE, width=4)
        draw.ellipse((cx - 6, cy - 6, cx + 6, cy + 6), fill=WHITE)
    elif kind == "strike":
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), outline=WHITE, width=4)
        draw.ellipse((cx - 10, cy - 10, cx + 10, cy + 10), outline=WHITE, width=3)
        draw.line((cx - 58, cy, cx - 22, cy), fill=WHITE, width=4)
        draw.line((cx + 22, cy, cx + 58, cy), fill=WHITE, width=4)
        draw.line((cx, cy - 58, cx, cy - 22), fill=WHITE, width=4)
        draw.line((cx, cy + 22, cx, cy + 58), fill=WHITE, width=4)
    else:
        draw.polygon([(cx, cy - 54), (cx + 46, cy - 20), (cx + 30, cy + 44), (cx, cy + 58), (cx - 30, cy + 44), (cx - 46, cy - 20)], outline=WHITE)
        draw.line((cx, cy - 38, cx, cy + 34), fill=WHITE, width=4)


def draw_panel(img: Image.Image, x: int, y: int, w: int, h: int, title: str, body: str, tags: list[str]) -> None:
    draw = ImageDraw.Draw(img)
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)
    odraw.rounded_rectangle((x, y, x + w, y + h), radius=18, fill=(7, 8, 8, 154), outline=(255, 230, 178, 138), width=2)
    odraw.rounded_rectangle((x + 4, y + 4, x + w - 4, y + h - 4), radius=14, outline=(255, 255, 255, 36), width=1)
    img.alpha_composite(overlay.filter(ImageFilter.GaussianBlur(0.2)))
    icon_box = (x + 30, y + 25, x + 158, y + h - 25)
    draw_skill_icon(draw, icon_box, icon_kind(title, body, tags))
    title_font = load_font(40 if h >= 220 else 42 if h >= 170 else 36, bold=True)
    text_x = x + 200
    max_w = w - 230
    draw.text((text_x, y + 30), f"【{title}】：", font=title_font, fill=WHITE, stroke_width=2, stroke_fill=(0, 0, 0, 170))
    available_h = h - 96
    for size in range(31 if h >= 220 else 33 if h >= 170 else 29, 22, -2):
        body_font = load_font(size, bold=True)
        lines = wrap_text(draw, body, body_font, max_w)
        line_h = int(body_font.size * 1.22)
        if len(lines) * line_h <= available_h:
            break
    max_lines = max(2, available_h // max(28, int(body_font.size * 1.22)))
    if len(lines) > max_lines:
        lines = lines[:max_lines]
        lines[-1] = lines[-1].rstrip("。") + "..."
    yy = y + 88
    for line in lines:
        draw.text((text_x, yy), line, font=body_font, fill=WHITE, stroke_width=2, stroke_fill=(0, 0, 0, 170))
        yy += int(body_font.size * 1.22)


def draw_faction_mark(img: Image.Image) -> None:
    draw = ImageDraw.Draw(img)
    box = (790, 1320, 942, 1472)
    if FACTION_MARK.exists():
        mark = Image.open(FACTION_MARK).convert("RGBA")
        mark.thumbnail((160, 160), Image.Resampling.LANCZOS)
        layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
        layer.alpha_composite(mark, (box[0] + (152 - mark.width) // 2, box[1] + (152 - mark.height) // 2))
        img.alpha_composite(layer)
    else:
        draw.ellipse(box, outline=(255, 230, 178, 190), width=3)
        draw.text((835, 1334), "★", font=load_font(92, bold=True), fill=(224, 218, 204, 230), stroke_width=2, stroke_fill=(0, 0, 0, 190))
    draw_glow_line(draw, (740, 1396, 786, 1396), fill=(255, 224, 158, 150), width=3)
    draw_glow_line(draw, (946, 1396, 992, 1396), fill=(255, 224, 158, 150), width=3)


def draw_bottom_ornaments(draw: ImageDraw.ImageDraw) -> None:
    y = 1472
    draw_glow_line(draw, (68, y, 330, y), fill=(220, 174, 94, 120), width=2)
    draw_glow_line(draw, (424, y, 612, y), fill=(255, 225, 160, 210), width=5)
    draw_glow_line(draw, (710, y, 955, y), fill=(220, 174, 94, 120), width=2)
    for x in (68, 332, 414, 622, 704, 956):
        draw.ellipse((x - 7, y - 7, x + 7, y + 7), outline=(255, 232, 174, 170), width=2, fill=(22, 16, 10, 160))


def draw_stars(draw: ImageDraw.ImageDraw, count: int) -> None:
    font = load_font(64, bold=True)
    x = 58
    y = 1344
    for index in range(count):
        draw.text((x + index * 72, y), "★", font=font, fill=(255, 205, 100, 255), stroke_width=2, stroke_fill=(122, 61, 14, 180))


def render_art(card: dict) -> Image.Image:
    src = get_source_art(card)
    img = Image.open(src)
    return grade_art(cover_image(img))


def render_detail(card: dict, art: Image.Image) -> Image.Image:
    img = art.copy()
    add_linear_gradient(img)
    draw = ImageDraw.Draw(img)
    draw_border(draw)

    title = card["name"]
    title_font = fit_font(draw, title, max_width=745 if card["type"] == "unit" else 880, start=74, minimum=42, bold=True)
    draw.text((58, 74), title, font=title_font, fill=(232, 232, 224, 255), stroke_width=4, stroke_fill=(0, 0, 0, 210))
    draw.text((58, 74), title, font=title_font, fill=WHITE, stroke_width=1, stroke_fill=(255, 255, 255, 38))

    badge_y = 188 if title_font.size <= 54 else 214
    first_w = draw_badge(draw, 58, badge_y, line_label(card), "◎")
    primary_tag = card["tags"][0] if card["tags"] else TYPE_LABELS.get(card["type"], card["type"])
    draw_badge(draw, 58 + first_w + 24, badge_y, primary_tag, "◇")

    skills = parse_skills(card["effect"])
    if len(skills) == 1:
        panel_specs = [(50, 1038, 924, 250, skills[0])]
    else:
        long_text = sum(len(title) + len(body) for title, body in skills) > 92 or max(len(body) for _, body in skills) > 54
        if long_text:
            panel_specs = [
                (50, 842, 924, 238, skills[0]),
                (50, 1094, 924, 238, skills[1]),
            ]
        else:
            panel_specs = [
                (50, 1004, 924, 174, skills[0]),
                (50, 1194, 924, 174, skills[1]),
            ]
    for x, y, w, h, skill in panel_specs:
        draw_panel(img, x, y, w, h, skill[0], skill[1], card["tags"])

    draw_stars(draw, RARITY_STARS.get(card["rarity"], card.get("stars", 1)))
    draw_faction_mark(img)
    draw_bottom_ornaments(draw)
    return img


def render_all() -> None:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    cards = read_usa_cards()
    manifest = []
    for card in cards:
        art = render_art(card)
        art_path = OUTPUT_ROOT / f"{card['id']}-art.png"
        detail_path = OUTPUT_ROOT / f"{card['id']}-detail.png"
        art.save(art_path, optimize=True)
        render_detail(card, art).save(detail_path, optimize=True)
        manifest.append({
            "id": card["id"],
            "name": card["name"],
            "type": card["type"],
            "art": art_path.name,
            "detail": detail_path.name,
        })
    (OUTPUT_ROOT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    # Keep the strongest model-made trial art as an archive inside the production folder.
    for src_name in ("us_m1a2-detail.png", "us_marine_rifle-detail.png"):
        src = TRIAL_ROOT / src_name
        if src.exists():
            shutil.copy2(src, OUTPUT_ROOT / f"_model-trial-{src_name}")


if __name__ == "__main__":
    render_all()
