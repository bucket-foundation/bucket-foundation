import argparse
import base64
import json
import os
import shutil
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from asc_setup import ASC

APPS = {"polingual": "6825177856", "bucket": "6825123451"}
KINDS = {"betaFeedbackScreenshotSubmissions": "screenshot", "betaFeedbackCrashSubmissions": "crash"}


class EnvASC(ASC):
    def token(self):
        if self.tok and time.time() - self.born < 900:
            return self.tok
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import ec
        from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature

        b64 = lambda b: base64.urlsafe_b64encode(b).rstrip(b"=").decode()
        now = int(time.time())
        head = b64(json.dumps({"alg": "ES256", "kid": os.environ["EXPO_ASC_KEY_ID"], "typ": "JWT"}).encode())
        body = b64(json.dumps({"iss": os.environ["EXPO_ASC_ISSUER_ID"], "iat": now, "exp": now + 1200, "aud": "appstoreconnect-v1"}).encode())
        with open(os.environ["EXPO_ASC_API_KEY_PATH"], "rb") as f:
            key = serialization.load_pem_private_key(f.read(), None)
        r, s = decode_dss_signature(key.sign(f"{head}.{body}".encode(), ec.ECDSA(hashes.SHA256())))
        self.tok = f"{head}.{body}.{b64(r.to_bytes(32, 'big') + s.to_bytes(32, 'big'))}"
        self.born = time.time()
        return self.tok


def client():
    if shutil.which("swift") is None and os.environ.get("EXPO_ASC_KEY_ID"):
        return EnvASC(False)
    return ASC(False)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--since", default="", help="ISO date, show feedback created after it")
    p.add_argument("--json", action="store_true", help="print one JSON record per line")
    args = p.parse_args()
    api = client()
    for name, app in APPS.items():
        for kind, tag in KINDS.items():
            for r in api.all(f"/v1/apps/{app}/{kind}?limit=50"):
                a = r["attributes"]
                if a["createdDate"] < args.since:
                    continue
                if args.json:
                    print(json.dumps({"app": name, "kind": tag, "id": r["id"], "attributes": a}))
                    continue
                print(f"{a['createdDate'][:16]} {name:9} {tag:10} {a.get('deviceModel', '')} iOS {a.get('osVersion', '')}: {a.get('comment') or ''}")


if __name__ == "__main__":
    main()
