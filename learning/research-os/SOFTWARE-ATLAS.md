# The Software Atlas

The software each science uses, open and closed, with its license, what it renders, the files it writes, and the path by which Research OS meets it. Bead ros-workbench 0, queued in `BEADS-PENDING.jsonl`.

The founder, 2026-09-18, as the bead records it: "Map the software each science and research area uses, open source and closed, including rendering and visualization, even where Research OS will not build it." The directions at the end feed the workbench design in `learning/research-os/WORKBENCH.md` (ros-workbench 1) and the runner in ros-workbench 2.

## The four paths

Every tool gets a first path and, where one exists, a fallback. The names are fixed so the workbench memo can join on them.

- **browser**: the tool, or the part of it Research OS needs, runs in the page through WebAssembly or JavaScript. The row names the port and whether it is maintained, which here means a release or a commit after 2025-09-21.
- **runner**: the tool runs on a registered machine, the person's own or a pooled one, which ros-workbench 2 builds. The row says what the machine needs: an operating system, a GPU, a license server, or a signed-in account.
- **import**: Research OS reads the tool's files into the graph through the ros-import slices. The row names the formats worth reading and the parser that exists for them.
- **link**: Research OS links out and stores a citation or a file.

Research OS shows a tool's output as a static export, such as an image or a PDF, or in an interactive web viewer that the row names. A row that names neither leaves the output as a linked file.

A closed tool reaches the runner path only under the person's own license on the person's own machine. Research OS holds no vendor license and runs no closed binary for anyone else.

## What the repository holds

Checked 2026-09-21 in this worktree at `b36c160ab` on `origin/dev`.

- **Lean 4 in the paper pipeline.** Two Lake projects under `papers/`, both on `leanprover/lean4:v4.33.1`, both built by `make lean`.
- **The research tools suite.** Forty tool pages under `src/app/research/tools/`, each with a same-origin proxy under `src/app/api/research/<tool>/` in front of a FastAPI gateway in `services/research-tools/`. Every one of the forty computes on a server.
- **Imports.** `src/lib/research-os/import-fetch.ts` fetches an import's public URL on the server (http and https only, 8 s, 1 MB) and keeps up to 6,000 characters of stripped text. Nothing reads a binary format yet. ros-import 1 and 2 give an import a type and an upload of any file, and ros-import 3 extracts text and tables from PDF, EPUB, DOCX, HTML, Markdown, plain text, CSV, TSV, and XLSX. All three are queued in `BEADS-PENDING.jsonl` and unbuilt on `dev`.
- **Graph kinds that fit software.** `NodeKind` in `src/lib/research-os/types.ts` already has `artifact` and `derivation`, and `EdgeKind` has `derives_from` and `cites`. A software output needs no new kind to enter the graph.
- **Rendering in the app today.** `package.json` carries `three` with `@react-three/fiber` and `@react-three/drei` for the canon globe, and KaTeX for math. It also carries `jszip`, which opens the formats that are zip archives, a REFI-QDA `.qdpx` and an Office `.docx` or `.xlsx` among them. It carries no viewer built for a scientific format: nothing molecular, genomic, astronomical, or for notebooks. Everything the tools suite draws arrives as JSON rendered by React or as a gateway HTML report in a sandboxed iframe.

## Lean

### What the repository does today

Checked 2026-09-21 by reading the files and running the builds in this worktree.

- **The rule.** `papers/PAPER-STANDARDS.md` gives every Bucket paper a Lean rule. Each definition in a paper's Preliminaries has a Lean 4 counterpart in the paper's `lean/` directory. Each lemma in the body is proved in Lean or left as `sorry` with a `TODO:` naming what remains. The appendix quotes the `lake build` output verbatim. The `lean/` directory is a minimal Lake project: `lean-toolchain` pinned to an exact release, `lakefile.toml`, one `lean_lib` target, and Mathlib only when a lemma needs it.
- **The template.** `papers/template/lean/` is that project at its smallest. `lakefile.toml` names the package `bucket_template` with one `lean_lib` called `Bucket`, `lean-toolchain` pins `leanprover/lean4:v4.33.1`, `lake-manifest.json` lists no packages, and `Bucket/Example.lean` proves `double_eq_add_self` from `Nat.two_mul`. The Makefile's `lean` target is `cd lean && lake build`.
- **The one paper.** `papers/history-hypothesis-engine/lean/` holds six modules, `Timeline`, `Concept`, `Hypothesis`, `Address`, `Belief`, and `Unknowns`, in 662 lines on the same pin, with no Mathlib. Its README lists 15 theorems: 14 proved, and `encode_injective` left as `sorry`, because the general proof needs unique prime factorization from Mathlib's `Nat.factorization`. The paper's `make pdf` depends on `lean-snapshot`, which depends on `lean`, so a proof that fails to check stops the PDF. `make_lean_snapshots.py` transliterates the Unicode Lean source to ASCII, because pdflatex's `listings` package cannot print it as it stands.
- **Both build here.** `lake build` in the template took 2.0 s over 4 jobs. In the hypothesis-engine paper it took 16.2 s over 9 jobs and printed one warning, `Bucket/Address.lean:57:8: declaration uses 'sorry'`. The toolchain reports `Lean (version 4.33.1, x86_64-unknown-linux-gnu, commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6, Release)`, installed for one user under `~/.elan`.
- **Machine-readable output exists.** `lake env lean --json Bucket/Address.lean` prints each message as one JSON object per line, with the file, the start and end positions, the severity, and a `kind`. The `sorry` arrives as `"kind":"hasSorry"`. A runner can read a proof's state from that stream without parsing prose.
- **The pin holds only inside the project.** From a directory with no `lean-toolchain`, `lean --version` started downloading Lean 4.34.0 on this machine, since elan's default here follows a newer release than the papers pin. Every Lean job has to start inside its project directory.
- **Nothing outside the author's machine checks it.** None of the six workflows in `.github/workflows/` runs `lake build`, and nothing under `src/` reads a Lean file. The proofs are checked when someone runs `make`, and Research OS has no view of them.

### A Lean path in Research OS

First path runner, fallback import, then link. The design uses graph kinds that exist today and adds provenance fields for ros-workbench 1 to settle.

**A Lean project enters as an import.** The unit is a Lake project: `lakefile.toml` or `lakefile.lean`, `lean-toolchain`, `lake-manifest.json`, and the `.lean` sources. The import becomes an `artifact` node owned by the person, with provenance holding the toolchain pin and the dependencies from the manifest, Mathlib or none. Reading the files needs no Lean at all, so this part can ship with ros-import 2.

**A runner checks it.** One job type, `lean-check`, runs on a registered machine:

1. Install the pinned toolchain through elan, from inside the project directory so the pin holds.
2. When the manifest lists Mathlib, fetch its prebuilt build files with `lake exe cache get`, which needs network and disk; a project without Mathlib, like both papers today, builds offline.
3. Run `lake build`, then run `lake env lean --json` on each source file and keep its message stream.
4. Return the build status, the toolchain, the count and positions of `sorry`, every error, the wall time, and a hash of the sources checked.

The two paper projects are the first test cases, with known answers: the template builds with no `sorry`, and the hypothesis-engine paper builds with one, at `Bucket/Address.lean:57:8`.

**What Research OS shows.** A check chip on the artifact node and on any production that cites it: the Lean version, the theorem count, the `sorry` count, and when and where it ran. The source view marks each `sorry` and error line from the positions in the JSON stream. A paper production carries the same chip, which is the Lean rule of `papers/PAPER-STANDARDS.md` checked by something other than the author's own `make`. An approved production already becomes a node with a `derives_from` edge to the node it targets (`src/lib/research-os/production-node.ts`), so a claim reaches its Lean proof through that edge with no new kind.

**The browser path waits on a server.** Lean's own web editor at live.lean-lang.org runs the Lean server on a web server and talks to the page over a WebSocket; its source, [lean4web](https://github.com/leanprover-community/lean4web) (Apache-2.0), spawns `lake serve` for each connection, inside Bubblewrap when it is installed. A Lean editor in Research OS is therefore a lean4web instance on a runner, with the `@leanprover/infoview` component (Apache-2.0) in the page. No official WebAssembly build is maintained: the "Web Assembly" job in the [lean4 CI file](https://github.com/leanprover/lean4/blob/master/.github/workflows/ci.yml) is commented out, and [release v4.34.0](https://github.com/leanprover/lean4/releases/tag/v4.34.0) of 2026-09-14 ships desktop archives only. A community port, [cauli/lean4-wasm-in-browser](https://github.com/cauli/lean4-wasm-in-browser), runs Lean 4 from a fork in a cross-origin isolated page with 70 to 101 MB of WebAssembly and loads Mathlib as packs of about 316 MB. It has one author and dates from 2026-01-05, so Research OS watches it and builds on the runner. Links checked 2026-09-21.

## The atlas

Sixty-four tools across fifteen fields. The brief named thirty-nine, counting Fiji with ImageJ as one row, and all thirty-nine are here; the other twenty-five fill gaps where a field's standard tool was missing, each with its reason at the head of its field. Every row was checked against the tool's own site, documentation, source repository, or package index on 2026-09-21, and the sources sit under each table. A claim that could not be checked says `unverified` in its cell, and the Unverified section lists them.

Each row's Path column gives the first path and the fallback. The index joins on those names:

| Tool | Field | First path | Fallback |
|---|---|---|---|
| Lean 4 | Proof | runner | import |
| Rocq | Proof | browser | runner |
| Isabelle | Proof | runner | import |
| Mathematica | Mathematics | link | import |
| Maple | Mathematics | import | link |
| SageMath | Mathematics | runner | browser |
| GAP | Mathematics | browser | runner |
| PARI/GP | Mathematics | browser | runner |
| RDKit | Chemistry | browser | runner |
| Gaussian | Chemistry | import | link |
| Avogadro 2 | Chemistry | import | runner |
| Open Babel | Chemistry | runner | browser |
| GROMACS | Chemistry | runner | import |
| PyMOL | Biology | runner | import |
| UCSF ChimeraX | Biology | link | runner |
| BLAST+ | Biology | runner | import |
| Bioconductor | Biology | runner | import |
| Biopython | Biology | browser | runner |
| Fiji and ImageJ | Biology | browser | runner |
| IGV | Biology | browser | link |
| NEURON | Neuroscience | runner | import |
| NWB | Neuroscience | import | link |
| ROOT | Physics | import | runner |
| Geant4 | Physics | runner | import |
| COMSOL Multiphysics | Physics | import | link |
| MATLAB | Physics | import | link |
| GNU Octave | Physics | runner | browser |
| LAMMPS | Physics | runner | browser |
| Astropy | Astronomy | browser | runner |
| SAOImageDS9 | Astronomy | link | import |
| Aladin Lite | Astronomy | browser | link |
| QGIS | Earth science | import | runner |
| GDAL | Earth science | browser | runner |
| Google Earth Engine | Earth science | link | import |
| netCDF and xarray | Earth science | browser | runner |
| GMT | Earth science | runner | import |
| SolidWorks | CAD | import | link |
| FreeCAD | CAD | import | browser |
| OpenSCAD | CAD | browser | runner |
| Onshape | CAD | link | import |
| KiCad | CAD | browser | runner |
| Ansys | Simulation | import | runner |
| Abaqus | Simulation | import | runner |
| FEniCS | Simulation | runner | import |
| OpenFOAM | Simulation | runner | import |
| R | Statistics | browser | runner |
| IBM SPSS Statistics | Statistics | import | link |
| PSPP | Statistics | runner | import |
| Stata | Statistics | import | link |
| SAS | Statistics | import | link |
| NVivo | Qualitative research | import | link |
| ATLAS.ti | Qualitative research | import | link |
| MAXQDA | Qualitative research | import | link |
| REFI-QDA | Qualitative research | import | none |
| QualCoder | Qualitative research | import | link |
| Taguette | Qualitative research | runner | import |
| Zotero | Humanities | import | link |
| TEI | Humanities | browser | import |
| Voyant Tools | Humanities | link | runner |
| Transkribus | Humanities | import | link |
| ParaView | Visualization | import | runner |
| VisIt | Visualization | import | link |
| Blender | Visualization | import | runner |
| Jupyter and the Python stack | Across the sciences | browser | runner |

### Proof

Lean leads, as the brief asks, with Rocq and Isabelle beside it. The repository's own Lean pipeline is in the Lean section.

| Tool | License | Renders | Main formats | Path | How it connects | Research OS shows |
|---|---|---|---|---|---|---|
| Lean 4 | Apache-2.0, open [1]; Mathlib Apache-2.0 [2] | Goals and messages in the infoview; ProofWidgets adds diagrams and plots to it [3] | `.lean` source; `.olean` and `.ilean` build outputs; `lakefile.toml` or `lakefile.lean`; `lean-toolchain`; `lake-manifest.json` [4] | runner, import | The web editor at live.lean-lang.org runs the Lean server on a web server and talks to the page over a WebSocket, Apache-2.0 [5]. No official WebAssembly build: the "Web Assembly" job in the lean4 CI file is commented out, and v4.34.0 of 2026-09-14 ships Linux, macOS, and Windows archives only, 580 MB for Linux [6][7]. A community port, cauli/lean4-wasm-in-browser, runs Lean 4 in the page from a fork, with 70 to 101 MB of WebAssembly and a Mathlib layer near 316 MB, first created 2026-01-05 [8]. `lake exe cache get` fetches prebuilt Mathlib files; without them Mathlib rebuilds from scratch, which takes hours [9] | Static: the check chip and source view of the Lean section; interactive: `@leanprover/infoview` fed by a Lean server on a runner [10] |
| Rocq | LGPL-2.1-only, open [11]; renamed from Coq with Rocq 9.0, announced 2025-03-12 [12] | Proof goals and messages per sentence in an editor; `rocq doc` writes LaTeX and HTML [13] | `.v` source compiled to `.vo`; `_CoqProject` or `_RocqProject`; Dune builds, experimental [14] | browser, runner | jsCoq runs Coq in the page through js_of_ocaml, AGPL-3.0-or-later; last release 0.17.1 in 2023, with commits into 2026 [15]. rocq-lsp ships a Rocq 9.1 WebAssembly build inside its VS Code extension, usable on vscode.dev, with only the standard library [16][17]. A runner with an opam switch takes projects that need other libraries | Interactive: live checking in the page through jsCoq; static: `rocq doc` HTML |
| Isabelle | BSD-style for the main code base, among other open licenses [18][19]; Archive of Formal Proofs entries BSD-style or LGPL [20] | Continuous proof checking in Isabelle/jEdit and Isabelle/VSCode; LaTeX documents and HTML [21] | `.thy` theories, `ROOT` session specifications, session heap images [22] | runner, import | Linux, Windows 10 and 11, macOS 12 to 26, and a Docker image; Java bundled; 4 GB of memory for small work up to 64 GB for large projects; the Linux archive is 1.2 GB [23]. No browser port found. The Isabelle server takes clients over TCP [22] | Static: HTML and PDF browser info; `.thy` sources as text |

Sources, read 2026-09-21:

