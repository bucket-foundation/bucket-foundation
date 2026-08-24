#!/usr/bin/env python3
"""
bucket-mcp, single Model Context Protocol server for bucket.foundation.

Replaces the old split (bucket-canon-mcp + standalone bucket-mcp repo).
One server. All tools. This file is canonical, the standalone bucket-mcp
GitHub repo is being archived.

Tools:
 CANON (local filesystem, fast, no network):
 - canon_search search 599 claim cards by query
 - canon_get_claim fetch a single claim card
 - canon_list_branches list 9 canon branches with counts
 - canon_list_bridges list detected multi-branch primitives
 - canon_get_bridge fetch a detected bridge by slug

 RESEARCH RAIL (hits bucket.foundation HTTPS API):
 - bucket_research paid research via feed402/0.2 envelopes
 - bucket_cite CSL-JSON citation from DOI or URL

Transport: stdio JSON-RPC 2.0.

Register in Claude Code:
 claude mcp add --scope user --transport stdio bucket \\
 -- python3 /home/gian/agfarms/bucket-foundation/mcp-server/bucket-mcp.py

Register in Claude Desktop (config.json):
 "bucket": {
 "command": "python3",
 "args": ["/path/to/bucket-mcp.py"]
 }
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


# ---------- Research rail tools (merged from standalone bucket-mcp) ----------

BUCKET_BASE = __import__('os').environ.get('BUCKET_BASE', 'https://www.bucket.foundation')
RESEARCH_PATH = '/api/research'
DOI_RE = re.compile(r"10\.\d{4,9}/[^\s]+", re.IGNORECASE)
HTTP_TIMEOUT = 20


def _post_json(url: str, body: dict) -> dict:
    """POST JSON, return {ok, status, body|error}."""
    data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, headers={
        'Content-Type': 'application/json', 'Accept': 'application/json',
        'User-Agent': 'bucket-mcp/2.0'
    }, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT) as r:
            return {'ok': True, 'status': r.status, 'body': json.loads(r.read())}
    except urllib.error.HTTPError as e:
        try: body = json.loads(e.read())
        except Exception: body = None
        return {'ok': False, 'status': e.code, 'error': f'HTTP {e.code}', 'body': body}
    except Exception as e:
        return {'ok': False, 'status': 0, 'error': f'{type(e).__name__}: {e}'}


def tool_bucket_research(query: str, tier: str = 'insight') -> dict:
    if tier not in ('raw', 'query', 'insight'):
        return {'error': "tier must be one of: raw, query, insight"}
    url = BUCKET_BASE.rstrip('/') + RESEARCH_PATH
    r = _post_json(url, {'query': query, 'tier': tier})
    if not r['ok']:
        return {'ok': False, 'error': r.get('error'), 'upstream_status': r.get('status'),
                'hint': 'paid research route; may require x402 challenge payment'}
    return {'ok': True, 'tier': tier, 'query': query, 'envelope': r['body']}


def tool_bucket_cite(doi_or_url: str) -> dict:
    doi_match = DOI_RE.search(doi_or_url)
    if doi_match:
        doi = doi_match.group(0).rstrip(".,;)")
        req = urllib.request.Request(
            f"https://doi.org/{doi}",
            headers={'Accept': 'application/vnd.citationstyles.csl+json',
                     'User-Agent': 'bucket-mcp/2.0'},
        )
        try:
            with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT) as r:
                return {'ok': True, 'doi': doi, 'csl_json': json.loads(r.read().decode())}
        except Exception as e:
            return {'ok': False, 'doi': doi, 'error': f'{type(e).__name__}: {e}'}
    # Non-DOI URL → minimal webpage CSL stub
    return {'ok': True, 'csl_json': {
        'type': 'webpage', 'URL': doi_or_url, 'id': doi_or_url
    }, 'note': 'no DOI detected; returned minimal webpage CSL stub'}


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
    {
        'name': 'bucket_research',
        'description': 'Paid research via bucket.foundation /api/research (feed402/0.2 envelopes). Returns either a cited answer (200) or an x402 payment challenge (402). Use for primary-source research backed by PubMed, Semantic Scholar, OpenAlex, ClinicalTrials, PubChem.',
        'inputSchema': {
            'type': 'object',
            'properties': {
                'query': {'type': 'string', 'description': 'natural-language research query'},
                'tier': {'type': 'string', 'enum': ['raw', 'query', 'insight'], 'default': 'insight',
                         'description': 'raw=$0.010/call, query=$0.005, insight=$0.002'},
            },
            'required': ['query'],
        },
    },
    {
        'name': 'bucket_cite',
        'description': 'Generate a CSL-JSON citation block from a DOI or URL. Uses doi.org content negotiation for DOIs; falls back to a minimal webpage CSL stub for non-DOI URLs.',
        'inputSchema': {
            'type': 'object',
            'properties': {
                'doi_or_url': {'type': 'string', 'description': 'a DOI (10.xxxx/yyyy) or any URL'},
            },
            'required': ['doi_or_url'],
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
                'serverInfo': {'name': 'bucket', 'version': '2.0.0'},
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
            elif name == 'bucket_research':
                result = tool_bucket_research(args.get('query', ''), args.get('tier', 'insight'))
            elif name == 'bucket_cite':
                result = tool_bucket_cite(args.get('doi_or_url', ''))
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
