from PIL import Image
from pathlib import Path

src_dir = Path(r"c:\Users\user\Desktop\Notify App\frontend\src\assets\images")
out_dir = Path(r"c:\Users\user\Desktop\Notify App\frontend\public\images")
out_dir.mkdir(parents=True, exist_ok=True)

jobs = [
    ("logo.png", "logo", 512, 82),
    ("white_logo.png", "white-logo", 512, 82),
    ("Notify landing (2).png", "notify-landing", 1600, 78),
    ("Playstore.png", "playstore", 420, 80),
    ("App store.png", "app-store", 420, 80),
    ("cyber.png", "cyber", 400, 80),
    ("RDB.png", "rdb", 400, 80),
    ("cartoon.png", "cartoon", 900, 78),
]

for src_name, stem, max_w, quality in jobs:
    src = src_dir / src_name
    if not src.exists():
        print("MISSING", src)
        continue
    im = Image.open(src).convert("RGBA")
    w, h = im.size
    if w > max_w:
        nh = int(h * (max_w / w))
        im = im.resize((max_w, nh), Image.Resampling.LANCZOS)
    webp = out_dir / f"{stem}.webp"
    png = out_dir / f"{stem}.png"
    im.save(webp, "WEBP", quality=quality, method=6)
    im.save(png, "PNG", optimize=True)
    print(
        f"{stem}: {src.stat().st_size // 1024}KB -> "
        f"webp {webp.stat().st_size // 1024}KB png {png.stat().st_size // 1024}KB "
        f"({im.size[0]}x{im.size[1]})"
    )

print("done")
