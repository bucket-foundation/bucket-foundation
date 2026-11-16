#!/usr/bin/env python3
import json
import os
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV = os.path.expanduser("~/.config/bucket/hosted-supabase.env")


def db_url():
    if os.environ.get("SUPABASE_DB_POOLER_URL"):
        return os.environ["SUPABASE_DB_POOLER_URL"]
    for line in open(ENV):
        if line.startswith("SUPABASE_DB_POOLER_URL="):
            return line.split("=", 1)[1].strip()
    sys.exit("SUPABASE_DB_POOLER_URL missing")


def rows(path):
    out = []
    for line in open(path):
        r = json.loads(line)
        parent = next((d["depends_on_id"] for d in r.get("dependencies", []) if d.get("type") == "parent-child"), None)
        out.append({"id": r["id"], "title": r["title"], "status": r["status"], "priority": r.get("priority"),
                    "issue_type": r.get("issue_type"), "labels": r.get("labels", []), "parent": parent,
                    "description": r.get("description"), "notes": r.get("notes"), "data": r,
                    "updated_at": r.get("updated_at")})
    return out


SQL = """
\\set content `cat {path}`
insert into bucket.beads (id, title, status, priority, issue_type, labels, parent, description, notes, data, updated_at, synced_at)
select x->>'id', x->>'title', x->>'status', (x->>'priority')::int, x->>'issue_type',
       coalesce(array(select jsonb_array_elements_text(x->'labels')), '{{}}'), x->>'parent',
       x->>'description', x->>'notes', x->'data', (x->>'updated_at')::timestamptz, now()
from jsonb_array_elements(:'content'::jsonb) x
on conflict (id) do update set title = excluded.title, status = excluded.status, priority = excluded.priority,
  issue_type = excluded.issue_type, labels = excluded.labels, parent = excluded.parent,
  description = excluded.description, notes = excluded.notes, data = excluded.data,
  updated_at = excluded.updated_at, synced_at = now();
select count(*) from bucket.beads;
"""


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, ".beads", "issues.jsonl")
    data = rows(path)
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump(data, f)
        tmp = f.name
    try:
        r = subprocess.run(["psql", db_url(), "-v", "ON_ERROR_STOP=1", "-Atq"], input=SQL.format(path=tmp),
                           text=True, capture_output=True)
    finally:
        os.unlink(tmp)
    if r.returncode:
        sys.exit(r.stderr)
    print(f"synced {len(data)} beads, table holds {r.stdout.strip()}")


if __name__ == "__main__":
    main()
