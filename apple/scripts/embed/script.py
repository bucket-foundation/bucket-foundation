import hashlib, sys
import numpy as np
import torch, torch.nn as nn, torch.nn.functional as F
from PIL import Image, ImageDraw, ImageFont
from common import LANGS, VEC, script_of, words

H, W = 32, 128
FONTS = {"Latn": ("/usr/share/fonts/google-noto-vf/NotoSans[wght].ttf", 0), "Grek": ("/usr/share/fonts/google-noto-vf/NotoSans[wght].ttf", 0),
         "Cyrl": ("/usr/share/fonts/google-noto-vf/NotoSans[wght].ttf", 0), "Arab": ("/usr/share/fonts/google-noto-vf/NotoSansArabic[wght].ttf", 0),
         "Hebr": ("/usr/share/fonts/google-noto-vf/NotoSansHebrew[wght].ttf", 0), "Deva": ("/usr/share/fonts/google-noto-vf/NotoSansDevanagari[wght].ttf", 0),
         "Taml": ("/usr/share/fonts/google-noto-vf/NotoSansTamil[wght].ttf", 0), "Thai": ("/usr/share/fonts/google-noto-vf/NotoSansThai[wght].ttf", 0),
         "Jpan": ("/usr/share/fonts/google-noto-sans-cjk-vf-fonts/NotoSansCJK-VF.ttc", 0), "Kore": ("/usr/share/fonts/google-noto-sans-cjk-vf-fonts/NotoSansCJK-VF.ttc", 1),
         "Hans": ("/usr/share/fonts/google-noto-sans-cjk-vf-fonts/NotoSansCJK-VF.ttc", 2)}
WEIGHTS = (300, 400, 700)
_fonts = {}


def font(script, weight):
    k = (script, weight)
    if k not in _fonts:
        path, idx = FONTS[script]
        f = ImageFont.truetype(path, 22, index=idx, layout_engine=ImageFont.Layout.RAQM)
        try:
            f.set_variation_by_axes([weight])
        except Exception:
            pass
        _fonts[k] = f
    return _fonts[k]


def render(word, script, weight=400):
    f = font(script, weight)
    direction = "rtl" if script in ("Arab", "Hebr") else None
    box = f.getbbox(word, direction=direction)
    w, h = max(box[2] - box[0], 1), max(box[3] - box[1], 1)
    img = Image.new("L", (w + 4, h + 4), 0)
    ImageDraw.Draw(img).text((2 - box[0], 2 - box[1]), word, fill=255, font=f, direction=direction)
    s = min(1.0, (W - 4) / img.width, (H - 4) / img.height)
    if s < 1.0:
        img = img.resize((max(1, int(img.width * s)), max(1, int(img.height * s))), Image.BILINEAR)
    out = Image.new("L", (W, H), 0)
    out.paste(img, (2, (H - img.height) // 2))
    return np.asarray(out, dtype=np.uint8)


class Net(nn.Module):
    def __init__(self, dim=64):
        super().__init__()
        c = lambda i, o: nn.Sequential(nn.Conv2d(i, o, 3, padding=1), nn.BatchNorm2d(o), nn.GELU())
        self.f = nn.Sequential(c(1, 32), nn.MaxPool2d(2), c(32, 64), nn.MaxPool2d(2), c(64, 128), nn.MaxPool2d(2), c(128, 192))
        self.head = nn.Linear(192 * 2, dim)

    def forward(self, x):
        z = self.f(x)
        z = torch.cat([z.mean((2, 3)), z.amax((2, 3))], 1)
        return F.normalize(self.head(z), dim=-1)


def augment(x):
    n = x.shape[0]
    s = 1 + 0.15 * (torch.rand(n, device=x.device) - 0.5)
    theta = torch.zeros(n, 2, 3, device=x.device)
    theta[:, 0, 0] = s
    theta[:, 1, 1] = s
    theta[:, 0, 1] = 0.1 * (torch.rand(n, device=x.device) - 0.5)
    theta[:, 0, 2] = 0.06 * (torch.rand(n, device=x.device) - 0.5)
    theta[:, 1, 2] = 0.2 * (torch.rand(n, device=x.device) - 0.5)
    grid = F.affine_grid(theta, x.shape, align_corners=False)
    x = F.grid_sample(x, grid, align_corners=False)
    return x + 0.1 * torch.randn_like(x)


def h(s):
    return int(hashlib.sha1(s.encode()).hexdigest()[:8], 16)


def train(steps=2000, per_lang=4000, batch=512):
    torch.manual_seed(0)
    pool = []
    for lang in LANGS:
        sc = script_of(lang)
        for w in sorted(words(lang), key=h)[:per_lang]:
            pool.append(np.stack([render(w, sc, wt) for wt in WEIGHTS]))
    for w in sorted(words("en"), key=h)[:per_lang]:
        pool.append(np.stack([render(w, "Latn", wt) for wt in WEIGHTS]))
    data = torch.tensor(np.stack(pool), dtype=torch.float16, device="cuda") / 255
    net = Net().cuda()
    opt = torch.optim.AdamW(net.parameters(), 2e-3, weight_decay=1e-4)
    g = torch.Generator(device="cpu").manual_seed(0)
    for step in range(steps):
        idx = torch.randint(0, len(data), (batch,), generator=g)
        v = torch.randint(0, 3, (2, batch), generator=g)
        a = augment(data[idx, v[0]].unsqueeze(1).float())
        b = augment(data[idx, v[1]].unsqueeze(1).float())
        za, zb = net(a), net(b)
        logits = za @ zb.T / 0.07
        y = torch.arange(batch, device="cuda")
        loss = (F.cross_entropy(logits, y) + F.cross_entropy(logits.T, y)) / 2
        opt.zero_grad(); loss.backward(); opt.step()
        if step % 500 == 0:
            print("step", step, loss.item(), flush=True)
    torch.save(net.state_dict(), VEC / "script_cnn.pt")
    return net


@torch.no_grad()
def embed(net, ws, script, bs=2048):
    net.eval()
    out = []
    for i in range(0, len(ws), bs):
        x = torch.tensor(np.stack([render(w, script) for w in ws[i:i + bs]]), dtype=torch.float32, device="cuda").unsqueeze(1) / 255
        out.append(net(x).cpu().numpy())
    return np.concatenate(out) if out else np.zeros((0, 64), np.float32)


def char_vectors(ws, dim=64, buckets=1 << 20):
    rng = np.random.default_rng(7)
    proj = {}
    out = np.zeros((len(ws), dim), np.float32)
    for i, w in enumerate(ws):
        t = f"^{w.lower()}$"
        grams = [t[j:j + n] for n in (1, 2, 3) for j in range(len(t) - n + 1)]
        for gm in grams:
            b = h(gm) % buckets
            v = proj.get(b)
            if v is None:
                v = proj[b] = np.random.default_rng(b).standard_normal(dim).astype(np.float32)
            out[i] += v
    n = np.linalg.norm(out, axis=1, keepdims=True)
    return out / np.maximum(n, 1e-6)


def main():
    if (VEC / "script_cnn.pt").exists() and "--retrain" not in sys.argv:
        net = Net().cuda(); net.load_state_dict(torch.load(VEC / "script_cnn.pt"))
    else:
        net = train()
    for lang in ["en"] + LANGS:
        ws = words(lang)
        sc = "Latn" if lang == "en" else script_of(lang)
        np.save(VEC / lang / "script.npy", embed(net, ws, sc).astype(np.float16))
        np.save(VEC / lang / "char.npy", char_vectors(ws).astype(np.float16))
        print(lang, len(ws), flush=True)


if __name__ == "__main__":
    main()
