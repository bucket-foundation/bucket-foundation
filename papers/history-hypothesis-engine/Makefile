# papers/history-hypothesis-engine/Makefile: copied from papers/template/,
# see PAPER-STANDARDS.md for the rules this file follows.
#
# latexmk is not installed in this environment (PAPER-STANDARDS.md,
# "Toolchain notes"), so `pdf` runs the pdflatex/biber/pdflatex/pdflatex
# sequence by hand: one pass to write the .bcf, biber to resolve citations
# from it, then two more passes so cross-references (\Cref) and the
# bibliography both settle.
#
# Unlike the template, `pdf` does not depend on `figures`: every fig_*.pdf
# under figures/ is already built and committed (seven figures, generated
# by their own fig_*.py scripts and reviewed against figures/CAPTIONS.md).
# `make figures` stays available to rebuild them by hand, via
# figures/build_all.py, which runs every fig_*.py in that directory and
# reports the file sizes it wrote.
#
# `pdf` does depend on `lean-snapshot`: lean/Bucket/*.lean is written in
# parallel by a companion pass and is genuine Lean 4 source, Unicode
# operators throughout, which plain pdflatex plus listings (no
# listingsutf8, no Unicode math font on this machine) cannot
# \lstinputlisting directly; make_lean_snapshots.py copies whatever Lean
# files exist into lean-snapshots/ as ASCII-safe transliterations first,
# so main.tex's \bucketlean macro always has a byte-safe target to test
# with \IfFileExists, real listing or pending note, on every run.

PAPER   := main
PYTHON  := python3

.PHONY: pdf figures lean lean-snapshot lint clean

pdf: lean-snapshot
	pdflatex -interaction=nonstopmode -halt-on-error $(PAPER).tex
	biber $(PAPER)
	pdflatex -interaction=nonstopmode -halt-on-error $(PAPER).tex
	pdflatex -interaction=nonstopmode -halt-on-error $(PAPER).tex

figures:
	$(PYTHON) figures/build_all.py

lean-snapshot:
	$(PYTHON) make_lean_snapshots.py

lean:
	cd lean && lake build

lint:
	@# agf-lint-voice only recognizes .md/.mdx/.txt/.rst (see agf-lint-voice's
	@# TEXT_EXTS), and its .voiceallow lookup walks upward from the linted
	@# file's own directory to $$HOME, so the copy has to land inside this
	@# repo (papers/history-hypothesis-engine/), not /tmp, or it never sees
	@# bucket-foundation's .voiceallow and legitimate field terms misreport
	@# as violations.
	@tmp=.lint-tmp.md; \
	cp $(PAPER).tex "$$tmp"; \
	status=0; \
	agf-lint-voice check "$$tmp" || status=$$?; \
	rm -f "$$tmp"; \
	exit $$status

clean:
	rm -f $(PAPER).aux $(PAPER).bbl $(PAPER).bcf $(PAPER).blg $(PAPER).log \
	      $(PAPER).out $(PAPER).run.xml $(PAPER).synctex.gz $(PAPER).toc \
	      $(PAPER).pdf
	rm -rf lean/.lake lean-snapshots
