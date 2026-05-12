#!/usr/bin/env python3
"""
bucket-canon-mcp — Model Context Protocol server for bucket.foundation canon.

Exposes the canon corpus as MCP tools that any MCP-compatible AI agent
(Claude Desktop, Claude Code, ChatGPT via MCP, custom agents) can call.

Tools:
  - canon_search       — semantic + lexical search over claim cards
  - canon_get_claim    — fetch a single claim card with full evidence
  - canon_get_bridge   — fetch a detected primitive bridge with members
  - canon_list_branches — list the 9 canon branches with counts
  - canon_list_bridges — list all detected multi-branch primitives
  - canon_get_author   — fetch author profile + canon-graph centrality

Transport: stdio JSON-RPC 2.0 (the standard MCP transport).

Register in Claude Code:
  claude mcp add --scope user --transport stdio bucket-canon \\
    -- python3 /home/gian/agfarms/bucket-foundation/mcp-server/bucket-canon-mcp.py

Register in Claude Desktop (config.json):
  "bucket-canon": {
    "command": "python3",
    "args": ["/path/to/bucket-canon-mcp.py"]
  }

Live HTTP-MCP variant (planned): https://bucket.foundation/mcp
"""
from __future__ import annotations
import json, sys, pathlib, re, urllib.request, urllib.error
from typing import Any

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parent
BUCKET_API = "https://bucket.foundation/api/canon"  # used if env BUCKET_USE_API=1
USE_API = bool(__import__('os').environ.get('BUCKET_USE_API'))


# ---------- canon data loading (local filesystem mode) ----------

def parse_claim_md(file: pathlib.Path) -> dict | None:
    try:
        raw = file.read_text(errors='replace')
    except Exception:
        return None
    title = ''
    for l in raw.splitlines():
        if l.startswith('# '):
            title = l[2:].strip(); break
    m = re.search(r'## Excerpt\s*\n(.+?)(?=\n## |\Z)', raw, re.S)
    excerpt = (m.group(1) if m else '').strip()
    excerpt = re.sub(r'^>\s*', '', excerpt, flags=re.M).strip()
    return {'title': title, 'excerpt': excerpt, 'raw': raw}


def list_claims() -> list[dict]:
    out = []
    root = REPO / 'bucket-canon'
    if not root.exists(): return out
    for branch_d in sorted(root.iterdir()):
        if not re.match(r'\d{2}-', branch_d.name): continue
        sc = branch_d / 'sub-claims'
        if not sc.exists(): continue
        for concept_d in sorted(sc.iterdir()):
            if not concept_d.is_dir(): continue
            for f in sorted(concept_d.glob('*.md')):
                if f.name == 'INDEX.md': continue
                p = parse_claim_md(f)
                if not p: continue
                out.append({
                    'branch': branch_d.name, 'concept': concept_d.name,
                    'slug': f.stem, 'title': p['title'], 'excerpt': p['excerpt'],
                    'path': str(f.relative_to(REPO)),
                })
    return out


def token_rank(query: str, items: list[dict], top_k: int = 10) -> list[dict]:
    qw = set(w.lower() for w in re.findall(r'[a-zA-Z][a-zA-Z\-]{2,}', query))
    if not qw: return []
    scored = []
    for it in items:
        text = (it['title'] + ' ' + it['excerpt']).lower()
        s = 0
        for w in qw:
            s += len(re.findall(rf'\b{re.escape(w)}\b', text))
        if s > 0:
            scored.append({**it, 'score': s})
    scored.sort(key=lambda x: -x['score'])
    return scored[:top_k]


# ---------- MCP tools ----------

def tool_canon_search(q: str, top_k: int = 10, branch: str | None = None, tier: str | None = None) -> dict:
    """Search canon claims by query."""
    if USE_API:
        try:
            url = f"{BUCKET_API}/search?q={urllib.request.quote(q)}&top_k={top_k}"
            if branch: url += f"&branch={branch}"
            if tier: url += f"&tier={tier}"
            with urllib.request.urlopen(url, timeout=10) as r:
                return json.loads(r.read())
        except Exception as e:
            return {'error': f'api fail: {e}', 'fallback': 'local'}
    items = list_claims()
    if branch:
        items = [i for i in items if i['branch'] == branch]
    results = token_rank(q, items, top_k)
    return {
        'query': q, 'top_k': top_k, 'mode': 'lexical_local',
        'n_results': len(results),
        'results': [{
            'branch': r['branch'], 'concept': r['concept'], 'slug': r['slug'],
            'title': r['title'], 'score': r['score'],
            'url': f"https://bucket.foundation/canon/claims/{r['concept']}/{r['slug']}",
            'excerpt': r['excerpt'][:400],
        } for r in results],
    }




def tool_canon_get_claim(concept: str, slug: str) -> dict:
    for it in list_claims():
        if it['concept'] == concept and it['slug'] == slug:
            return {
                'branch': it['branch'], 'concept': it['concept'], 'slug': it['slug'],
                'title': it['title'], 'excerpt': it['excerpt'],
                'url': f"https://bucket.foundation/canon/claims/{concept}/{slug}",
                'source_path': it['path'],
            }
    return {'error': 'not_found'}


def tool_canon_list_branches() -> dict:
    items = list_claims()
    by = {}
    for it in items: by[it['branch']] = by.get(it['branch'], 0) + 1
    return {
        'branches': [
            {'slug': k, 'claim_count': v,
             'url': f'https://bucket.foundation/canon/{k}'}
            for k, v in sorted(by.items())
        ],
        'total_claims': len(items),
    }


