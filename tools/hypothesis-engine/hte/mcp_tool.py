"""The `hypothesize` MCP tool definition: what `bucket-mcp` (or another MCP
host) registers to expose `hte.api.hypothesize` over `hte-serve`'s
`POST /hypothesize` endpoint (`hte/serve.py`), matching `docs/
K12-INTEGRATION.md`'s own tool shape, expanded for the production-adapter
request and response `hte.api.hypothesize` reads and writes (`hte/api.py`'s
own module docstring names every field).

This module defines no server of its own and imports nothing from
`bucket-mcp`: per `docs/RESEARCH-OS-INTEGRATION.md`'s own "this section
names the seam, it does not cut it" rule, wiring `TOOL_DEFINITION` into a
live `bucket-mcp.py` tool handler stays bucket-mcp's own change to make.

TypeScript registration sketch, for a bucket-mcp tool handler that speaks
JSON-RPC/stdio and calls this package's own HTTP surface over `hte-serve`:

    import { TOOL_DEFINITION } from "./hypothesize-tool.json"; // this module's TOOL_DEFINITION, exported once as JSON

    const HTE_SERVE_URL = process.env.HTE_SERVE_URL ?? "http://127.0.0.1:8420";

    server.registerTool(TOOL_DEFINITION.name, TOOL_DEFINITION, async (input) => {
      const res = await fetch(`${HTE_SERVE_URL}/hypothesize`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      const body = await res.json();
      if (!res.ok || body.ok === false) {
        return { isError: true, content: [{ type: "text", text: body.error ?? `hte-serve returned ${res.status}` }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(body) }] };
    });

`hte-serve` binds to localhost with no authentication of its own
(`hte/serve.py`'s own module docstring): this handler, and whatever
process starts `hte-serve` alongside `bucket-mcp`, carry the whole trust
boundary between them.
"""
from __future__ import annotations

from typing import Any

TOOL_NAME = "hypothesize"

