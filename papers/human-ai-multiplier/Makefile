PAPER   := main
PYTHON  := python3
TEX     := pdflatex -interaction=nonstopmode -halt-on-error

.PHONY: pdf figures lean lint clean

pdf:
	$(TEX) $(PAPER).tex
	biber $(PAPER)
	$(TEX) $(PAPER).tex
	$(TEX) $(PAPER).tex

figures:
	cd figures && $(PYTHON) fig_timeline.py && $(PYTHON) fig_scores.py

lean:
	cd lean && lake build

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
	rm -f figures/fig_timeline.pdf figures/fig_scores.pdf
	rm -rf lean/.lake
