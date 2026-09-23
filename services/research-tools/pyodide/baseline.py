#!/usr/bin/env python3
from __future__ import annotations

import importlib
import json
import math
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))

import gateway as g  # noqa: E402

CANDIDATES = {
    "seqalign": g.SeqAlignSubmit,
    "stoichbalance": g.StoichBalanceSubmit,
    "unitdimcheck": g.UnitDimCheckSubmit,
    "faircheck": g.FAIRCheckSubmit,
    "mlreprocard": g.MLReproCardSubmit,
    "materialsfeaturizer": g.MaterialsFeaturizerSubmit,
    "causaldesigner": g.CausalDesignerSubmit,
    "chromatinaccess": g.ChromatinAccessSubmit,
    "aggregatepredict": g.AggregatePredictSubmit,
    "channeldwell": g.ChannelDwellSubmit,
    "grnaoptimizer": g.GRNAOptimizerSubmit,
    "rnafmembeds": g.RNAFMEmbedsSubmit,
    "powerplan": g.PowerPlanSubmit,
    "replicheck": g.RepliCheckSubmit,
    "geosummary": g.GeoSummarySubmit,
    "survivalfit": g.SurvivalFitSubmit,
    "timeseriesforecast": g.TimeSeriesForecastSubmit,
    "hhfit": g.HHFitSubmit,
    "spikefeatures": g.SpikeFeaturesSubmit,
    "calciumtraceml": g.CalciumTraceSubmit,
    "cellsegtrack": g.CellSegSubmit,
    "afmcurveml": g.AFMCurveSubmit,
    "tractionforceml": g.TractionForceSubmit,
    "figureminer": g.FigureMinerSubmit,
    "protocolgpt": g.ProtocolGPTSubmit,
}

EXPLICIT = {
    "chromatinaccess": {"sequence": "demo"},
    "aggregatepredict": {"sequence": "demo"},
    "grnaoptimizer": {"sequence": "ATGGCTAGCTAGGCTAGCTTACGGATCCGATCGATCGGCTAGCTAGGCTAACGGTTAGCCTAGG"},
    "rnafmembeds": {"sequence": "GGGAAACUUCGGUUUCCCGGCAUCGAUGCUAGCUAGCAUCG"},
    "protocolgpt": {"methods": "Cells were centrifuged at 500 x g for 5 min at 4 C. "
                               "The pellet was resuspended in 200 uL PBS and incubated for 30 min at 37 C."},
    "powerplan": {"demo": True},
}

MODULES = [
    "tools_seqalign", "tools_stoich", "tools_units", "tools_fair", "tools_mlrepro",
    "tools_materials", "tools_causal", "tools_genomics", "tools_dnarna", "tools_power",
    "tools_repli", "tools_geo", "tools_survival", "tools_forecast", "tools_neuro",
    "tools_imaging", "tools_figure", "tools_protocol",
]

CLOCK_FIELDS = {"elapsed_ms", "runtime_ms", "generated_at", "timestamp"}

def norm(x):
    if isinstance(x, float):
        return None if math.isnan(x) else float(f"{x:.6g}")
    if isinstance(x, dict):
        return {k: norm(v) for k, v in x.items() if k not in CLOCK_FIELDS}
    if isinstance(x, (list, tuple)):
        return [norm(v) for v in x]
    return x

def registry() -> dict[str, tuple[str, str]]:
    out: dict[str, tuple[str, str]] = {}
    for name in MODULES:
        mod = importlib.import_module(name)
        for key, value in vars(mod).items():
            if key.endswith("_RUNNERS") and isinstance(value, dict):
                for tool, fn in value.items():
                    out[tool] = (name, fn.__name__)
    return out

def payload_for(tool: str) -> dict:
    if tool in EXPLICIT:
        return EXPLICIT[tool]
    seen: dict[str, dict] = {}

    def capture(t: str, payload: dict) -> dict:
        seen[t] = payload
        return {}

    original = g._dispatch
    g._dispatch = capture
    try:
        getattr(g, f"submit_{tool}")(CANDIDATES[tool]())
    finally:
        g._dispatch = original
    return seen[tool]

def main(dest: str) -> int:
    reg = registry()
    out: dict[str, dict] = {}
    failed: list[str] = []
    for tool in CANDIDATES:
        module, fn = reg[tool]
        payload = payload_for(tool)
        result = getattr(importlib.import_module(module), fn)(payload)
        if isinstance(result, dict) and result.get("error"):
            failed.append(f"{tool}: {result['error']}")
            continue
        out[tool] = {"module": module, "fn": fn, "payload": payload,
                     "expected": json.loads(json.dumps(norm(result), default=str))}
    Path(dest).write_text(json.dumps(out))
    print(f"{len(out)} baselines written to {dest}")
    for line in failed:
        print("no baseline:", line)
    return 1 if failed else 0

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("usage: python3 pyodide/baseline.py <out.json>")
        sys.exit(2)
    sys.exit(main(sys.argv[1]))
