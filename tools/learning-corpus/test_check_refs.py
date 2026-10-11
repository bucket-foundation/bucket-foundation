import importlib.util
import tempfile
import unittest
from pathlib import Path

SPEC = importlib.util.spec_from_file_location("check_refs", Path(__file__).with_name("check_refs.py"))
check_refs = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(check_refs)

INDEX = {
    "w": {"a-2020-x": {"id": "a-2020-x", "verification": "doi-confirmed", "withdrawn": False,
                       "effect": [{"value": "d = .67; 46 samples; N = 2,136; -0.39 for words"}], "finding": "x", "population": "61 studies"},
          "t-2021-cut": {"id": "t-2021-cut", "verification": "doi-confirmed", "withdrawn": False,
                         "effect": [{"value": "Overall effect 0.67 (the fetched abstract is truncated)"}]},
          "b-2021-y": {"id": "b-2021-y", "verification": "unconfirmed", "withdrawn": False, "effect": [{"value": "g = 0.42"}]},
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


def numbers(text):
    with tempfile.TemporaryDirectory() as folder:
        path = Path(folder) / "doc.md"
        path.write_text(text, encoding="utf-8")
        return check_refs.check_numbers([str(path)], INDEX)


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

    def test_number_in_record_passes_in_any_spelling(self):
        self.assertEqual(numbers("d = 0.67 over 46 samples and 2136 people, 0.39 lower for words [empirical: w:a-2020-x, 2026-10-11, show].\n"), [])

    def test_number_absent_from_record_fails(self):
        self.assertEqual(len(numbers("| Overall d = 0.79 | 61 studies | [empirical: w:a-2020-x, 2026-10-11, show] |\n")), 1)

    def test_number_after_the_tag_or_in_code_is_ignored(self):
        self.assertEqual(numbers("d = .67 [empirical: w:a-2020-x, 2026-10-11, show] and a default of `90 days`, then 5 more.\n"), [])

    def test_adjacent_tags_share_their_records(self):
        self.assertEqual(numbers("0.67 and 0.42 [empirical: w:a-2020-x, 2026-10-11, show], [empirical: w:b-2021-y, 2026-10-11, show]\n"), [])

    def test_effect_from_truncated_abstract_fails(self):
        errors = numbers("An effect of 0.67 [empirical: w:t-2021-cut, 2026-10-11, show].\n")
        self.assertEqual(len(errors), 1)
        self.assertIn("truncated", errors[0])


if __name__ == "__main__":
    unittest.main()
