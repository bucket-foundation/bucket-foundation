PYTHON ?= python3

.PHONY: test parity

test:
	$(PYTHON) -m pytest -q -p no:cacheprovider

parity:
	$(PYTHON) -m pytest -q -p no:cacheprovider tests/test_curveball.py
