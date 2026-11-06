
PAPER   := main
PYTHON  := python3
EMB     ?= $(HOME)/agfarms/data/polingual-embeddings/v1
TOOLS   := ../tools

.PHONY: pdf figures lean lint test clean

pdf: figures
	pdflatex -interaction=nonstopmode -halt-on-error $(PAPER).tex
	biber $(PAPER)
	pdflatex -interaction=nonstopmode -halt-on-error $(PAPER).tex
	pdflatex -interaction=nonstopmode -halt-on-error $(PAPER).tex

figures:
	@if [ -d "$(EMB)" ]; then \
	  $(PYTHON) $(TOOLS)/langgraph.py derive --root "$(EMB)" --out data/langgraph.json && \
	  $(PYTHON) $(TOOLS)/langgraph.py neighbors --root "$(EMB)" --lang en --word right --out data/neighbors_en_right.json; \
	else echo "$(EMB) not found, drawing from committed data/langgraph.json"; fi
	$(PYTHON) figures/build.py

lean:
	cd lean && lake build

lint:
	@tmp=.lint-tmp.md; \
	cp $(PAPER).tex "$$tmp"; \
	status=0; \
	agf-lint-voice check "$$tmp" || status=$$?; \
	rm -f "$$tmp"; \
	exit $$status

test:
	$(PYTHON) -m pytest -q $(TOOLS)/test_langgraph.py $(TOOLS)/test_zenodo_mint.py

clean:
	rm -f $(PAPER).aux $(PAPER).bbl $(PAPER).bcf $(PAPER).blg $(PAPER).log \
	      $(PAPER).out $(PAPER).run.xml $(PAPER).synctex.gz $(PAPER).toc \
	      $(PAPER).pdf
	rm -f figures/*.png tables/*.tex
	rm -rf lean/.lake
