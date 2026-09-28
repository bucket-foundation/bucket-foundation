from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

REGISTRY_PATH = Path(__file__).resolve().parents[1] / "registry.json"
SCHEMA = "workbench.registry/v1"
GROUPS = (
    "prime_directions",
    "profile",
    "advisor",
    "network",
    "visual",
    "cadence",
    "statements",
    "bucketmath",
    "corpus",
    "helix",
)
KINDS = ("cli", "python", "mcp_proxy")
SCOPES = ("read", "local", "gdrive", "repo", "personal")
WRITES = ("none", "local", "gdrive", "repo")
SCOPE_WRITES = {
    "read": {"none"},
    "local": {"none", "local"},
    "personal": {"none", "local"},
    "gdrive": {"local", "gdrive"},
    "repo": {"local", "repo"},
}
STATUSES = ("live", "pending")
ARG_TYPES = {"string", "integer", "number", "boolean", "path"}

class RegistryError(ValueError):
    pass

@dataclass(frozen=True)
class Tool:
    id: str
    group: str
    kind: str
    title: str
    description: str
    scope: str
    writes: str
    timeout_s: int
    status: str
    input_schema: dict
    command: tuple = ()
    cwd: str = "."
    function: str = ""
    exit_codes: dict = field(default_factory=dict)
    bead: str = ""
    blocked_by: str = ""

    @property
    def live(self) -> bool:
        return self.status == "live"

    def mcp_spec(self) -> dict:
        prefix = "" if self.live else f"[pending {self.bead}: {self.blocked_by}] "
        return {"name": self.id, "description": prefix + self.description, "inputSchema": self.input_schema}

@dataclass(frozen=True)
class Registry:
    tools: dict
    limits: dict

    def get(self, tool_id: str) -> Tool | None:
        return self.tools.get(tool_id)

    def by_group(self) -> dict:
        out: dict[str, list[Tool]] = {}
        for t in self.tools.values():
            out.setdefault(t.group, []).append(t)
        return out

def _slots(parts, props: set, where: str) -> set:
    found = set()
    for part in parts:
        if isinstance(part, list):
            found |= _slots(part, props, where)
            continue
        if not isinstance(part, str):
            raise RegistryError(f"{where}: command parts must be strings or lists")
        if part.startswith("?") and part[1:] not in props:
            raise RegistryError(f"{where}: condition {part} has no input_schema property")
        if part.startswith("{") and part.endswith("}"):
            name = part[1:-1]
            if name != "out" and name not in props:
                raise RegistryError(f"{where}: slot {part} has no input_schema property")
            found.add(name)
    return found

def _tool(raw: dict, i: int) -> Tool:
    where = f"tools[{i}]"
    for key in ("id", "group", "kind", "title", "description", "scope", "writes", "timeout_s", "status"):
        if key not in raw:
            raise RegistryError(f"{where}: missing {key}")
    if raw["group"] not in GROUPS:
        raise RegistryError(f"{where}: unknown group {raw['group']}")
    if raw["kind"] not in KINDS:
        raise RegistryError(f"{where}: unknown kind {raw['kind']}")
    if raw["scope"] not in SCOPES:
        raise RegistryError(f"{where}: unknown scope {raw['scope']}")
    if raw["writes"] not in WRITES:
        raise RegistryError(f"{where}: unknown writes {raw['writes']}")
    if raw["writes"] not in SCOPE_WRITES[raw["scope"]]:
        raise RegistryError(f"{where}: writes {raw['writes']} exceeds scope {raw['scope']}")
    if raw["status"] not in STATUSES:
        raise RegistryError(f"{where}: unknown status {raw['status']}")
    if raw["status"] == "pending" and not (raw.get("bead") and raw.get("blocked_by")):
        raise RegistryError(f"{where}: pending tools need bead and blocked_by")
    schema = raw.get("input_schema", {"type": "object", "properties": {}})
    props = schema.get("properties", {})
    for name, spec in props.items():
        if spec.get("type") not in ARG_TYPES:
            raise RegistryError(f"{where}: property {name} has unknown type")
    for req in schema.get("required", []):
        if req not in props:
            raise RegistryError(f"{where}: required {req} is not a property")
    command = tuple(raw.get("command", ()))
    if raw["kind"] == "cli" and raw["status"] == "live":
        if not command:
            raise RegistryError(f"{where}: cli tools need a command")
        _slots(command, set(props), where)
    if raw["kind"] == "python" and raw["status"] == "live" and ":" not in raw.get("function", ""):
        raise RegistryError(f"{where}: python tools need function module:name")
    if int(raw["timeout_s"]) <= 0:
        raise RegistryError(f"{where}: timeout_s must be positive")
    return Tool(
        id=raw["id"],
        group=raw["group"],
        kind=raw["kind"],
        title=raw["title"],
        description=raw["description"],
        scope=raw["scope"],
        writes=raw["writes"],
        timeout_s=int(raw["timeout_s"]),
        status=raw["status"],
        input_schema=schema,
        command=command,
        cwd=raw.get("cwd", "."),
        function=raw.get("function", ""),
        exit_codes={str(k): v for k, v in raw.get("exit_codes", {}).items()},
        bead=raw.get("bead", ""),
        blocked_by=raw.get("blocked_by", ""),
    )

def parse(doc: dict) -> Registry:
    if doc.get("schema") != SCHEMA:
        raise RegistryError(f"schema must be {SCHEMA}")
    tools: dict[str, Tool] = {}
    for i, raw in enumerate(doc.get("tools", [])):
        t = _tool(raw, i)
        if t.id in tools:
            raise RegistryError(f"duplicate tool id {t.id}")
        tools[t.id] = t
    limits = doc.get("limits", {})
    for g in limits.get("group_caps", {}):
        if g not in GROUPS:
            raise RegistryError(f"limits: unknown group {g}")
    return Registry(tools=tools, limits=limits)

def load(path: Path = REGISTRY_PATH) -> Registry:
    return parse(json.loads(Path(path).read_text()))