1. Lean 4 repository: <https://github.com/leanprover/lean4>
2. Mathlib repository: <https://github.com/leanprover-community/mathlib4>
3. ProofWidgets4 repository: <https://github.com/leanprover-community/ProofWidgets4>
4. Lake README: <https://github.com/leanprover/lean4/blob/master/src/lake/README.md>
5. lean4web repository: <https://github.com/leanprover-community/lean4web>
6. Lean 4 CI workflow: <https://github.com/leanprover/lean4/blob/master/.github/workflows/ci.yml>
7. Lean 4 release v4.34.0: <https://github.com/leanprover/lean4/releases/tag/v4.34.0>
8. lean4-wasm-in-browser repository: <https://github.com/cauli/lean4-wasm-in-browser>
9. Mathlib cache README: <https://github.com/leanprover-community/mathlib4/blob/master/Cache/README.md>
10. @leanprover/infoview on the npm registry: <https://registry.npmjs.org/@leanprover/infoview>
11. Rocq repository: <https://github.com/rocq-prover/rocq>
12. Rocq, changelog: <https://rocq-prover.org/changelog>
13. Rocq reference manual, rocq doc: <https://rocq-prover.org/doc/V9.2.0/refman/using/tools/coqdoc.html>
14. Rocq reference manual, utilities: <https://rocq-prover.org/doc/V9.2.0/refman/practical-tools/utilities.html>
15. jsCoq repository: <https://github.com/jscoq/jscoq>
16. Rocq Discourse, coq-lsp 0.2.4 announcement: <https://discourse.rocq-prover.org/t/ann-coq-lsp-0-2-4/2829>
17. rocq-lsp repository: <https://github.com/rocq-community/rocq-lsp>
18. Isabelle: <https://isabelle.in.tum.de/>
19. Isabelle2025-2, COPYRIGHT: <https://isabelle.in.tum.de/website-Isabelle2025-2/dist/Isabelle2025-2/COPYRIGHT>
20. Archive of Formal Proofs, about: <https://isa-afp.org/about/>
21. Isabelle, overview: <https://isabelle.in.tum.de/overview.html>
22. Isabelle2025-2, system manual: <https://isabelle.in.tum.de/website-Isabelle2025-2/dist/Isabelle2025-2/doc/system.pdf>
23. Isabelle, installation: <https://isabelle.in.tum.de/installation.html>

### Mathematics

The brief names Mathematica and Maple, closed, with SageMath and GAP, open. PARI/GP is added as a number theory system whose own site serves a WebAssembly build.

| Tool | License | Renders | Main formats | Path | How it connects | Research OS shows |
|---|---|---|---|---|---|---|
| Mathematica | Closed: cloud and node-locked licenses, and network licenses served by MathLM [24][25]. The free Wolfram Engine is barred from any production application, internal services included [26][27] | Notebooks of text, typeset math, graphics, animation, and sound [28] | `.nb` notebooks in plain text Wolfram Language syntax [28]; `.wl` and `.m` packages [29]; `.mx` binary files [34]; `.cdf`, now a legacy type [30] | link, import | Windows 10 and 11, Windows Server, macOS 13 to 26, and Linux; 10 to 23 GB of disk; a GPU with CUDA or OpenCL for GPU functions [31]. Wolfram Cloud hosts notebooks and embeds them in a page, computing on Wolfram's servers [32]. Parser: Wolfram's own codeparser, MIT [33] | Static: exported PDF or SVG; the `.nb` as text; interactive: an embedded Wolfram Cloud notebook, on the person's own account |
| Maple | Closed: single-user licenses activated online, and network licenses served by FlexNet [35] | Worksheets with math and 2D and 3D plots | `.mw` worksheets in XML, `.mws` classic worksheets, `.mpl` source, `.maple` workbooks in SQLite [36][37][38] | import, link | Desktop builds needing 8 GB of memory and 10 GB of disk, with internet access to activate [39]. Maple Learn is hosted by Maplesoft [40] | Static: HTML or PDF exports; the `.mpl` and `.mw` contents as text |
| SageMath | GPL-3.0-only for the distribution, GPL-2.0-or-later for Sage's own code; open [41] | 2D plots and 3D plots in a three.js viewer [42], inside Jupyter notebooks | `.sage` scripts [46], `.sobj` saved objects [47], `.ipynb` notebooks | runner, browser | Linux through conda-forge or packages, macOS through a signed app, Windows through WSL only [43]. SageMathCell embeds a cell in a page and computes on its server, GPL-2.0-or-later [44]. passagemath, a pip-installable fork, publishes WebAssembly packages with partial functionality since 2026-02 [45] | Static: PNG or SVG plots; interactive: three.js 3D plots and SageMathCell embeds |
| GAP | GPL-2.0-or-later, open [48] | Text output in a console | `.g` code, `.gd` declarations and `.gi` implementations [49], binary workspaces [50] | browser, runner | An official WebAssembly build in the main repository, `etc/emscripten`, served at gap-in-the-browser, computing in the page [48][51]. It needs cross-origin isolation headers and keeps no files across reloads; packages with native code do not load [51]. Native GAP runs on the three desktop systems, with WSL recommended on Windows [52] | Interactive: the GAP console in the page |
| PARI/GP | GPL-2.0-or-later, open [53] | Text output in a console | GP scripts as text; file extension unverified | browser, runner | The PARI site serves GP compiled with Emscripten, stable and development builds, a 14 MB WebAssembly file dated 2026-08-16 [54] | Interactive: the GP console in the page |

Sources, read 2026-09-21:

24. Wolfram, group and organization licensing: <https://www.wolfram.com/group-organization-licensing/>
25. Wolfram, what is MathLM: <https://reference.wolfram.com/language/tutorial/WhatIsMathLM.html>
26. Wolfram Engine, terms: <https://www.wolfram.com/legal/terms/wolfram-engine.html>
27. Wolfram Engine, FAQ: <https://www.wolfram.com/engine/faq/>
28. Wolfram Language, NB format: <https://reference.wolfram.com/language/ref/format/NB.html>
29. Wolfram Language, WL format: <https://reference.wolfram.com/language/ref/format/WL.html>
30. Wolfram, CDF: <https://www.wolfram.com/cdf/>
31. Mathematica, system requirements: <https://www.wolfram.com/mathematica/system-requirements/>
32. Wolfram Cloud: <https://www.wolfram.com/cloud/>
33. codeparser repository: <https://github.com/WolframResearch/codeparser>
34. Wolfram Language, MX format: <https://reference.wolfram.com/language/ref/format/MX.html>
35. Maple 2026, install guide: <https://www.maplesoft.com/support/install/2026/Maple/Install.html>
36. Maple help, MW format: <https://www.maplesoft.com/support/help/Maple/view.aspx?path=Formats/MW>
37. Maple help, MPL format: <https://www.maplesoft.com/support/help/Maple/view.aspx?path=Formats/MPL>
38. Maple help, workbook format: <https://www.maplesoft.com/support/help/Maple/view.aspx?path=Formats/Maple>
39. Maple, system requirements: <https://www.maplesoft.com/products/system_requirements.aspx>
40. Maple Learn: <https://learn.maplesoft.com/>
41. SageMath repository: <https://github.com/sagemath/sage>
42. SageMath, three.js viewer: <https://doc.sagemath.org/html/en/reference/plot3d/threejs.html>
43. SageMath, installation guide: <https://doc.sagemath.org/html/en/installation/index.html>
44. SageMathCell repository: <https://github.com/sagemath/sagecell>
45. passagemath repository: <https://github.com/passagemath/passagemath>
46. SageMath tutorial, programming: <https://doc.sagemath.org/html/en/tutorial/programming.html>
47. SageMath reference, persist: <https://doc.sagemath.org/html/en/reference/misc/sage/misc/persist.html>
48. GAP repository: <https://github.com/gap-system/gap>
49. GAP reference manual, chapter 76: <https://docs.gap-system.org/doc/ref/chap76.html>
50. GAP reference manual, chapter 3: <https://docs.gap-system.org/doc/ref/chap3.html>
51. gap-in-the-browser repository: <https://github.com/gap-system/gap-in-the-browser>
52. GAP, installing on Windows: <https://www.gap-system.org/install/windows/>
53. PARI/GP: <https://pari.math.u-bordeaux.fr/>
54. PARI/GP in the browser: <https://pari.math.u-bordeaux.fr/gp.html>

### Chemistry

The brief names RDKit and Avogadro, open, with Gaussian, closed. Open Babel is added as the format converter the others lean on, and GROMACS as the molecular dynamics engine chemistry shares with biology and physics; the suite's TrajMine reads its trajectories.

| Tool | License | Renders | Main formats | Path | How it connects | Research OS shows |
|---|---|---|---|---|---|---|
| RDKit | BSD-3-Clause, open [55] | 2D depictions as SVG or PNG [56] | SMILES, MOL and SDF, InChI, and pickles [56][57]; PDB and Maestro files among its readers and writers [58] | browser, runner | RDKit.js, npm `@rdkit/rdkit`, compiles a subset of RDKit to WebAssembly: SVG depiction, descriptors, substructure search, fingerprints, and reactions; npm 2026.3.6 on 2026-09-13, a new package with every release [59][60]. RDKit is absent from Pyodide 314.0.7 [61]. Python wheels take bulk jobs on a runner | Interactive: SVG depictions drawn in the page by RDKit.js; 3D structures in Mol* or 3Dmol.js |
| Gaussian | Closed: site or single-computer licenses with a one-time fee and a twenty-year term; a US commercial site license for G16 is $35,000 [62]. Where a university hosts directly competitive work, its license excludes the competing research group [63] | Nothing of its own; GaussView, licensed separately, plots properties, animates vibrations, and shows spectra [64] | `.gjf` input and `.log` output; `.chk` checkpoint and `.rwf` scratch files [65]; `.fchk`, the formatted checkpoint for exchange between platforms [66] | import, link | Binaries for Linux, macOS, IBM Power, and Fujitsu A64FX, and no builds from source; optional NVIDIA GPUs from K40 to A100; Linda for runs across machines [67]. Parser: cclib reads Gaussian logs and `.fchk` and a dozen other quantum chemistry codes, BSD-3-Clause, a pure Python wheel [68] | Energies and frequencies from the log on the node; the geometry in Mol* or JSmol |
| Avogadro 2 | BSD-3-Clause, open [69] | Interactive 3D molecules; exports PNG, SVG, PLY, POV-Ray, VRML, and a 3Dmol.js HTML snippet [70] | `.cjson`, which keeps atoms, bonds, cells, orbitals, spectra, and more [71]; CML, legacy; over 100 more through Open Babel [71]; built-in readers for PDB, XYZ, GROMACS, LAMMPS, Molden, ORCA, and Gaussian cube and fchk [72] | import, runner | Desktop builds and Python wheels; release 2.0.0 on 2026-04-01 [69]. `avogadro-web` exists as a repository with a README and no code, created 2026-09-14 [73]. `.cjson` is JSON, read by any JSON parser | Interactive: the molecule in Mol* or 3Dmol.js |
| Open Babel | GPL-2.0-only, open [74] | 2D depictions as SVG and PNG [75] | 146 formats, 108 read and 107 written, among them Gaussian input, output, and fchk, SMILES, InChI, MOL and SDF, CML, PDB, mmCIF, GRO, and XTC [75] | runner, browser | Desktop builds and Python wheels; release 3.2.1 on 2026-07-11 [74]. No official WebAssembly build; an experimental one, cheminfo-to-web, had its last commit on 2025-09-24 [76]. Its GPL keeps it best on a runner, out of the page bundle | The converted structure, in whatever viewer its target format has |
| GROMACS | LGPL-2.1-or-later, open [77] | Nothing of its own; analysis tools write `.xvg` series for Grace [78] | `.gro` coordinates, `.top` and `.itp` topologies, `.mdp` parameters, `.tpr` run input, `.xtc` and `.trr` trajectories, `.edr` energies [78] | runner, import | Runs on x86-64, ARM, POWER9, and RISC-V; GPU optional, with CUDA for NVIDIA, SYCL for Intel and AMD, HIP for AMD, and OpenCL for Apple M-series [79]. No browser port found. Parsers: MDAnalysis and MDTraj in Python [80][81] | Interactive: the trajectory played in Mol* or NGL from `.gro` with `.xtc`; `.xvg` series as charts |

Sources, read 2026-09-21:

55. RDKit, license: <https://github.com/rdkit/rdkit/blob/master/license.txt>
56. RDKit, getting started in Python: <https://www.rdkit.org/docs/GettingStartedInPython.html>
57. RDKit reference, InChI: <https://www.rdkit.org/docs/source/rdkit.Chem.inchi.html>
58. RDKit reference, rdmolfiles: <https://www.rdkit.org/docs/source/rdkit.Chem.rdmolfiles.html>
59. RDKit MinimalLib: <https://github.com/rdkit/rdkit/tree/master/Code/MinimalLib>
60. RDKit.js repository: <https://github.com/rdkit/rdkit-js>
61. Pyodide 314.0.7, packages built in Pyodide: <https://pyodide.org/en/stable/usage/packages-in-pyodide.html>
62. Gaussian, US commercial price list: <https://gaussian.com/wp-content/uploads/dl/us_com.pdf>
63. Gaussian, licensing policy for competitors: <https://gaussian.com/silly/>
64. GaussView 6: <https://gaussian.com/gaussview6/>
65. Gaussian, running Gaussian: <https://gaussian.com/running/>
66. Gaussian, formchk: <https://gaussian.com/formchk/>
67. Gaussian 16, platform list: <https://gaussian.com/g16/g16_plat.pdf>
68. cclib repository: <https://github.com/cclib/cclib>
69. avogadrolibs repository: <https://github.com/OpenChemistry/avogadrolibs>
70. Avogadro, file menu: <https://avogadro.cc/docs/menus/file-menu.html>
71. Avogadro, saving files: <https://avogadro.cc/docs/getting-started/saving-files.html>
72. Avogadro, file IO: <https://avogadro.cc/develop/io.html>
73. avogadro-web repository: <https://github.com/OpenChemistry/avogadro-web>
74. Open Babel repository: <https://github.com/openbabel/openbabel>
75. Open Babel, file formats: <https://openbabel.org/docs/FileFormats/Overview.html>
76. cheminfo-to-web repository: <https://github.com/partridgejiang/cheminfo-to-web>
77. GROMACS repository: <https://gitlab.com/gromacs/gromacs>
78. GROMACS manual, file formats: <https://manual.gromacs.org/current/reference-manual/file-formats.html>
79. GROMACS install guide: <https://manual.gromacs.org/current/install-guide/index.html>
80. MDAnalysis, topology formats: <https://docs.mdanalysis.org/stable/documentation_pages/topology/init.html>
81. MDTraj repository: <https://github.com/mdtraj/mdtraj>

### Biology

The brief names PyMOL, BLAST, Bioconductor, and Fiji. ChimeraX is added beside PyMOL as a molecular viewer, and IGV as a genome browser whose JavaScript build suits the page. Biopython is added because the suite's sequence tools meet its formats and it already runs in Pyodide.

