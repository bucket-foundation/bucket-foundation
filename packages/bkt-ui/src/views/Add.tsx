import { href } from "../router";

export function AddView() {
  return (
    <section>
      <header className="head">
        <h1>Add your own</h1>
        <p className="muted">Bring in what you already have. Everything stays on this computer.</p>
      </header>
      <div className="grid">
        <a className="deck" href={href({ name: "import" })}>
          <span className="deck-title">Bring progress from the website</span>
          <span className="deck-meta">Carry over what you studied on the Bucket website.</span>
        </a>
        <a className="deck" href={href({ name: "jobs" })}>
          <span className="deck-title">Analyze my data</span>
          <span className="deck-meta">Find patterns in a table of your own.</span>
        </a>
      </div>
    </section>
  );
}
