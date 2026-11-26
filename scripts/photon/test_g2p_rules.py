import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import g2p_rules as g
from fill_thin_langs import fa_ipa, is_form_of


class G2PTest(unittest.TestCase):
    def test_japanese_kana(self):
        self.assertEqual(g.ja_ipa("みみ"), "[mʲimʲi]")
        self.assertEqual(g.ja_ipa("おとな"), "[o̞to̞na̠]")
        self.assertEqual(g.ja_ipa("ちょろちょろ"), "[t͡ɕo̞ɾo̞t͡ɕo̞ɾo̞]")
        self.assertEqual(g.ja_romaji("しんぶん"), "shinbun")
        self.assertIsNone(g.ja_ipa("漢字"))

    def test_korean_hangul(self):
        self.assertEqual(g.ko_ipa("마당"), "[ma̠da̠ŋ]")
        self.assertEqual(g.ko_ipa("밥그릇"), "[pa̠p̚k͈ɯɾɯt̚]")
        self.assertEqual(g.ko_ipa("첫눈"), "[t͡ɕʰʌ̹nnun]")
        self.assertEqual(g.ko_rr("창고"), "changgo")

    def test_pinyin(self):
        self.assertEqual(g.py_split("jīngshén"), ["jing", "shen"])
        self.assertEqual(g.py_ipa("jīngshén"), "/t͡ɕiŋ ʂən/")
        self.assertEqual(g.py_ipa("zhī"), "/ʈ͡ʂʐ̩/")
        self.assertEqual(g.py_marks("zhong1 guo2"), "zhōng guó")

    def test_hebrew_romanization(self):
        self.assertEqual(g.he_ipa("liskhót"), "/lisχot/")
        self.assertEqual(g.he_ipa("tavnít"), "/tavnit/")

    def test_devanagari(self):
        self.assertEqual(g.hi_ipa("सबसे"), "/səbseː/")
        self.assertEqual(g.sa_ipa("सभ्य"), "/sɐbʱjɐ/")

    def test_latin_vietnamese_tamil_thai(self):
        self.assertEqual(g.la_ipa("rārus"), "[raːrʊs]")
        self.assertEqual(g.vi_ipa("chạy"), "[t͡ɕaj˧˨ʔ]")
        self.assertEqual(g.ta_ipa("நரி"), "/n̪ɐɾɪ/")
        self.assertEqual(g.ta_iso("நெல்"), "nel")
        self.assertEqual(g.th_rtgs("/tʰam˧/"), "tham")

    def test_persian_and_gloss_detection(self):
        self.assertEqual(fa_ipa("pirâmun"), "/pʰiːɹɒːmuːn/")
        self.assertTrue(is_form_of("defective spelling of גידול"))
        self.assertTrue(is_form_of("hanja form of 정신"))
        self.assertFalse(is_form_of("spirit; soul; will"))


if __name__ == "__main__":
    unittest.main()
