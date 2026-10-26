import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from asc_setup import ASC

APPS = {"polingual": "6825177856", "bucket": "6825123451"}


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--since", default="", help="ISO date, show feedback created after it")
    args = p.parse_args()
    api = ASC(False)
    for name, app in APPS.items():
        for kind in ("betaFeedbackScreenshotSubmissions", "betaFeedbackCrashSubmissions"):
            for r in api.all(f"/v1/apps/{app}/{kind}"):
                a = r["attributes"]
                if a["createdDate"] < args.since:
                    continue
                tag = "crash" if "Crash" in kind else "note"
                print(f"{a['createdDate'][:16]} {name:9} {tag:5} {a.get('deviceModel', '')} iOS {a.get('osVersion', '')}: {a.get('comment') or ''}")


if __name__ == "__main__":
    main()
