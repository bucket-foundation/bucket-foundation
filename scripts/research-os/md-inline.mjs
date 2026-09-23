export function cells(line) {
  const out = [];
  let cur = "";
  let code = false;
  const body = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  for (const ch of body) {
    if (ch === "`") code = !code;
    if (ch === "|" && !code) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

export function segments(text) {
  const refs = [];
  const segs = [];
  const re = /(`[^`]+`)|(\[([^\]]+)\]\((https?:[^)\s]+)\))|(\[(\d+)\])|(<(https?:[^>\s]+)>)|(\*\*([^*]+)\*\*)/g;
  let last = 0;
  let m;
  const push = (t) => {
    if (!t) return;
    const prev = segs[segs.length - 1];
    if (prev && prev.t === "text") prev.v += t;
    else segs.push({ t: "text", v: t });
  };
  while ((m = re.exec(text))) {
    push(text.slice(last, m.index));
    if (m[1]) segs.push({ t: "code", v: m[1].slice(1, -1) });
    else if (m[2]) segs.push({ t: "link", v: m[3], href: m[4] });
    else if (m[5]) refs.push(Number(m[6]));
    else if (m[7]) segs.push({ t: "link", v: m[8], href: m[8] });
    else if (m[9]) push(m[10]);
    last = re.lastIndex;
  }
  push(text.slice(last));
  for (const s of segs) if (s.t === "text") s.v = s.v.replace(/\s+([,.;:)])/g, "$1").replace(/\s{2,}/g, " ");
  return { segs: segs.filter((s) => s.t !== "text" || s.v.trim() !== "" || segs.length === 1), refs };
}

export function plain(segs) {
  return segs.map((s) => s.v).join("").trim();
}

export function writeOrCheck(fs, out, json, label, summary) {
  if (process.argv.includes("--check")) {
    const now = fs.existsSync(out) ? fs.readFileSync(out, "utf8") : "";
    if (now !== json) {
      console.error(`${label} is stale; run the script without --check`);
      process.exit(1);
    }
    console.log(`${label} matches the memo: ${summary}`);
  } else {
    fs.writeFileSync(out, json);
    console.log(`wrote ${label}: ${summary}`);
  }
}
