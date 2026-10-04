"use client";

import { useState } from "react";
import { binaryEntropy, DEMO_SOURCES, DEMO_TOOLS, PATH_STEPS, SAMPLE_CSV, parseProbabilities, searchDemoSources, type DemoTool } from "@/lib/download/demo";
import styles from "./download-demo.module.css";

const FIRST_NOTE = "# A coin, a question, a bit\n\nWhat changes when a coin becomes predictable?\n\nMove the probability in Learn, then save a source from Explore.";

function saveFile(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function EntropyPicture({ p }: { p: number }) {
  const path = Array.from({ length: 101 }, (_, index) => `${index ? "L" : "M"}${50 + index * 4.4},${225 - binaryEntropy(index / 100) * 175}`).join(" ");
  return <svg viewBox="0 0 540 280" role="img" aria-label={`Binary entropy curve. At probability ${p.toFixed(2)}, entropy is ${binaryEntropy(p).toFixed(2)} bits.`} className={styles.plot}>
    <defs><linearGradient id="entropy-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#b8861e" stopOpacity=".24" /><stop offset="100%" stopColor="#b8861e" stopOpacity="0" /></linearGradient></defs>
    {[0, .5, 1].map((value) => <g key={value}><path d={`M50 ${225 - value * 175}H490`} stroke="#d9d3c5" strokeDasharray="3 7" /><text x="35" y={230 - value * 175} textAnchor="end">{value}</text></g>)}
    <path d={`${path} L490 225 L50 225 Z`} fill="url(#entropy-area)" />
    <path d="M50 35V225H490" fill="none" stroke="#938773" />
    <path d={path} fill="none" stroke="#315e50" strokeWidth="3" />
    <path d={`M${50 + p * 440} 225V${225 - binaryEntropy(p) * 175}`} stroke="#b8861e" strokeDasharray="4 5" />
    <circle cx={50 + p * 440} cy={225 - binaryEntropy(p) * 175} r="8" fill="#b8861e" stroke="#faf7ed" strokeWidth="3" />
    <text x="50" y="252">0</text><text x="270" y="252" textAnchor="middle">½</text><text x="490" y="252" textAnchor="end">1</text>
    <text x="52" y="22">uncertainty · bits</text><text x="270" y="275" textAnchor="middle">probability of heads</text>
  </svg>;
}

export default function ProductDemo() {
  const [tool, setTool] = useState<DemoTool>("learn");
  const [p, setP] = useState(.5);
  const [step, setStep] = useState(0);
  const [query, setQuery] = useState("entropy");
  const [saved, setSaved] = useState<string[]>([]);
  const [note, setNote] = useState(FIRST_NOTE);
  const [answer, setAnswer] = useState<number | null>(null);
  const [reveal, setReveal] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [csv, setCsv] = useState(SAMPLE_CSV);
  const [analyzedCsv, setAnalyzedCsv] = useState(SAMPLE_CSV);
  const [values, setValues] = useState(() => parseProbabilities(SAMPLE_CSV));
  const [error, setError] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [workAnswer, setWorkAnswer] = useState<boolean | null>(null);
  const [notice, setNotice] = useState("");
  const current = DEMO_TOOLS.find((item) => item.id === tool)!;
  const entropy = binaryEntropy(p);
  const record = (event: string) => setEvents((items) => [...items.slice(-19), event]);

  function reset() {
    setTool("learn"); setP(.5); setStep(0); setQuery("entropy"); setSaved([]); setNote(FIRST_NOTE);
    setAnswer(null); setReveal(false); setReviewed(false); setCsv(SAMPLE_CSV); setValues(parseProbabilities(SAMPLE_CSV));
    setAnalyzedCsv(SAMPLE_CSV); setEvents([]); setError(""); setWorkAnswer(null); setNotice("Sample workspace reset. Your download details are unchanged.");
  }

  function keepSource(id: string) {
    const source = DEMO_SOURCES.find((item) => item.id === id)!;
    if (saved.includes(id)) return;
    setSaved((items) => [...items, id]);
    setNote((text) => `${text}\n\n## ${source.title}\n${source.author} · ${source.year}\n${source.detail}${source.url ? `\n${source.url}` : ""}`);
    record(`Saved ${source.title} to Notes`);
    setNotice("Source saved to Notes.");
  }

  function analyze(text: string) {
    try { const rows = parseProbabilities(text); setValues(rows); setCsv(text); setAnalyzedCsv(text); setError(""); record(`Analyzed ${rows.length} sample probabilities`); setTool("analyze"); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "This CSV could not be read."); }
  }

  async function loadFile(file?: File) {
    if (!file) return;
    if (file.size > 20_000) { setError("Choose a CSV under 20 KB."); return; }
    try { analyze(await file.text()); } catch { setError("This file could not be read. Try pasting its values."); }
  }

  return <section className={styles.workspace} aria-label="Interactive sample workspace" data-product-demo>
    <div className={styles.workspaceBar}><span><i aria-hidden="true" /> Sample workspace</span><button type="button" onClick={reset}>Reset demo ↺</button></div>
    <div className={styles.workspaceBody}>
      <nav className={styles.toolNav} aria-label="Demo tools">{DEMO_TOOLS.map((item) => <button key={item.id} type="button" aria-pressed={tool === item.id} onClick={() => { setTool(item.id); setNotice(""); }}>{item.label}</button>)}</nav>
      <div className={styles.toolContent}>
        <div className={styles.toolHeading}><span className={styles.eyebrow}>{current.label}</span><p>{current.hint}</p></div>
        {tool === "learn" && <>
          <h2>How much can a coin tell you?</h2>
          <div className={styles.coinRow}><span className={styles.coin}>H</span><div><strong data-entropy-output>{entropy.toFixed(2)} <small>bits</small></strong><p>{p === 0 || p === 1 ? "The outcome is certain." : p === .5 ? "Both outcomes are equally likely." : "One outcome is more likely."}</p></div><span className={`${styles.coin} ${styles.coinTail}`}>T</span></div>
          <EntropyPicture p={p} />
          <label className={styles.sliderLabel}>Chance of heads <output>{Math.round(p * 100)}%</output><input aria-label="Chance of heads" type="range" min="0" max="100" value={Math.round(p * 100)} onChange={(event) => setP(Number(event.target.value) / 100)} /></label>
          <p className={styles.formula}>H(p) = −p log₂ p − (1−p) log₂(1−p)</p>
          <p className={styles.small}>Binary entropy, with 0 log₂ 0 = 0. <a href={DEMO_SOURCES[0].url} target="_blank" rel="noreferrer">Shannon, 1948 ↗</a></p>
          <button className={styles.primary} type="button" onClick={() => { setTool("path"); record("Explored the binary entropy curve"); }}>Follow the idea →</button>
        </>}
        {(tool === "path" || tool === "canon") && <>
          <h2>{tool === "path" ? "Build the idea from its prerequisites." : "An idea has roots."}</h2>
          <div className={styles.path} aria-label="Sample prerequisite path">{PATH_STEPS.map((item, index) => <button type="button" aria-pressed={step === index} onClick={() => setStep(index)} key={item.name}><span>{String(index + 1).padStart(2, "0")}</span>{item.name}</button>)}</div>
          <article className={styles.paper}><span className={styles.eyebrow}>Selected concept</span><h3>{PATH_STEPS[step].name}</h3><p>{PATH_STEPS[step].body}</p></article>
          <p className={styles.small}>This example path introduces the formula. The desktop lets you follow its bundled learning concepts and browse the Canon graph.</p>
          <button className={styles.primary} type="button" onClick={() => setTool(tool === "canon" ? "explore" : "quiz")}>{tool === "canon" ? "Find the source" : "Check your understanding"} →</button>
        </>}
        {(tool === "quiz" || tool === "work") && <>
          <span className={styles.eyebrow}>{tool === "quiz" ? "One question" : "Recall your work"}</span>
          <h2>{tool === "quiz" ? "Which coin has the most uncertainty?" : saved.length ? "Where did your saved source go?" : "Which control changed the chance of heads?"}</h2>
          <div className={styles.answers}>{(tool === "quiz" ? ["A coin that always lands heads", "A fair coin", "A coin with a 90% chance of heads"] : saved.length ? ["Notes", "The download form"] : ["The probability slider", "The email field"]).map((text, index) => <button type="button" key={text} aria-pressed={tool === "quiz" ? answer === index : undefined} onClick={() => { if (tool === "quiz") { setAnswer(index); record(index === 1 ? "Answered the entropy question" : "Tried the entropy question"); } else { setWorkAnswer(index === 0); record("Answered a work quiz question"); } }}>{text}<span>↗</span></button>)}</div>
          {(tool === "quiz" ? answer !== null : workAnswer !== null) && <p role="status" className={styles.feedback}>{tool === "quiz" ? answer === 1 ? "Yes. Equal probabilities give the largest binary entropy: one bit." : "Try the fair coin. Uncertainty peaks when the two outcomes are equally likely." : workAnswer ? "You remembered it." : "Try the first answer. Your actions remain inside this sample workspace."}</p>}
          <button type="button" className={styles.textButton} onClick={() => setTool("review")}>Keep practicing in Review →</button>
        </>}
        {tool === "review" && <>
          <span className={styles.eyebrow}>Sample review card</span><h2>What happens to entropy when the outcome is certain?</h2>
          {reveal ? <article className={styles.paper}><h3>Zero bits.</h3><p>A certain outcome leaves no uncertainty. Both ends of the binary entropy curve meet zero.</p><button type="button" className={styles.primary} onClick={() => { setReviewed(true); record("Reviewed the certain-outcome card"); }}>{reviewed ? "Reviewed ✓" : "I recalled it"}</button></article> : <button className={styles.primary} type="button" onClick={() => setReveal(true)}>Show answer</button>}
          <p className={styles.small}>The installed app schedules reviews from your learning history. This card is a practice example.</p>
        </>}
        {tool === "explore" && <>
          <h2>Follow your question to a source.</h2><label className={styles.field}>Search sample sources<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try entropy, Shannon, or coin" /></label>
          <div className={styles.sources}>{searchDemoSources(query).map((source) => <article key={source.id} className={styles.paper}><span className={styles.eyebrow}>{source.kind} · {source.year}</span><h3>{source.title}</h3><p>{source.detail}</p><div className={styles.sourceActions}><button type="button" disabled={saved.includes(source.id)} onClick={() => keepSource(source.id)}>{saved.includes(source.id) ? "Saved to Notes ✓" : "Save to Notes +"}</button>{source.url && <a href={source.url} target="_blank" rel="noreferrer">Read source ↗</a>}</div></article>)}{searchDemoSources(query).length === 0 && <p>No sample matches. Try “entropy” or “Shannon”.</p>}</div>
        </>}
        {tool === "notes" && <>
          <h2>Keep the trail of your thinking.</h2><label className={styles.field}>Your sample note<textarea value={note} maxLength={12000} rows={12} onChange={(event) => setNote(event.target.value)} /></label>
          <button type="button" className={styles.primary} onClick={() => { saveFile("bucket-entropy-note.md", note, "text/markdown"); record("Exported a sample note"); }}>Export note ↓</button><p className={styles.small}>Edits stay in this tab. Export a copy before you reset or leave.</p>
        </>}
        {tool === "history" && <>
          <h2>A record of the work.</h2>{events.length ? <ol className={styles.history}>{events.map((event, index) => <li key={`${index}-${event}`}><span>{String(index + 1).padStart(2, "0")}</span>{event}</li>)}</ol> : <article className={styles.paper}><p>Save a source, answer a question, or analyze the sample data. Your actions will appear here.</p><button type="button" onClick={() => setTool("explore")}>Start with a source →</button></article>}
        </>}
        {(tool === "analyze" || tool === "data") && <>
          <h2>{tool === "analyze" ? "See the numbers behind the curve." : "Take the example apart."}</h2><div className={styles.metrics}><div><strong>{values.length}</strong><span>rows</span></div><div><strong>{(values.reduce((sum, value) => sum + binaryEntropy(value), 0) / values.length).toFixed(3)}</strong><span>mean entropy · bits</span></div></div>
          <div className={styles.tableWrap}><table><caption>Sample probabilities and computed binary entropy</caption><thead><tr><th>Probability of heads</th><th>Entropy in bits</th></tr></thead><tbody>{values.slice(0, 12).map((value, index) => <tr key={index}><td>{value}</td><td>{binaryEntropy(value).toFixed(4)}</td></tr>)}</tbody></table></div>
          {values.length > 12 && <p className={styles.small}>Showing the first 12 rows.</p>}
          <div className={styles.sourceActions}><button type="button" onClick={() => saveFile("bucket-coin-probabilities.csv", analyzedCsv, "text/csv")}>Download sample CSV ↓</button><button type="button" onClick={() => setTool("add")}>Try your values →</button></div>
          <p className={styles.small}>The desktop Analyze data screen runs its analysis tools on your chosen files. This browser example computes binary entropy.</p>
        </>}
        {tool === "add" && <>
          <h2>Bring a question of your own.</h2><label className={styles.field}>Probabilities, one per row<textarea value={csv} rows={7} maxLength={20000} onChange={(event) => setCsv(event.target.value)} /></label><button type="button" className={styles.primary} onClick={() => analyze(csv)}>Analyze these values →</button>
          <label className={`${styles.field} ${styles.fileInput}`}>Or choose a numeric CSV<input type="file" accept=".csv,text/csv" onChange={(event) => void loadFile(event.target.files?.[0])} /></label>{error && <p role="alert" className={styles.feedback}>{error}</p>}<p className={styles.small}>One probability from zero to one per row, up to 20 KB. The file is read in your browser.</p>
        </>}
        <p role="status" className={styles.notice}>{notice}</p>
      </div>
    </div>
    <p className={styles.workspaceFoot}>A guided sample of Bucket. Changes stay in this tab and reset on refresh. No account needed.</p>
  </section>;
}