| Tool | License | Renders | Main formats | Path | How it connects | Research OS shows |
|---|---|---|---|---|---|---|
| PyMOL | Open-source PyMOL under a BSD-like copyright notice [82]; Incentive PyMOL is a closed subscription, free to full-time students and educators [83], activated through the Schrodinger License Manager [84] | 3D molecular graphics, with ray-traced images [85] | Loads PDB, mmCIF, BinaryCIF, MOL2, SDF, XYZ, maps, and trajectories; `.pse` sessions and `.pml` scripts; saves PNG, glTF, OBJ, STL, VRML, and structure formats [85] | runner, import | Incentive 3.x runs on 64-bit desktops, Linux with glibc 2.28 or later [84]. Headless open-source PyMOL renders PNG or exports glTF on a runner. PyMOL-Wasm, a third-party Pyodide build of PyMOL 2, is experimental [86]. No `.pse` parser outside PyMOL found | Static: the ray-traced PNG; interactive: exported glTF in model-viewer, or the input structures in Mol* |
| UCSF ChimeraX | Closed for commercial use: the UCSF ChimeraX Non-Commercial Software License, with source on GitHub under the same terms [87]; free for academic, government, nonprofit, and personal use [88] | Interactive 3D structures and maps with trajectory playback, in VR headsets too through OpenXR [89]; saves PNG, TIFF, JPEG, and 3D scenes as GLB, STL, OBJ, X3D, and VRML [90] | `.cxs` sessions, `.cxc` command files, Python; reads PDB, mmCIF, Mol2, SDF, GRO, XTC, TRR, DCD, and MRC maps [91] | link, runner | Desktop builds, some Linux distributions among them, with OpenGL 3.3 [92]. The license forbids redistribution, so a runner serves noncommercial use only; headless rendering is unverified. RBVI's own web route is a saved `.glb` shown in model-viewer [93] | Static: PNG; interactive: exported `.glb` in model-viewer |
| BLAST+ | Public domain as a United States Government Work [94][95]; the NCBI C++ Toolkit around it bundles parts under Apache-2.0, MIT, BSD, and GPL terms [96] | Text and HTML alignment reports; no graphics from the command line | FASTA queries; BLAST version 5 databases in volumes [97]; `-outfmt` 0 to 18 and 20 in the 2.17.0 source, among them XML, tabular, CSV, JSON, XML2, SAM, and the ASN.1 archive [94] | runner, import | Desktop builds of 133 to 408 MB [94], and a Docker image [98]; databases download separately [97]. No NCBI WebAssembly build found, and biowasm does not package BLAST [99]. Web BLAST runs on NCBI's servers behind a URL API [100]. Parser: Biopython reads the XML and tabular outputs [101] | The hit table from tabular or JSON output; the report as text |
| Bioconductor | Each package carries its own open license; most core packages use Artistic-2.0, and licenses that restrict use are refused [102] | R packages; figures come from R graphics | BAM, BCF, FASTA, and tabix files through Rsamtools; GFF, BED, WIG, and BigWig through rtracklayer; FASTQ through ShortRead; SummarizedExperiment containers [103][104][105][106] | runner, import | R 4.6 with release 3.23 of 2026-04-29, two releases a year [107]; Linux, macOS, Windows, or Docker [108]. The webR repository for R 4.6 lists none of Biobase, S4Vectors, GenomicRanges, or SummarizedExperiment [109]; webr.bioconductor.org did not answer on 2026-09-21, so a WebAssembly repository run by Bioconductor is unverified. Parsers outside R: pysam, in Pyodide 314.0.7 [61], and the @gmod packages for BAM, CRAM, VCF, and GFF in JavaScript | Static: R plots; genomic tracks in igv.js |
| Biopython | Biopython License Agreement, with some files dual-licensed BSD-3-Clause; open [110] | Linear and circular genome maps through ReportLab, to PDF, EPS, or SVG [111] | Reads FASTA, FASTQ, GenBank, EMBL, PDB, Stockholm, and some thirty more sequence formats [112], and BLAST output | browser, runner | In Pyodide 314.0.7 as version 1.87 [61]; PyPI latest 1.88 [113] | Parsed sequences and records on the node; static maps as SVG |
| Fiji and ImageJ | Fiji GPL-3.0 [114][115]; ImageJ2 BSD-2-Clause; ImageJ 1.x public domain under US law [114]; Bio-Formats GPL, with a BSD-2-Clause component for OME-TIFF [116] | Image stacks in two or more dimensions, with ROIs and plots | TIFF by default; more than 130 formats through Bio-Formats, which writes OME-TIFF and OME-XML [117]; `.ijm` macros [118]; ROI files | browser, runner | Viv and Vizarr render OME-TIFF and OME-Zarr in the page with WebGL, MIT, both with commits in 2026 [119][120]. ImageJ.JS compiles ImageJ 1 to JavaScript with CheerpJ, last commit 2025-08-21, so unmaintained [121]; a newer build, aicell-lab/imagej.js, runs on CheerpJ, whose community edition is free for noncommercial use only [122]. Fiji needs Java 21 on any of the three desktop systems [123]. Parsers: tifffile and roifile (Python, BSD-3-Clause) | Interactive: OME-TIFF or OME-Zarr in Vizarr; static: PNG exports |
| IGV | MIT for all IGV software [124] | Genome tracks: alignments, variants, annotations, signal, and copy number | BAM, CRAM, VCF, BED, bigWig, bigBed, GFF3, GTF, WIG, and more track formats; FASTA and JSON genomes [125] | browser, link | igv.js embeds in a page with ES2015 JavaScript, MIT, release v3.8.7 on 2026-09-09 [126]; the IGV-Web app runs only in the browser and uploads no data [127]. Desktop IGV needs Java 21 [128] | Interactive: igv.js in the page |

Sources, read 2026-09-21:

82. PyMOL open source, LICENSE: <https://github.com/schrodinger/pymol-open-source/blob/master/LICENSE>
83. PyMOL, buy: <https://www.pymol.org/buy.html>
84. PyMOL, support: <https://www.pymol.org/support.html>
85. PyMOL open source repository: <https://github.com/schrodinger/pymol-open-source>
86. PyMOL-Wasm repository: <https://github.com/yakomaxa/PyMOL-Wasm>
87. ChimeraX, License.md: <https://github.com/RBVI/ChimeraX/blob/develop/License.md>
88. UCSF ChimeraX: <https://www.cgl.ucsf.edu/chimerax/>
89. ChimeraX guide, VR: <https://www.cgl.ucsf.edu/chimerax/docs/user/vr.html>
90. ChimeraX guide, save: <https://www.cgl.ucsf.edu/chimerax/docs/user/commands/save.html>
91. ChimeraX guide, open: <https://www.cgl.ucsf.edu/chimerax/docs/user/commands/open.html>
92. ChimeraX, known issues: <https://www.cgl.ucsf.edu/chimerax/issues.html>
93. RBVI, glTF viewer example: <https://www.rbvi.ucsf.edu/chimerax/data/gltf-viewer-may2023/>
94. NCBI, BLAST+ latest executables and source: <https://ftp.ncbi.nlm.nih.gov/blast/executables/blast+/LATEST/>
95. NCBI BLAST help, developer information: <https://blast.ncbi.nlm.nih.gov/doc/blast-help/developerinfo.html>
96. NCBI C++ Toolkit, LICENSE: <https://github.com/ncbi/ncbi-cxx-toolkit-public/blob/master/LICENSE>
97. NCBI, BLAST databases: <https://ftp.ncbi.nlm.nih.gov/blast/documents/blastdb.html>
98. NCBI, BLAST+ Docker documentation: <https://github.com/ncbi/blast_plus_docs>
99. biowasm repository: <https://github.com/biowasm/biowasm>
100. NCBI BLAST, URL API: <https://blast.ncbi.nlm.nih.gov/doc/blast-help/urlapi.html>
101. Biopython tutorial, BLAST: <https://biopython.org/docs/latest/Tutorial/chapter_blast.html>
102. Bioconductor contributions, license: <https://contributions.bioconductor.org/license.html>
103. Bioconductor, Rsamtools: <https://bioconductor.org/packages/release/bioc/html/Rsamtools.html>
104. Bioconductor, rtracklayer: <https://bioconductor.org/packages/release/bioc/html/rtracklayer.html>
105. Bioconductor, ShortRead: <https://bioconductor.org/packages/release/bioc/html/ShortRead.html>
106. Bioconductor, SummarizedExperiment: <https://bioconductor.org/packages/release/bioc/html/SummarizedExperiment.html>
107. Bioconductor, about: <https://bioconductor.org/about/>
108. Bioconductor, install: <https://bioconductor.org/install/>
109. webR package index for R 4.6: <https://repo.r-wasm.org/bin/emscripten/contrib/4.6/PACKAGES>
110. Biopython, LICENSE: <https://github.com/biopython/biopython/blob/master/LICENSE.rst>
111. Biopython tutorial, graphics: <https://biopython.org/docs/latest/Tutorial/chapter_graphics.html>
112. Biopython wiki, SeqIO: <https://biopython.org/wiki/SeqIO>
113. Biopython on PyPI: <https://pypi.org/project/biopython/>
114. ImageJ, licensing: <https://imagej.net/licensing/>
115. Fiji: <https://imagej.net/software/fiji/>
116. Bio-Formats repository: <https://github.com/ome/bioformats>
117. ImageJ, formats: <https://imagej.net/formats/>
118. ImageJ, macro language: <https://imagej.net/scripting/macro>
119. Viv repository: <https://github.com/hms-dbmi/viv>
120. Vizarr repository: <https://github.com/hms-dbmi/vizarr>
121. ImageJ.JS repository: <https://github.com/imjoy-team/imagej.js>
122. aicell-lab imagej.js repository: <https://github.com/aicell-lab/imagej.js>
123. Fiji downloads: <https://imagej.net/software/fiji/downloads>
124. IGV: <https://igv.org/>
125. IGV-Web, file formats: <https://igv.org/doc/webapp/FileFormats/>
126. igv.js repository: <https://github.com/igvteam/igv.js>
127. IGV-Web app documentation: <https://igv.org/doc/webapp/>
128. IGV desktop, downloads: <https://igv.org/doc/desktop/DownloadPage/>

### Neuroscience

Neither row is in the brief. Five suite tools analyze electrophysiology and calcium imaging, and PatchSeqML already reads NWB files, so NEURON, a simulator of neurons and networks, and NWB, the data format the DANDI archive requires, are added.

| Tool | License | Renders | Main formats | Path | How it connects | Research OS shows |
|---|---|---|---|---|---|---|
| NEURON | BSD-3-Clause by the repository's `Copyright` file [129]; PyPI classifies the `neuron` package as "Other/Proprietary License" [130], which conflicts | Model cells and networks scripted in Python or HOC; shape plots through Matplotlib or plotly [131] | `.hoc` and Python models, `.mod` mechanisms in NMODL compiled by `nrnivmodl`, `.ses` sessions [131] | runner, import | `pip install neuron` on Linux and macOS, an installer on Windows; release 9.0.2 on 2026-08-10 [130]. GPU is optional through CoreNEURON's OpenACC backend, now a source build since the GPU wheel was removed [132]. No browser build found, and NEURON is absent from Pyodide 314.0.7 [61] | Static: Matplotlib plots; interactive: plotly HTML; the model sources as text |
| NWB | PyNWB BSD-3-Clause [133]; MatNWB BSD-2-Clause [134] | Nothing; NWB is a data format for electrophysiology, optical physiology, tracking, and stimulus data [139] | `.nwb`, an HDF5 file with a defined structure [135]; the DANDI archive requires it for cellular neurophysiology [136] | import, link | h5py is in Pyodide 314.0.7 and pynwb is absent [61]; h5wasm reads HDF5 in JavaScript [137]. Neurosift is a browser viewer for NWB on DANDI, Apache-2.0, last commit 2026-09-16 [138] | Interactive: Neurosift, embedded or linked; the session, subject, device, and electrode metadata on the node |

Sources, read 2026-09-21:

129. NEURON, Copyright file: <https://github.com/neuronsimulator/nrn/blob/master/Copyright>
130. NEURON on PyPI: <https://pypi.org/project/NEURON/>
131. NEURON documentation: <https://www.neuronsimulator.org/en/latest/>
132. NEURON, CoreNEURON installation: <https://www.neuronsimulator.org/en/latest/coreneuron/installation.html>
133. PyNWB repository: <https://github.com/NeurodataWithoutBorders/pynwb>
134. MatNWB repository: <https://github.com/NeurodataWithoutBorders/matnwb>
135. NWB overview, file structure: <https://nwb-overview.readthedocs.io/en/latest/intro_to_nwb/2_file_structure.html>
136. DANDI, data standards: <https://docs.dandiarchive.org/getting-started/data-standards/>
137. h5wasm repository: <https://github.com/usnistgov/h5wasm>
138. Neurosift repository: <https://github.com/flatironinstitute/neurosift>
139. Neurodata Without Borders: <https://nwb.org/>

### Physics

The brief names ROOT, Geant4, COMSOL, and MATLAB. GNU Octave is added as the open runtime for MATLAB code, and LAMMPS as a molecular dynamics code for materials, with a maintained port that runs in the page.

| Tool | License | Renders | Main formats | Path | How it connects | Research OS shows |
|---|---|---|---|---|---|---|
| ROOT | LGPL-2.1-or-later, open, except MathMore under the GPL and RooFit under a University of California and Stanford license [140] | Histograms, graphs, trees, and detector geometry; publication figures as PDF and other formats [141] | `.root` files, compressed and self-describing [141], holding TTree and RNTuple data [142]; `.C` macros run by Cling [141]; canvases save as PNG, SVG, PDF, JSON, and a dozen more [143] | import, runner | JSROOT draws ROOT objects in the page and reads `.root` files over HTTP, MIT, release 7.11.1 on 2026-07-27 [144]. uproot reads and writes `.root` in pure Python under BSD-3-Clause; its CI tests a Pyodide build, though uproot is absent from Pyodide 314.0.7 [145][61]. ROOT ships binaries for Linux and macOS, with Windows in beta, plus conda and Docker builds [146] | Interactive: histograms, graphs, trees, and geometry in JSROOT |
| Geant4 | Geant4 Software License 1.0, open source with a clause against patenting modifications [147] | Detector geometry and particle tracks through OpenGL, Qt, Open Inventor, VTK, HepRep, VRML, and other drivers [148] | GDML geometry, which needs Xerces-C [149]; `.mac` macros [150]; analysis output as ROOT, HDF5, XML, or CSV [151] | runner, import | RHEL-family Linux with GCC 11.5, macOS 14 to 26 with Xcode, Windows 11 with Visual Studio 2022, and C++17; multithreaded builds; physics datasets download at build time [152]. Release 11.4.2 of 2026-06-17 [153]. No official web version; a third-party WebAssembly build for the YAPTIDE project runs Geant4 in a web worker, with no license file [154] | Static: images from the offscreen driver; interactive: ROOT output in JSROOT |
| COMSOL Multiphysics | Closed: CPU-locked, named single-user, floating network, and server licenses, term or perpetual [155], managed by FlexNet [156] | Result plots in one to three dimensions, and animations | `.mph` models holding the model and application trees; `.mphbin` and `.mphtxt` geometry; exports VTK `.vtu`, STL, PLY, 3MF, and glTF `.glb`, images, WebM and GIF animations, and MATLAB or Java model code [157] | import, link | Windows 10 and 11, Windows Server, macOS 12 to 26, and several Linux distributions; 4 GB of memory and 2 to 25 GB of disk; GPU solvers need an NVIDIA GPU of compute capability 6.0 [158]. COMSOL Server runs apps for web browsers on the licensee's own server [159], and COMSOL Compiler builds apps that run with no license [160]. No `.mph` parser outside COMSOL found | Interactive: exported `.glb` in model-viewer or three.js; static: images and WebM |
| MATLAB | Closed: individual, designated computer, network named user, and concurrent licenses, the last served by Flexera's license manager [161][162] | Figures and plots, live scripts, Simulink models | `.m` code; `.mlx` live scripts, a zip under Open Packaging Conventions [163]; `.mat` data, HDF5-based from version 7.3 [164]; `.fig`; `.slx` models, also OPC [165] | import, link | MATLAB Online runs on MathWorks servers [166]. Parsers: `scipy.io.loadmat` reads `.mat` up to 7.2 and h5py reads 7.3, both in Pyodide 314.0.7 [61]. `exportgraphics` writes an HTML file with an interactive canvas since R2026a [167] | The `.m` code as text; `.mat` variables as tables; interactive: exported HTML figures |
| GNU Octave | GPL-3.0-or-later, open [168] | 2D and 3D plots [169] | `.m` scripts; MATLAB `.mat` versions 4 to 7, and 7.3 read in part through HDF5 [170] | runner, browser | GNU/Linux, macOS, BSD, and Windows, with no license [169]. xeus-octave runs Octave in JupyterLite in the page, GPL-3.0, release v0.6.3 on 2026-01-26 [171] | Static: plots printed to SVG, PDF, PNG, or JPEG [172] |
| LAMMPS | GPLv2, open; the site does not say "or later" [173] | Images of each snapshot, and movies of a run [174] | Input scripts and data files; dumps as XYZ, extended XYZ, DCD, XTC, netCDF, H5MD, VTK, YAML, and more [174] | runner, browser | Executables for the three desktop systems [175]. Atomify compiles LAMMPS to WebAssembly and runs it in the page at about half native speed, single-threaded, GPL-3.0, last commit 2026-09-11 [176] | Interactive: Atomify's three.js view of a run; trajectories in Mol* or 3Dmol.js |

