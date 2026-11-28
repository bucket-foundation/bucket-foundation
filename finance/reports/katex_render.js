const katex = require("./vendor/katex/katex.min.js");
let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  const items = JSON.parse(raw);
  const out = items.map((it) =>
    katex.renderToString(it.tex, { displayMode: it.display, throwOnError: false, output: "html", strict: "ignore" })
  );
  process.stdout.write(JSON.stringify(out));
});
