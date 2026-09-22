"""Chunking and the vector build with a scripted tokenizer and encoder:
window arithmetic, byte spans, the corpus checks, the index checks, and a
rebuild that finds its revision already built. The real tokenizer runs when
the pinned snapshot is cached."""

import hashlib
import json
import tempfile
import unittest
from pathlib import Path

import numpy as np

from evidence_search.chunking import chunk_spans
from evidence_search.normalize import byte_slice, sha256_hex
from evidence_search.registry import model_entry, snapshot_dir
from evidence_search.vectors import ArtifactError, VectorIndex, build_vectors


class Enc:
    def __init__(self, offsets):
        self.offsets = offsets


class SpaceTokenizer:
    """One word piece per whitespace-separated word."""

    def encode(self, text, add_special_tokens=False):
        offsets, i = [], 0
        for word in text.split():
            start = text.index(word, i)
            offsets.append((start, start + len(word)))
            i = start + len(word)
        return Enc(offsets)


class FakeEncoder:
    model_id = "fake"
    dimension = 4
    device = "cpu"
    entry = {"repo": "test/fake", "revision": "f" * 40, "metric": "cosine", "files": {"tokenizer.json": "0" * 64}}

    def __init__(self):
        self.tokenizer = SpaceTokenizer()
        self.calls = 0

    def encode(self, texts, batch_size=16):
        self.calls += 1
        rows = []
        for t in texts:
            h = hashlib.sha256(t.encode()).digest()
            v = np.frombuffer(h[:16], dtype="<u4").astype("<f4") + 1
            rows.append(v / np.linalg.norm(v))
        return np.asarray(rows, dtype="<f4")


def corpus(tmp: Path, texts: list[str], revision: str = "c" * 64) -> Path:
    lines = []
    for i, text in enumerate(texts):
        lines.append(json.dumps({"sourceId": f"graph:{i:08d}-0000-4000-8000-000000000000", "sourceRevision": f"{i:064x}", "slug": f"s{i}", "text": text, "bodyHash": sha256_hex(text)}))
    raw = "\n".join(lines) + "\n"
    d = tmp / "corpus"
    d.mkdir()
    (d / "sources.jsonl").write_text(raw, encoding="utf-8")
    (d / "manifest.json").write_text(json.dumps({"corpusRevision": revision, "files": {"sources.jsonl": {"sha256": sha256_hex(raw)}}}), encoding="utf-8")
    return d


class Chunking(unittest.TestCase):
    def test_windows_and_overlap(self):
        text = " ".join(f"w{i}" for i in range(500))
        chunks = chunk_spans(text, SpaceTokenizer(), 192, 32)
        self.assertEqual([c.tokens for c in chunks], [192, 192, 180])
        self.assertEqual(byte_slice(text, chunks[1].start, chunks[1].end).split()[0], "w160")
        self.assertEqual(byte_slice(text, chunks[2].start, chunks[2].end).split()[-1], "w499")

    def test_short_and_empty(self):
        self.assertEqual(len(chunk_spans("one two", SpaceTokenizer())), 1)
        self.assertEqual(chunk_spans("   ", SpaceTokenizer()), [])
        with self.assertRaises(ValueError):
            chunk_spans("a", SpaceTokenizer(), 32, 32)

    def test_multibyte_spans_decode(self):
        text = "sky \U0001F324 blue Ampère λ"
        for c in chunk_spans(text, SpaceTokenizer(), 2, 1):
            byte_slice(text, c.start, c.end)

    def test_real_tokenizer_spans_decode(self):
        _, entry = model_entry()
        path = snapshot_dir(entry) / "tokenizer.json"
        if not path.is_file():
            self.skipTest("the pinned tokenizer is not cached")
        from tokenizers import Tokenizer

        tok = Tokenizer.from_file(str(path))
        text = "Rayleigh scattering \U0001F324 makes the sky look blue; Ampère's λ⁻⁴ law. " * 60
        if tok.truncation:
            with self.assertRaises(ValueError):
                chunk_spans(text, tok)
        tok.no_truncation()
        chunks = chunk_spans(text, tok)
        self.assertGreater(len(chunks), 1)
        self.assertTrue(all(c.tokens <= 192 for c in chunks))
        for c in chunks:
            byte_slice(text, c.start, c.end)


class Build(unittest.TestCase):
    def test_build_load_and_rebuild(self):
        with tempfile.TemporaryDirectory() as t:
            tmp = Path(t)
            enc = FakeEncoder()
            d = corpus(tmp, ["Blue light scatters.", " ".join(["word"] * 400)])
            out = build_vectors(d, tmp / "vec", enc)
            idx = VectorIndex.load(out)
            self.assertEqual(idx.corpus_revision, "c" * 64)
            self.assertEqual(len(idx.chunks), 1 + 3)
            self.assertEqual(idx.matrix.shape, (4, 4))
            manifest = json.loads((out / "manifest.json").read_text())
            self.assertEqual((manifest["rows"], manifest["sources"], manifest["chunking"]), (4, 2, {"tokens": 192, "overlap": 32}))
            again = build_vectors(d, tmp / "vec", enc)
            self.assertEqual((again, enc.calls), (out, 1), "the same revision is not encoded twice")

    def test_tampering_is_refused(self):
        with tempfile.TemporaryDirectory() as t:
            tmp = Path(t)
            out = build_vectors(corpus(tmp, ["Blue light scatters.", "Red light too."]), tmp / "vec", FakeEncoder())
            m = out / "matrix.f32"
            original = m.read_bytes()
            m.write_bytes(original[:-4] + b"\x00\x00\x80\x7f")
            with self.assertRaises(ArtifactError):
                VectorIndex.load(out)
            m.write_bytes(original)
            c = out / "chunks.jsonl"
            c.write_text(c.read_text().replace("graph:0", "graph:9"))
            with self.assertRaises(ArtifactError):
                VectorIndex.load(out)

    def test_a_corpus_that_fails_its_manifest_is_refused(self):
        with tempfile.TemporaryDirectory() as t:
            tmp = Path(t)
            d = corpus(tmp, ["Blue light scatters."])
            (d / "sources.jsonl").write_text((d / "sources.jsonl").read_text() + "\n")
            with self.assertRaises(ArtifactError):
                build_vectors(d, tmp / "vec", FakeEncoder())
        with tempfile.TemporaryDirectory() as t:
            tmp = Path(t)
            with self.assertRaises(ArtifactError):
                build_vectors(corpus(tmp, ["line one\r\nline two"]), tmp / "vec", FakeEncoder())


if __name__ == "__main__":
    unittest.main()