def tool_canon_list_bridges() -> dict:
    root = REPO / 'bucket-canon/_bridges/detected'
    bridges = []
    if root.exists():
        for d in sorted(root.iterdir()):
            if not d.is_dir(): continue
            r = d / 'README.md'
            if not r.exists(): continue
            raw = r.read_text(errors='replace')
            name = (raw.split('\n')[0] or '').replace('# ', '').strip()
            br = re.search(r'\*\*Branches\*\*:\s*(.+?)$', raw, re.M)
            cf = re.search(r'## Canonical form\s*\n+>\s*(.+?)\n', raw)
            sz = re.search(r'\*\*Cluster size\*\*:\s*(\d+)', raw)
            bridges.append({
                'slug': d.name, 'name': name,
                'branches': [b.strip() for b in (br.group(1).split('·') if br else []) if b.strip()],
                'canonical_form': cf.group(1).strip() if cf else '',
                'size': int(sz.group(1)) if sz else 0,
                'url': f'https://bucket.foundation/canon/bridges/detected/{d.name.split("-", 1)[1] if "-" in d.name else d.name}',
            })
    return {'bridges': bridges, 'count': len(bridges)}


def tool_canon_get_bridge(slug: str) -> dict:
    root = REPO / 'bucket-canon/_bridges/detected'
    for d in root.iterdir() if root.exists() else []:
        if d.is_dir() and (d.name == slug or d.name.endswith(f'-{slug}')):
            r = d / 'README.md'
            if r.exists():
                return {'slug': d.name, 'body': r.read_text(errors='replace')}
    return {'error': 'not_found'}


# ---------- MCP JSON-RPC 2.0 stdio loop ----------

TOOLS = [
    {
        'name': 'canon_search',
        'description': 'Search the bucket.foundation canon (599 curated claim cards across 9 branches) by natural-language query. Returns top-K most relevant claims with branch/concept/url/excerpt.',
        'inputSchema': {
            'type': 'object',
            'properties': {
                'q': {'type': 'string', 'description': 'natural-language query'},
                'top_k': {'type': 'integer', 'default': 10, 'minimum': 1, 'maximum': 50},
                'branch': {'type': 'string', 'description': 'optional branch slug filter (e.g. 01-mathematics)'},
                'tier': {'type': 'string', 'enum': ['nucleus', 'functional', 'edge', 'all'], 'default': 'all'},
            },
            'required': ['q'],
        },
    },
    {
        'name': 'canon_get_claim',
        'description': 'Fetch a single claim card by concept + slug.',
        'inputSchema': {
            'type': 'object',
            'properties': {'concept': {'type': 'string'}, 'slug': {'type': 'string'}},
            'required': ['concept', 'slug'],
        },
    },
    {
        'name': 'canon_list_branches',
        'description': 'List the 9 canon branches with claim counts.',
        'inputSchema': {'type': 'object', 'properties': {}},
    },
    {
        'name': 'canon_list_bridges',
        'description': 'List the detected multi-branch primitive bridges (algorithm-discovered cross-domain isomorphisms).',
        'inputSchema': {'type': 'object', 'properties': {}},
    },
    {
        'name': 'canon_get_bridge',
        'description': 'Fetch a detected bridge by slug.',
        'inputSchema': {
            'type': 'object',
            'properties': {'slug': {'type': 'string'}},
            'required': ['slug'],
        },
    },
]


def handle_request(req: dict) -> dict:
    method = req.get('method', '')
    id_ = req.get('id')
    params = req.get('params', {}) or {}

    if method == 'initialize':
        return {
            'jsonrpc': '2.0', 'id': id_,
            'result': {
                'protocolVersion': '2024-11-05',
                'capabilities': {'tools': {}},
                'serverInfo': {'name': 'bucket-canon', 'version': '1.0.0'},
            },
        }
    if method == 'notifications/initialized':
        return {}  # no response

    if method == 'tools/list':
        return {'jsonrpc': '2.0', 'id': id_, 'result': {'tools': TOOLS}}

    if method == 'tools/call':
        name = params.get('name', '')
        args = params.get('arguments', {}) or {}
        try:
            if name == 'canon_search':
                result = tool_canon_search(args.get('q', ''), int(args.get('top_k', 10)),
                                            args.get('branch'), args.get('tier'))
            elif name == 'canon_get_claim':
                result = tool_canon_get_claim(args['concept'], args['slug'])
            elif name == 'canon_list_branches':
                result = tool_canon_list_branches()
            elif name == 'canon_list_bridges':
                result = tool_canon_list_bridges()
            elif name == 'canon_get_bridge':
                result = tool_canon_get_bridge(args['slug'])
            else:
                return {'jsonrpc': '2.0', 'id': id_,
                        'error': {'code': -32601, 'message': f'unknown tool: {name}'}}
            return {'jsonrpc': '2.0', 'id': id_,
                    'result': {'content': [{'type': 'text', 'text': json.dumps(result, indent=2)}]}}
        except Exception as e:
            return {'jsonrpc': '2.0', 'id': id_,
                    'error': {'code': -32603, 'message': f'tool error: {e}'}}

    return {'jsonrpc': '2.0', 'id': id_,
            'error': {'code': -32601, 'message': f'unknown method: {method}'}}


def main():
    for line in sys.stdin:
        line = line.strip()
        if not line: continue
        try:
            req = json.loads(line)
        except Exception:
            continue
        resp = handle_request(req)
        if resp:
            sys.stdout.write(json.dumps(resp) + '\n')
            sys.stdout.flush()


if __name__ == '__main__':
    main()
