import json
import re
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_ROOT = ROOT / "assets" / "generated-cards" / "imagegen-us-model-test"
CARD_DATA = ROOT / "repo_inspect" / "usa_cards_for_card_render.json"
ASSET_MANIFEST = ROOT / "repo_inspect" / "new_us_card_assets_manifest.json"
MANIFEST_OUT = ROOT / "repo_inspect" / "generated_us_card_manifest.json"

ART_SUFFIXES = [
    ("\u002d\u63d2\u753b\u72482", 1),
    ("\u002d\u63d2\u753b\u7248", 2),
]
DETAIL_SUFFIXES = [
    "\u002dUI\u7248",
]
SKILL_RE = re.compile(r"\u3010([^\u3011]+)\u3011\s*[\uff1a:]\s*")
BAD_LINE_STARTS = set("\uff0c\u3002\uff1b\u3001\uff1a\uff09\u3011")
CARD_SIZE = (1024, 1536)

FONT_MEDIUM = Path("C:/Windows/Fonts/Noto Sans SC Medium (TrueType).otf")
FONT_BOLD = Path("C:/Windows/Fonts/Noto Sans SC Bold (TrueType).otf")
FONT_FALLBACKS = [
    Path("C:/Windows/Fonts/msyh.ttc"),
    Path("C:/Windows/Fonts/simhei.ttf"),
    Path("C:/Windows/Fonts/simsun.ttc"),
]

RARITY_COUNTS = {
    "common": 1,
    "uncommon": 2,
    "rare": 3,
    "epic": 4,
    "legendary": 5,
}

ALIASES = {
    "us_javelin_team": [
        "\u9676\u6c0f\u53cd\u5766\u514b\u7ec4",
        "\u9676\u5f0f\u53cd\u5766\u514b\u7ec4",
        "\u6807\u67aa\u53cd\u7532\u5c0f\u7ec4",
    ],
    "us_rangers_target": [
        "\u6b66\u88c5\u4fa6\u5bdf\u961f",
        "\u6e38\u9a91\u5175\u6e17\u900f\u5c0f\u7ec4",
    ],
    "us_marine_engineers": [
        "\u6d77\u519b\u9646\u6218\u7a81\u51fb\u961f",
        "\u6d77\u519b\u9646\u6218\u961f\u5de5\u5175\u7ec4",
    ],
    "us_apache": [
        "\u963f\u5e15\u5947\u6b66\u88c5\u76f4\u5347\u673a",
        "\u963f\u5e15\u5947\u76f4\u5347\u673a",
    ],
    "us_mshorad": [
        "M-SHORAD\u673a\u52a8\u9632\u7a7a",
        "M-SHORAD \u673a\u52a8\u9632\u7a7a",
    ],
    "us_patriot": [
        "\u7231\u56fd\u8005\u9632\u7a7a\u5bfc\u5f39",
        "\u7231\u56fd\u8005\u5bfc\u5f39\u7cfb\u7edf",
    ],
    "us_reaper": [
        "\u6b7b\u795e\u65e0\u4eba\u673a",
        "\u6b7b\u795e\u4fa6\u5bdf\u65e0\u4eba\u673a",
    ],
    "us_gray_eagle": [
        "\u7070\u9e70\u4fa6\u5bdf\u65e0\u4eba\u673a",
    ],
    "us_mlrs": [
        "MLRS\u706b\u7bad\u70ae",
    ],
    "us_atacms": [
        "ATACMS\u6218\u672f\u5bfc\u5f39",
        "ATACMS\u6218\u672f\u5bfc\u5f39\u53d1\u5c04\u8f66",
    ],
    "us_f15e": [
        "F-15E\u653b\u51fb\u673a",
    ],
    "us_f35": [
        "F-35\u6218\u6597\u673a",
    ],
    "us_b2": [
        "B-2\u9690\u8eab\u8f70\u70b8\u673a",
    ],
    "us_smoke_screen": [
        "\u70df\u5e55\u63a9\u62a4",
    ],
    "us_reposition": [
        "\u9635\u5730\u8f6c\u79fb",
    ],
    "us_battlefield_repair": [
        "\u6218\u5730\u7ef4\u4fee",
    ],
    "us_emergency_supply": [
        "\u7d27\u6025\u8865\u7ed9",
    ],
    "us_electronic_suppression": [
        "\u7535\u5b50\u538b\u5236",
    ],
    "us_tomahawk": [
        "\u6218\u65a7\u5de1\u822a\u5bfc\u5f39",
    ],
    "us_green_beret": [
        "\u7eff\u8d1d\u96f7\u5e3d",
        "\u7eff\u8d1d\u96f7",
        "\u7eff\u8272\u8d1d\u96f7\u5e3d\u5f15\u5bfc\u7ec4",
    ],
    "us_decoy_position": [
        "\u8bf1\u9975\u9635\u5730",
    ],
}


