import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from asc_setup import ASC, rel, upload

HERE = os.path.dirname(os.path.abspath(__file__))
APP = "6825123451"
SUBTITLE = "One word, every language. Learn it free."
HOST = "https://www.bucket.foundation"
INVOCATIONS = [
    ("A word in four languages", f"{HOST}/s/w?id=night&g=night&f=fr%3Anuit%7Ces%3Anoche%7Cit%3Anotte%7Cde%3ANacht"),
    ("A language set", f"{HOST}/s/l?l=fr.es.it&r=en"),
    ("A physics lesson", f"{HOST}/s/a?d=physics&id=newton-2&t=Newton%27s%20second%20law&b=Physics&q=Force%20equals%20mass%20times%20acceleration."),
]


def clip_bundle(api, build_number):
    query = f"/v1/builds?filter[app]={APP}&sort=-uploadedDate&limit=5&include=buildBundles"
    if build_number:
        query = f"/v1/builds?filter[app]={APP}&filter[version]={build_number}&limit=1&include=buildBundles"
    d = api.get(query)
    bundles = {b["id"]: b for b in d.get("included", []) if b["type"] == "buildBundles"}
    for build in d.get("data", []):
        for ref in build["relationships"]["buildBundles"].get("data", []):
            b = bundles.get(ref["id"])
            if b and b["attributes"].get("bundleType") == "APP_CLIP":
                return build, b
    return None, None


def default_experience(api, clip_id, header):
    existing = api.all(f"/v1/appClips/{clip_id}/appClipDefaultExperiences")
    if existing:
        print(f"  default experience exists {existing[0]['id']}")
        return
    d = api.write("default App Clip experience", "POST", "/v1/appClipDefaultExperiences",
                  {"data": {"type": "appClipDefaultExperiences", "attributes": {"action": "OPEN"}, "relationships": {"appClip": rel("appClips", clip_id)}}})
    if not d:
        return
    loc = api.write("default experience subtitle (en-US)", "POST", "/v1/appClipDefaultExperienceLocalizations",
                    {"data": {"type": "appClipDefaultExperienceLocalizations", "attributes": {"locale": "en-US", "subtitle": SUBTITLE},
                              "relationships": {"appClipDefaultExperience": rel("appClipDefaultExperiences", d["data"]["id"])}}})
    if loc:
        upload(api, "default experience header image", "appClipHeaderImages", {},
               {"appClipDefaultExperienceLocalization": rel("appClipDefaultExperienceLocalizations", loc["data"]["id"])}, header)


def testflight_invocations(api, bundle_id):
    have = {i["attributes"].get("url") for i in api.all(f"/v1/buildBundles/{bundle_id}/betaAppClipInvocations")}
    for title, url in INVOCATIONS:
        if url in have:
            print(f"  invocation exists: {title}")
            continue
        api.write(f"TestFlight App Clip invocation: {title}", "POST", "/v1/betaAppClipInvocations", {
            "data": {"type": "betaAppClipInvocations", "attributes": {"url": url},
                     "relationships": {"buildBundle": rel("buildBundles", bundle_id),
                                       "betaAppClipInvocationLocalizations": {"data": [{"type": "betaAppClipInvocationLocalizations", "id": "${loc}"}]}}},
            "included": [{"type": "betaAppClipInvocationLocalizations", "id": "${loc}", "attributes": {"locale": "en-US", "title": title}}],
        })


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--apply", action="store_true")
    p.add_argument("--build", default="", help="build number, latest upload with a clip when empty")
    p.add_argument("--header", default=os.path.join(HERE, "clip-header.png"))
    args = p.parse_args()
    api = ASC(args.apply)
    clips = api.all(f"/v1/apps/{APP}/appClips")
    if not clips:
        sys.exit("no App Clip on Bucket yet: upload a build that embeds foundation.bucket.app.Clip and wait for processing")
    clip = clips[0]
    print(f"  app clip {clip['attributes'].get('bundleId')} {clip['id']}")
    default_experience(api, clip["id"], args.header)
    build, bundle = clip_bundle(api, args.build)
    if not bundle:
        sys.exit("no processed build with the App Clip yet")
    print(f"  build {build['attributes']['version']} {build['attributes'].get('processingState')}")
    testflight_invocations(api, bundle["id"])


if __name__ == "__main__":
    main()
