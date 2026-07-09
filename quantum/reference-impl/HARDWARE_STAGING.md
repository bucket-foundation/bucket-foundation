# Hardware run — staged and GATED (do not execute without explicit go-ahead)

This document stages the single real-QPU run. **Nothing here has been run.** No
account was created, no credentials were entered, no ToS was accepted, no job was
submitted. Execute only after an explicit "go", and run the `--check` preflight
first every time.

## Status of the gate

- `src/experiment.py` and `src/angle_sweep.py` both **refuse to submit** a
  hardware job unless `--run` is passed. Verified: `--backend ibm` without
  `--run` prints "Refusing to submit a hardware job without --run."
- `--check` is a separate QPU-free path (auth + device metadata + local
  transpile + cost report). It submits nothing.
- The hardware libraries are **not installed** in `.venv`:
  `qiskit-ibm-runtime` (IBM) and `qiskit-braket-provider` (IonQ) are both absent.
  A `--check` today fails at `import qiskit_ibm_runtime` — expected. They must be
  installed, and the user must supply credentials, before any hardware path runs.

## Recommended first run — IBM Open plan, dim=2 signed-cosine angle sweep

The lowest-risk, highest-information first circuit is the **dim=2 Hadamard-test
angle sweep** (`src/angle_sweep.py`): one figure that traces measured-vs-true
cosine across the full signed range, at minimal depth.

Confirmed local transpile cost (line coupling, IBM-native basis `rz/sx/x/ecr`):

| circuit                         | qubits | depth | 2-qubit gates |
|---------------------------------|-------:|------:|--------------:|
| dim=2 Hadamard (per sweep point)|      2 |   ~13 |          ~1.7 |
| dim=2 destructive swap (alt.)   |      2 |    12 |             1 |
| dim=2 standard swap (for ref.)  |      3 |    41 |            10 |

6 sweep circuits × a few thousand shots = seconds of QPU. This is well inside the
Open plan's free monthly allowance.

## Exact commands (run only on "go")

```bash
cd /home/gian/agfarms/bucket-foundation/quantum/reference-impl
. .venv/bin/activate

# 0) one-time: install the hardware provider (user does this; needs network)
pip install qiskit-ibm-runtime          # IBM
# and later, for IonQ:
pip install qiskit-braket-provider       # AWS Braket

# 1) credentials — the USER supplies these; do not create accounts or enter tokens.
#    IBM:    QiskitRuntimeService.save_account(channel="ibm_quantum", token=...)
#    Braket: standard AWS credentials in the environment.

# 2) FREE preflight FIRST — auth, pick least-busy device, transpile, report cost.
#    Submits NOTHING. Run this and read the depth / 2q-gate report before step 3.
python -m src.angle_sweep --backend ibm --check

# 3) submit the single Open-plan job (only after the preflight looks right):
python -m src.angle_sweep --backend ibm --run --shots 4096
#    -> writes results/angle_sweep.png with the real-hardware line added.

# 4) IonQ second, via Braket, same pattern:
python -m src.angle_sweep --backend braket --check
python -m src.angle_sweep --backend braket --run --shots 4096
```

## Optional: the low-depth magnitude circuit on hardware

If a magnitude-only (`|cos|^2`) run is wanted, the destructive swap test is the
cheapest circuit (1 two-qubit gate at dim=2). It is not yet wired into a
hardware-preflight CLI; wiring it is a small follow-up (add a `--check`/`--run`
path mirroring `angle_sweep.py`, transpiling `destructive_swap_circuit`). The
signed-cosine sweep above is the stronger first result and is fully wired.

## Guardrails (unchanged from the repo)

- `--check` before every real run.
- Start with `--pairs 1` / the 6-point sweep, not the full kernel.
- No account creation, no credential entry, no ToS acceptance by the agent.
- Simulators remain the default; every hardware path is behind `--run`.
