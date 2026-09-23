import json

from hte import runner
from hte.corpus import sacred_history_texts as sht

def test_slice_one_loads_with_its_recorded_counts_and_no_absolute_paths():
    corpus = sht.load_slice_one()
    assert len(corpus.evidence) == 917
    assert set(corpus.sources) == {"kjv-bible"}
    raw = sht.SLICE_ONE_PATH.read_text()
    assert "/home/" not in raw
    assert all(not env.source_path.startswith("/") for env in corpus.provenance)
    assert runner._CORPUS_LOADERS["sacred-history-texts-slice-1"] is sht.load_slice_one
