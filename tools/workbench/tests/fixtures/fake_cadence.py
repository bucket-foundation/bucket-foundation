import json
import os
import sys
import time

mode = os.environ.get("FAKE_CADENCE_MODE", "ok")
count_file = os.environ.get("FAKE_CADENCE_COUNT")
if count_file:
    with open(count_file, "a") as fh:
        fh.write("start\n")
if mode == "slow_start":
    time.sleep(30)
for line in sys.stdin:
    req = json.loads(line)
    method, rid = req.get("method"), req.get("id")
    if method == "initialize":
        out = {"protocolVersion": "2024-11-05", "capabilities": {"tools": {}}}
    elif method == "tools/list":
        out = {
            "tools": [
                {"name": "create_track", "description": "Create a track", "inputSchema": {"type": "object"}},
                {"name": "render", "description": "Render", "inputSchema": {"type": "object"}},
            ]
        }
    elif method == "tools/call":
        name = req["params"]["name"]
        if name == "hang" or mode == "hang_calls":
            time.sleep(60)
        if name == "crash":
            sys.exit(3)
        out = {"content": [{"type": "text", "text": json.dumps({"called": name, "args": req["params"]["arguments"]})}]}
    else:
        out = {}
    sys.stdout.write(json.dumps({"jsonrpc": "2.0", "id": rid, "result": out}) + "\n")
    sys.stdout.flush()