_PRODUCTION_RECORD_SCHEMA: dict[str, Any] = {
    "type": "object",
    "description": "One production record, docs/PRODUCTION-SCHEMA.md's own JSON shape.",
    "required": ["id", "created_at", "author_role", "grade_band", "school_or_district_id", "research_question", "review"],
    "properties": {
        "id": {"type": "string"},
        "created_at": {"type": "string", "format": "date-time"},
        "author_role": {"type": "string", "enum": ["student", "teacher", "researcher", "agent"]},
        "grade_band": {"type": "string"},
        "school_or_district_id": {"type": "string"},
        "research_question": {"type": "string"},
        "provenance": {"type": "string"},
        "claims": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["text", "stance"],
                "properties": {
                    "text": {"type": "string"},
                    "stance": {"type": "string", "enum": ["supports", "refutes", "extends"]},
                    "slots": {
                        "type": "object",
                        "properties": {
                            "actor": {"type": ["string", "null"]},
                            "action": {"type": ["string", "null"]},
                            "object": {"type": ["string", "null"]},
                            "place": {"type": ["string", "null"]},
                            "mechanism": {"type": ["string", "null"]},
                        },
                    },
                    "interval": {
                        "type": ["object", "null"],
                        "properties": {"start": {"type": "integer"}, "end": {"type": "integer"}},
                    },
                    "evidence": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "required": ["source_id", "locator", "quote", "kind", "tier"],
                            "properties": {
                                "source_id": {"type": "string"},
                                "locator": {"type": "string"},
                                "quote": {"type": "string"},
                                "kind": {
                                    "type": "string",
                                    "enum": [
                                        "material", "textual", "genetic", "linguistic", "astronomical",
                                        "geological", "oral_tradition", "iconographic", "model_prior",
                                    ],
                                },
                                "tier": {"type": "string", "enum": ["T1", "T2", "T3", "T4", "T5", "T6"]},
                                "citations": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "required": ["type", "value"],
                                        "properties": {
                                            "type": {"type": "string", "enum": ["doi", "url", "feed402_envelope"]},
                                            "value": {"type": "string"},
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        "review": {
            "type": "object",
            "required": ["status"],
            "properties": {
                "status": {
                    "type": "string",
                    "enum": ["draft", "peer-reviewed", "teacher-reviewed", "accepted", "retracted"],
                },
                "history": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "required": ["status", "date"],
                        "properties": {"status": {"type": "string"}, "date": {"type": "string"}},
                    },
                },
            },
        },
    },
}

TOOL_DEFINITION: dict[str, Any] = {
    "name": TOOL_NAME,
    "description": (
        "Run a hypothesis-engine campaign over one or more K-12 research productions and "
        "return its ranked timeline, gap nodes, coverage, and self-report."
    ),
    "inputSchema": {
        "type": "object",
        "required": ["productions"],
        "properties": {
            "productions": {
                "oneOf": [
                    _PRODUCTION_RECORD_SCHEMA,
                    {"type": "array", "items": _PRODUCTION_RECORD_SCHEMA, "minItems": 1},
                ],
                "description": "One production record or a list of them (docs/PRODUCTION-SCHEMA.md).",
            },
            "status_min": {
                "type": "string",
                "enum": ["draft", "peer-reviewed", "teacher-reviewed", "accepted"],
                "default": "peer-reviewed",
            },
            "seeds": {"type": "integer", "minimum": 1, "default": 1},
            "max_hypotheses": {"type": "integer", "minimum": 1, "default": 100},
            "llm_mode": {
                "type": "string",
                "enum": ["fake", "claude"],
                "description": "'fake' forces the deterministic no-network stand-in; omit for a real claude -p run.",
            },
            "replay_only": {
                "type": "boolean",
                "default": False,
                "description": "fail on any LLM cache miss instead of making a live call",
            },
            "prior_profile": {
                "type": "string",
                "enum": ["consensus", "skeptic", "fringe", "uniform"],
                "default": "consensus",
            },
        },
    },
    "outputSchema": {
        "type": "object",
        "required": ["ok"],
        "properties": {
            "ok": {"type": "boolean"},
            "error": {"type": "string"},
            "run_id": {"type": "string"},
            "artifact_version": {"type": "string"},
            "models": {
                "type": "object",
                "description": "Which CLI model alias backed each role this run (model-policy.json's own shape: roles + escalation).",
                "properties": {
                    "roles": {"type": "object"},
                    "escalation": {"type": "string"},
                },
            },
            "corpus": {
                "type": "object",
                "properties": {
                    "n_productions": {"type": "integer"},
                    "status_min": {"type": "string"},
                    "prior_profile": {"type": "string"},
                    "n_sources": {"type": ["integer", "null"]},
                    "n_evidence": {"type": ["integer", "null"]},
                    "n_hypotheses_generated": {"type": ["integer", "null"]},
                    "n_survivors": {"type": ["integer", "null"]},
                },
            },
            "timeline": {
                "type": "object",
                "properties": {
                    "bins": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "time_bin": {
                                    "type": "object",
                                    "properties": {"index": {"type": "integer"}, "label": {"type": "string"}},
                                },
                                "ranked_hypotheses": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "hypothesis_id": {"type": "string"},
                                            "address": {"type": "integer"},
                                            "slots": {"type": "object"},
                                            "slot_labels": {"type": "object"},
                                            "opinion": {
                                                "type": ["object", "null"],
                                                "properties": {
                                                    "b": {"type": "number"}, "d": {"type": "number"},
                                                    "u": {"type": "number"}, "a": {"type": "number"},
                                                    "P": {"type": "number"},
                                                },
                                            },
                                            "elo": {"type": ["number", "null"]},
                                            "linked_evidence": {
                                                "type": "object",
                                                "properties": {
                                                    "supports": {"type": "array", "items": {"type": "string"}},
                                                    "refutes": {"type": "array", "items": {"type": "string"}},
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            "gap_nodes": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string"},
                        "kind": {"type": "string"},
                        "description": {"type": "string"},
                        "would_move": {"type": "array", "items": {"type": "integer"}},
                        "value_of_information": {"type": "number"},
                    },
                },
            },
            "coverage": {
                "type": "object",
                "properties": {
                    "observed": {"type": "integer"},
                    "chao1_estimate": {"type": "number"},
                    "missing_mass": {"type": "number"},
                    "coverage_low": {"type": "number"},
                    "coverage_high": {"type": "number"},
                },
            },
            "surprise_items": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string"}, "source_id": {"type": "string"},
                        "kind": {"type": "string"}, "tier": {"type": "string"}, "quote": {"type": "string"},
                        "actor": {"type": ["string", "null"]}, "action": {"type": ["string", "null"]},
                        "object": {"type": ["string", "null"]}, "place": {"type": ["string", "null"]},
                        "mechanism": {"type": ["string", "null"]},
                    },
                },
            },
            "prior_profile_robustness": {
                "type": "object",
                "properties": {
                    "requested_profile": {"type": "string"},
                    "profiles": {"type": "array", "items": {"type": "string"}},
                    "stable_fraction": {"type": ["number", "null"]},
                },
            },
            "self_report": {
                "type": "object",
                "properties": {
                    "assumptions": {"type": "array", "items": {"type": "string"}},
                    "incomplete_vocabularies": {"type": "array", "items": {"type": "string"}},
                    "missing_mass_estimate": {},
                    "calibration_summary": {"type": ["string", "null"]},
                    "target_blind_steady": {"type": ["boolean", "null"]},
                    "refusal_counts": {"type": "object"},
                },
            },
            "calibration": {
                "type": ["object", "null"],
                "properties": {
                    "mode": {"type": "string"},
                    "brier_score": {"type": ["number", "null"]},
                    "coverage_of_truth": {"type": ["number", "null"]},
                },
            },
            "timings": {
                "type": "object",
                "properties": {"total_s": {"type": "number"}, "llm_wall_time_s": {"type": "object"}},
            },
            "request_id": {"type": "string"},
        },
    },
}

__all__ = ["TOOL_NAME", "TOOL_DEFINITION"]
