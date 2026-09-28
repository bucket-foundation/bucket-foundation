from __future__ import annotations

import json
import os

from .auth import AuthError, TokenStore, anonymous
from .service import ToolError, Workbench

MCP_CODES = {
    "unauthorized": -32001,
    "forbidden": -32003,
    "rate_limited": -32029,
    "busy": -32030,
    "unknown_tool": -32601,
    "bad_arguments": -32602,
}

class McpBridge:
    def __init__(self, bench: Workbench | None = None, tokens: TokenStore | None = None, env=os.environ):
        self._bench = bench
        self.tokens = tokens or TokenStore()
        self.env = env

    @property
    def bench(self) -> Workbench:
        if self._bench is None:
            self._bench = Workbench()
        return self._bench

    def principal(self):
        secret = self.env.get("BUCKET_WORKBENCH_TOKEN")
        return self.tokens.verify(secret) if secret else anonymous()

    def tools(self) -> list[dict]:
        try:
            return self.bench.mcp_tools(self.principal())
        except AuthError:
            return self.bench.mcp_tools(anonymous())

    def has(self, name: str) -> bool:
        return self.bench.has(name)

    def call(self, id_, name: str, args: dict) -> dict:
        try:
            p = self.principal()
        except AuthError as exc:
            self.bench.audit(anonymous(), name, "?", f"refused: {exc}")
            return {"jsonrpc": "2.0", "id": id_, "error": {"code": -32001, "message": f"unauthorized: {exc}"}}
        try:
            result = self.bench.call(p, name, args)
        except ToolError as exc:
            return {
                "jsonrpc": "2.0",
                "id": id_,
                "error": {"code": MCP_CODES.get(exc.code, -32603), "message": f"{exc.code}: {exc}", "data": exc.data},
            }
        if isinstance(result, dict) and "run_id" in result and "value" in result:
            payload = result["value"] if result.get("ok") else result
        elif isinstance(result, dict) and "run_id" in result and not result.get("ok", True):
            return {
                "jsonrpc": "2.0",
                "id": id_,
                "error": {"code": -32603, "message": f"{name} failed: {result.get('meaning')}", "data": result},
            }
        else:
            payload = result
        if "content" in payload and isinstance(payload.get("content"), list):
            return {"jsonrpc": "2.0", "id": id_, "result": payload}
        return {
            "jsonrpc": "2.0",
            "id": id_,
            "result": {"content": [{"type": "text", "text": json.dumps(payload, indent=2, default=str)}]},
        }
