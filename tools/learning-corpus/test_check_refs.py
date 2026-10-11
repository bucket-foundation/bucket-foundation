import importlib.util
import tempfile
import unittest
from pathlib import Path

SPEC = importlib.util.spec_from_file_location("check_refs", Path(__file__).with_name("check_refs.py"))
check_refs = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(check_refs)

INDEX = {
    "w": {"a-2020-x": {"id": "a-2020-x", "verification": "doi-confirmed", "withdrawn": False},
          "b-2021-y": {"id": "b-2021-y", "verification": "unconfirmed", "withdrawn": False},
          "c-2024-z": {"id": "c-2024-z", "verification": "doi-confirmed", "withdrawn": True}},
    "c": {"core:spacing-effect": {"id": "core:spacing-effect"}},
    "m": {"motivation: growth mindset": {"method": "motivation: growth mindset"}},
    "mech": {"streak": {"id": "streak"}},
}


def run(text):
    with tempfile.TemporaryDirectory() as folder:
        path = Path(folder) / "doc.md"
        path.write_text(text, encoding="utf-8")
        return check_refs.check([str(path)], INDEX)


class CheckRefs(unittest.TestCase):
    def test_every_prefix_resolves(self):
        errors, warnings, total = run(
            "A [w:a-2020-x] b [c:core:spacing-effect] c [m:motivation: growth mindset] d [mech:streak].\n")
        self.assertEqual((errors, warnings, total), ([], [], 4))

    def test_unknown_id_fails(self):
        errors, _, _ = run("A [w:nobody-1999-nothing] and [mech:hearts].\n")
        self.assertEqual(len(errors), 2)

    def test_empirical_tag_is_read(self):
        errors, _, total = run("g = 0.5 [empirical: w:missing-2000-q, 2026-10-11, show].\n")
        self.assertEqual((len(errors), total), (1, 1))

    def test_withdrawn_fails_and_unconfirmed_warns(self):
        errors, warnings, _ = run("[w:c-2024-z] [w:b-2021-y]\n")
        self.assertEqual((len(errors), len(warnings)), (1, 1))

    def test_fenced_code_is_skipped(self):
        errors, _, total = run("```\n[w:nobody-1999-nothing]\n```\n")
        self.assertEqual((errors, total), ([], 0))

    def test_inline_code_is_skipped(self):
        errors, _, total = run("The form `[w:id]` cites a work.\n")
        self.assertEqual((errors, total), ([], 0))


if __name__ == "__main__":
    unittest.main()