Sources, read 2026-09-21:

140. ROOT, license: <https://root.cern/about/license/>
141. ROOT, about: <https://root.cern/about/>
142. ROOT reference, RNTuple: <https://root.cern/doc/master/group__NTuple.html>
143. ROOT reference, TPad: <https://root.cern/doc/master/classTPad.html>
144. JSROOT repository: <https://github.com/root-project/jsroot>
145. uproot repository: <https://github.com/scikit-hep/uproot5>
146. ROOT, install: <https://root.cern/install/>
147. Geant4, software license: <https://geant4.web.cern.ch/download/license>
148. Geant4 guide, visualization drivers: <https://geant4-userdoc.web.cern.ch/UsersGuides/ForApplicationDeveloper/html/Visualization/visdrivers.html>
149. Geant4 guide, GDML: <https://geant4-userdoc.web.cern.ch/UsersGuides/ForApplicationDeveloper/html/Detector/Geometry/geomXML.html>
150. Geant4 guide, running a program: <https://geant4-userdoc.web.cern.ch/UsersGuides/ForApplicationDeveloper/html/GettingStarted/executeProgram.html>
151. Geant4 guide, analysis managers: <https://geant4-userdoc.web.cern.ch/UsersGuides/ForApplicationDeveloper/html/Analysis/managers.html>
152. Geant4 installation guide: <https://geant4-userdoc.web.cern.ch/UsersGuides/InstallationGuide/html/gettingstarted.html>
153. Geant4 11.4.2: <https://geant4.web.cern.ch/download/11.4.2.html>
154. yaptide geant-web-application repository: <https://github.com/yaptide/geant-web-application>
155. COMSOL, licensing: <https://www.comsol.com/products/licensing>
156. COMSOL 6.4, installation guide, license manager: <https://doc.comsol.com/6.4/doc/com.comsol.help.comsol/comsol_installation.02.026.html>
157. COMSOL learning center, file formats: <https://www.comsol.com/support/learning-center/article/76161>
158. COMSOL, system requirements: <https://www.comsol.com/system-requirements>
159. COMSOL Server: <https://www.comsol.com/comsol-server>
160. COMSOL Compiler: <https://www.comsol.com/comsol-compiler>
161. MathWorks, individual and designated computer licenses: <https://www.mathworks.com/help/install/administer-individual-and-designated-computer-licenses.html>
162. MathWorks, concurrent licenses: <https://www.mathworks.com/help/install/license/concurrent-licenses.html>
163. MATLAB, live script file format: <https://www.mathworks.com/help/matlab/matlab_prog/live-script-file-format.html>
164. MATLAB, MAT-file versions: <https://www.mathworks.com/help/matlab/import_export/mat-file-versions.html>
165. Simulink, save models: <https://www.mathworks.com/help/simulink/ug/save-models.html>
166. MATLAB Online: <https://www.mathworks.com/products/matlab-online.html>
167. MATLAB, exportgraphics: <https://www.mathworks.com/help/matlab/ref/exportgraphics.html>
168. GNU Octave repository: <https://github.com/gnu-octave/octave>
169. GNU Octave: <https://octave.org/>
170. Octave manual, simple file I/O: <https://docs.octave.org/latest/Simple-File-I_002fO.html>
171. xeus-octave repository: <https://github.com/jupyter-xeus/xeus-octave>
172. Octave manual, printing and saving plots: <https://docs.octave.org/latest/Printing-and-Saving-Plots.html>
173. LAMMPS: <https://www.lammps.org/>
174. LAMMPS manual, dump: <https://docs.lammps.org/dump.html>
175. LAMMPS manual, install: <https://docs.lammps.org/Install.html>
176. Atomify repository: <https://github.com/andeplane/atomify>

### Astronomy

The brief names Astropy. SAOImageDS9 is added as the desktop FITS viewer, and Aladin Lite as the maintained sky viewer for the page; JS9, once DS9's browser counterpart, is archived.

| Tool | License | Renders | Main formats | Path | How it connects | Research OS shows |
|---|---|---|---|---|---|---|
| Astropy | BSD-3-Clause, open [177] | Plots through Matplotlib, with world coordinates through WCSAxes [178] | FITS; tables as ASCII and ECSV, FITS, HDF5, Parquet, and VOTable [179]; ASDF through asdf-astropy | browser, runner | In Pyodide 314.0.7 as 7.2.0, with pyerfa and healpy [61]; the upstream release is 8.0 [177] | Static: Matplotlib figures; FITS headers and tables on the node; interactive: FITS images in Aladin Lite |
| SAOImageDS9 | GPL-3.0 for the DS9 code, which the README calls licensed in part; open [180] | FITS images and binary tables, frames, regions, scales, and colormaps [180] | FITS images, tables, cubes, and mosaics, NRRD, ENVI, and common image formats; region and contour files [181] | link, import | Desktop builds, macOS 13 to 26 among them; stable 8.7 of 2026-03-15 [182]. JS9, its browser counterpart, is archived with a final release on 2024-12-14 [183]. Parsers: astropy for FITS and astropy-regions for DS9 region files [184] | Interactive: the FITS image in Aladin Lite, with regions drawn from the region file |
| Aladin Lite | LGPL-3.0-or-later, open [185] | HiPS sky surveys and FITS images with catalogs overlaid, through a Rust and WebGL2 engine [185] | HiPS, FITS images, JPEG and PNG with WCS [185] | browser, link | An npm package, `aladin-lite`; stable v3.8.1 on 2026-03-05, last push 2026-09-17 [185][186] | Interactive: the sky view in the page |

Sources, read 2026-09-21:

177. Astropy repository: <https://github.com/astropy/astropy>
178. Astropy, WCSAxes: <https://docs.astropy.org/en/stable/visualization/wcsaxes/index.html>
179. Astropy, unified table I/O: <https://docs.astropy.org/en/stable/io/unified_table.html>
180. SAOImageDS9 repository: <https://github.com/SAOImageDS9/SAOImageDS9>
181. DS9 reference, file: <https://github.com/SAOImageDS9/SAOImageDS9/blob/master/ds9/doc/ref/file.html>
182. SAOImageDS9, download: <https://sites.google.com/cfa.harvard.edu/saoimageds9/download>
183. JS9 repository: <https://github.com/ericmandel/js9>
184. astropy-regions repository: <https://github.com/astropy/regions>
185. Aladin Lite repository: <https://github.com/cds-astro/aladin-lite>
186. aladin-lite on the npm registry: <https://registry.npmjs.org/aladin-lite>

### Earth science

The brief names QGIS and GDAL. Google Earth Engine is added as a closed platform for satellite remote sensing, and netCDF with xarray for gridded climate data. GMT is added for published maps. GeoSummary in the suite reads the kind of series these tools write.

| Tool | License | Renders | Main formats | Path | How it connects | Research OS shows |
|---|---|---|---|---|---|---|
| QGIS | GPL-2.0-or-later, open [187] | Maps of raster, vector, mesh, and point cloud data, with print layouts [187] | `.qgz`, a zip holding the `.qgs` project XML and a `.qgd` SQLite file of auxiliary data; `.qml` styles and `.qlr` layer definitions [188]; data formats through GDAL [189] | import, runner | qgis-js runs QGIS in the page as a public beta that loads a project and renders it to an image, with no network layers and no PyQGIS; npm 4.2.0 on 2026-07-06 [190]. QGIS Server provides WMS, WFS, WCS, and OGC API Features [191] for a web client such as QWC2, BSD-2-Clause, release 2026-09-17 [192]. Desktop on Windows, macOS, Linux, and BSD, free of charge [193] | Static: a print layout exported as PDF or SVG [194]; interactive: the layers on an OpenLayers map through QGIS Server and QWC2 |
| GDAL | MIT for most of the source, with some files under BSD terms [195] | Nothing; it translates raster and vector data through one abstract model for each [196] | 160 raster and 85 vector drivers in the stable documentation's tables on 2026-09-21 [197][198], GeoTIFF, COG, GeoPackage, netCDF, HDF5, Zarr, Shapefile, GeoParquet, and GeoJSON among them | browser, runner | gdal3.js compiles GDAL 3.8.4 to WebAssembly with `gdal_translate`, `ogr2ogr`, `gdalwarp`, and two more utilities, LGPL-2.1-or-later; last release v2.8.1 on 2024-02-22, npm beta 3.0.0-beta.4 on 2026-05-04, last commit 2026-05-13 [199]. Pyodide 314.0.7 has no GDAL package and ships rasterio, pyproj, fiona, and geopandas [61]. geotiff.js reads GeoTIFF and COG in JavaScript, MIT [200] | Static: a raster as an image; interactive: a COG on a web map through geotiff.js |
| Google Earth Engine | Closed and hosted: free for noncommercial and government research, and paid under Google Cloud terms for other use [201]; the `earthengine-api` client is Apache-2.0 [202] | Map tiles and console output over a multi-petabyte catalog of satellite imagery and geospatial data [203] | Scripts in JavaScript in the Code Editor or in Python; images export as GeoTIFF or TFRecord [204], tables as CSV, SHP, GeoJSON, KML, KMZ, or TFRecord [205] | link, import | A Google account and a Cloud project registered for commercial or noncommercial use [206]. The Code Editor sends each script to Google for processing [207] | Exported COGs through geotiff.js and exported tables; the script as text |
| netCDF and xarray | netCDF libraries BSD-3-Clause [208]; the CF conventions document CC0 [209]; xarray Apache-2.0 [210] | netCDF renders nothing; xarray plots through Matplotlib [211] | `.nc` in the classic, 64-bit offset, CDF-5, and netCDF-4 variants, and every netCDF-4 file is an HDF5 file [212]; CF metadata describes each variable and its space and time coordinates [209] | browser, runner | Pyodide 314.0.7 ships xarray, netcdf4, h5py, and zarr [61]. netcdfjs reads netCDF 3 in JavaScript, MIT, v4.0.0 on 2026-03-06 [213]; h5wasm reads HDF5 in JavaScript, v0.10.3 on 2026-06-11 [137]. A runner takes files too large to load in a page | Static: Matplotlib plots of a variable; the variables with their attributes as a table |
| GMT | LGPL-3.0-or-later, with one bundled file, `triangle.c`, under a non-permissive license [214] | Maps and figures for the geosciences [215] | Figures as PDF by default, or EPS, PS, PNG, JPEG, TIFF, and BMP [216]; grids as netCDF | runner, import | Command lines on Unix and Windows, no license [215]; release 6.7.0 on 2026-07-30 [217]. No browser build found, and PyGMT is absent from Pyodide 314.0.7 [61] | Static: the PDF or PNG figure |

Sources, read 2026-09-21:

187. QGIS repository: <https://github.com/qgis/QGIS>
188. QGIS manual, QGIS file formats: <https://docs.qgis.org/3.44/en/docs/user_manual/appendices/qgis_file_formats.html>
189. QGIS manual, supported data formats: <https://docs.qgis.org/3.44/en/docs/user_manual/managing_data_source/supported_data.html>
190. qgis-js repository: <https://github.com/qgis/qgis-js>
191. QGIS Server manual, introduction: <https://docs.qgis.org/3.44/en/docs/server_manual/introduction.html>
192. QWC2 repository: <https://github.com/qgis/qwc2>
193. QGIS, download: <https://qgis.org/download/>
194. QGIS manual, creating output: <https://docs.qgis.org/3.44/en/docs/user_manual/print_layout/create_output.html>
195. GDAL, license: <https://gdal.org/en/stable/license.html>
196. GDAL documentation: <https://gdal.org/en/stable/index.html>
197. GDAL, raster drivers: <https://gdal.org/en/stable/drivers/raster/index.html>
198. GDAL, vector drivers: <https://gdal.org/en/stable/drivers/vector/index.html>
199. gdal3.js repository: <https://github.com/bugra9/gdal3.js>
200. geotiff.js repository: <https://github.com/geotiffjs/geotiff.js>
201. Earth Engine, terms of service: <https://earthengine.google.com/terms/>
202. earthengine-api repository: <https://github.com/google/earthengine-api>
203. Google Earth Engine: <https://earthengine.google.com/>
204. Earth Engine guide, exporting images: <https://developers.google.com/earth-engine/guides/exporting_images>
205. Earth Engine guide, exporting tables: <https://developers.google.com/earth-engine/guides/exporting_tables>
206. Earth Engine guide, access: <https://developers.google.com/earth-engine/guides/access>
207. Earth Engine guide, Code Editor: <https://developers.google.com/earth-engine/guides/playground>
208. Unidata, netCDF licensing: <https://www.unidata.ucar.edu/software/netcdf/licensing>
209. CF Conventions 1.13: <https://cfconventions.org/Data/cf-conventions/cf-conventions-1.13/cf-conventions.html>
210. xarray repository: <https://github.com/pydata/xarray>
211. xarray, plotting: <https://docs.xarray.dev/en/stable/user-guide/plotting.html>
212. netCDF-C, file format specifications: <https://docs.unidata.ucar.edu/netcdf-c/current/file_format_specifications.html>
213. netcdfjs repository: <https://github.com/cheminfo/netcdfjs>
214. GMT, LICENSE.TXT: <https://github.com/GenericMappingTools/gmt/blob/master/LICENSE.TXT>
215. The Generic Mapping Tools: <https://www.generic-mapping-tools.org/>
216. GMT documentation, figure: <https://docs.generic-mapping-tools.org/latest/figure.html>
217. GMT repository: <https://github.com/GenericMappingTools/gmt>

### CAD

The brief names SolidWorks and Onshape, closed, with FreeCAD and OpenSCAD, open. KiCad is added as an open tool for electronics design. STEP and glTF exports carry four of the five to the web, where Online3DViewer reads STEP; OpenSCAD runs in the page itself.

