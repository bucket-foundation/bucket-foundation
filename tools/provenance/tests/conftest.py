from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

DAY_ONE = Path(__file__).resolve().parent / "fixtures" / "day-one"
DAY_ONE_ROOT = "10472d64990e60078e7588701191e665edd87db3afeb49bbf323629b38f536dc"


@pytest.fixture
def day_one(tmp_path: Path) -> Path:
    dst = tmp_path / "day-one"
    shutil.copytree(DAY_ONE, dst)
    return dst


@pytest.fixture
def ssh_key(tmp_path: Path):
    def make(name: str = "k") -> tuple[Path, str]:
        key = tmp_path / f"{name}_ed25519"
        subprocess.run(["ssh-keygen", "-q", "-t", "ed25519", "-N", "", "-C", name, "-f", str(key)], check=True)
        return key, key.with_suffix(".pub").read_text().strip()

    return make


def need_age():
    if not shutil.which("age") or not shutil.which("age-keygen"):
        pytest.skip("age not installed; CI installs it")


@pytest.fixture
def age_pair(tmp_path: Path):
    need_age()

    def make(name: str) -> tuple[Path, str]:
        ident = tmp_path / f"{name}.age.txt"
        subprocess.run(["age-keygen", "-o", str(ident)], check=True, capture_output=True)
        pub = subprocess.run(["age-keygen", "-y", str(ident)], check=True, capture_output=True, text=True)
        return ident, pub.stdout.strip()

    return make
