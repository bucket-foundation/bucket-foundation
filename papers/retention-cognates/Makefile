PAPER   := main
PYTHON  := python3

.PHONY: pdf figures data analysis polingual lean lint clean

pdf: figures
	pdflatex -interaction=nonstopmode -halt-on-error $(PAPER).tex
	biber $(PAPER)
	pdflatex -interaction=nonstopmode -halt-on-error $(PAPER).tex
	pdflatex -interaction=nonstopmode -halt-on-error $(PAPER).tex

figures:
	$(PYTHON) figures/fig_results.py

data:
	bash scripts/download.sh

analysis: data
	$(PYTHON) scripts/features.py
	$(PYTHON) scripts/hlr.py
	$(PYTHON) scripts/tests.py

polingual:
	bash scripts/polingual_size.sh

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
	      $(PAPER).out $(PAPER).run.xml $(PAPER).synctex.gz $(PAPER).toc
	rm -f figures/*.png
	rm -rf lean/.lake