| Tool | License | Renders | Main formats | Path | How it connects | Research OS shows |
|---|---|---|---|---|---|---|
| SolidWorks | Closed. Single seats activate on one machine or sign in online [219]; networks use SolidNetWork on FlexNet for perpetual and term licenses [218] | 3D parts and assemblies, 2D drawings | `.sldprt`, `.sldasm`, `.slddrw` [220]; exchanges STEP, IGES, Parasolid, ACIS, DXF and DWG, IFC, PDF [221]; glTF and GLB [222]; STL and 3MF meshes among others [223] | import, link | Windows 10 or 11, 64-bit, with 16 GB of memory and a certified graphics card [224]. SOLIDWORKS xDesign runs in the browser on the 3DEXPERIENCE platform as a separate product [225]. No open parser for the native files found | Interactive: exported STEP in Online3DViewer or glTF in model-viewer; drawings as PDF |
| FreeCAD | LGPL-2.1-or-later, open [226] | Parametric 3D solids, sketches, drawings, and FEM meshes and results | `.FCStd`, a zip of `Document.xml`, BREP shapes, and a thumbnail [227]; STEP, IGES, STL, OBJ, 3MF, DXF, SVG, IFC, and more; exports glTF [228] | import, browser | The three desktop systems, with a console mode [229]. freecad-web compiles FreeCAD 1.1.3 to WebAssembly, third party, Chrome or Edge 137 only, about 115 MB on first load, release v1.0.0 on 2026-09-18 [230]. Import reads `Document.xml` with any XML parser and the thumbnail as PNG | Static: the thumbnail; interactive: the model in Online3DViewer, which reads `.fcstd` [231] |
| OpenSCAD | GPL-2.0-or-later with a linking exception for CGAL; open [232][233] | 3D solids by constructive geometry and extruded 2D outlines | `.scad` text in; STL, OBJ, OFF, 3MF, DXF, SVG, PNG, PDF, and more out on master [234]; last stable release 2021.01 | browser, runner | openscad-wasm is the headless WebAssembly build, last commit 2026-08-02 [235]; the OpenSCAD Playground runs it in the page and draws with model-viewer, last commit 2026-07-16 [236]. Native builds for the three desktop systems [233] | Interactive: the rendered model in the page; the `.scad` source as text |
| Onshape | Closed subscription of PTC; the free plan is noncommercial and makes every document public [237]; education plans are free [238] | 3D parts and assemblies, with drawings, in the browser through WebGL [239] | No local files; imports STEP, Parasolid, SolidWorks, and a dozen more, and exports STEP, Parasolid, glTF, STL, 3MF, and URDF [240] | link, import | A browser with WebGL and a sign-in [239]. A REST API with API keys or OAuth2 exports glTF, Parasolid, STL, and translations to other formats [241] | Interactive: glTF from the API in model-viewer; a link to the document |
| KiCad | GPL-3.0-or-later for most of the source; libraries CC-BY-SA 4.0 [242] | Schematics, circuit boards, a 3D board view, and SPICE simulation | `.kicad_sch` and `.kicad_pcb` S-expression text [243][244]; `kicad-cli` exports Gerber, drill, SVG, PDF, STEP, and GLB [245] | browser, runner | KiCanvas views `.kicad_sch` and `.kicad_pcb` in the page, MIT, early alpha, last commit 2026-04-28 [246]. `kicad-cli` runs headless on every desktop system KiCad supports [245] | Interactive: the schematic or board in KiCanvas; the GLB board in model-viewer |

Sources, read 2026-09-21:

218. SOLIDWORKS help, SolidNetWork licenses: <https://help.solidworks.com/2023/english/Installation/install_guide/c_administering_licenses_using_snl.htm>
219. SOLIDWORKS help, online licensing: <https://help.solidworks.com/2021/english/SolidWorks/sldworks/t_log_into_SOLIDWORKS_with_online_licensing.htm>
220. SOLIDWORKS help, types of files: <https://help.solidworks.com/2021/English/SolidWorks/acadhelp/c_Types_of_Files.htm>
221. SOLIDWORKS help, import and export: <https://help.solidworks.com/2025/english/SolidWorks/sldworks/c_import_export_file_information.htm>
222. SOLIDWORKS help, glTF and GLB: <https://help.solidworks.com/2025/English/SolidWorks/sldworks/c_glb_gltf_extended_reality_files.htm>
223. SOLIDWORKS help, STL files: <https://help.solidworks.com/2025/english/SolidWorks/sldworks/c_stl_files.htm>
224. SOLIDWORKS, system requirements: <https://www.solidworks.com/support/system-requirements>
225. SOLIDWORKS xDesign: <https://www.3ds.com/store/solidworks-xdesign>
226. FreeCAD source, Document.cpp: <https://github.com/FreeCAD/FreeCAD/blob/main/src/App/Document.cpp>
227. FreeCAD wiki, FCStd file format: <https://github.com/FreeCAD/FreeCAD-documentation/blob/main/wiki/File_Format_FCStd.md>
228. FreeCAD wiki, import and export: <https://github.com/FreeCAD/FreeCAD-documentation/blob/main/wiki/Import_Export.md>
229. FreeCAD repository: <https://github.com/FreeCAD/FreeCAD>
230. freecad-web repository: <https://github.com/Virtastic/freecad-web>
231. Online3DViewer repository: <https://github.com/kovacsv/Online3DViewer>
232. OpenSCAD repository: <https://github.com/openscad/openscad>
233. OpenSCAD, about: <https://openscad.org/about.html>
234. OpenSCAD source, export.cc: <https://github.com/openscad/openscad/blob/master/src/io/export.cc>
235. openscad-wasm repository: <https://github.com/openscad/openscad-wasm>
236. OpenSCAD Playground repository: <https://github.com/openscad/openscad-playground>
237. Onshape, pricing: <https://www.onshape.com/en/pricing>
238. Onshape, education plans: <https://www.onshape.com/en/education/plans>
239. Onshape help, hardware recommendations: <https://cad.onshape.com/help/Content/Home/hardware_and_graphics_performance_recommendations.htm>
240. Onshape help, translation: <https://cad.onshape.com/help/Content/translation.htm>
241. Onshape API, translation: <https://onshape-public.github.io/docs/api-adv/translation/>
242. KiCad, licenses: <https://www.kicad.org/about/licenses/>
243. KiCad, schematic file format: <https://dev-docs.kicad.org/en/file-formats/sexpr-schematic/>
244. KiCad, board file format: <https://dev-docs.kicad.org/en/file-formats/sexpr-pcb/>
245. KiCad 10, command line: <https://docs.kicad.org/10.0/en/cli/cli.html>
246. KiCanvas repository: <https://github.com/theacodes/kicanvas>

### Simulation

The brief names Ansys and Abaqus, closed, with FEniCS and OpenFOAM, open. meshio is the import parser for the group: it reads Abaqus input, Gmsh, VTK, XDMF, and some thirty mesh formats in pure Python, though its last release was 2024-01-31.

| Tool | License | Renders | Main formats | Path | How it connects | Research OS shows |
|---|---|---|---|---|---|---|
| Ansys | Closed: FlexNet licensing through the Ansys License Management Center [247]; Ansys became part of Synopsys on 2025-07-17 [248]; Ansys Student is a free twelve-month lease capped at 128K structural nodes and 1 million fluid cells [249] | Meshes and 3D field results, structural and fluid | `.wbpj` Workbench projects with `.mechdb` Mechanical and `.db` Mechanical APDL databases [250]; Fluent `.cas.h5` and `.dat.h5` in HDF5 [251]; exports EnSight, CGNS, Tecplot, and others [252] | import, runner | Ansys Student runs on 64-bit Windows 10 and 11 with 50 GB of disk [249]; full products need a FlexNet license server [247]. ansys-mapdl-reader reads `.rst` result files in Python, MIT [253]; Fluent's HDF5 files open with h5py | Static: exported images; interactive: CGNS or EnSight converted to a mesh for vtk.js |
| Abaqus | Closed: tokens served by FLEXnet or Dassault Systèmes licensing, per the 6.12 guide of 2012 [254], with current licensing unverified behind a sign-in; the Learning Edition caps models at 1,000 nodes and runs on Windows only [255] | Finite element meshes and results | `.inp` text input, `.odb` binary results, `.cae` models, `.jnl` journals [256] | import, runner | meshio reads `.inp` in pure Python, MIT [257]. `.odb` opens only through Abaqus's own Python or C++ API, and ODB2VTK, MIT, converts it to `.vtu` with Abaqus installed [258] | Interactive: the mesh from `.inp`, or `.vtu` results converted on a licensed runner, in vtk.js |
| FEniCS | DOLFINx LGPL-3.0-or-later, open [259] | Nothing of its own; it is a finite element library | XDMF with HDF5, VTK, VTX through ADIOS2, and VTKHDF [260] | runner, import | Linux through apt, Docker, conda, or Spack; macOS through conda; Windows through Docker or WSL2; MPI for parallel runs; release v0.11.0 on 2026-06-10 [261]. No Pyodide or emscripten build found | Interactive: VTK or XDMF output read by meshio and drawn in vtk.js |
| OpenFOAM | GPL-3.0-or-later for openfoam.org [262]; GPL v3 for openfoam.com [263]; open | Nothing of its own; `paraFoam` opens ParaView | A case directory of text dictionaries: `system/` and `constant/`, which holds the mesh, beside time directories such as `0/` [264]; `foamToVTK` converts results to VTK [265] | runner, import | Linux, or Windows through WSL, with OpenMPI for parallel runs [266]; OpenFOAM 14 from the Foundation on 2026-07-14 [267]. A third-party WebAssembly demo runs `blockMesh` and one solver, with no license and one day of commits [268]. | Interactive: `foamToVTK` output in vtk.js; the case dictionaries as text |

Sources, read 2026-09-21:

247. Ansys help, licensing introduction: <https://ansyshelp.ansys.com/public/Views/Secured/corp/v251/en/ai_elg/license_intro.html>
248. Synopsys, acquisition of Ansys completed: <https://news.synopsys.com/2025-07-17-Synopsys-Completes-Acquisition-of-Ansys>
249. Ansys Student: <https://ansys.synopsys.com/academic/students/ansys-student>
250. Ansys help, Workbench file types: <https://ansyshelp.ansys.com/public/Views/Secured/corp/v252/en/wb2_help/wb2h_wbfiles.html>
251. Ansys Fluent guide, case and data files: <https://ansyshelp.ansys.com/public/Views/Secured/corp/v242/en/flu_ug/flu_ug_CaseDataFiles.html>
252. Ansys Fluent guide, exporting data: <https://ansyshelp.ansys.com/public/Views/Secured/corp/v252/en/flu_ug/flu_ug_FileExport.html>
253. ansys-mapdl-reader repository: <https://github.com/ansys/pymapdl-reader>
254. Abaqus 6.12 installation and licensing guide: <https://media.3ds.com/support/simulia/public/v612/installation_and_licensing_guides/books/sgb/ch02s01.html>
255. Abaqus Learning Edition: <https://www.3ds.com/edu/education/students/solutions/abaqus-le>
256. Dassault Systemes blog, Abaqus files: <https://blog.3ds.com/ko/brands/simulia/abaqus-file-1/>
257. meshio repository: <https://github.com/nschloe/meshio>
258. ODB2VTK repository: <https://github.com/Arris-Composites/ODB2VTK>
259. DOLFINx source, XDMFFile.h: <https://github.com/FEniCS/dolfinx/blob/main/cpp/dolfinx/io/XDMFFile.h>
260. DOLFINx documentation, dolfinx.io: <https://docs.fenicsproject.org/dolfinx/main/python/generated/dolfinx.io.html>
261. DOLFINx repository: <https://github.com/FEniCS/dolfinx>
262. OpenFOAM-dev repository: <https://github.com/OpenFOAM/OpenFOAM-dev>
263. OpenFOAM.com, licencing: <https://www.openfoam.com/documentation/licencing>
264. OpenFOAM user guide, case file structure: <https://doc.cfd.direct/openfoam/user-guide-v13/case-file-structure>
265. OpenFOAM user guide, ParaView: <https://doc.cfd.direct/openfoam/user-guide-v13/paraview>
266. OpenFOAM user guide, running in parallel: <https://doc.cfd.direct/openfoam/user-guide-v13/running-applications-parallel>
267. OpenFOAM Foundation, download: <https://openfoam.org/download/>
268. openfoam-wasm repository: <https://github.com/FoamScience/openfoam-wasm>

### Statistics

The brief names R with SPSS and Stata. SAS is added as the owner of the XPORT format the FDA requires for every electronic dataset in a submission, and PSPP as the free engine for SPSS syntax. The four data formats here, `.sav`, `.dta`, `.sas7bdat`, and `.xpt`, have readers that load in the page. pandas in Pyodide 314.0.7 read a Stata `.dta` file in a check on 2026-09-21, and its SAS reader is untested there. haven, which reads all four, is in webR's package repository.

| Tool | License | Renders | Main formats | Path | How it connects | Research OS shows |
|---|---|---|---|---|---|---|
| R | GPL-2 or GPL-3, as R states it; open [269] | 2D statistical graphics through graphics devices, PDF, PNG, and SVG among them [270] | `.R` scripts; `.RData` and `.rda` workspaces [271]; `.rds` objects, which R's own help calls unsuitable for interchange between machines [272]; `.Rmd` and `.qmd` documents [273] | browser, runner | webR runs R in the page through WebAssembly: MIT for its build scripts and console, GPL-3 for the binaries that contain R; release v0.6.0 on 2026-05-19, last commit 2026-06-23 [274]. Its package repository listed 22,741 packages for R 4.6 on 2026-09-21, haven, foreign, readxl, and ggplot2 among them [109]. A package with compiled code needs a WebAssembly build, and webR cannot install from source [275]. Shinylive runs Shiny apps in the page, MIT [276]. A runner covers packages with no WebAssembly build | Static: PNG or SVG plots; interactive: webR in the page, with plots drawn through `webr::canvas()` [277], or a Shinylive app |
| IBM SPSS Statistics | Closed: per-user licenses or a subscription, with concurrent licenses served by a license manager [278] | Pivot tables and charts in the Viewer; exports to HTML, Word, Excel, and PDF [279] | `.sav` and `.zsav` data, `.spv` Viewer output, `.sps` syntax [279] | import, link | Desktop on Windows and macOS, 64-bit only, with no Linux desktop; SPSS Statistics Server runs on Linux; concurrent licenses use the Sentinel License Manager [280]. Parsers: ReadStat (C, MIT) [281], pyreadstat (Python, Apache-2.0) [282], and haven in webR for the page [283]; PSPP's `pspp-output` reads `.spv` [284] | The dataset as a table with its variable labels; `.sps` syntax as text; `.spv` output converted to text or PDF by PSPP |
| PSPP | GPL-3.0-or-later, open [285] | Statistical tables and charts, output as text, PostScript, PDF, OpenDocument, or HTML [285] | Syntax and data files compatible with SPSS [285]; `pspp-convert` turns SPSS system and portable files into CSV [286] | runner, import | The three desktop systems, with a command line and no license; 2.1.2 released 2026-09-19 [287] | Static: PDF or HTML output of an `.sps` run |
| Stata | Closed: single-user, network, site, and student lab licenses, annual or perpetual; editions up to MP, which runs on up to 64 cores [288][289] | 2D statistical graphs, exported as PS, EPS, SVG, PDF, PNG, TIFF, and more [290] | `.dta` data, `.do` and `.ado` code, `.smcl` logs, `.gph` graphs [291]; `.dta` versions 113 to 121 across Stata 8 to 19 [292] | import, link | Windows 10, Windows 11, macOS 13 to 26, or 64-bit Linux with glibc 2.28; 4 GB of disk; a license and activation key [293]. Parsers: `pandas.read_stata` for `.dta` 113 to 118, which runs in Pyodide [294]; haven; ReadStat for versions 104 to 119 [281]. No parser here lists versions 120 and 121, which Stata 18 and 19 write for alias variables [292], so reading them is unverified | The dataset as a table; `.do` files as text; graphs as the static exports |
| SAS | Closed: SAS 9.4 runs on an annual SID license file [295]; SAS OnDemand for Academics is free for coursework and noncommercial research, hosted by SAS [296][297] | Statistical output and graphics | `.sas` programs, `.sas7bdat` data sets, `.sas7bcat` catalogs [298]; `.xpt` XPORT, which the FDA names as the file format for every electronic dataset in a submission [299] | import, link | SAS Studio processes code on a SAS server and returns results to the browser [300]. Parsers: `pandas.read_sas` reads `.xpt` and `.sas7bdat` and runs in Pyodide [294]; ReadStat and haven read both | The dataset as a table; `.sas` programs as text |

