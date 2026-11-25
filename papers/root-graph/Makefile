PAPER   := main
PYTHON  := python3
RUN     := systemd-run --user --scope -q -p MemoryMax=20G env OMP_NUM_THREADS=4
RAW     := ../../_intake/kaikki-raw/raw-wiktextract-data.jsonl.gz
GRAPH   := ../../_intake/root-graph/graph.sqlite

.PHONY: pdf figures data graph lean lint clean

pdf: figures
	pdflatex -interaction=nonstopmode -halt-on-error $(PAPER).tex
	biber $(PAPER)
	pdflatex -interaction=nonstopmode -halt-on-error $(PAPER).tex
	pdflatex -interaction=nonstopmode -halt-on-error $(PAPER).tex

graph:
	$(RUN) $(PYTHON) scripts/build_graph.py $(RAW) $(GRAPH)

data:
	$(RUN) $(PYTHON) scripts/stats.py
	$(RUN) $(PYTHON) scripts/tests.py

figures:
	$(PYTHON) figures/make_figures.py

lean:
	cd ../../lean && LEAN_NUM_THREADS=4 systemd-run --user --scope -q -p MemoryMax=8G lake build BucketMath.Etymology.Forest

lint:
	@tmp=.lint-tmp.md; \
	cp $(PAPER).tex "$$tmp"; \
	status=0; \
	agf-lint-voice check "$$tmp" || status=$$?; \
	rm -f "$$tmp"; \
	exit $$status

clean:
	rm -f $(PAPER).aux $(PAPER).bbl $(PAPER).bcf $(PAPER).blg $(PAPER).log $(PAPER).out $(PAPER).run.xml $(PAPER).toc
