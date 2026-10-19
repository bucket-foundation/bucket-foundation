(() => {
  const NS = "http://www.w3.org/2000/svg";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const css = getComputedStyle(document.documentElement);
  const tok = (k, f) => (css.getPropertyValue(k).trim() || f);
  const ACC = tok("--acc", "#3FC1C9"), HL = tok("--hl", "#F2C14E"), LINE = tok("--line", "#2C5AA0"), SURF = tok("--surf", "#123873");
  const P = (x, y) => x.toFixed(2) + " " + y.toFixed(2);

  function khatam(cx, cy, R) {
    const sq = (rot) => [0, 1, 2, 3].map(k => {
      const a = rot + Math.PI / 4 + k * Math.PI / 2;
      return [cx + R * Math.cos(a), cy + R * Math.sin(a)];
    });
    const path = (pts) => "M" + pts.map(p => P(p[0], p[1])).join("L") + "Z";
    return { a: path(sq(0)), b: path(sq(Math.PI / 4)) };
  }

  function starPoints(cx, cy, r1, r2, n) {
    const out = [];
    for (let k = 0; k < 2 * n; k++) {
      const r = k % 2 ? r2 : r1, a = -Math.PI / 2 + k * Math.PI / n;
      out.push(P(cx + r * Math.cos(a), cy + r * Math.sin(a)));
    }
    return out.join(" ");
  }

  function tile(s) {
    const R = s / Math.SQRT2 * 0.5;
    const k = khatam(s / 2, s / 2, R);
    const r8 = R * Math.cos(Math.PI / 4) / Math.cos(Math.PI / 8);
    const str = `<svg xmlns='${NS}' width='${s}' height='${s}' viewBox='0 0 ${s} ${s}'><g fill='none' stroke='${LINE}' stroke-width='1' opacity='.5'><path d='${k.a}'/><path d='${k.b}'/><path d='M0 ${s / 2}H${s / 2 - R}M${s / 2 + R} ${s / 2}H${s}M${s / 2} 0V${s / 2 - R}M${s / 2} ${s / 2 + R}V${s}'/><circle cx='${s / 2}' cy='${s / 2}' r='${r8.toFixed(2)}' opacity='.4'/></g></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(str)}")`;
  }

  function band(h) {
    const w = h * 2, m = h / 2;
    const str = `<svg xmlns='${NS}' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'><g fill='none' stroke-width='1.5'><path d='M0 ${m}Q${w / 4} 0 ${w / 2} ${m}T${w} ${m}' stroke='${ACC}'/><path d='M0 ${m}Q${w / 4} ${h} ${w / 2} ${m}T${w} ${m}' stroke='${HL}'/></g></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(str)}")`;
  }

  function crackle() {
    const str = `<svg xmlns='${NS}' width='240' height='240'><filter id='c'><feTurbulence type='fractalNoise' baseFrequency='.035' numOctaves='2' seed='7'/><feComponentTransfer><feFuncA type='discrete' tableValues='0 1 0 0 1 0'/></feComponentTransfer><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0'/></filter><rect width='240' height='240' filter='url(#c)'/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(str)}")`;
  }

  const root = document.documentElement.style;
  root.setProperty("--girih-tile", tile(96));
  root.setProperty("--band", band(8));
  root.setProperty("--crackle", crackle());

  function el(n, a) { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); return e; }

  function field(svg) {
    const s = 80, W = s * 6, H = s * 7;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const cols = 6, rows = 7;
    const sc = Math.floor(cols / 2), sr = Math.floor(rows / 2);
    const R = s / Math.SQRT2 * 0.5;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const cx = c * s + s / 2, cy = r * s + s / 2, k = khatam(cx, cy, R);
      const g = el("g", { class: "gt" });
      g.style.setProperty("--ring", Math.max(Math.abs(c - sc), Math.abs(r - sr)));
      g.appendChild(el("circle", { cx, cy, r: R, class: "cons" }));
      g.appendChild(el("path", { d: k.a, class: "ln" }));
      g.appendChild(el("path", { d: k.b, class: "ln" }));
      g.appendChild(el("polygon", { points: starPoints(cx, cy, R * 0.42, R * 0.2, 4), class: "mk" }));
      g.appendChild(el("path", { d: `M${cx - s / 2} ${cy}H${cx - R}M${cx + R} ${cy}H${cx + s / 2}M${cx} ${cy - s / 2}V${cy - R}M${cx} ${cy + R}V${cy + s / 2}`, class: "ln" }));
      svg.appendChild(g);
    }
  }

  function rosette(svg) {
    const S = 400, c = S / 2;
    svg.setAttribute("viewBox", `0 0 ${S} ${S}`);
    const rings = [170, 120, 70];
    rings.forEach((R, i) => {
      const g = el("g", { class: "gt" }); g.style.setProperty("--ring", i);
      g.appendChild(el("circle", { cx: c, cy: c, r: R, class: "cons" }));
      for (let k = 0; k < 8; k++) {
        const a = k * Math.PI / 4;
        g.appendChild(el("line", { x1: c, y1: c, x2: c + R * Math.cos(a), y2: c + R * Math.sin(a), class: "cons" }));
      }
      const kh = khatam(c, c, R);
      g.appendChild(el("path", { d: kh.a, class: "ln" }));
      g.appendChild(el("path", { d: kh.b, class: "ln" }));
      svg.appendChild(g);
    });
    const g = el("g", { class: "gt" }); g.style.setProperty("--ring", 3);
    g.appendChild(el("polygon", { points: starPoints(c, c, 54, 22, 8), class: "fillst" }));
    svg.appendChild(g);
  }

  function build() {
    document.querySelectorAll("svg[data-girih=field]").forEach(field);
    document.querySelectorAll("svg[data-girih=rosette]").forEach(rosette);
    document.querySelectorAll('img[src*="3d/d5-"]').forEach(img => {
      const s = el("svg", { "data-girih": "rosette", role: "img", "aria-label": img.alt || "Girih rosette built by compass and straightedge", class: "girih-rosette" });
      s.style.cssText = img.getAttribute("style") || "";
      img.replaceWith(s); rosette(s);
    });
    const seeds = document.querySelectorAll(".card,.opt,.btn,.chip,main h1,main .h1,.apphead,.stack>p,.setrow,.tl button");
    const cx = innerWidth / 2, cy = 0;
    seeds.forEach(n => {
      const b = n.getBoundingClientRect();
      const d = Math.hypot(b.left + b.width / 2 - cx, b.top + b.height / 2 - cy);
      n.style.setProperty("--ring", Math.min(12, Math.round(d / 160)));
      n.classList.add("grow");
    });
    if (!reduce) document.documentElement.classList.add("girih-anim");
    requestAnimationFrame(() => document.documentElement.classList.add("girih-in"));
  }

  let ctx = null, on = false;
  try { on = localStorage.getItem("bkt-sound-d5") === "on"; } catch (e) {}
  function chime() {
    if (!on) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      const t = ctx.currentTime;
      [1568, 2349].forEach((f, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = "sine"; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(i ? 0.03 : 0.06, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
        o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.62);
      });
    } catch (e) {}
  }
  function toggle() {
    const b = document.createElement("button");
    b.type = "button"; b.className = "sndtog";
    const paint = () => { b.setAttribute("aria-pressed", String(on)); b.textContent = on ? "Sound on" : "Sound off"; };
    paint();
    b.addEventListener("click", () => { on = !on; try { localStorage.setItem("bkt-sound-d5", on ? "on" : "off"); } catch (e) {} paint(); chime(); });
    const dock = document.querySelector(".apphead") || document.querySelector(".top") || document.querySelector(".auth .art") || document.querySelector("main") || document.body;
    const last = dock.classList.contains("top") ? dock.querySelector(":scope > .btn") : null;
    last ? dock.insertBefore(b, last) : dock.appendChild(b);
  }
  document.addEventListener("pointerdown", e => { const t = e.target.closest(".btn,.chip,.opt,.mode"); if (t && !t.classList.contains("sndtog")) chime(); });

  const go = () => { build(); toggle(); };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", go) : go();
})();
