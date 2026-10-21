PY ?= python3
BLENDER ?= blender
PORT ?= 8777
DIRS := $(abspath ..)
BRAND := $(abspath ../..)
VIDEO_IDS := d1 d2 d3 d4 d5 d6 d7

.PHONY: all marks pages screens mm video thumbs check index serve render3d round2 round2-check

all: marks pages mm index thumbs check

marks:
	$(PY) build2.py

pages: marks
	$(PY) gen_pages.py
	$(PY) game12.py
	$(PY) pages456.py
	$(PY) game56.py
	$(PY) game_d34.py
	$(PY) search_gen.py

mm:
	$(PY) mm.py

index:
	$(PY) build2.py

screens:
	./shoot.sh screens

thumbs:
	./shoot.sh pages
	./shoot.sh screens

video:
	@curl -sf -o /dev/null http://127.0.0.1:$(PORT)/_directions/index.html || { echo "run make serve in another shell first"; exit 1; }
	for i in $(VIDEO_IDS); do ./vid.sh $$i 16x9 1280 720; ./vid.sh $$i 9x16 720 1280; done

check:
	for f in ../made/*.js; do node --check $$f || exit 1; done
	$(PY) geomcheck.py
	$(PY) check.py

render3d:
	$(BLENDER) -b -P render.py -- d1,d2,d3,d4,d5,d6,d7

serve:
	$(PY) -m http.server --directory $(BRAND) $(PORT)

round2:
	$(MAKE) -C ../../_round2/src round2

round2-check:
	$(MAKE) -C ../../_round2/src round2-check
