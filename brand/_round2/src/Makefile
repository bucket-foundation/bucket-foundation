PY ?= python3
PORT ?= 8777
BRAND := $(abspath ../..)

.PHONY: round2 round2-check thumbs serve

round2:
	$(PY) g2marks.py
	$(PY) g2pages.py
	$(PY) deck.py
	$(PY) sync.py

round2-check:
	$(PY) check.py

thumbs:
	$(PY) check.py --thumbs

serve:
	$(PY) -m http.server --directory $(BRAND) $(PORT)
