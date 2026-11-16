(() => {
  const rows = [...document.querySelectorAll(".ff")];
  if (!rows.length || (document.documentElement.lang || "en") !== "en") return;
  const HEAD = "Founding family, free for life";
  const OFFER = "Founding families get the Family plan free for life. We email your code when family plans open.";
  const CSS = `.ff-sh{position:fixed;left:16px;right:16px;bottom:16px;margin:0 auto;max-width:460px;background:#F6EEDC;color:#231F20;border-radius:18px;padding:20px;box-shadow:0 8px 0 rgba(0,0,0,.25),0 0 0 2px #E3D6B8;font-family:Nunito,sans-serif;z-index:99}
.ff-sh[hidden],.ff-sh [hidden]{display:none}.ff-sh h2{font-family:Fredoka,sans-serif;font-size:22px;margin:0 32px 8px 0;line-height:1.25}.ff-sh p{margin:0 0 10px;font-size:15px;line-height:1.4}
.ff-sh .n{font-family:'Space Mono',monospace;font-weight:700;color:#5B1A4A}.ff-sh .r{display:flex;gap:8px;flex-wrap:wrap}
.ff-sh input[type=email]{flex:1 1 200px;min-width:0;font:inherit;font-size:17px;padding:12px 14px;border-radius:12px;border:2px solid #E3D6B8;background:#fff}.ff-sh input:focus{outline:3px solid #D9381E;outline-offset:1px}
.ff-sh button[type=submit]{flex:0 0 auto;font:inherit;font-weight:800;font-size:17px;padding:12px 18px;border:0;border-radius:12px;background:#D9381E;color:#fff;box-shadow:0 4px 0 #8E2312;cursor:pointer}
.ff-sh .x{position:absolute;right:10px;top:6px;background:none;border:0;font-size:26px;color:#5d5650;cursor:pointer;padding:4px}.ff-sh .hp{position:absolute;left:-9999px}
.ff-sh .m{min-height:20px;margin:10px 0 0;font-weight:700}.ff-sh .err{color:#B92E08}.ff-sh .s{margin:6px 0 0;font-size:13px;color:#5d5650}.ff-sh a{color:#D9381E;font-weight:800}`;
  let spots = null;
  let sheet = null;
  const label = () => (spots.left > 0 ? `${spots.left} of ${spots.total} left` : `All ${spots.total} spots are taken`);
  const paint = () => {
    for (const row of rows) {
      row.querySelector(".ffn").textContent = label();
      row.hidden = false;
    }
    if (!sheet) return;
    sheet.querySelector(".n").textContent = label();
    sheet.querySelector(".r").hidden = spots.left <= 0 || sheet.dataset.done === "1";
  };
  const human = () => {
    if (!spots.siteKey) return;
    const box = document.createElement("div");
    box.className = "cf-turnstile";
    box.dataset.sitekey = spots.siteKey;
    box.style.marginTop = "10px";
    sheet.querySelector(".m").before(box);
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    document.head.appendChild(script);
  };
  const submit = async (event) => {
    event.preventDefault();
    const note = sheet.querySelector(".m");
    note.className = "m";
    note.textContent = "…";
    try {
      const token = (sheet.querySelector('[name="cf-turnstile-response"]') || {}).value;
      const r = await fetch("/api/founding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: sheet.email.value, website: sheet.website.value, turnstile: token }) });
      const j = await r.json().catch(() => ({}));
      if (typeof j.left === "number") spots.left = j.left;
      if (!r.ok) throw new Error(j.error || "Something went wrong. Try again.");
      sheet.dataset.done = "1";
      note.textContent = "Check your email for your founding family link.";
      try { window.plEv && window.plEv("founding_claim"); } catch (_) {}
    } catch (err) {
      note.className = "m err";
      note.textContent = err instanceof TypeError ? "Could not reach the signup service." : err.message;
      try { window.turnstile && window.turnstile.reset(); } catch (_) {}
    }
    paint();
  };
  const build = () => {
    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);
    sheet = document.createElement("form");
    sheet.className = "ff-sh";
    sheet.noValidate = true;
    sheet.setAttribute("aria-label", HEAD);
    sheet.innerHTML = `<button type="button" class="x" aria-label="Close">×</button><h2>${HEAD}</h2><p>${OFFER}</p><p class="n"></p><div class="r"><input type="email" name="email" autocomplete="email" required aria-label="Email" placeholder="you@example.com"><button type="submit">Claim a spot</button></div><input class="hp" tabindex="-1" autocomplete="off" name="website" aria-hidden="true"><p class="m" aria-live="polite"></p><p class="s">Spots go to the first 500 families who confirm by email. One spot per family, up to 6 people through Apple Family Sharing. We keep your email in our database and send your confirmation with Resend. <a href="/privacy" target="_blank" rel="noopener">Privacy policy</a></p>`;
    document.body.appendChild(sheet);
    sheet.querySelector(".x").onclick = () => { sheet.hidden = true; };
    addEventListener("keydown", (k) => { if (k.key === "Escape") sheet.hidden = true; });
    sheet.onsubmit = submit;
    human();
  };
  const open = () => {
    if (!sheet) build();
    sheet.hidden = false;
    paint();
    if (spots.left > 0) setTimeout(() => sheet.email.focus(), 30);
  };
  for (const row of rows) row.querySelector("button").addEventListener("click", open);
  fetch("/api/founding")
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => {
      if (!j || !j.total) return;
      spots = { total: j.total, left: j.left, siteKey: j.siteKey };
      paint();
    })
    .catch(() => {});
})();
