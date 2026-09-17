# Span doc-length validation

`hte.evidence.EvidenceSpan.doc_length` (`bkt-hte-evidence-span-doc-length`,
filed as a PR #60 review follow-up in `BEADS-PENDING.jsonl`), PLAN.md
section 10 item 4: "Insert a full-document context check between
extraction and belief fusion."

`EvidenceSpan.__post_init__` checked only internal consistency between
`char_start` and `char_end`; nothing checked a span against `doc_id`'s own
stored document length, since `hte.corpus.Source` carried no document text
or length field to check against. A span pointing past the end of its own
document passed construction unnoticed, the failure mode this check
closes off, one the LLM-extraction path (`hte.roles.extract`) is most
exposed to: a hallucinated or mis-tracked offset.

## Contract

`doc_length: int | None = None`, the full length of `doc_id`'s own
document text, set by the caller whenever that text is on hand at
construction time. `None` when the caller has no document text to
measure, an ingestion path this module does not control; no document-
length check applies to such a span. When `doc_length` is given:

- `doc_length < 0` raises `ValueError`.
- `char_end > doc_length` raises `ValueError`, naming the span's
  `doc_id`, `char_end`, and `doc_length`: a span that reads past the end
  of its own document is refused at construction, ahead of
  `hte.belief.score`.

`to_dict()`/`from_dict()` carry `doc_length` through; `from_dict()` on a
span serialized before this field existed (no `"doc_length"` key) reads
back with `doc_length` set to `None`, and raises no error.

## Callers

Every corpus adapter under `hte.corpus` and the `hte.roles` LLM-extraction
path pass `doc_length`, each from the same string `char_start`/`char_end`
were located against:

- `hte.corpus.fixtures`, `hte.corpus.education_atlas`,
  `hte.corpus.quantum_history`, `hte.corpus.sacred_history`,
  `hte.corpus.production`: `doc_length=len(raw)` or `len(quote)`,
  whichever string the offsets are located against.
- `hte.corpus.literature`: `Card.doc_length` (the raw file text's own
  length, set once in `_parse_frontmatter`) carried onto each
  `EvidenceSpan` built from that card's `key_claims`.
- `hte.corpus.younger_dryas`: the same pattern as `literature`,
  `Card.doc_length` set in `_parse_frontmatter` and carried onto each
  claim's own span.
- `hte.roles.extract`: `doc_length=len(document_text)`, the full text the
  LLM extraction ran against.
- `hte.synth`, `hte.fusion_stress`: synthetic spans built from a single
  quote string, `doc_length=len(quote)`, the quote standing in for the
  whole document.

## Tests

`tests/test_evidence.py`, 13 tests: the pre-existing `char_start`/
`char_end` range check; `doc_length` absent (no document-length check
applied); `char_end` accepted exactly at `doc_length`; `char_end` refused
past `doc_length`; negative `doc_length` refused; round trip through
`to_dict()`/`from_dict()` with and without `doc_length` set; a
pre-`doc_length` serialized shape (no `"doc_length"` key) reading back as
`None`; plus the pre-existing `Source`/`EvidenceItem` round-trip and
tier-weight-table coverage this file already carried.
