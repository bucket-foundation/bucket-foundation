(() => {
  const NS = "http://www.w3.org/2000/svg";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function el(n, a) { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); return e; }

  function primitives(svg) {
    const W = 400, H = 280, M = 8;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const g = el("g", { class: "grid8" });
    for (let x = 0; x <= W; x += M * 5) g.appendChild(el("line", { x1: x, y1: 0, x2: x, y2: H }));
    for (let y = 0; y <= H; y += M * 5) g.appendChild(el("line", { x1: 0, y1: y, x2: W, y2: y }));
    svg.appendChild(g);
    const cons = el("g", { class: "cons" });
    cons.appendChild(el("circle", { cx: 88, cy: 80, r: 72 }));
    cons.appendChild(el("line", { x1: 88, y1: 80, x2: 312, y2: 200 }));
    svg.appendChild(cons);
    const shapes = [
      ["circle", { cx: 88, cy: 80, r: 56, fill: "#111" }],
      ["circle", { cx: 88, cy: 80, r: 32, fill: "#1D4ED8" }],
      ["circle", { cx: 88, cy: 80, r: 16, fill: "#FF5F00" }],
      ["rect", { x: 200, y: 40, width: 80, height: 80, fill: "#E1251B" }],
      ["path", { d: "M240 256 312 136 384 256Z", fill: "#F2C400" }],
      ["circle", { cx: 312, cy: 200, r: 8, fill: "#111" }],
      ["rect", { x: 40, y: 192, width: 120, height: 16, fill: "#111" }]
    ];
    shapes.forEach(([n, a], i) => { const s = el(n, a); s.setAttribute("class", "pr"); s.style.setProperty("--i", i); svg.appendChild(s); });
  }

  function build() {
    document.querySelectorAll("svg[data-prim]").forEach(primitives);
    document.querySelectorAll(".card,.opt,.btn,.chip,main h1,main .h1,.apphead,.setrow,.tl button,.d6-hero").forEach((n, i) => {
      n.classList.add("step-in"); n.style.setProperty("--i", Math.min(i, 8));
    });
    if (!reduce) document.documentElement.classList.add("prim-anim");
    requestAnimationFrame(() => document.documentElement.classList.add("prim-in"));
  }

  let ctx = null, on = false;
  try { on = localStorage.getItem("bkt-sound-d6") === "on"; } catch (e) {}
  function detent() {
    if (!on) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      const t = ctx.currentTime, n = Math.floor(ctx.sampleRate * 0.012);
      const buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
      for (let k = 0; k < n; k++) d[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / n, 6);
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = "bandpass"; f.frequency.value = 3200; f.Q.value = 2; g.gain.value = 0.5;
      s.buffer = buf; s.connect(f).connect(g).connect(ctx.destination); s.start(t);
    } catch (e) {}
  }

  function turn(root) {
    root.querySelectorAll(".knob").forEach(k => {
      const a = (parseFloat(k.dataset.a || "0") + 22.5) % 360;
      k.dataset.a = a; k.style.setProperty("--a", a + "deg");
    });
  }

  function toggle() {
    const b = document.createElement("button");
    b.type = "button"; b.className = "sndtog";
    b.innerHTML = '<span class="knob" aria-hidden="true"></span><span class="t"></span>';
    const paint = () => { b.setAttribute("aria-pressed", String(on)); b.querySelector(".t").textContent = on ? "SOUND ON" : "SOUND OFF"; };
    paint();
    b.addEventListener("click", () => { on = !on; try { localStorage.setItem("bkt-sound-d6", on ? "on" : "off"); } catch (e) {} paint(); turn(b); detent(); });
    const dock = document.querySelector(".apphead") || document.querySelector(".top") || document.querySelector(".auth .art") || document.querySelector("main") || document.body;
    const last = dock.classList.contains("top") ? dock.querySelector(":scope > .btn") : null;
    last ? dock.insertBefore(b, last) : dock.appendChild(b);
  }

  document.addEventListener("pointerdown", e => {
    const t = e.target.closest(".btn,.chip,.opt,.mode,.tog");
    if (!t || t.classList.contains("sndtog")) return;
    turn(t); if (t.classList.contains("btn")) turn(document.querySelector(".keys") || t); detent();
  });

  const go = () => { build(); toggle(); };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", go) : go();
})();