Sources, read 2026-09-21:

269. R Project, licenses: <https://www.r-project.org/Licenses/>
270. R manual, graphics devices: <https://stat.ethz.ch/R-manual/R-devel/library/grDevices/html/Devices.html>
271. R manual, save: <https://stat.ethz.ch/R-manual/R-devel/library/base/html/save.html>
272. R manual, readRDS: <https://stat.ethz.ch/R-manual/R-devel/library/base/html/readRDS.html>
273. Quarto, using R: <https://quarto.org/docs/computations/r.html>
274. webR repository: <https://github.com/r-wasm/webr>
275. webR, building R packages: <https://docs.r-wasm.org/webr/latest/building.html>
276. Shinylive for R repository: <https://github.com/posit-dev/r-shinylive>
277. webR, plotting: <https://docs.r-wasm.org/webr/latest/plotting.html>
278. IBM SPSS Statistics 31, installation and licensing: <https://www.ibm.com/docs/en/SSLVMB_31.0.0/pdf/Getting_Started_with_Installation_and_Licensing.pdf>
279. IBM SPSS Statistics 31, core system user guide: <https://www.ibm.com/docs/en/SSLVMB_31.0.0/pdf/IBM_SPSS_Statistics_Core_System_User_Guide.pdf>
280. IBM, downloading SPSS Statistics 32: <https://www.ibm.com/support/pages/downloading-ibm-spss-statistics-32>
281. ReadStat repository: <https://github.com/WizardMac/ReadStat>
282. pyreadstat repository: <https://github.com/Roche/pyreadstat>
283. haven on CRAN: <https://cran.r-project.org/package=haven>
284. PSPP manual, pspp-output: <https://www.gnu.org/software/pspp/manual/html_node/Invoking-pspp_002doutput.html>
285. GNU PSPP: <https://www.gnu.org/software/pspp/>
286. PSPP manual, pspp-convert: <https://www.gnu.org/software/pspp/manual/html_node/Invoking-pspp_002dconvert.html>
287. GNU PSPP release directory: <https://ftp.gnu.org/gnu/pspp/>
288. Stata, license options: <https://www.stata.com/order/license-options/>
289. Stata, which Stata is right for me: <https://www.stata.com/products/which-stata-is-right-for-me/>
290. Stata manual, graph export: <https://www.stata.com/manuals/g-2graphexport.pdf>
291. Stata user's guide: <https://www.stata.com/manuals/u.pdf>
292. Stata help, dta: <https://www.stata.com/help.cgi?dta>
293. Stata, compatible operating systems: <https://www.stata.com/products/compatible-operating-systems/>
294. pandas, IO tools: <https://pandas.pydata.org/docs/user_guide/io.html>
295. SAS, applying a SID file: <https://support.sas.com/documentation/installcenter/en/ikwinbasicri/66608/PDF/default/setinit_basic.pdf>
296. SAS OnDemand for Academics: <https://www.sas.com/en_us/software/on-demand-for-academics.html>
297. SAS OnDemand for Academics license: <https://support.sas.com/ondemand/pdf/click_license.pdf>
298. SAS for Windows, file extensions: <https://support.sas.com/documentation/cdl/en/hostwin/69955/HTML/default/n0sk6o15955yoen19n9ghdziqw1u.htm>
299. FDA, Study Data Technical Conformance Guide: <https://www.fda.gov/media/153632/download>
300. SAS Studio support: <https://support.sas.com/en/software/studio-support.html>

### Qualitative research

The brief names NVivo and ATLAS.ti. MAXQDA is added as a third closed package that writes the same exchange format. REFI-QDA is the exchange standard all of them write, so one parser covers the group; QualCoder and Taguette are added as the open tools on the desktop and on the web.

| Tool | License | Renders | Main formats | Path | How it connects | Research OS shows |
|---|---|---|---|---|---|---|
| NVivo | Closed: perpetual, enterprise, student, and trial licenses activated through a MyLumivero account [301] | Coded sources, text, PDF, images, audio, and video, with code hierarchies, matrices, and maps | `.nvp` on Windows and `.nvpx` on Mac [302]; exports a REFI-QDA project `.qdpx` [303] and a codebook as `.qdc` among other formats [304] | import, link | Windows 10 or later, 4 to 8 GB of memory, about 5 to 8 GB of disk [305]. The `.qdpx` export leaves out queries, maps, framework matrices, dynamic sets, and aggregate coding [303] | The sources with their coded segments and the code tree, read from `.qdpx` |
| ATLAS.ti | Closed: purchased or leased desktop licenses and leased web licenses, renewing yearly [306]; every license covers both desktop editions and ATLAS.ti Web [307] | Coded documents and code networks | `.atlproj` project bundles [308]; exports QDPX and Excel among its formats, and imports QDPX from any tool [309][310] | import, link | Desktop on Windows and Mac. ATLAS.ti Web is hosted, on servers in Germany [311] | The sources with their coded segments, read from `.qdpx` |
| MAXQDA | Closed: subscriptions of one to five years for single users and networks [312] | Coded documents and the code system | `.mqda` projects in MAXQDA 26, which opens `.mx24` back to `.mx12` [313]; exports `.qdpx` and imports and exports `.qdc` codebooks [314] | import, link | Windows and Mac, with an internet connection once to activate [315]. On a REFI import MAXQDA cuts comments on coded segments to 511 characters [314] | The sources with their coded segments, read from `.qdpx` |
| REFI-QDA | No license stated on the standard's pages; the site footer reads "All rights reserved" [316] | Nothing; it is an exchange format for sources, segments, codes, memos, cases, and sets [317] | `.qdpx` projects, an XML file with the sources in one archive [317]; `.qdc` codebooks with an XSD [316] | import | Parsers: pyqdpx, which reads `.qdpx` as a zip with `project.qde` and a `Sources` folder (Python, MIT, last push 2026-04-29) [318]. The site lists ATLAS.ti, MAXQDA, NVivo, QualCoder, and eight more tools as supporting project exchange [319] | The one parser behind the NVivo, ATLAS.ti, MAXQDA, and QualCoder rows |
| QualCoder | LGPL-3.0, open [320] | Coded text, images, audio, and video, with reports | A SQLite project; imports text, Word, HTML, Markdown, EPUB, PDF, and media; REFI-QDA project and codebook import and export [320][317] | import, link | The three desktop systems, with Python 3.13 and PyQt6; stable 3.8.2 on 2026-02-26, last push 2026-09-21 [320] | The sources with their coded segments, read from `.qdpx` |
| Taguette | BSD-3-Clause, open [321] | Documents with highlighted, tagged quotes | Imports PDF, DOCX, TXT, ODT, Markdown, and HTML; exports highlights as HTML, CSV, XLSX, DOCX, or PDF, the codebook as `.qdc`, CSV, and more, and the project as SQLite [322] | runner, import | A Python web server, self-hosted or at app.taguette.org [323]; tag v1.5.2 on 2025-12-08, last commit 2026-02-05 [324] | The codebook from `.qdc`; highlights from CSV |

Sources, read 2026-09-21:

301. NVivo 15 help, activate a license: <https://help-nv.qsrinternational.com/15/win/Content/about-nvivo/activate-license.htm>
302. NVivo 15 help, Windows and Mac projects: <https://help-nv.qsrinternational.com/15/win/Content/projects-teamwork/work-with-projects-windows-mac.htm>
303. NVivo 15 help, REFI-QDA standard: <https://help-nv.qsrinternational.com/15/win/Content/projects-teamwork/refi-qda%20standard.htm>
304. NVivo 14 help, export codes: <https://help-nv.qsrinternational.com/14/win/Content/nodes/export-nodes.htm>
305. NVivo 15 help, installation: <https://help-nv.qsrinternational.com/15/win/Content/about-nvivo/installation.htm>
306. ATLAS.ti, terms and conditions: <https://atlasti.com/legal/terms-conditions>
307. ATLAS.ti, multi-user licenses: <https://atlasti.com/multi-user-licenses>
308. ATLAS.ti manual, setting up a team project: <https://manuals.atlasti.com/Win/en/manual/Team/TeamWorkSettingUpProject.html>
309. ATLAS.ti manual, QDPX export: <https://manuals.atlasti.com/Win/en/manual/Export/ExportQDPXUniversalDataExchange.html>
310. ATLAS.ti manual, importing a project: <https://manuals.atlasti.com/Win/en/manual/Project/ProjectImportingAnExistingProject.html>
311. ATLAS.ti Web: <https://atlasti.com/atlas-ti-web>
312. MAXQDA, pricing: <https://www.maxqda.com/pricing>
313. MAXQDA help, opening older projects: <https://help.maxqda.com/en/support/solutions/articles/80001139450-how-to-open-projects-from-older-versions-2020-and-2022-in-the-current-maxqda->
314. MAXQDA help, REFI-QDA projects: <https://www.maxqda.com/help/report-and-export/export-and-import-refi-qda-projects>
315. MAXQDA, system requirements: <https://www.maxqda.com/system-requirements>
316. REFI-QDA, codebook implementation files: <https://www.qdasoftware.org/codebook-implementation-files>
317. REFI-QDA, project exchange: <https://www.qdasoftware.org/project>
318. pyqdpx repository: <https://github.com/DEpt-metagenom/pyqdpx>
319. REFI-QDA, about: <https://www.qdasoftware.org/about>
320. QualCoder repository: <https://github.com/ccbogel/QualCoder>
321. Taguette, LICENSE: <https://gitlab.com/remram44/taguette/-/raw/master/LICENSE.txt>
322. Taguette, getting started: <https://www.taguette.org/getting-started.html>
323. Taguette: <https://www.taguette.org/>
324. Taguette repository: <https://gitlab.com/remram44/taguette>

### Humanities

The brief names Zotero and TEI. Voyant Tools is added for text analysis, and Transkribus for handwritten text recognition in archives. Research OS already holds 178 literature cards as `primary_source` nodes, so a reference manager is the row with the widest reach here.

| Tool | License | Renders | Main formats | Path | How it connects | Research OS shows |
|---|---|---|---|---|---|---|
| Zotero | AGPL-3.0-or-later, open [325] | A reference library of items, notes, tags, and attachments; formatted citations through CSL styles [326] | `zotero.sqlite` and a `storage` folder of attachments [327]; imports and exports BibTeX, CSL JSON, MODS XML, RIS, Refer; exports BibLaTeX and Zotero RDF [328] | import, link | Web API v3 at `api.zotero.org`: public libraries read with no key, private ones with a user key, up to 100 items a request, `429` with `Retry-After` under load [326]. A local API on `localhost:23119` in Zotero 10 [329]. Parsers: citation-js (MIT, JavaScript, npm 0.9.0 on 2026-09-18) [330]. Desktop on the three major systems [331] | Each reference as a `primary_source` node; formatted references from the API's `include=bib` or citeproc-js in the page |
| TEI | Guidelines and schemas under both CC BY 3.0 and BSD-2-Clause, open [332] | TEI is an XML encoding; the TEI Stylesheets transform it to XHTML, LaTeX, XSL-FO, ePub, and Word [333] | XML in the TEI namespace, with ODD customizations [334]; P5 4.12.0 released 2026-07-28 [335] | browser, import | CETEIcean renders TEI in the page as custom elements, BSD-2-Clause, last release v1.9.5 on 2025-08-29 and last commit 2026-09-08 [336]. TEI Publisher (GPL-3.0) needs an eXist-db server [337]. Import reads `teiHeader` metadata and the text into passages with any XML parser | Interactive: the edition in the page through CETEIcean |
| Voyant Tools | GPL-3.0, open [338] | Interactive corpus panels: Cirrus, Reader, Trends, Summary, Contexts, Collocates, Links [339] | Reads HTML, Word, Excel, ODT, Pages, PDF, plain text, RTF, XML, archives, JSON, RSS, and TEI [340] | link, runner | Hosted at voyant-tools.org, which answered 502 on 2026-09-21. VoyantServer needs Java 11; release 2.6.23 on 2026-08-19 [341] | Interactive: a Voyant tool in an iframe, loading a document by `?input=<url>` [342] |
| Transkribus | Closed: a subscription service of READ-COOP SCE; the free plan gives 50 credits a month, and recognizing handwriting costs 1 credit a page [343][344] | Handwritten text recognition and layout analysis over page images | Every plan exports JPEG, DOCX, PDF, TXT, and PAGE XML; paid plans add METS, CSV, ALTO XML, and TEI XML [345] | import, link | Hosted only. A processing API takes page images up to 20 MB and returns PAGE XML, ALTO, TEI, or text [346]. Parser: pagexml-tools (Python, MIT) [347] | Static: the text as passages; the page image with the PAGE XML line polygons drawn over it is a viewer to build |

Sources, read 2026-09-21:

325. Zotero, COPYING: <https://raw.githubusercontent.com/zotero/zotero/main/COPYING>
326. Zotero Web API v3, basics: <https://www.zotero.org/support/dev/web_api/v3/basics>
327. Zotero, the Zotero data directory: <https://www.zotero.org/support/zotero_data>
328. Zotero, data formats: <https://www.zotero.org/support/dev/data_formats>
329. Zotero, local API: <https://www.zotero.org/support/dev/web_api/v3/local_api>
330. citation-js repository: <https://github.com/citation-js/citation-js>
331. Zotero, system requirements: <https://www.zotero.org/support/system_requirements>
332. TEI, licensing and citation: <https://www.tei-c.org/guidelines/licensing-and-citation/>
333. TEI Stylesheets repository: <https://github.com/TEIC/Stylesheets>
334. TEI P5 Guidelines, chapter ST: <https://www.tei-c.org/release/doc/tei-p5-doc/en/html/ST.html>
335. TEI, P5 Guidelines: <https://www.tei-c.org/guidelines/p5/>
336. CETEIcean repository: <https://github.com/TEIC/CETEIcean>
337. TEI Publisher app repository: <https://github.com/eeditiones/tei-publisher-app>
338. Voyant repository: <https://github.com/voyanttools/Voyant>
339. Voyant, getting started guide: <https://github.com/voyanttools/Voyant/blob/master/src/main/webapp/docs/tutorials/guides/guides/start.md>
340. Voyant, corpus creator guide: <https://github.com/voyanttools/Voyant/blob/master/src/main/webapp/docs/tutorials/guides/guides/corpuscreator.md>
341. VoyantServer repository: <https://github.com/voyanttools/VoyantServer>
342. Voyant, embedding guide: <https://github.com/voyanttools/Voyant/blob/master/src/main/webapp/docs/tutorials/guides/guides/embedding.md>
343. Transkribus, terms: <https://legal.transkribus.org/terms>
344. Transkribus, plans: <https://www.transkribus.org/plans>
345. Transkribus help, downloading: <https://help.transkribus.org/downloading>
346. Transkribus metagrapho API documentation: <https://www.transkribus.org/metagrapho/documentation>
347. pagexml-tools repository: <https://github.com/knaw-huc/pagexml>