def load_font(path, size):
    if path.exists():
        return ImageFont.truetype(str(path), size)
    for fallback in FONT_FALLBACKS:
        if fallback.exists():
            return ImageFont.truetype(str(fallback), size)
    return ImageFont.load_default(size=size)


def text_size(draw, text, font):
    if not text:
        return (0, 0)
    box = draw.textbbox((0, 0), text, font=font)
    return (box[2] - box[0], box[3] - box[1])


def normalize_key(name):
    return re.sub(r"[\s_\-\u2010-\u2015\uff0d]+", "", name or "").casefold()


def split_source_name(stem):
    stem = re.sub(r"\s*[\(\uff08]\s*2\s*[\)\uff09]\s*$", "2", stem.strip(" '‘’\"“”"))
    for suffix in DETAIL_SUFFIXES:
        if stem.endswith(suffix):
            return stem[: -len(suffix)], "detail", 2
    for suffix, priority in ART_SUFFIXES:
        if stem.endswith(suffix):
            return stem[: -len(suffix)], "art", priority
    return stem, "detail", 1


def wrap_cjk(draw, text, font, max_width):
    lines = []
    current = ""
    for char in text:
        candidate = current + char
        if current and text_size(draw, candidate, font)[0] > max_width:
            lines.append(current)
            current = char
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines


def has_bad_wrap(lines):
    return (
        any(line and line[0] in BAD_LINE_STARTS for line in lines[1:])
        or any(line.count("\u3010") != line.count("\u3011") for line in lines)
        or (len(lines) > 1 and len(lines[-1].strip()) <= 4)
    )


def split_skills(effect):
    matches = list(SKILL_RE.finditer(effect or ""))
    if not matches:
        body = (effect or "").strip()
        return [("", body)] if body else []
    parts = []
    for index, match in enumerate(matches):
        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(effect)
        body = effect[start:end].strip()
        if body:
            parts.append((match.group(1), body))
    return parts


def draw_shadowed_text(draw, xy, text, font, fill, *, stroke=0, anchor=None):
    x, y = xy
    shadow = (4, 3, 2, 230)
    for dx, dy, alpha in ((3, 4, 225), (0, 2, 175), (-1, 1, 145)):
        draw.text((x + dx, y + dy), text, font=font, fill=(0, 0, 0, alpha), anchor=anchor)
    draw.text(xy, text, font=font, fill=fill, stroke_width=stroke, stroke_fill=shadow, anchor=anchor)


def visual_text_height(draw, text, font, *, stroke=1):
    box = draw.textbbox((0, 0), text or "\u56fd", font=font, stroke_width=stroke)
    return box[3] - box[1]


def draw_shadowed_text_at_top(draw, xy, text, font, fill, *, stroke=1):
    x, visual_top = xy
    box = draw.textbbox((0, 0), text or "\u56fd", font=font, stroke_width=stroke)
    draw_shadowed_text(draw, (x, visual_top - box[1]), text, font, fill, stroke=stroke)


def draw_power(draw, power):
    power_font = load_font(FONT_BOLD, 140)
    text = str(power)
    center = (915, 122)
    draw_shadowed_text(draw, center, text, power_font, (246, 230, 196, 255), stroke=3, anchor="mm")
    draw.text((center[0], center[1] - 3), text, font=power_font, fill=(255, 250, 224, 150), anchor="mm")


def draw_title_and_tags(draw, card):
    title_font = load_font(FONT_BOLD, 72)
    draw_shadowed_text(draw, (60, 86), card["name"], title_font, (238, 232, 218, 255), stroke=2)
    tags = []
    if card.get("line") and card.get("line") != "instant":
        tags.append(card["line"])
    tags.extend(card.get("tags", [])[:2])
    labels = {
        "frontline": "\u524d\u7ebf",
        "support": "\u652f\u63f4",
        "instant": "\u5373\u65f6",
    }
    tag_font = load_font(FONT_BOLD, 27)
    x = 60
    for tag in tags[:3]:
        label = labels.get(tag, tag)
        text_w = text_size(draw, label, tag_font)[0]
        box_w = max(150, text_w + 58)
        box = (x, 200, x + box_w, 262)
        draw.rounded_rectangle(box, radius=8, fill=(13, 14, 13, 150), outline=(224, 205, 168, 185), width=2)
        draw.text((x + 28, 216), label, font=tag_font, fill=(236, 228, 211, 255))
        x += box_w + 18


