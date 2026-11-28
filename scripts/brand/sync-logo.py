import io
from pathlib import Path
import cairosvg
from PIL import Image

root = Path(__file__).resolve().parents[2] / "public"
src = root / "brand" / "logo.svg"
for size in (512, 180):
    cairosvg.svg2png(url=str(src), write_to=str(root / "brand" / f"logo-{size}.png"), output_width=size, output_height=size)
png = cairosvg.svg2png(url=str(src), output_width=256, output_height=256)
Image.open(io.BytesIO(png)).save(root / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
