PAPER   := main
PYTHON  := python3
TEX     := pdflatex -interaction=nonstopmode -halt-on-error

.PHONY: pdf data figures lean lint clean

pdf:
	$(TEX) $(PAPER).tex
	biber $(PAPER)
	$(TEX) $(PAPER).tex
	$(TEX) $(PAPER).tex

data:
	cd ../.. && npx ts-node --compiler-options '{"module":"commonjs","resolveJsonModule":true}' scripts/build-solvability-frontier-report.ts

figures:
	cd figures && $(PYTHON) fig_frontier.py && $(PYTHON) fig_backtest.py && $(PYTHON) fig_classes.py && $(PYTHON) tables.py

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
	rm -rf lean/.lake