### Visualization

The brief names ParaView and VisIt for scientific data, and Blender for scenes. Their web path is one pattern: export a mesh or a scene in an open format and show it in a JavaScript viewer, vtk.js for VTK data and model-viewer or three.js for glTF.

| Tool | License | Renders | Main formats | Path | How it connects | Research OS shows |
|---|---|---|---|---|---|---|
| ParaView | BSD-3-Clause, open [348] | 3D views of meshes and volumes, with screenshots and animations [349] | `.pvsm` XML state files and Python state files [349]; reads VTK XML `.vti`, `.vtp`, `.vtr`, `.vts`, and `.vtu` [350], and CGNS, EnSight, Exodus, OpenFOAM, netCDF, and XDMF among many more [351]; exports scenes as WebGL, X3D, VRML, SVG, and PDF [349] | import, runner | vtk.js renders VTK data in the page, BSD-3-Clause, v37.1.0 on 2026-09-18 [352]. ParaView Glance last released on 2024-09-17 [353] and ParaViewWeb is in maintenance mode [354], so neither counts as maintained. trame serves ParaView from a Python server to a web client, Apache-2.0, v4.0.0 on 2026-09-09 [355]. Desktop downloads of 466 to 827 MB [356] | Static: PNG or PDF exports; interactive: `.vtp` and `.vti` in vtk.js, or a trame app on a runner |
| VisIt | BSD-3-Clause, open [357] | Scalar and vector fields on structured and unstructured meshes in 2D and 3D, adaptive ones included [357] | Reads more than 130 formats, Silo, VTK, Exodus, and CGNS among them [358]; XML session files [359]; exports images, and geometry as OBJ, PLY, STL, and VTK [360] | import, link | Desktop builds, five or more Linux distributions among them [358]; release v3.5.0 on 2026-04-29 [361]. No browser port found | Static: PNG exports; interactive: exported VTK in vtk.js |
| Blender | Source GPL-2.0-or-later, binaries GPL-3.0-or-later; the Cycles renderer Apache-2.0 [362] | 3D scenes through the Cycles and EEVEE renderers | `.blend`; imports and exports Alembic, FBX, OBJ, PLY, STL, and USD among others [363]; glTF 2.0 `.glb` and `.gltf` through an add-on that is on by default [364] | import, runner | Cycles renders on a GPU through CUDA, OptiX, HIP, oneAPI, or Metal [365]; the minimum is 8 GB of memory and a GPU with 2 GB and OpenGL 4.3 [366]. The `bpy` package runs Blender as a Python module for headless jobs [367]. The web path is glTF in model-viewer, Apache-2.0 [368], or three.js, MIT, which the app already ships [369] | Static: rendered PNG; interactive: glTF in model-viewer or three.js |

Sources, read 2026-09-21:

348. ParaView, license: <https://www.paraview.org/license/>
349. ParaView guide, saving results: <https://docs.paraview.org/en/latest/UsersGuide/savingResults.html>
350. VTK, XML file formats: <https://docs.vtk.org/en/latest/vtk_file_formats/vtkxml_file_format.html>
351. ParaView, features: <https://www.paraview.org/features/>
352. vtk.js repository: <https://github.com/Kitware/vtk-js>
353. ParaView Glance repository: <https://github.com/Kitware/glance>
354. ParaViewWeb repository: <https://github.com/Kitware/paraviewweb>
355. trame: <https://kitware.github.io/trame/>
356. ParaView 6.1 downloads: <https://www.paraview.org/files/v6.1/>
357. VisIt, about: <https://visit-dav.github.io/visit-website/about/>
358. VisIt: <https://visit-dav.github.io/visit-website/>
359. VisIt manual, session files: <https://visit-sphinx-github-user-manual.readthedocs.io/en/3.4rc/using_visit/SavingPrinting/Session_files.html>
360. VisIt manual, saving the window: <https://visit-sphinx-github-user-manual.readthedocs.io/en/3.4rc/using_visit/SavingPrinting/Saving_the_visualization_window.html>
361. VisIt repository: <https://github.com/visit-dav/visit>
362. Blender, license: <https://www.blender.org/about/license/>
363. Blender manual, import and export: <https://docs.blender.org/manual/en/latest/files/import_export/index.html>
364. Blender manual, glTF 2.0: <https://docs.blender.org/manual/en/latest/addons/scene_gltf2.html>
365. Blender manual, GPU rendering: <https://docs.blender.org/manual/en/latest/render/cycles/gpu_rendering.html>
366. Blender, requirements: <https://www.blender.org/download/requirements/>
367. bpy on PyPI: <https://pypi.org/project/bpy/>
368. model-viewer repository: <https://github.com/google/model-viewer>
369. three.js repository: <https://github.com/mrdoob/three.js>

### Across the sciences

Added because the forty suite tools run on Python, and many rows here name a Python parser or port. The notebook design belongs to `learning/research-os/WORKBENCH.md`.

| Tool | License | Renders | Main formats | Path | How it connects | Research OS shows |
|---|---|---|---|---|---|---|
| Jupyter and the Python stack | Jupyter under the modified BSD license [370]; JupyterLite BSD-3-Clause [371]; Pyodide MPL-2.0 [372]; NumPy and SciPy BSD-3-Clause [373][374]; Matplotlib under its own PSF-based license [375] | Notebooks of code, Markdown, math, and outputs; Matplotlib's 2D plots | `.ipynb`, a JSON document in nbformat 4, with cell ids since 4.5 [376] | browser, runner | Pyodide 314.0.7 ships numpy, scipy, pandas, matplotlib, scikit-learn, statsmodels, networkx, and scikit-image [61]. micropip installs pure-Python wheels from PyPI, and a package with compiled extensions needs a Pyodide build [377][378]. JupyterLite runs JupyterLab in the browser on Pyodide, v0.8.3 on 2026-08-20 [371]. A runner hosts a native kernel for everything else | Static: the notebook as HTML through nbconvert; interactive: the Pyodide worker, or JupyterLite |

Sources, read 2026-09-21:

370. Project Jupyter, about: <https://jupyter.org/about>
371. JupyterLite repository: <https://github.com/jupyterlite/jupyterlite>
372. Pyodide repository: <https://github.com/pyodide/pyodide>
373. NumPy repository: <https://github.com/numpy/numpy>
374. SciPy repository: <https://github.com/scipy/scipy>
375. Matplotlib, license: <https://matplotlib.org/stable/project/license.html>
376. nbformat, format description: <https://nbformat.readthedocs.io/en/latest/format_description.html>
377. Pyodide, loading packages: <https://pyodide.org/en/stable/usage/loading-packages.html>
378. Pyodide, FAQ: <https://pyodide.org/en/stable/usage/faq.html>

### Viewers and runtimes for the page

The pieces an import or a browser path embeds. Every one runs in the page, and each serves several rows above. "Maintained" follows the rule of the four paths: a release or a commit after 2025-09-21.

| Viewer or runtime | License | Reads | Latest release | Maintained | Serves the rows |
|---|---|---|---|---|---|
| Mol* | MIT [379] | mmCIF, BinaryCIF, PDB, GRO, MOL, MOL2, SDF, XYZ; DCD, NetCDF, TRR, and XTC trajectories; CCP4, MRC, cube, and DX volumes [380] | v5.11.0, 2026-07-19 [379] | yes | PyMOL, ChimeraX, GROMACS, Avogadro 2, LAMMPS, and the suite's TrajMine |
| 3Dmol.js | BSD-3-Clause [381] | PDB, SDF, MOL2, XYZ, CIF, MMTF, GRO, PQR, cube, VASP [381] | 2.5.5, 2026-05-22 [381] | yes | Avogadro 2, RDKit |
| NGL Viewer | MIT [382] | mmCIF, PDB, PQR, GRO, SDF, MOL2, MMTF; density maps; DCD, NetCDF, TRR, and XTC trajectories [382] | npm 2.5.0, 2026-09-03 [383] | yes | GROMACS |
| JSmol | LGPL-2.1-or-later [384] | MOL, SDF, CIF, PDB, and the output of Gaussian, GAMESS, MOPAC, NWChem, and other quantum chemistry codes [385] | 16.4, 2026-08-27 [386] | yes | Gaussian |
| RDKit.js | BSD-3-Clause [60] | SMILES, MOL, SDF; draws SVG [59] | npm 2026.3.6, 2026-09-13 [60] | yes | RDKit, and the suite's ScreenServer inputs |
| igv.js | MIT [126] | BAM, CRAM, VCF, BED, bigWig, GFF3, and other track formats [125] | v3.8.7, 2026-09-09 [126] | yes | IGV and Bioconductor, with the suite's ChromatinAccess and gRNA-Optimizer |
| Viv and Vizarr | MIT [119][120] | OME-TIFF and OME-Zarr [119][120] | Viv npm 0.22.1, 2026-08-10 [387] | yes | Fiji and ImageJ, and the suite's CellSegTrack |
| Neurosift | Apache-2.0 [138] | NWB files on DANDI and other archives [138] | no recent tag; last commit 2026-09-16 [138] | yes, by commit | NWB, and the suite's PatchSeqML |
| JSROOT | MIT [144] | `.root` files over HTTP and ROOT JSON [144] | 7.11.1, 2026-07-27 [144] | yes | ROOT, Geant4 |
| Aladin Lite | LGPL-3.0-or-later [185] | HiPS surveys, FITS images, catalogs [185] | v3.8.1, 2026-03-05 [185] | yes | Astropy, SAOImageDS9 |
| geotiff.js | MIT [200] | GeoTIFF and cloud-optimized GeoTIFF [200] | v3.1.0-beta.0, 2026-03-30 [200] | yes | GDAL, QGIS, Google Earth Engine exports |
| vtk.js | BSD-3-Clause [352] | VTK XML image and polygon data, legacy polygon data, STL, PLY, OBJ, glTF [352] | v37.1.0, 2026-09-18 [352] | yes | ParaView, VisIt, FEniCS, OpenFOAM, Ansys, Abaqus |
| model-viewer | Apache-2.0 [368] | glTF and GLB only [368] | v4.3.1, 2026-06-04 [368] | yes | Blender, ChimeraX, PyMOL, COMSOL, SolidWorks, Onshape, KiCad |
| three.js | MIT [369] | glTF, STL, OBJ, 3MF, PLY, VTK, and other formats through its loaders [369] | r186, 2026-09-08 [369] | yes; already in `package.json` | Every mesh row |
| Online3DViewer | MIT [231] | STEP, IGES, BREP, FCStd, IFC, glTF, STL, OBJ, 3MF, and more, with STEP through occt-import-js [231] | 0.18.0, 2025-12-18; last commit 2026-06-24 [231] | yes | FreeCAD, SolidWorks, Onshape |
| KiCanvas | MIT [246] | `.kicad_sch` and `.kicad_pcb` from KiCad 6 on [246] | no releases; last commit 2026-04-28 [246] | yes, early alpha | KiCad |
| CETEIcean | BSD-2-Clause [336] | TEI XML, rendered as custom elements [336] | v1.9.5, 2025-08-29; last commit 2026-09-08 [336] | yes, by commit | TEI, Transkribus TEI exports |
| citeproc-js | CPAL-1.0-or-later or AGPL-3.0-or-later [388] | CSL JSON with CSL styles [388] | npm 2.4.63, 2023-04-17; last commit 2026-07-05 [388] | yes, by commit | Zotero; its license needs a decision before it ships in the bundle |
| webR | MIT for its scripts and console, GPL-3 for the binaries that contain R [274] | R code and 22,741 WebAssembly packages for R 4.6 [109] | v0.6.0, 2026-05-19 [274] | yes | R, SPSS, Stata, SAS, through haven |
| Pyodide | MPL-2.0 [372] | Python 3.14 with the packages its list names [61] | 314.0.7, 2026-09-14 [372] | yes | Twenty-five suite tools, Astropy, Biopython, netCDF and xarray, Jupyter and the Python stack |

Sources, read 2026-09-21:

379. Mol* repository: <https://github.com/molstar/molstar>
380. Mol*, file formats: <https://molstar.org/docs/plugin/file-formats/>
381. 3Dmol.js repository: <https://github.com/3dmol/3Dmol.js>
382. NGL Viewer repository: <https://github.com/nglviewer/ngl>
383. ngl on the npm registry: <https://registry.npmjs.org/ngl>
384. Jmol-SwingJS repository: <https://github.com/BobHanson/Jmol-SwingJS>
385. Jmol: <https://jmol.sourceforge.net/>
386. Jmol releases on SourceForge: <https://sourceforge.net/projects/jmol/files/Jmol/>
387. @hms-dbmi/viv on the npm registry: <https://registry.npmjs.org/@hms-dbmi/viv>
388. citeproc-js repository: <https://github.com/Juris-M/citeproc-js>

## The research tools suite

`src/app/research/tools/` holds forty tool pages beside the directory page `page.tsx` and `_shared/`, which holds the run hooks. `src/lib/tools.ts` registers the same forty with a blurb, a class, a status, and a hosting label. Checked 2026-09-21 at `b36c160ab`.

**How they run.** Every page computes on a server. The client posts to its same-origin proxy `/api/research/<tool>`, which forwards to `TOOLS_GATEWAY_URL` (default `https://research-tools.agfarms.dev`) and polls for the job. Thirty-nine clients use `useToolRun` from `_shared/runner.tsx`; LabBrain's client writes the same submit and poll by hand. No page computes in the browser, and none draws a chart: results render as React tables and text from JSON, and five tools return a self-contained HTML report that the page shows in a sandboxed iframe (ProteinScout, ScreenServer, PatchSeqML, TrajMine, CryoTriage).

**What sits behind the gateway.** `services/research-tools/gateway.py` is one FastAPI process with a job table. Thirty-three tools are Python modules in `services/research-tools/` that the gateway calls in a worker thread. Seven run as subprocesses of scripts outside this repository: six in `gianyrox/biophysics-phd-review` (LabBrain, ProteinScout, StabilityDesigner, PatchSeqML, TrajMine, CryoTriage) and ScreenServer in `gianyrox/screenserver`. TrajMine and CryoTriage are in the gateway's `DEMO_TOOLS`: TrajMine runs its bundled demo trajectory, and CryoTriage runs a synthetic session unless a micrograph is uploaded. The registry labels LabBrain "founder GPU", along with the two demo tools: a machine reached over a tunnel to the founder's laptop. The other thirty-seven are "always-on". Two tools have an optional step through `llm_client.py`, an OpenAI-compatible client that defaults to a local Ollama model and falls back to the rule-based output when no endpoint is set (ProtocolGPT, QuantumBioRAG).

**What is a stub.** No tool is a stub on the compute side. The stub is the "publish to canon" button on every page: `PublishToCanon` in `_shared/runner.tsx` waits 400 ms and prints a notice, with the call to a publish endpoint commented out.