def draw_synthetic_frame(draw, card, skill_count):
    draw.rectangle((0, 0, 1024, 318), fill=(0, 0, 0, 92))
    draw.rectangle((0, 900, 1024, 1536), fill=(0, 0, 0, 118))
    draw.rounded_rectangle((16, 16, 1008, 1520), radius=18, outline=(214, 176, 112, 138), width=3)
    draw.rounded_rectangle((28, 28, 996, 1508), radius=14, outline=(238, 226, 204, 48), width=1)
    draw_title_and_tags(draw, card)
    if card.get("type") == "unit" and "power" in card:
        draw_power(draw, card["power"])
    panels = skill_panels(skill_count)
    for panel in panels:
        _, y, _, height = panel
        draw.rounded_rectangle((52, y - 14, 972, y + height + 12), radius=12, fill=(5, 6, 5, 178), outline=(230, 208, 168, 165), width=2)
        draw.line((70, y - 3, 954, y - 3), fill=(255, 228, 176, 62), width=2)
        draw.rounded_rectangle((76, y + 1, 216, y + height - 2), radius=8, fill=(8, 9, 8, 132), outline=(226, 205, 166, 128), width=2)
    star_font = load_font(FONT_BOLD, 42)
    stars = RARITY_COUNTS.get(card.get("rarity"), 1)
    for index in range(stars):
        draw_shadowed_text(draw, (64 + index * 42, 1394), "\u2605", star_font, (255, 211, 128, 255), stroke=1)
    draw.ellipse((814, 1350, 948, 1484), outline=(218, 188, 130, 180), width=3, fill=(20, 17, 14, 90))
    draw_shadowed_text(draw, (881, 1417), "\u2605", load_font(FONT_BOLD, 70), (225, 216, 196, 230), stroke=2, anchor="mm")


def fit_body_font(draw, body, max_width, max_height, title_font, has_title):
    first_fit = None
    title_height = visual_text_height(draw, "\u3010\u6280\u80fd\u3011", title_font) + 7 if has_title else 0
    for size in range(36, 23, -1):
        body_font = load_font(FONT_MEDIUM, size)
        line_height = max(int(size * 1.14), visual_text_height(draw, "\u73b0\u4ee3\u6218\u4e89", body_font) + 4)
        lines = wrap_cjk(draw, body, body_font, max_width)
        if title_height + len(lines) * line_height <= max_height:
            first_fit = first_fit or (body_font, lines, line_height)
            if not has_bad_wrap(lines):
                return body_font, lines, line_height
    if first_fit:
        return first_fit
    body_font = load_font(FONT_MEDIUM, 22)
    return body_font, wrap_cjk(draw, body, body_font, max_width), 27


def draw_skill_panel(draw, panel, title, body):
    x, y, width, height = panel
    title_font = load_font(FONT_BOLD, 34)
    body_font, body_lines, body_line_height = fit_body_font(draw, body, width, height - 8, title_font, bool(title))
    title_fill = (242, 217, 169, 255)
    body_fill = (218, 211, 194, 255)

    visible_body_lines = body_lines[:4]
    title_text = f"\u3010{title}\u3011" if title else ""
    title_height = visual_text_height(draw, title_text, title_font) + 7 if title else 0
    total_height = title_height + len(visible_body_lines) * body_line_height
    cursor_y = y + max(3, int((height - total_height) / 2))
    if title:
        draw_shadowed_text_at_top(draw, (x, cursor_y), title_text, title_font, title_fill, stroke=1)
        cursor_y += title_height

    for line in visible_body_lines:
        draw_shadowed_text_at_top(draw, (x, cursor_y), line, body_font, body_fill, stroke=1)
        cursor_y += body_line_height


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def load_cards():
    return read_json(CARD_DATA)


def load_asset_manifest():
    entries = read_json(ASSET_MANIFEST)
    if isinstance(entries, dict):
        entries = [entries]
    return entries


