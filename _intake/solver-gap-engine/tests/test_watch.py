import contextlib, io, json, os, pathlib, subprocess, sys, tempfile, types, unittest
from unittest import mock

ENGINE = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ENGINE))
sys.modules.setdefault("sentence_transformers", types.SimpleNamespace(SentenceTransformer=None))
import watch

OPEN = '/-- Every even number above two is a sum of two primes, stated for the fixture. -/\n@[category research open, AMS 11]\ntheorem goldbach_fixture : True := by\n  sorry\n'
SOLVED = OPEN.replace("research open", "research solved, formal_proof using lean4 at \"https://example.org/proof\"")
BOTH = {"BUCKET_WHATS_NEW_URL": "https://example.org/api", "BUCKET_WHATS_NEW_TOKEN": "fixture-token"}
OTHER = '/-- A second fixture problem that stays open across both commits. -/\n@[category research open, AMS 5]\ntheorem stays_open : True := by\n  sorry\n'


def commit(repo, day, files, message):
    for name, text in files.items():
        path = repo / "FormalConjectures" / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text)
    stamp = f"{day}T12:00:00+00:00"
    env = {**os.environ, "GIT_AUTHOR_DATE": stamp, "GIT_COMMITTER_DATE": stamp, "GIT_AUTHOR_NAME": "fixture", "GIT_AUTHOR_EMAIL": "fixture@example.org",
           "GIT_COMMITTER_NAME": "fixture", "GIT_COMMITTER_EMAIL": "fixture@example.org"}
    subprocess.run(["git", "-C", str(repo), "add", "-A"], check=True, env=env)
    subprocess.run(["git", "-C", str(repo), "commit", "-q", "--no-verify", "--no-gpg-sign", "-m", message], check=True, env=env)
    return subprocess.run(["git", "-C", str(repo), "rev-parse", "HEAD"], check=True, capture_output=True, env=env).stdout.decode().strip()


class WatchTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = pathlib.Path(self.tmp.name)
        self.repo = self.root / "fc"
        self.repo.mkdir()
        subprocess.run(["git", "-C", str(self.repo), "init", "-q"], check=True)
        self.first = commit(self.repo, "2026-09-01", {"Demo/Goldbach.lean": OPEN, "Demo/Other.lean": OTHER}, "open")
        self.state = self.root / "state.json"
        self.outbox = self.root / "outbox"

    def tearDown(self):
        self.tmp.cleanup()

    def run_watch(self, *extra, env=None, post=None):
        argv = ["watch.py", "--repo", str(self.repo), "--state", str(self.state), "--outbox", str(self.outbox), "--no-fetch", *extra]
        clean = {k: v for k, v in os.environ.items() if not k.startswith("BUCKET_WHATS_NEW_")}
        out, err = io.StringIO(), io.StringIO()
        with mock.patch.object(sys, "argv", argv), mock.patch.dict(os.environ, {**clean, **(env or {})}, clear=True), \
                mock.patch.object(watch, "post", side_effect=post or AssertionError("no post without --publish and both settings")), \
                contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            watch.main()
        return json.loads(out.getvalue()), err.getvalue()

    def staged(self):
        return sorted(self.outbox.glob("*.json"))

    def test_first_run_records_the_head_and_stages_nothing(self):
        result, _ = self.run_watch()
        self.assertEqual(result, {"initialised_at": self.first[:8]})
        self.assertEqual(json.loads(self.state.read_text()), {"last": self.first, "runs": []})
        self.assertEqual(self.staged(), [])

    def test_a_retag_to_solved_stages_one_candidate_generation(self):
        self.run_watch()
        flip = commit(self.repo, "2026-09-10", {"Demo/Goldbach.lean": SOLVED}, "solved")
        head = commit(self.repo, "2026-09-20", {"Demo/Third.lean": OTHER.replace("stays_open", "added_later")}, "later")
        result, _ = self.run_watch()
        self.assertEqual({k: result[k] for k in ("solved", "with_formal_proof_link", "reopened", "new_open", "open_total", "staged", "posted", "post_failed")},
                         {"solved": 1, "with_formal_proof_link": 1, "reopened": 0, "new_open": 1, "open_total": 2, "staged": 1, "posted": 0, "post_failed": 0})
        files = self.staged()
        self.assertEqual(len(files), 1)
        body = json.loads(files[0].read_text())
        self.assertEqual(files[0].name, f"{body['id']}.json")
        self.assertTrue(body["id"].startswith("fc-solved-goldbach-fixture-"))
        self.assertEqual((body["kind"], body["state"], body["machine_generated"], body["date"]), ("generation", "candidate", True, "2026-09-10"))
        self.assertEqual(body["score"]["value"], 1)
        self.assertIn("Every even number above two", body["claim"])
        self.assertEqual(body["evidence"], [f"{watch.UPSTREAM}/commit/{flip}", f"{watch.UPSTREAM}/blob/{head}/FormalConjectures/Demo/Goldbach.lean"])
        self.assertNotIn("posted_at", body)
        self.assertEqual(json.loads(self.state.read_text())["last"], head)

    def test_a_rerun_over_the_same_range_leaves_the_staged_file_alone(self):
        self.run_watch()
        commit(self.repo, "2026-09-10", {"Demo/Goldbach.lean": SOLVED}, "solved")
        self.run_watch()
        before = self.staged()[0].read_bytes()
        result, _ = self.run_watch("--since", self.first)
        self.assertEqual((result["solved"], result["staged"]), (1, 0))
        self.assertEqual(len(self.staged()), 1)
        self.assertEqual(self.staged()[0].read_bytes(), before)

    def test_an_unchanged_head_stages_nothing(self):
        self.run_watch()
        result, _ = self.run_watch()
        self.assertEqual((result["solved"], result["staged"]), (0, 0))
        self.assertEqual(self.staged(), [])

    def test_both_settings_without_the_publish_flag_stage_and_never_post(self):
        self.run_watch()
        commit(self.repo, "2026-09-10", {"Demo/Goldbach.lean": SOLVED}, "solved")
        result, _ = self.run_watch(env=BOTH)
        self.assertEqual((result["staged"], result["posted"]), (1, 0))
        self.assertNotIn("posted_at", json.loads(self.staged()[0].read_text()))

    def test_the_publish_flag_with_one_setting_stages_and_never_posts(self):
        self.run_watch()
        commit(self.repo, "2026-09-10", {"Demo/Goldbach.lean": SOLVED}, "solved")
        result, err = self.run_watch("--publish", env={"BUCKET_WHATS_NEW_URL": BOTH["BUCKET_WHATS_NEW_URL"]})
        self.assertIn("staging only", err)
        self.assertEqual((result["staged"], result["posted"]), (1, 0))

    def test_the_publish_flag_with_both_settings_posts_each_entry_once(self):
        self.run_watch()
        commit(self.repo, "2026-09-10", {"Demo/Goldbach.lean": SOLVED}, "solved")
        sent = []
        result, _ = self.run_watch("--publish", env=BOTH, post=lambda url, token, body: sent.append((url, token, body["id"])))
        self.assertEqual((result["staged"], result["posted"], result["post_failed"]), (1, 1, 0))
        self.assertEqual([s[:2] for s in sent], [(BOTH["BUCKET_WHATS_NEW_URL"], BOTH["BUCKET_WHATS_NEW_TOKEN"])])
        self.assertIn("posted_at", json.loads(self.staged()[0].read_text()))
        again, _ = self.run_watch("--publish", "--since", self.first, env=BOTH, post=lambda url, token, body: sent.append((url, token, body["id"])))
        self.assertEqual((again["posted"], len(sent)), (0, 1))

    def test_fetch_never_forces_a_local_ref(self):
        source = (ENGINE / "watch.py").read_text()
        self.assertIn('"refs/heads/*:refs/heads/*"', source)
        self.assertNotIn("+refs", source)
        self.assertNotIn("--force", source)

    def test_slug_is_stable_and_distinct_per_problem(self):
        a, b = watch.slug("Demo/A.lean::erdos_1.variants.x"), watch.slug("Demo/B.lean::erdos_1.variants.x")
        self.assertEqual(a, watch.slug("Demo/A.lean::erdos_1.variants.x"))
        self.assertNotEqual(a, b)
        self.assertRegex(a, r"^erdos-1-variants-x-[0-9a-f]{6}$")


class EngineShipsNoScheduleTest(unittest.TestCase):
    def test_no_unit_file_and_no_enable_call_in_the_engine(self):
        units = [p.name for p in ENGINE.rglob("*") if p.suffix in {".timer", ".service"} and "fc" not in p.relative_to(ENGINE).parts[:1]]
        self.assertEqual(units, [])
        source = (ENGINE / "watch.py").read_text()
        for word in ("systemctl", "systemd", "crontab", "schedule"):
            self.assertNotIn(word, source)


if __name__ == "__main__":
    unittest.main()
