# Makefile: generated campaign-report paper, copied from
# papers/template/Makefile (see papers/PAPER-STANDARDS.md). Only PAPER and
# the figures target's script list differ from the template's own file.

PAPER   := main
PYTHON  := python3

.PHONY: pdf figures lint clean

pdf: figures
	pdflatex -interaction=nonstopmode -halt-on-error $(PAPER).tex
	biber $(PAPER)
	pdflatex -interaction=nonstopmode -halt-on-error $(PAPER).tex
	pdflatex -interaction=nonstopmode -halt-on-error $(PAPER).tex

figures:
	$(PYTHON) figures/fig_opinion_histogram.py
	$(PYTHON) figures/fig_bin_topk.py
	$(PYTHON) figures/fig_calibration_curve.py

lint:
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
	rm -f figures/*.png
