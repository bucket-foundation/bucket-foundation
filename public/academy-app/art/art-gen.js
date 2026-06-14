/* Bucket Academy — deterministic procedural SVG concept-art anchor.
 *
 * The load-bearing-art contract (GRAPHICS-RENDERING.md §2): the anchor must DEPICT
 * the actual concept/mechanism, be crisp, tiny, offline, on-brand, alt-texted, and
 * — crucially — DETERMINISTIC (same atom → same bytes, byte-for-byte). Diffusion
 * models are BANNED here: they hallucinate plausible-but-wrong science (−0.3..−0.5σ
 * for novices). Everything below is drawn from the atom's own data + a hash(atomId)
 * seed, so it is reproducible, inspectable, and $0.
 *
 * Three tiers, by what we can honestly depict:
 *   1. Equation atoms whose relation we RECOGNISE  → plot the REAL curve.
 *   2. Equation/mechanism atoms we can't parse      → an on-brand schematic motif
 *      keyed to the atom type (lattice / orbital / wave / membrane / flow / tree).
 *   3. Everything else (concept/result/abstract)    → a constrained generative motif
 *      seeded by the atom's id + dependency-graph position (encodes something true:
 *      its leverage/shell, never random decoration).
 *
 * Runs identically in the browser (window.BucketArt) and at build time
 * (module.exports, used by build-art.mjs). No dependencies.
 */
