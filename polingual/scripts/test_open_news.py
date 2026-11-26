import json
import sys
import tempfile
import unittest
from pathlib import Path

try:
    import jsonschema
except ImportError:
    jsonschema = None

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import open_news as nw
import open_stories as st

SCHEMA = json.loads((HERE.parent / "src/lib/input/input-bundle.schema.json").read_text())
SHIPPED = HERE.parent / "public/input/news"

GV = """<html><title>Una historia · Global Voices en Español</title>
<span class='translation-language post-translation-en'><a href='https://globalvoices.org/2026/11/09/a-story/' title='x'>English</a></span>
<div class='contributor-name'><span class='credit-label'>Escrito (English) por</span><a href='a' class='user-link'>Jude Pierre Louis</a></div>
<div class='contributor-name'><span class='credit-label'>Traducido (Español) por</span><a href='b' class='user-link'>Alonso Délano</a></div>
<div class='entry-container'><p>El municipio de Kenscoff está a 20 kilómetros del centro.</p>
<blockquote class="twitter-tweet"><p>Un tuit de otra persona con derechos propios.</p></blockquote>
<p>Photo: una imagen con licencia propia de terceros.</p>
<div class='entry-footer'></div></div>
<a rel='license' href='https://creativecommons.org/licenses/by/3.0/deed.es' title='x'>CC</a></html>"""

VOA = """<html><title> A Story </title><div class="wsw"><p>The city has 20 schools and many parks.</p>
<p>The Associated Press said the mayor would visit next week.</p>
<div class="wsw__embed"><div><div><p>Caption (REUTERS/Someone)</p></div></div></div>
<p>Ashley Thompson wrote this story for VOA Learning English.</p></div></html>"""


def write(text):
    d = tempfile.mkdtemp()
    p = Path(d) / "page.html"
    p.write_text(text)
    return p


class GlobalVoices(unittest.TestCase):
    def test_parse_licence_roles_original_and_drop_third_party(self):
        g = nw.gv_parse(write(GV))
        self.assertEqual(g["licence"]["label"], "CC BY 3.0")
        self.assertEqual(g["title"], "Una historia")
        self.assertEqual(g["original"], "https://globalvoices.org/2026/11/09/a-story/")
        self.assertEqual(g["authors"], ["Jude Pierre Louis"])
        self.assertEqual(g["translators"], ["Alonso Délano"])
        self.assertEqual(g["paras"], ["El municipio de Kenscoff está a 20 kilómetros del centro."])

    def test_partner_content_flagged(self):
        self.assertFalse(nw.gv_parse(write(GV))["partner"])
        note = "<p>This story was originally published by Hong Kong Free Press and is republished under a content partnership agreement.</p>"
        self.assertTrue(nw.gv_parse(write(GV.replace("<div class='entry-footer'>", note + "<div class='entry-footer'>")))["partner"])

    def test_no_cc_by_link_means_no_licence(self):
        g = nw.gv_parse(write(GV.replace("licenses/by/3.0", "licenses/by-nc/3.0")))
        self.assertIsNone(g["licence"])


class Voa(unittest.TestCase):
    def test_parse_drops_captions_and_blockquotes(self):
        v = nw.voa_parse(write(VOA.replace("</div></html>", "<blockquote><p>A long quoted post from another site.</p></blockquote></div></html>")))
        self.assertEqual(v["authors"], ["Ashley Thompson"])
        self.assertFalse(any("REUTERS" in p or "quoted post" in p for p in v["paras"]))

    def test_agency_named_drops_article_in_any_script(self):
        for text in ["The Associated Press said the mayor would visit.", "据美联社报道，市长将访问。", "路透社报道称市长将访问。",
                     "法新社说市长将访问。", "Как сообщает Ассошиэйтед Пресс, мэр приедет.", "По данным Рейтер, мэр приедет.",
                     "به گزارش رویترز شهردار می‌آید.", "وفقا لوكالة رويترز سيزور العمدة.", "AP통신에 따르면 시장이 방문한다."]:
            self.assertEqual(nw.screen_voa([text]), "voa names a wire agency", text)

    def test_localized_dateline_drops_article(self):
        self.assertEqual(nw.screen_voa(["华盛顿（美联社）— 投票今天举行。"]), "voa wire dateline")
        self.assertEqual(nw.screen_voa(["WASHINGTON (AP) \u2014 The vote was held today."]), "voa wire dateline")

    def test_clean_article_passes(self):
        self.assertIsNone(nw.screen_voa(["The city has 20 schools and many parks."], "A Story"))

    def test_third_party_copyright_or_contractor_flagged(self):
        self.assertFalse(nw.voa_parse(write(VOA))["thirdParty"])
        self.assertTrue(nw.voa_parse(write(VOA.replace("</html>", "<footer>© 2025 Getty Images</footer></html>")))["thirdParty"])
        self.assertTrue(nw.voa_parse(write(VOA.replace("A Story", "A Story, Special to VOA")))["thirdParty"])
        self.assertFalse(nw.voa_parse(write(VOA.replace("</html>", "<footer>© 2025 Voice of America</footer></html>")))["thirdParty"])