def load_asset_index():
    index = {}
    for entry in load_asset_manifest():
        name = entry.get("Name") or Path(entry.get("FullName", "")).name
        full_name = entry.get("FullName") or name
        path = Path(full_name)
        base, slot, priority = split_source_name(Path(name).stem)
        for key in {base, normalize_key(base)}:
            item = index.setdefault(key, {})
            previous_priority = item.get(f"{slot}Priority", -1)
            if priority >= previous_priority:
                item[slot] = path
                item[f"{slot}Priority"] = priority
    return index


def asset_names_for(card):
    return [card["name"], *ALIASES.get(card["id"], [])]


def find_asset(asset_index, card, kind):
    for name in asset_names_for(card):
        for key in (name, normalize_key(name)):
            path = asset_index.get(key, {}).get(kind)
            if path and path.exists():
                return path
    return None


def skill_panels(skill_count):
    if skill_count <= 1:
        return [(248, 1110, 692, 148)]
    return [
        (248, 982, 692, 130),
        (248, 1145, 692, 132),
    ]


def copy_art(card, art_path):
    out = OUTPUT_ROOT / f"{card['id']}-art.png"
    with Image.open(art_path) as image:
        ImageOps.fit(image.convert("RGB"), CARD_SIZE, method=Image.Resampling.LANCZOS, centering=(0.5, 0.5)).save(out, quality=95)
    return out


def render_detail(card, detail_path):
    out = OUTPUT_ROOT / f"{card['id']}-detail.png"
    with Image.open(detail_path) as image:
        rendered = ImageOps.fit(image.convert("RGB"), CARD_SIZE, method=Image.Resampling.LANCZOS, centering=(0.5, 0.5)).convert("RGBA")
    draw = ImageDraw.Draw(rendered, "RGBA")
    if card.get("type") == "unit" and "power" in card:
        draw_power(draw, card["power"])

    skills = split_skills(card.get("effect", ""))[:2]
    for panel, (title, body) in zip(skill_panels(len(skills)), skills):
        draw_skill_panel(draw, panel, title, body)

    rendered.convert("RGB").save(out, quality=95)
    return out


def render_fallback_detail(card, art_path):
    out = OUTPUT_ROOT / f"{card['id']}-detail.png"
    with Image.open(art_path) as image:
        rendered = ImageOps.fit(image.convert("RGB"), CARD_SIZE, method=Image.Resampling.LANCZOS, centering=(0.5, 0.5)).convert("RGBA")
    draw = ImageDraw.Draw(rendered, "RGBA")
    skills = split_skills(card.get("effect", ""))[:2]
    draw_synthetic_frame(draw, card, len(skills))
    for panel, (title, body) in zip(skill_panels(len(skills)), skills):
        draw_skill_panel(draw, panel, title, body)
    rendered.convert("RGB").save(out, quality=95)
    return out


def remove_old_us_generated_images():
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    output_resolved = OUTPUT_ROOT.resolve()
    root_resolved = ROOT.resolve()
    if root_resolved not in output_resolved.parents:
        raise RuntimeError(f"Refusing to delete outside project: {output_resolved}")
    removed = []
    for path in OUTPUT_ROOT.glob("us_*.png"):
        path.unlink()
        removed.append(path.name)
    return sorted(removed)


def main():
    cards = load_cards()
    asset_index = load_asset_index()
    removed = remove_old_us_generated_images()
    generated = []
    missing = []

    for card in cards:
        art_path = find_asset(asset_index, card, "art")
        detail_path = find_asset(asset_index, card, "detail")
        item = {
            "id": card["id"],
            "name": card["name"],
            "art": "",
            "detail": "",
            "sourceArt": str(art_path) if art_path else "",
            "sourceDetail": str(detail_path) if detail_path else "",
        }
        if art_path:
            item["art"] = str(copy_art(card, art_path))
        if detail_path:
            item["detail"] = str(render_detail(card, detail_path))
        elif art_path:
            item["detail"] = str(render_fallback_detail(card, art_path))
        if item["art"] or item["detail"]:
            generated.append(item)
        else:
            missing.append({"id": card["id"], "name": card["name"]})

    manifest = {
        "removed": removed,
        "generated": generated,
        "missing": missing,
        "generatedArtIds": [item["id"] for item in generated if item["art"]],
        "generatedDetailIds": [item["id"] for item in generated if item["detail"]],
    }
    MANIFEST_OUT.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
