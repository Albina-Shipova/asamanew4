from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from PIL import Image, ImageFilter, ImageStat


ROOT = Path(__file__).resolve().parents[1]
RAW_ROOT = ROOT / "tools" / ".capture-raw"
OUTPUT_ROOT = ROOT / "tools" / ".capture-output"
MATERIALS = ROOT / "cases" / "materials"
VISIBLE = {
    "behome", "touch", "estetica", "socvetie", "spasibodoctor", "semdoc4",
    "krasivaya", "tai2", "belous", "les", "remontsurgut", "jaluzeperm",
}


def frame_count() -> dict[str, int]:
    text = (ROOT / "cases" / "materials.js").read_text(encoding="utf-8")
    counts: dict[str, int] = {}
    for slug in VISIBLE:
        block = re.search(rf'"slug":\s*"{re.escape(slug)}"(.*?)(?=\n\s*\{{\n\s*"slug"|\n\];)', text, re.S)
        if not block:
            raise RuntimeError(f"Нет блока materials.js для {slug}")
        counts[slug] = len(re.findall(r'"src":\s*"materials/.+?/orbit-', block.group(1)))
    return counts


def fit_width(image: Image.Image, width: int) -> Image.Image:
    if image.width <= width:
        return image.copy()
    height = round(image.height * width / image.width)
    return image.resize((width, height), Image.Resampling.LANCZOS)


def save_webp(image: Image.Image, target: Path, quality: int = 92) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    sharpened = image.convert("RGB").filter(ImageFilter.UnsharpMask(radius=0.65, percent=80, threshold=3))
    sharpened.save(target, "WEBP", quality=quality, method=6)


def frame_canvas(image: Image.Image, size: tuple[int, int] = (2400, 1350)) -> Image.Image:
    image = image.convert("RGB")
    sample_width = max(1, min(24, image.width // 30))
    left = image.crop((0, 0, sample_width, image.height))
    right = image.crop((image.width - sample_width, 0, image.width, image.height))
    color = tuple(round(value) for value in ImageStat.Stat(Image.new("RGB", (2, 1))).mean)
    edge = Image.new("RGB", (left.width + right.width, max(left.height, right.height)))
    edge.paste(left, (0, 0))
    edge.paste(right, (left.width, 0))
    color = tuple(round(value) for value in ImageStat.Stat(edge.resize((1, 1))).mean)
    scale = min(size[0] / image.width, size[1] / image.height)
    fitted = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", size, color)
    canvas.paste(fitted, ((size[0] - fitted.width) // 2, (size[1] - fitted.height) // 2))
    return canvas


def process(slugs: list[str]) -> dict[str, dict[str, object]]:
    expected = frame_count()
    report: dict[str, dict[str, object]] = {}
    for slug in slugs:
        raw_dir = RAW_ROOT / slug
        output_dir = OUTPUT_ROOT / slug
        frames = sorted(raw_dir.glob("orbit-*.png"))
        if len(frames) != expected[slug]:
            raise RuntimeError(f"{slug}: ожидалось {expected[slug]} кадров, найдено {len(frames)}")
        sizes = []
        for source in frames:
            with Image.open(source) as image:
                if slug == "belous":
                    # Keep every native capture pixel: no canvas fit, resize or sharpening.
                    clean = image.convert("RGB")
                    output_dir.mkdir(parents=True, exist_ok=True)
                    clean.save(output_dir / source.with_suffix(".webp").name, "WEBP", lossless=True, method=6)
                else:
                    clean = frame_canvas(image)
                    save_webp(clean, output_dir / source.with_suffix(".webp").name)
                sizes.append(clean.size)
        with Image.open(raw_dir / "full.png") as image:
            full = fit_width(image, 1600)
            save_webp(full, output_dir / "full.webp", quality=90)
        with Image.open(frames[0]) as image:
            cover = frame_canvas(image, (1600, 900))
            save_webp(cover, output_dir / "cover.webp", quality=92)
            thumb = fit_width(image, 640)
            save_webp(thumb, output_dir / "thumb.webp", quality=88)
        report[slug] = {"frames": len(frames), "sizes": sizes, "full": full.size}
    return report


def install(slugs: list[str]) -> None:
    for slug in slugs:
        source_dir = OUTPUT_ROOT / slug
        target_dir = MATERIALS / slug
        for source in source_dir.glob("*.webp"):
            (target_dir / source.name).write_bytes(source.read_bytes())


parser = argparse.ArgumentParser()
parser.add_argument("--project")
parser.add_argument("--install", action="store_true")
args = parser.parse_args()
selected = [args.project] if args.project else sorted(VISIBLE)
report = process(selected)
if args.install:
    install(selected)
print(json.dumps(report, ensure_ascii=False, indent=2))