class Wire(unittest.TestCase):
    def test_tass_lusa_and_cyrillic_ap(self):
        for text in ["Как сообщает АП, мэр приедет.", "По данным ТАСС, мэр приедет.", "TASS reported the visit.",
                     "Segundo a Lusa, o presidente chega amanhã."]:
            self.assertEqual(nw.screen_voa([text]), "voa names a wire agency", text)
        self.assertIsNone(nw.screen_voa(["Капитан пришёл в АПтеку не вовремя, а лузер ушёл."]))


class RobotsStatus(unittest.TestCase):
    def setUp(self):
        self.cache = tempfile.mkdtemp()
        self.old = nw.CACHE
        nw.CACHE = Path(self.cache)

    def tearDown(self):
        nw.CACHE = self.old

    def test_404_allows_everything(self):
        text = nw.robots_text("a.org", lambda url: (404, ""))
        self.assertTrue(nw.robots_from_text(text).can_fetch(nw.UA, "https://a.org/x"))

    def test_server_error_or_unreachable_disallows(self):
        for status in (500, None):
            text = nw.robots_text(f"b{status}.org", lambda url, s=status: (s, ""))
            self.assertFalse(nw.robots_from_text(text).can_fetch(nw.UA, "https://b.org/x"))

    def test_200_uses_file(self):
        text = nw.robots_text("c.org", lambda url: (200, "User-agent: *\nDisallow: /p/\n"))
        rp = nw.robots_from_text(text)
        self.assertFalse(rp.can_fetch(nw.UA, "https://c.org/p/1"))
        self.assertTrue(rp.can_fetch(nw.UA, "https://c.org/q"))


class Robots(unittest.TestCase):
    def test_disallow_and_crawl_delay(self):
        rp = nw.robots_from_text("User-agent: *\nCrawl-delay: 10\nDisallow: /wp-admin/\n")
        self.assertFalse(rp.can_fetch(nw.UA, "https://x.org/wp-admin/a"))
        self.assertTrue(rp.can_fetch(nw.UA, "https://x.org/2026/11/a/"))
        self.assertEqual(rp.crawl_delay("*"), 10)

    def test_robots_raises_fetcher_delay_and_blocks(self):
        class F:
            delay = 1.0
        r = nw.Robots(F())
        r.parsers["x.org"] = nw.robots_from_text("User-agent: *\nCrawl-delay: 10\nDisallow: /private/\n")
        self.assertTrue(r.allowed("https://x.org/a"))
        self.assertEqual(r.f.delay, 10.0)
        self.assertFalse(r.allowed("https://x.org/private/b"))


class Lengths(unittest.TestCase):
    def test_per_script_minimum(self):
        self.assertTrue(nw.keep_para("市长今天访问了学校。"))
        self.assertFalse(nw.keep_para("Short line."))
        self.assertTrue(nw.keep_para("ראש העיר ביקר היום"))


class Build(unittest.TestCase):
    def test_boilerplate_removed(self):
        arts = [nw.article("voa", "es", f"a{i}", "t", "u", [], [], dict(nw.PD), ["Apoya el periodismo.", f"texto {i}"], "B2")
                for i in range(3)]
        nw.strip_boilerplate(arts)
        self.assertEqual(arts[0]["pages"], ["texto 0"])

    def test_pairing_rejects_mismatched_paragraphs(self):
        self.assertFalse(st.plausible(["Uno con 3 cosas.", "Dos."], ["One with 4 things.", "Two."]))
        self.assertFalse(st.plausible(["Uno."], ["One.", "Two."]))
        self.assertFalse(st.plausible(["Sí."], ["A very long English paragraph that is far longer than its pair."]))

    def test_credit_names_original_and_licence(self):
        b = nw.article("global-voices", "es", "gv-es-1", "Una", "u", ["A"], ["T"], st.licence("CC BY", "3.0"), ["x"], "B2")
        e = nw.article("global-voices", "en", "gv-en-1", "One", "eu", ["A"], [], st.licence("CC BY", "3.0"), ["y"], "B2")
        st.attach_pair(b, e)
        line = nw.credit(b)
        self.assertIn("translated by T", line)
        self.assertIn("English original \"One\" by A, eu, CC BY 3.0", line)
        self.assertEqual(b["pairedWith"], "gv-en-1")


@unittest.skipIf(jsonschema is None or not (SHIPPED / "manifest.json").exists(), "no news manifest")
class Shipped(unittest.TestCase):
    def test_bundles_validate(self):
        manifest = json.loads((SHIPPED / "manifest.json").read_text())
        for lang, m in manifest["langs"].items():
            self.assertEqual(m["beta"], m["tokenShare"] < st.BETA_SHARE or not m["wordPack"])
            path = nw.BUNDLES / m["file"]
            self.assertTrue(path.exists(), f"missing bundle {path}; run open_news.py build")
            b = json.loads(path.read_text())
            jsonschema.validate(b, SCHEMA)
            ids = {x["id"] for x in b["books"]}
            for u in b["units"]:
                self.assertIn(u["bookId"], ids)
            for reason, n in manifest["articlesExcluded"].items():
                self.assertGreaterEqual(n, 0, reason)
            for x in b["books"]:
                self.assertIn(x["license"], ("Public Domain", "CC BY 2.0", "CC BY 3.0", "CC BY 4.0"))


if __name__ == "__main__":
    unittest.main()
