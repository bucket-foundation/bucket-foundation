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
	cd figures && for f in fig_timeline fig_scores fig_prereq_chart fig_knowledge_region fig_mastery fig_protocol_region fig_validation; do $(PYTHON) $$f.py; done

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
	rm -f figures/*.pdf figures/*.png
	rm -rf lean/.lake