**What answers today.** Nothing. On 2026-09-21 `research-tools.agfarms.dev` resolved to 5.161.236.151, the host `CLAUDE.md` records as unreachable since at least 2026-09-14, and `GET /health` timed out after 45 s. The live site's proxy, `GET https://www.bucket.foundation/api/research/seqalign?job=x`, returned 504 with Vercel's `FUNCTION_INVOCATION_TIMEOUT`. The directory page `/research/tools` answered 200, so a visitor sees forty tools and every run fails.

**What runs locally.** The suite's own tests pass: `python3 -m pytest tests` in `services/research-tools/` ran 245 tests in 4.1 s on CPython.

**What runs in the browser.** Twenty-five tools import only packages that Pyodide 314.0.7 ships (numpy, scipy, networkx, scikit-image, or the standard library) and make no network call. `services/research-tools/pyodide/` holds a check for them: `baseline.py` builds each tool's payload through the gateway's own submit handler and records the CPython result, and `check.mjs` loads Pyodide under Node and runs the same payloads, comparing results at six significant digits. On 2026-09-21 all twenty-five ran, and twenty-four matched the CPython result at that precision. RNA-FM-Embeds differed in one field, `mfe_per_nt_kcal_mol`, because ViennaRNA is absent from Pyodide and the tool drops the folding energy without it. The download is the cost: Pyodide's core is 13.4 MB (`pyodide.asm.wasm` 9.6 MB, `python_stdlib.zip` 2.5 MB, `pyodide.asm.mjs` 1.3 MB), numpy with scipy and networkx adds 18.1 MB, and the full set with scikit-image and its dependencies is 20 wheels and 39.9 MB. The check ran under Node 22; a run inside a browser page is still owed.

The other fifteen stay on a server. Seven call OpenAlex or read the local research-atlas grant corpus (PaperRadar, GrantDraft, MethodsMatcher, ReviewGuard, QuantumBioRAG, CitationGraph, ToxinChannelFinder). RNAStructure needs ViennaRNA for a real fold and returns a degraded result without it. The seven subprocess tools need their sibling repositories and trained models, plus packages Pyodide 314.0.7 lacks, such as RDKit for ScreenServer and MDTraj for TrajMine.

In the tables, "Pyodide: same" means the tool ran in the check with the CPython result, and "server" names what keeps it there. "Atlas rows" names the atlas rows whose files or methods the tool meets.

### Suite: literature and research practice

Eleven tools.

| Tool | What it does | Runs | Pyodide | Atlas rows |
|---|---|---|---|---|
| LabBrain | Answers questions over one investigator's OpenAlex works with dense and BM25 retrieval, citing passages | subprocess, `labbrain/labbrain.py`; founder GPU | server: sentence-transformers, OpenAlex | Zotero |
| PaperRadar | Ranks recent OpenAlex papers for a topic by relevance and recency, weighted by citation velocity | `tools_rag.py`, live OpenAlex with a disk cache | server: OpenAlex | Zotero |
| GrantDraft | Finds funders and drafts specific aims from NSF awards in the research-atlas corpus, with an OpenAlex fallback | `tools_rag.py` | server: local corpus | none |
| MethodsMatcher | Mines recurring methods in OpenAlex results and points to the Bucket tool that runs one | `tools_rag.py` | server: OpenAlex | every row |
| ReviewGuard | Sorts OpenAlex papers into supporting and contradicting evidence for a claim | `tools_rag.py` | server: OpenAlex | Zotero |
| QuantumBioRAG | Scores how far OpenAlex papers support a quantum-biology claim; optional model synthesis | `tools_rag.py` | server: OpenAlex | Zotero |
| CitationGraph | Builds a paper's citation neighborhood from OpenAlex and ranks it by degree | `tools_citation.py` | server: OpenAlex | Zotero |
| FigureMiner | Mines figure captions, table captions, reported statistics, and unit-bearing measurements from pasted text or a PDF text layer | `tools_figure.py`; PyMuPDF or pypdf for PDF input | same, for pasted text | Zotero, R |
| FAIRCheck | Scores a dataset record against the 15 FAIR sub-principles | `tools_fair.py`, standard library | same | every import format |
| RepliCheck | Recomputes reported p-values and runs the GRIM test on a Results section | `tools_repli.py`, scipy | same | R, SPSS, Stata |
| MLReproCard | Scores an ML experiment's reproducibility and fills a model card | `tools_mlrepro.py`, standard library | same | Jupyter and Python |

### Suite: molecular biology

Ten tools.

| Tool | What it does | Runs | Pyodide | Atlas rows |
|---|---|---|---|---|
| StabilityDesigner | Predicts the stability change of point mutations with a scikit-learn tree ensemble trained on FireProtDB | subprocess, `stabilitydesigner/` | server: trained model | PyMOL, ChimeraX |
| ProteinScout | Per-residue scales and small ML models from a sequence or UniProt accession, as an HTML report | subprocess, `proteinscout/` | server: trained models | Biopython |
| AggregatePredict | Windowed aggregation propensity from β-sheet propensity and hydrophobicity, less net charge | `tools_genomics.py`, numpy | same | Biopython |
| SeqAlign | Needleman-Wunsch and Smith-Waterman alignment with BLOSUM62 | `tools_seqalign.py`, standard library | same | BLAST, Biopython |
| RNAStructure | Minimum free energy structure and base-pair probabilities through ViennaRNA | `tools_dnarna.py` | server: ViennaRNA | none |
| gRNA-Optimizer | SpCas9 guide design: PAM scan on both strands, on-target score, seed off-target flag | `tools_dnarna.py`, numpy | same | IGV, Bioconductor |
| RNA-FM-Embeds | RNA embedding from RNA-FM weights when installed, k-mer and structure features otherwise | `tools_dnarna.py` | same except the folding energy | Jupyter and Python |
| ChromatinAccess | Accessibility score from GC content and CpG islands, with a scan for four core promoter motifs | `tools_genomics.py`, numpy | same | IGV, Bioconductor |
| ToxinChannelFinder | Maps a toxin or peptide to likely ion-channel targets from a curated table and OpenAlex co-occurrence | `tools_toxin.py` | server: OpenAlex | none |
| ProtocolGPT | Turns methods prose into ordered steps and a reagent table by rules, flagging safety hazards; optional model polish | `tools_protocol.py` | same, rules path | none |

### Suite: chemistry and materials

Three tools.

| Tool | What it does | Runs | Pyodide | Atlas rows |
|---|---|---|---|---|
| ScreenServer | Predicts 13 ADMET endpoints for up to 200 SMILES after RDKit standardization, as an HTML report | subprocess, `gianyrox/screenserver` | server: RDKit, trained models | RDKit, Open Babel |
| StoichBalance | Balances a chemical equation by exact null-space elimination and finds the limiting reagent | `tools_stoich.py`, standard library | same | none |
| MaterialsFeaturizer | Magpie-style composition descriptors from a formula | `tools_materials.py`, standard library | same | none |

### Suite: structural biology and simulation

Two tools, both in demo mode.

| Tool | What it does | Runs | Pyodide | Atlas rows |
|---|---|---|---|---|
| TrajMine | RMSD, RMSF, PCA, and Markov state models from a molecular dynamics trajectory; the gateway runs the demo trajectory | subprocess, `trajmine/trajmine.py demo-md`; founder GPU | server: MDTraj, deeptime | GROMACS, Mol* |
| CryoTriage | Micrograph quality control: CTF fit, drift, ice, contamination; synthetic unless a file is uploaded | subprocess, `cryotriage/`; founder GPU | server: trained models | none |

### Suite: neuroscience

Five tools.

| Tool | What it does | Runs | Pyodide | Atlas rows |
|---|---|---|---|---|
| PatchSeqML | Detects action potentials, extracts eFEL features, builds an F-I curve, and classifies the firing type, from ABF or NWB sweeps or a simulated cell | subprocess, `patchseqml/` | server: sibling repository | NWB, NEURON |
| HH-FitML | Fits passive membrane parameters to a current-clamp trace by least squares | `tools_neuro.py`, scipy | same | NEURON |
| SpikeFeatures | Detects spikes and extracts waveform features; spikeinterface when installed | `tools_neuro.py`, scipy | same | NWB |
| ChannelDwell | Idealizes a single-channel record into open and closed states with dwell times | `tools_genomics.py`, numpy | same | NWB |
| CalciumTraceML | ΔF/F over a rolling baseline, transient detection, decay fits, and firing-rate statistics from a fluorescence trace | `tools_imaging.py`, scipy | same | Fiji, NWB |

### Suite: imaging and mechanobiology

Three tools.

| Tool | What it does | Runs | Pyodide | Atlas rows |
|---|---|---|---|---|
| CellSegTrack | Otsu threshold and seeded watershed segmentation, Cellpose when installed | `tools_imaging.py`, scipy and scikit-image | same, watershed path | Fiji |
| AFM-CurveML | Finds the contact point of a force curve and fits a Hertz or Sneddon modulus, with adhesion from the retract minimum | `tools_imaging.py`, scipy | same | none |
| TractionForceML | Block-matching displacement field between a relaxed and a deformed bead image | `tools_imaging.py`, scipy | same | Fiji |

### Suite: quantitative methods

Six tools.

| Tool | What it does | Runs | Pyodide | Atlas rows |
|---|---|---|---|---|
| UnitDimCheck | Converts units by their SI base dimensions and checks an equation for dimensional homogeneity | `tools_units.py`, standard library | same | MATLAB, COMSOL |
| GeoSummary | Descriptives, Mann-Kendall and Theil-Sen trend, seasonality, and spatial extent of a series | `tools_geo.py`, scipy | same | QGIS, GDAL, NetCDF and xarray |
| TimeSeriesForecast | Holt-Winters decomposition and forecast with a holdout backtest against a naive baseline | `tools_forecast.py`, numpy and scipy | same | R, Stata |
| PowerPlan | Power and sample size for t tests, ANOVA, two proportions, and correlation | `tools_power.py`, scipy | same | R, SPSS, Stata |
| SurvivalFit | Kaplan-Meier estimates with Greenwood errors and the log-rank test | `tools_survival.py`, scipy | same | R, SAS, Stata |
| CausalDesigner | Finds a minimal adjustment set from a causal graph's backdoor paths and recommends an estimator | `tools_causal.py`, networkx | same | R, Stata |

**What the suite tells the workbench.** The suite is Research OS's first set of computations, and all forty sit behind one host that is down. Twenty-five of them already run in Pyodide with the gateway's own inputs, so a browser path would keep them working while the host is down, at the cost of a 13 to 53 MB first load. The three "founder GPU" tools are a runner in all but name: a registered machine reached over a tunnel, offline when the laptop closes. The seven subprocess tools live in two repositories outside this one, and a runner that installs them from their own repositories is the path that keeps them.

## Unverified

Claims the rows mark in place:

- PARI/GP's script file extension.
- A WebAssembly package repository run by Bioconductor: webr.bioconductor.org did not answer on 2026-09-21.
- Whether any parser reads Stata `.dta` versions 120 and 121, the ones Stata 18 and 19 write for alias variables.
- Abaqus licensing in current releases; the source is the 6.12 guide of 2012, and current documentation sits behind a sign-in.
- ChimeraX rendering without a display, which the runner path assumes.
- The suite tools inside a browser page: the Pyodide check ran under Node 22 on the same WebAssembly a page loads; a page run is still owed.

Pages that refused scripted access on 2026-09-21 and were read another way: the NCBI Bookshelf manual for BLAST+ answered with a CAPTCHA, so the `-outfmt` list comes from the 2.17.0 source; lumivero.com answered with a bot check, so the NVivo row cites Lumivero's help site; MathWorks and IBM pages refuse `curl` and were read through a browser fetch and the PDF manual; Voyant's public host answered 502 and JS9's host refused connections, so those rows rest on their repositories.

## Directions for the workbench

The order in which Research OS builds the four paths, for ros-workbench 1 to fold into `learning/research-os/WORKBENCH.md`. Reach is the atlas rows and suite tools a path serves. Cost is the work, with what a person downloads or installs. License is what the tools let Research OS embed or run.

From the path index: import is the first path for 25 of the 64 rows and a path for 43; runner is first for 17 and a path for 39; browser is first for 16 and a path for 21; link is first for 6 and sits under every row.

1. **link, for every row.** An import or a production carries a software citation: the tool, its version, its license, and a URL, with the output file attached when there is one. The cost is one structured field on the typed import of ros-import 1 and one line in the production form. It reaches all 64 rows, closed tools included, and needs no license from anyone. Six rows start here, Mathematica, ChimeraX, SAOImageDS9, Earth Engine, Onshape, and Voyant Tools, because each lives on a desktop the person runs or on a hosted service; their exports come in through the import path where they exist.
2. **browser, one Pyodide worker, then webR.** Twenty-five of the forty suite tools ran in Pyodide 314.0.7 on 2026-09-21 with the gateway's own inputs. Twenty-four gave the CPython answer, and the twenty-fifth dropped one field that needs ViennaRNA. The host that serves all forty did not answer that day, and one worker keeps those twenty-five working whatever that host does. The same worker carries ros-workbench 3's statistics on imported tables, since pandas, statsmodels, scikit-learn, and matplotlib ship in Pyodide 314.0.7, and pandas in the worker read a Stata file in a check on 2026-09-21. The cost is the worker with its loader, and a first load of 13.4 MB for the core alone and 53.3 MB with every package the twenty-five import. Pyodide is MPL-2.0, and numpy, scipy, networkx, and scikit-image are under BSD licenses. webR is the second worker: R in the page, with 22,741 packages for R 4.6, haven among them, which reads all four statistics formats in the atlas. The sixteen rows whose first path is browser follow the same pattern with their own ports, RDKit.js, igv.js, GAP's own build, and the OpenSCAD Playground among them.
3. **import, one format and one viewer at a time.** Closed tools meet the web through their export formats: 25 rows take import as their first path, fourteen of them closed tools. Each format costs a parser with a node shape in the graph, and a viewer embedded under its own license. Once ros-import 3 lands tables, the order follows reach:
   - statistics files, `.sav`, `.dta`, `.sas7bdat`, and `.xpt`, through pandas in the Pyodide worker and haven in webR, for the SPSS, PSPP, Stata, and SAS rows;
   - meshes and scenes through model-viewer, which serves seven rows, and vtk.js, which serves six, with Online3DViewer for STEP;
   - molecules through Mol*, for five rows and the suite's TrajMine;
   - `.qdpx` projects through one REFI-QDA parser, for the NVivo, ATLAS.ti, MAXQDA, and QualCoder rows;
   - then Zotero's CSL JSON, which meets the 178 literature cards already in the graph, and the formats with one or two rows behind them: FITS, `.root`, `.nwb`, TEI, BAM, and VCF.

   Every viewer in the table of viewers and runtimes is under an MIT, BSD, Apache-2.0, or LGPL license except citeproc-js, whose CPAL or AGPL terms need a decision before it ships in the bundle. The two runtimes are Pyodide, MPL-2.0, and webR, whose R binaries are GPL-3.
4. **runner, Lean first.** Seventeen rows take the runner first, and it is the only path for heavy open codes and for closed tools under the person's own license on the person's own machine. Lean goes first because the repository already builds two Lean projects and `lake env lean --json` already reports each message as a line of JSON, so the first job, `lean-check`, has known answers to test against. A paper's Lean check is also a rule in `papers/PAPER-STANDARDS.md` that nothing outside the author's machine enforces. LaTeX builds and the seven subprocess suite tools come next, three of which the registry already places on the founder's laptop. The heavy simulation codes follow: GROMACS on a GPU, OpenFOAM over MPI, LAMMPS, and Geant4.
