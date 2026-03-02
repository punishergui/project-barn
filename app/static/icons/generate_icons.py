from pathlib import Path

from PIL import Image, ImageDraw


BACKGROUND = "#1C0E05"
WHITE = "#FAF0E0"
GOLD = "#E8A020"


def draw_icon(size: int, output_path: Path) -> None:
    image = Image.new("RGBA", (size, size), BACKGROUND)
    draw = ImageDraw.Draw(image)

    stroke = max(4, size // 40)

    roof_top = (size * 0.5, size * 0.2)
    roof_left = (size * 0.22, size * 0.43)
    roof_right = (size * 0.78, size * 0.43)

    body_left = size * 0.28
    body_top = size * 0.43
    body_right = size * 0.72
    body_bottom = size * 0.8

    door_left = size * 0.45
    door_top = size * 0.56
    door_right = size * 0.55
    door_bottom = size * 0.8

    draw.polygon([roof_top, roof_left, roof_right], outline=WHITE, width=stroke)
    draw.rectangle([body_left, body_top, body_right, body_bottom], outline=WHITE, width=stroke)
    draw.rectangle([door_left, door_top, door_right, door_bottom], outline=WHITE, width=stroke)

    inset = stroke * 1.5
    draw.line(
        [(door_left + inset, door_top + inset), (door_right - inset, door_bottom - inset)],
        fill=GOLD,
        width=stroke,
    )
    draw.line(
        [(door_right - inset, door_top + inset), (door_left + inset, door_bottom - inset)],
        fill=GOLD,
        width=stroke,
    )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    image.save(output_path, format="PNG")


def main() -> None:
    base = Path(__file__).resolve().parent
    draw_icon(192, base / "icon-192.png")
    draw_icon(512, base / "icon-512.png")


if __name__ == "__main__":
    main()
