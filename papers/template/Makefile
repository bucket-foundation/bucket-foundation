# papers/template/Makefile: reference build for every Bucket paper.
#
# latexmk is not installed in this environment (see PAPER-STANDARDS.md,
# "Toolchain notes"), so `pdf` runs the pdflatex/biber/pdflatex/pdflatex
# sequence by hand: one pass to write the .bcf, biber to resolve citations
# from it, then two more passes so cross-references (\Cref) and the
# bibliography both settle. Copy this file as-is into a new paper's
# directory; only PAPER and the bib inputs change.

PAPER   := main
PYTHON  := python3

.PHONY: pdf figures lean lint clean

pdf: figures
	pdflatex -interaction=nonstopmode -halt-on-error $(PAPER).tex
	biber $(PAPER)
	pdflatex -interaction=nonstopmode -halt-on-error $(PAPER).tex
	pdflatex -interaction=nonstopmode -halt-on-error $(PAPER).tex

figures:
	$(PYTHON) figures/fig_example.py

lean:
	cd lean && lake build

lint:
	@# agf-lint-voice only recognizes .md/.mdx/.txt/.rst (see agf-lint-voice's
	@# TEXT_EXTS), and its .voiceallow lookup walks upward from the linted
	@# file's own directory to $$HOME, so the copy has to land inside this
	@# repo (papers/template/), not /tmp, or it never sees bucket-foundation's
	@# .voiceallow and legitimate field terms misreport as violations.
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
	rm -f figures/fig_example.png
	rm -rf lean/.lake
