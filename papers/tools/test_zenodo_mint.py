#!/usr/bin/env python3
"""Tests for `zenodo-mint.py --dry-run` (closes the Medium finding from the
PR #17 review: no dry-run rehearsal path existed before this).

Stdlib `unittest` only, matching `zenodo-mint.py`'s own stdlib-only
contract; `zenodo-mint.py`'s hyphenated filename is not an importable
module name, so this test loads it directly off its path with
`importlib.util` rather than a normal `import zenodo_mint`.

Each dry-run test monkeypatches `urllib.request.urlopen` to raise on any
call, the same "prove the network path never opens" technique `hte`'s own
network-fetch tests use (`tools/hypothesis-engine/tests/test_corpus_
literature.py`): a dry-run subcommand that reaches the real `_request`
path fails loudly here rather than silently making a real HTTP call
during a test run. `ZENODO_TOKEN` is deliberately unset in every dry-run
test, proving the mode reads no token at all.

Run directly (`python3 papers/tools/test_zenodo_mint.py`) or via
`python3 -m pytest papers/tools/test_zenodo_mint.py`; both work, since
`unittest.TestCase` classes are pytest-collectible without change.
"""
from __future__ import annotations

import contextlib
import importlib.util
import io
import json
import os
import sys
import tempfile
import unittest
import unittest.mock
from pathlib import Path

_MODULE_PATH = Path(__file__).resolve().parent / "zenodo-mint.py"
_spec = importlib.util.spec_from_file_location("zenodo_mint", _MODULE_PATH)
zenodo_mint = importlib.util.module_from_spec(_spec)
assert _spec.loader is not None
_spec.loader.exec_module(zenodo_mint)


def _fail_on_any_network_call(*_args, **_kwargs):
    raise AssertionError("a dry-run subcommand must never call urllib.request.urlopen")


class DryRunTests(unittest.TestCase):
    def setUp(self) -> None:
        self._tmpdir = tempfile.TemporaryDirectory()
        self.paper_dir = self._tmpdir.name
        self.zenodo_json = os.path.join(self.paper_dir, "zenodo.json")
        with open(self.zenodo_json, "w", encoding="utf-8") as f:
            json.dump({"title": "A Test Paper", "creators": [{"name": "Author, A."}]}, f)
        self.sample_file = os.path.join(self.paper_dir, "main.pdf")
        with open(self.sample_file, "wb") as f:
            f.write(b"%PDF-fake")

        self._token_patch = unittest.mock.patch.dict(os.environ, {}, clear=False)
        self._token_patch.start()
        os.environ.pop("ZENODO_TOKEN", None)

        self._urlopen_patch = unittest.mock.patch.object(
            zenodo_mint.urllib.request, "urlopen", side_effect=_fail_on_any_network_call,
        )
        self._urlopen_patch.start()

    def tearDown(self) -> None:
        self._urlopen_patch.stop()
        self._token_patch.stop()
        self._tmpdir.cleanup()

    def _run(self, argv: list[str]) -> tuple[int, str]:
        """Runs `zenodo_mint.main()` with `argv` (no leading program name)
        and returns `(exit_code, combined_stdout)`. `main()` returns
        normally (no `SystemExit`) on every dry-run path this module
        builds, so a bare, successful return reads as exit code 0, the
        same convention the real CLI's own shell exit code follows."""
        buf = io.StringIO()
        old_argv = sys.argv
        sys.argv = ["zenodo-mint.py", *argv]
        try:
            with contextlib.redirect_stdout(buf):
                try:
                    zenodo_mint.main()
                    code = 0
                except SystemExit as exc:
                    code = exc.code if isinstance(exc.code, int) else 1
        finally:
            sys.argv = old_argv
        return code, buf.getvalue()

    def test_dry_run_create_exits_zero_and_prints_metadata_with_no_token(self):
        code, out = self._run([
            "--dry-run", "create", "--paper-dir", self.paper_dir, "--file", self.sample_file,
        ])
        self.assertEqual(code, 0)
        self.assertIn("A Test Paper", out)
        self.assertIn("[dry-run]", out)
        self.assertIn(self.sample_file, out)

    def test_dry_run_update_exits_zero_and_prints_metadata(self):
        code, out = self._run([
            "--dry-run", "update", "--paper-dir", self.paper_dir,
            "--deposition-id", "12345678", "--file", self.sample_file,
        ])
        self.assertEqual(code, 0)
        self.assertIn("A Test Paper", out)
        self.assertIn("12345678", out)

    def test_dry_run_show_exits_zero_with_no_token(self):
        code, out = self._run(["--dry-run", "show", "--deposition-id", "12345678"])
        self.assertEqual(code, 0)
        self.assertIn("[dry-run]", out)
        self.assertIn("12345678", out)

    def test_dry_run_publish_exits_zero_without_confirm(self):
        # The real (non-dry-run) publish path refuses without --confirm;
        # dry-run publish must still exit 0 with no --confirm at all,
        # since nothing irreversible runs either way.
        code, out = self._run(["--dry-run", "publish", "--deposition-id", "12345678"])
        self.assertEqual(code, 0)
        self.assertIn("[dry-run]", out)
        self.assertNotIn("Published.", out)

    def test_dry_run_never_calls_token(self):
        # `_token()` exits 2 when ZENODO_TOKEN is unset; every dry-run
        # test above already runs with no token set, so a passing exit
        # code of 0 on each is itself proof `_token()` was never reached.
        # This test names that guarantee directly rather than leaving it
        # implicit in the other four.
        with unittest.mock.patch.object(zenodo_mint, "_token", side_effect=AssertionError(
            "dry-run must never call _token()"
        )):
            for argv in (
                ["--dry-run", "create", "--paper-dir", self.paper_dir],
                ["--dry-run", "update", "--paper-dir", self.paper_dir, "--deposition-id", "1"],
                ["--dry-run", "show", "--deposition-id", "1"],
                ["--dry-run", "publish", "--deposition-id", "1"],
            ):
                code, _out = self._run(argv)
                self.assertEqual(code, 0, f"argv={argv!r} did not exit 0")


class NonDryRunStillGatedTests(unittest.TestCase):
    """A narrow regression check: adding `--dry-run` must not loosen the
    existing, non-dry-run `--confirm` gate on `publish`, or the existing
    `ZENODO_TOKEN` requirement on every other subcommand."""

    def setUp(self) -> None:
        self._token_patch = unittest.mock.patch.dict(os.environ, {}, clear=False)
        self._token_patch.start()
        os.environ.pop("ZENODO_TOKEN", None)
        self._urlopen_patch = unittest.mock.patch.object(
            zenodo_mint.urllib.request, "urlopen", side_effect=_fail_on_any_network_call,
        )
        self._urlopen_patch.start()

    def tearDown(self) -> None:
        self._urlopen_patch.stop()
        self._token_patch.stop()

    def _run(self, argv: list[str]) -> int:
        old_argv = sys.argv
        sys.argv = ["zenodo-mint.py", *argv]
        buf = io.StringIO()
        try:
            with contextlib.redirect_stdout(buf), contextlib.redirect_stderr(buf):
                try:
                    zenodo_mint.main()
                    return 0
                except SystemExit as exc:
                    return exc.code if isinstance(exc.code, int) else 1
        finally:
            sys.argv = old_argv

    def test_publish_without_dry_run_or_confirm_still_refuses(self):
        self.assertEqual(self._run(["publish", "--deposition-id", "1"]), 2)

    def test_show_without_dry_run_still_needs_a_token(self):
        self.assertEqual(self._run(["show", "--deposition-id", "1"]), 2)


if __name__ == "__main__":
    unittest.main()
