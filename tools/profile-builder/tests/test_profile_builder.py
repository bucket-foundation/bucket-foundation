import unittest

from profile_builder import profile, sources
from profile_builder.sources import Item


def fake_fetch(url, token=None):
    if url.endswith("/users/ada"):
        return {"html_url": "https://github.com/ada", "bio": "graphs and learning", "public_repos": 2}
    if "/users/ada/repos" in url:
        return [
            {"full_name": "ada/lean-paths", "html_url": "u1", "name": "lean-paths", "description": "Lean proofs of prerequisite graph paths", "topics": ["lean", "graph"], "language": "Lean", "fork": False},
            {"full_name": "ada/fork", "html_url": "u2", "name": "fork", "description": "x", "topics": [], "language": "C", "fork": True},
        ]
    if url.endswith("/readme"):
        raise OSError("no readme")
    raise AssertionError(url)


class ProfileBuilderTest(unittest.TestCase):
    def test_github_skips_forks_and_records_readme_errors(self):
        items = sources.github("ada", 10, fetch=fake_fetch)
        self.assertEqual([i.title for i in items], ["GitHub ada", "lean-paths"])
        self.assertEqual(items[1].meta["errors"], ["no readme"])

    def test_max_items_caps_repos(self):
        self.assertEqual(len(sources.github("ada", 0, fetch=fake_fetch)), 1)

    def test_website_crawl_stays_on_host_and_stops_at_max_links(self):
        pages = {
            "https://a.org/": '<title>A</title><a href="/p1">1</a><a href="https://other.org/x">o</a><a href="/p2">2</a>',
            "https://a.org/p1": "<title>P1</title>quantum learning",
            "https://a.org/p2": "<title>P2</title>more",
        }
        items = sources.websites(["https://a.org/"], 2, fetch_text=pages.__getitem__)
        self.assertEqual([i.url for i in items], ["https://a.org/", "https://a.org/p1"])

    def test_website_errors_are_kept(self):
        def boom(url):
            raise OSError("down")
        items = sources.websites(["https://a.org/"], 5, fetch_text=boom)
        self.assertEqual(items[0].meta["error"], "down")

    def test_branch_scores_sum_to_one_and_reflect_text(self):
        items = [Item("x", "u", "t", "learning education student teaching theorem proof"), Item("x", "v", "t", "quantum photon")]
        b = profile.branch_scores(items)
        self.assertAlmostEqual(sum(b.values()), 1.0, places=3)
        self.assertGreater(b["mind"], b["physics"])

    def test_build_counts_and_skills(self):
        items = [Item("github", "u", "r", "graph learning", {"language": "Python"}), Item("web", "w", "", "", {"error": "x"})]
        out = profile.build({"name": "Ada"}, items)
        self.assertEqual(out["counts"]["items"], 2)
        self.assertEqual(out["counts"]["usable"], 1)
        self.assertEqual(out["skills"], [{"language": "Python", "repos": 1}])
        self.assertEqual(out["errors"], [{"url": "w", "error": "x"}])


    def test_boilerplate_lines_shared_by_most_items_are_dropped(self):
        items = [Item("web", str(i), "p", f"Sign in to continue\nunique topic {w}") for i, w in enumerate(["photon", "enzyme", "galaxy", "theorem", "glacier"])]
        texts = profile.strip_boilerplate(items)
        self.assertTrue(all("Sign in to continue" not in t for t in texts))
        self.assertIn("photon", texts[0])


if __name__ == "__main__":
    unittest.main()