(function (root) {
  "use strict";

  // ---- on-brand palette (mirrors css/app.css :root) ----
  var PAL = {
    bg: "#EFE8D4", // bone
    card: "#F5F0E1",
    ink: "#1F1C16", // basalt
    inkDim: "#4A4238",
    inkFaint: "#6F6A5E",
    line: "rgba(31,28,22,0.14)",
    lineStrong: "rgba(31,28,22,0.26)",
    aegean: "#2E6B6B",
    aegeanDeep: "#1F4F4F",
    gold: "#B8861E",
    goldDeep: "#8A641A",
    laurel: "#5A7A3A",
    laurelDeep: "#3E5A2A",
  };
  var SHELL_STROKE = { prereq: PAL.aegean, nucleus: PAL.goldDeep, frontier: PAL.laurel };

  // ---- deterministic PRNG: FNV-1a hash → mulberry32 ----
  function hashStr(s) {
    var h = 2166136261 >>> 0;
    s = String(s);
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---- viewBox geometry ----
  var W = 320, H = 150; // 2.13:1, matches the .art card aspect
  var PLOT = { x0: 30, y0: 18, x1: 296, y1: 120 }; // plot frame for curve figures

  function fnum(n) {
    // trim float cruft so output is small + stable
    return (Math.round(n * 100) / 100).toString();
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* ============================================================
   * EQUATION RECOGNITION → real plotted figures
   * We only claim a curve when the equation's *form* is unambiguous.
   * Each returns {f, label, domain, note} or null.
   * ============================================================ */
  function recognise(eq) {
    if (!eq) return null;
    var e = eq.replace(/\s+/g, "");

    // exponential decay: e^{-x...} / Boltzmann factor / e^{-E/kT}
    if (/e\^\{?-/.test(e) || /e\^\(-/.test(e)) {
      // logistic / sigmoid sniff first (has 1/(1+e^-x))
      if (/1\}?\{?\(?1\+e/.test(e) || /\\frac\{1\}\{1\+e/.test(e) || /1\/\(1\+e/.test(e)) {
        return { kind: "sigmoid", f: function (x) { return 1 / (1 + Math.exp(-6 * (x - 0.5))); }, label: "logistic", domain: [0, 1] };
      }
      return { kind: "decay", f: function (x) { return Math.exp(-3.2 * x); }, label: "e^{−x}", domain: [0, 1] };
    }
    // logistic written without an explicit e^- (e.g. \sigma(x))
    if (/sigmoid|logistic|\\sigma\(/.test(eq)) {
      return { kind: "sigmoid", f: function (x) { return 1 / (1 + Math.exp(-6 * (x - 0.5))); }, label: "logistic", domain: [0, 1] };
    }
    // gaussian / normal: e^{-x^2}
    if (/e\^\{?-.*\^2/.test(e) || /gauss|normal/.test(eq)) {
      return { kind: "gaussian", f: function (x) { var u = (x - 0.5) * 6; return Math.exp(-u * u / 2); }, label: "e^{−x²}", domain: [0, 1] };
    }
    // power law / scaling: x^a , R^2 = N b^2 , \propto
    if (/\\langleR\^2|N\s*b\^2|\\propto|\^\{?[0-9.]+\}?/.test(e) && !/e\^/.test(e)) {
      return { kind: "power", f: function (x) { return Math.pow(x, 0.5); }, label: "x^{1/2}", domain: [0, 1] };
    }
    // oscillation: sin / cos / wave
    if (/\\?sin|\\?cos|wave|oscill/.test(eq)) {
      return { kind: "wave", f: function (x) { return 0.5 + 0.42 * Math.sin(x * Math.PI * 4); }, label: "sin", domain: [0, 1] };
    }
    // linear proportional: y = mx, \Delta G = \Delta H - T\Delta S (linear in T)
    if (/=.*-T|=k|=m?x|\\propto x|=.*\\cdot/.test(e)) {
      return { kind: "linear", f: function (x) { return 0.85 - 0.7 * x; }, label: "linear", domain: [0, 1] };
    }
    // log: \ln , \log , F=-kT ln Z
    if (/\\ln|\\log/.test(e)) {
      return { kind: "log", f: function (x) { return Math.max(0, 0.2 + 0.8 * Math.log(1 + 9 * x) / Math.log(10)); }, label: "ln", domain: [0, 1] };
    }
    return null;
  }

  // sample f over domain → SVG path in the plot frame
  function plotPath(f, n) {
    n = n || 64;
    var W2 = PLOT.x1 - PLOT.x0, H2 = PLOT.y1 - PLOT.y0;
    var d = "";
    var lo = Infinity, hi = -Infinity, ys = [];
    for (var i = 0; i <= n; i++) {
      var x = i / n;
      var y = f(x);
      ys.push(y);
      if (y < lo) lo = y;
      if (y > hi) hi = y;
    }
    var span = hi - lo || 1;
    for (var j = 0; j <= n; j++) {
      var px = PLOT.x0 + (j / n) * W2;
      var py = PLOT.y1 - ((ys[j] - lo) / span) * H2;
      d += (j === 0 ? "M" : "L") + fnum(px) + " " + fnum(py);
    }
    return d;
  }

  function axes() {
    return (
      '<line x1="' + PLOT.x0 + '" y1="' + PLOT.y1 + '" x2="' + PLOT.x1 + '" y2="' + PLOT.y1 +
      '" stroke="' + PAL.lineStrong + '" stroke-width="1"/>' +
      '<line x1="' + PLOT.x0 + '" y1="' + PLOT.y0 + '" x2="' + PLOT.x0 + '" y2="' + PLOT.y1 +
      '" stroke="' + PAL.lineStrong + '" stroke-width="1"/>'
    );
  }

  function figureCurve(rec, accent) {
    var d = plotPath(rec.f);
    var area = d + "L" + PLOT.x1 + " " + PLOT.y1 + "L" + PLOT.x0 + " " + PLOT.y1 + "Z";
    return (
      axes() +
      '<path d="' + area + '" fill="' + accent + '" fill-opacity="0.10"/>' +
      '<path d="' + d + '" fill="none" stroke="' + accent + '" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>' +
      // a single honest data tick at the curve's midpoint
      '<circle cx="' + fnum((PLOT.x0 + PLOT.x1) / 2) + '" cy="' + fnum(PLOT.y1 - (rec.f(0.5) - rec.f(1)) / ((rec.f(0) - rec.f(1)) || 1) * (PLOT.y1 - PLOT.y0)) +
      '" r="3" fill="' + accent + '"/>' +
      '<text x="' + (PLOT.x1 - 4) + '" y="' + (PLOT.y0 + 11) + '" text-anchor="end" font-family="ui-monospace,Menlo,monospace" font-size="10" fill="' + PAL.inkFaint + '">' + esc(rec.label) + "</text>"
    );
  }

  /* ============================================================
   * SCHEMATIC MOTIFS (tier 2/3) — keyed to atom type, seeded by id.
   * Each is a true *constrained* schematic: it encodes the atom's kind
   * and dependency position, never decorative noise.
   * ============================================================ */
  function motifLattice(rnd, accent) {
    // crystal / lattice / structure — a regular grid of nodes with subtle jitter
    var s = "";
    var cols = 7, rows = 3, cw = (PLOT.x1 - PLOT.x0) / (cols - 1), ch = (PLOT.y1 - PLOT.y0) / (rows - 1);
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var x = PLOT.x0 + c * cw + (rnd() - 0.5) * 4;
      var y = PLOT.y0 + r * ch + (rnd() - 0.5) * 4;
      if (c < cols - 1) s += '<line x1="' + fnum(x) + '" y1="' + fnum(y) + '" x2="' + fnum(x + cw) + '" y2="' + fnum(PLOT.y0 + r * ch) + '" stroke="' + PAL.line + '" stroke-width="1"/>';
      if (r < rows - 1) s += '<line x1="' + fnum(x) + '" y1="' + fnum(y) + '" x2="' + fnum(PLOT.x0 + c * cw) + '" y2="' + fnum(y + ch) + '" stroke="' + PAL.line + '" stroke-width="1"/>';
    }
    for (var r2 = 0; r2 < rows; r2++) for (var c2 = 0; c2 < cols; c2++) {
      var x2 = PLOT.x0 + c2 * cw + (rnd() - 0.5) * 4, y2 = PLOT.y0 + r2 * ch + (rnd() - 0.5) * 4;
      s += '<circle cx="' + fnum(x2) + '" cy="' + fnum(y2) + '" r="3.4" fill="' + accent + '"/>';
    }
    return s;
  }
  function motifOrbital(rnd, accent) {
    // atom / orbital / field — concentric ellipses + a nucleus + orbiting marks
    var cx = (PLOT.x0 + PLOT.x1) / 2, cy = (PLOT.y0 + PLOT.y1) / 2;
    var s = "";
    for (var k = 1; k <= 3; k++) {
      var rx = 30 * k + rnd() * 6, ry = 16 * k;
      var rot = Math.floor(rnd() * 180);
      s += '<ellipse cx="' + fnum(cx) + '" cy="' + fnum(cy) + '" rx="' + fnum(rx) + '" ry="' + fnum(ry) + '" fill="none" stroke="' + PAL.lineStrong + '" stroke-width="1" transform="rotate(' + rot + " " + fnum(cx) + " " + fnum(cy) + ')"/>';
      var ang = rnd() * Math.PI * 2;
      s += '<circle cx="' + fnum(cx + Math.cos(ang) * rx * Math.cos(rot * Math.PI / 180)) + '" cy="' + fnum(cy + Math.sin(ang) * ry) + '" r="3" fill="' + accent + '"/>';
    }
    s += '<circle cx="' + fnum(cx) + '" cy="' + fnum(cy) + '" r="6.5" fill="' + accent + '"/>';
    return s;
  }
  function motifWave(rnd, accent) {
    // wave / oscillation / signal — two phase-shifted sinusoids
    var s = axes();
    for (var w = 0; w < 2; w++) {
      var ph = rnd() * Math.PI, amp = 0.34 - w * 0.12, freq = 3 + w;
      var d = "";
      for (var i = 0; i <= 64; i++) {
        var x = i / 64;
        var px = PLOT.x0 + x * (PLOT.x1 - PLOT.x0);
        var py = (PLOT.y0 + PLOT.y1) / 2 - Math.sin(x * Math.PI * freq + ph) * amp * (PLOT.y1 - PLOT.y0);
        d += (i === 0 ? "M" : "L") + fnum(px) + " " + fnum(py);
      }
      s += '<path d="' + d + '" fill="none" stroke="' + (w === 0 ? accent : PAL.inkFaint) + '" stroke-width="' + (w === 0 ? 2.4 : 1.4) + '" stroke-linecap="round"/>';
    }
    return s;
  }
  function motifMembrane(rnd, accent) {
    // membrane / barrier / transport — a lipid bilayer with a channel
    var midY = (PLOT.y0 + PLOT.y1) / 2, sp = 14, n = 13;
    var s = "";
    var gap = Math.floor(n * (0.35 + rnd() * 0.3));
    for (var i = 0; i < n; i++) {
      if (i === gap || i === gap + 1) continue; // channel gap
      var x = PLOT.x0 + 6 + i * ((PLOT.x1 - PLOT.x0 - 12) / (n - 1));
      s += '<line x1="' + fnum(x) + '" y1="' + fnum(midY - sp) + '" x2="' + fnum(x) + '" y2="' + fnum(midY + sp) + '" stroke="' + PAL.lineStrong + '" stroke-width="1.2"/>';
      s += '<circle cx="' + fnum(x) + '" cy="' + fnum(midY - sp) + '" r="3.6" fill="' + accent + '" fill-opacity="0.85"/>';
      s += '<circle cx="' + fnum(x) + '" cy="' + fnum(midY + sp) + '" r="3.6" fill="' + accent + '" fill-opacity="0.85"/>';
    }
    // a particle passing through the channel
    var gx = PLOT.x0 + 6 + (gap + 0.5) * ((PLOT.x1 - PLOT.x0 - 12) / (n - 1));
    s += '<circle cx="' + fnum(gx) + '" cy="' + fnum(midY) + '" r="5" fill="' + PAL.gold + '"/>';
    s += '<path d="M' + fnum(gx) + " " + fnum(midY - sp - 10) + "L" + fnum(gx) + " " + fnum(midY + sp + 10) + '" stroke="' + PAL.gold + '" stroke-width="1" stroke-dasharray="2 3"/>';
    return s;
  }
  function motifFlow(rnd, accent) {
    // process / method / transformation — a left→right pipeline of stages
    var midY = (PLOT.y0 + PLOT.y1) / 2, n = 3 + Math.floor(rnd() * 2);
    var s = "", bw = (PLOT.x1 - PLOT.x0 - (n - 1) * 18) / n;
    for (var i = 0; i < n; i++) {
      var x = PLOT.x0 + i * (bw + 18);
      s += '<rect x="' + fnum(x) + '" y="' + fnum(midY - 16) + '" width="' + fnum(bw) + '" height="32" rx="5" fill="' + PAL.card + '" stroke="' + accent + '" stroke-width="1.6"/>';
      s += '<circle cx="' + fnum(x + bw / 2) + '" cy="' + fnum(midY) + '" r="' + fnum(4 + i) + '" fill="' + accent + '" fill-opacity="' + fnum(0.4 + i * 0.2) + '"/>';
      if (i < n - 1) {
        var ax = x + bw, ax2 = ax + 18;
        s += '<line x1="' + fnum(ax) + '" y1="' + fnum(midY) + '" x2="' + fnum(ax2 - 5) + '" y2="' + fnum(midY) + '" stroke="' + PAL.inkFaint + '" stroke-width="1.4"/>';
        s += '<path d="M' + fnum(ax2 - 8) + " " + fnum(midY - 3) + "L" + fnum(ax2 - 3) + " " + fnum(midY) + "L" + fnum(ax2 - 8) + " " + fnum(midY + 3) + 'Z" fill="' + PAL.inkFaint + '"/>';
      }
    }
    return s;
  }
  function motifTree(rnd, accent, leverage) {
    // theorem / result / definition — a branching dependency tree whose breadth
    // encodes leverage (how much this atom unlocks). Honest: it depicts position
    // in the knowledge lattice.
    var rootX = PLOT.x0 + 14, rootY = (PLOT.y0 + PLOT.y1) / 2;
    var branches = 2 + Math.round((leverage || 0.3) * 3);
    var s = '<circle cx="' + fnum(rootX) + '" cy="' + fnum(rootY) + '" r="6.5" fill="' + accent + '"/>';
    for (var b = 0; b < branches; b++) {
      var t = branches === 1 ? 0.5 : b / (branches - 1);
      var ey = PLOT.y0 + 12 + t * (PLOT.y1 - PLOT.y0 - 24);
      var ex = PLOT.x1 - 40 - rnd() * 30;
      var midX = (rootX + ex) / 2;
      s += '<path d="M' + fnum(rootX + 6) + " " + fnum(rootY) + "C" + fnum(midX) + " " + fnum(rootY) + " " + fnum(midX) + " " + fnum(ey) + " " + fnum(ex) + " " + fnum(ey) +
        '" fill="none" stroke="' + PAL.lineStrong + '" stroke-width="1.3"/>';
      s += '<circle cx="' + fnum(ex) + '" cy="' + fnum(ey) + '" r="3.6" fill="' + accent + '" fill-opacity="0.85"/>';
      // second-order leaves for high-leverage atoms
      if ((leverage || 0) > 0.5 && rnd() > 0.4) {
        var lx = ex + 22, ly = ey + (rnd() - 0.5) * 16;
        s += '<line x1="' + fnum(ex) + '" y1="' + fnum(ey) + '" x2="' + fnum(lx) + '" y2="' + fnum(ly) + '" stroke="' + PAL.line + '" stroke-width="1"/>';
        s += '<circle cx="' + fnum(lx) + '" cy="' + fnum(ly) + '" r="2.4" fill="' + PAL.inkFaint + '"/>';
      }
    }
    return s;
  }

  // map atom.type → a schematic motif, with keyword sniffing on title for precision
  function schematic(atom, rnd, accent) {
    var t = (atom.type || "concept").toLowerCase();
    var title = (atom.title || "").toLowerCase();
    var blurb = (atom.summary || "").toLowerCase();
    var hay = title + " " + blurb;
    if (/membrane|channel|transport|bilayer|osmo|diffus|permeab|barrier/.test(hay)) return { svg: motifMembrane(rnd, accent), alt: "schematic of a membrane with a channel" };
    if (/wave|oscill|vibration|frequency|fourier|signal|spectr|photon|light/.test(hay)) return { svg: motifWave(rnd, accent), alt: "two phase-shifted waveforms" };
    if (/orbit|atom|electron|nucleus|field|charge|quantum|spin/.test(hay)) return { svg: motifOrbital(rnd, accent), alt: "an orbital/field schematic with a central nucleus" };
    if (/lattice|crystal|structure|bond|polymer|network|grid|matrix/.test(hay)) return { svg: motifLattice(rnd, accent), alt: "a regular lattice of bonded nodes" };
    if (t === "method" || /process|pathway|cycle|algorithm|reaction|fold|synthesis|pipeline/.test(hay)) return { svg: motifFlow(rnd, accent), alt: "a left-to-right process pipeline" };
    if (t === "theorem" || t === "result" || t === "definition") return { svg: motifTree(rnd, accent, atom.leverage), alt: "a branching dependency tree" };
    // default: dependency tree sized by leverage (always honest about graph position)
    return { svg: motifTree(rnd, accent, atom.leverage), alt: "a branching dependency motif keyed to this concept's leverage" };
  }

  /* ============================================================
   * PUBLIC: build the full SVG string + alt text for an atom.
   * ============================================================ */
  function altFor(atom, body) {
    return "Concept figure for " + (atom.title || atom.id) + " — " + body + ", drawn in the Bucket palette.";
  }

  function svgFor(atom) {
    atom = atom || {};
    var seed = hashStr(atom.id || atom.title || "atom");
    var rnd = mulberry32(seed);
    var accent = SHELL_STROKE[atom.shell] || PAL.aegean;
    var inner, altBody;

    var rec = (atom.type === "equation" || atom.equation) ? recognise(atom.equation) : null;
    if (rec) {
      inner = figureCurve(rec, accent);
      altBody = "a plotted " + rec.label + " curve";
    } else {
      var sc = schematic(atom, rnd, accent);
      inner = sc.svg;
      altBody = sc.alt;
    }

    // subtle deterministic corner motif (grain dots) for texture — never over the figure
    var grain = "";
    for (var i = 0; i < 5; i++) {
      grain += '<circle cx="' + fnum(8 + rnd() * 18) + '" cy="' + fnum(H - 8 - rnd() * 18) + '" r="' + fnum(0.6 + rnd()) + '" fill="' + PAL.inkFaint + '" fill-opacity="0.25"/>';
    }

    var alt = altFor(atom, altBody);
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + " " + H + '" ' +
      'class="art-svg" role="img" aria-label="' + esc(alt) + '" preserveAspectRatio="xMidYMid meet">' +
      "<title>" + esc(alt) + "</title>" +
      // top shell rule
      '<rect x="0" y="0" width="' + W + '" height="3" fill="' + accent + '"/>' +
      inner + grain +
      "</svg>";
    return { svg: svg, alt: alt };
  }

  var API = { svgFor: svgFor, hashStr: hashStr, recognise: recognise, _PAL: PAL };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  root.BucketArt = API;
})(typeof window !== "undefined" ? window : this);
