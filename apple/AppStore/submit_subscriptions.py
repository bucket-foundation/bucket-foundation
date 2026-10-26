import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from asc_setup import ASC, rel

GROUP = "22498866"
NOTES = {
    "com.polingual.yearly": "Yearly plan with a 3-day free trial. Unlocks every language system, placement, spaced review and speaking practice.",
    "com.polingual.monthly": "Monthly plan with a 3-day free trial. Unlocks every language system, placement, spaced review and speaking practice.",
}


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--apply", action="store_true")
    args = p.parse_args()
    api = ASC(args.apply)
    for sub in api.all(f"/v1/subscriptionGroups/{GROUP}/subscriptions"):
        a = sub["attributes"]
        print(f"-- {a['productId']} {a['state']}")
        if not a.get("reviewNote") and a["productId"] in NOTES:
            api.write("review note", "PATCH", f"/v1/subscriptions/{sub['id']}",
                      {"data": {"type": "subscriptions", "id": sub["id"], "attributes": {"reviewNote": NOTES[a["productId"]]}}})
        if a["state"] == "READY_TO_SUBMIT":
            api.write("submit for review", "POST", "/v1/subscriptionSubmissions",
                      {"data": {"type": "subscriptionSubmissions", "relationships": {"subscription": rel("subscriptions", sub["id"])}}})


if __name__ == "__main__":
    main()
