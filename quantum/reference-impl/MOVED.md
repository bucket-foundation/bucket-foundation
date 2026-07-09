# Moved here 2026-07-08

This is the **Quantum Project** — quantum similarity & kernel estimation
(swap test / Hadamard test over amplitude-encoded states → quantum-kernel SVM,
with an honest shots-vs-noise error budget). Owner: Gianangelo Dichio.

**Previously:** `~/agfarms/biophysics-phd-review/qc-embedding-similarity/`
**Now:** `~/agfarms/bucket-foundation/quantum/reference-impl/`

Moved out of biophysics-phd-review because it is a quantum-computing project,
not a biophysics PhD-review artifact. It is the **depth anchor** for the Quantum
Operating Manual — a real, hardware-validatable reference implementation that the
manual's `03-stack-algorithms/` chapter (nodes `S-qsim`, `S-hhl`, `S-qml`,
`S-bench`) points to as a worked, reproducible example.

The `.venv/` (765 MB, regenerable) was dropped in the move. Rebuild with:
```bash
cd ~/agfarms/bucket-foundation/quantum/reference-impl
python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
```

`CLAUDE-SCIENCE-SETUP.md` is the paste-ready spec for the matching **Claude
Science** project (this is almost certainly the project behind the frame URL in
the initiative brief). See the initiative's Claude Science ask-list.
