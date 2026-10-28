import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import check_units


def run(*questions):
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump({"questions": [dict(kind="calculate", answer=1, **q) for q in questions]}, f)
    try:
        return check_units.check([f.name])
    finally:
        os.unlink(f.name)


class CheckUnitsTest(unittest.TestCase):
    def test_count_with_a_length_unit_is_flagged(self):
        hits = run(dict(id="lss", prompt="How many void-sized cells fit in the survey?", unit="million ly"))
        self.assertEqual(len(hits), 1)

    def test_count_per_second_with_an_energy_unit_is_flagged(self):
        hits = run(dict(id="etc", prompt="How many protons does it pump per second?", unit="kJ/mol"))
        self.assertEqual(len(hits), 1)

    def test_unit_must_match_the_unit_the_prompt_asks_for(self):
        hits = run(dict(id="fd", prompt="What is the trap stiffness, in N/m?", unit="m^2/s"))
        self.assertEqual(len(hits), 1)

    def test_missing_unit_on_an_asked_quantity_is_flagged(self):
        hits = run(dict(id="cf", prompt="What is that integral, in ns?", unit=""))
        self.assertEqual(len(hits), 1)

    def test_scale_word_needs_a_unit(self):
        hits = run(dict(id="sh", prompt="How many O2 can it carry, in millions?", unit=""))
        self.assertEqual(len(hits), 1)

    def test_unknown_unit_is_flagged(self):
        hits = run(dict(id="u", prompt="What is it?", unit="furlongs"))
        self.assertEqual(len(hits), 1)

    def test_valid_items_pass(self):
        hits = run(
            dict(id="a", prompt="How many protons does it pump per second?", unit="protons/s"),
            dict(id="b", prompt="How many moles of CO2 form?", unit="mol"),
            dict(id="c", prompt="How many cysteines must pair?", unit=""),
            dict(id="d", prompt="What is the drop, in degrees C?", unit="degrees C"),
            dict(id="e", prompt="What is the stiffness, in N/m?", unit="N/m"),
        )
        self.assertEqual(hits, [])


if __name__ == "__main__":
    unittest.main()
