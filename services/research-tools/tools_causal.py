#!/usr/bin/env python3
"""
research-tools — CausalDesigner (REAL causal inference, CPU, no GPU, no network)
================================================================================

Per-field tool for **econ-social** (econ-social, 42,276 profiled researchers in
the research-atlas corpus). The atlas USERS_NEEDS roadmap names "causal-inference
tooling" as a top unmet software need for this field — the reproducibility crisis
is most acute here, and causal-inference best practice (DAGs, do-calculus, valid
adjustment sets, design choice) is under-adopted because the tooling has a steep
learning curve (DAGitty, dowhy, etc.).

Given a described study — treatment, outcome, confounders, and the edges of the
assumed causal graph — CausalDesigner does REAL causal-inference logic:

  1. Builds the causal DAG (networkx DiGraph) and validates it is acyclic.
  2. Enumerates the BACKDOOR PATHS between treatment and outcome (Pearl's
     back-door criterion: a path with an arrow INTO the treatment).
  3. Finds a VALID ADJUSTMENT SET that blocks every backdoor path while opening
     no new ones — using the real d-separation machinery (it blocks confounder
     chains/forks, and crucially does NOT condition on colliders or on
     descendants of the treatment, which would *introduce* bias).
  4. Recommends an estimator (DiD / RDD / IV / matching / regression-adjustment)
     from the declared design features, with the identifying assumptions and the
     concrete threats to validity for that design.

This is real do-calculus basics, not a template. The backdoor enumeration and
the adjustment-set validity test use networkx's d-separation
(`nx.is_d_separator`) over the moralized/ancestral logic Pearl defines, so the
returned set is *checked* to satisfy the back-door criterion, not merely
heuristically guessed. Deterministic; never crashes on malformed input (returns
a structured {"error": ...} the gateway turns into a clean 400).

Input shape (`payload`):
    treatment   : str  — the treatment/exposure variable name (required)
    outcome     : str  — the outcome variable name (required)
    confounders : list[str] | comma-string — variables that may confound (optional)
    edges       : list[[from,to]] | "A->B, C->D" string — the assumed causal
                  graph edges (optional; if omitted, each declared confounder is
                  assumed to point at BOTH treatment and outcome — the canonical
                  confounding triangle)
    design      : str — free text describing the study design (used to pick the
                  estimator: "difference-in-differences"/"panel", "regression
                  discontinuity"/"cutoff", "instrument"/"IV", "RCT"/"randomized",
                  "matching"/"propensity", …)
    instrument  : str — optional named instrument variable (for IV)

The gateway imports CAUSAL_RUNNERS from here.
"""
from __future__ import annotations

import re
from itertools import combinations
from typing import Any, Optional

import networkx as nx


# ---------------------------------------------------------------------------
# input parsing (tolerant — never raises)
# ---------------------------------------------------------------------------
def _as_list(v: Any) -> list[str]:
    if v is None:
        return []
    if isinstance(v, (list, tuple, set)):
        items = list(v)
    else:
        items = re.split(r"[,\n;|]", str(v))
    return [str(x).strip() for x in items if str(x).strip()]


def _parse_edges(raw: Any) -> list[tuple[str, str]]:
    """Parse edges from a list of pairs OR an 'A->B, C->D' style string."""
    edges: list[tuple[str, str]] = []
    if raw is None:
        return edges
    if isinstance(raw, (list, tuple)):
        for e in raw:
            if isinstance(e, (list, tuple)) and len(e) == 2:
                a, b = str(e[0]).strip(), str(e[1]).strip()
                if a and b:
                    edges.append((a, b))
            elif isinstance(e, str):
                edges.extend(_parse_edge_string(e))
        return edges
    if isinstance(raw, str):
        return _parse_edge_string(raw)
    return edges


def _parse_edge_string(s: str) -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    # split on commas/semicolons/newlines, each token is "A -> B" (or →, -->)
    for tok in re.split(r"[,\n;]", s):
        tok = tok.strip()
        if not tok:
            continue
        m = re.split(r"\s*(?:-+>|→|—>)\s*", tok)
        # chain support: A -> B -> C
        for a, b in zip(m, m[1:]):
            a, b = a.strip(), b.strip()
            if a and b:
                out.append((a, b))
    return out


# ---------------------------------------------------------------------------
# REAL causal-graph logic (Pearl's back-door criterion via networkx)
# ---------------------------------------------------------------------------
def _all_paths_undirected(G: nx.DiGraph, src: str, dst: str, cutoff: int = 12) -> list[list[str]]:
    """All simple paths in the UNDIRECTED skeleton (paths can traverse edges in
    either direction — this is what 'a path between X and Y' means in Pearl)."""
    U = G.to_undirected()
    try:
        return list(nx.all_simple_paths(U, src, dst, cutoff=cutoff))
    except (nx.NodeNotFound, nx.NetworkXNoPath):
        return []


def _is_backdoor_path(G: nx.DiGraph, path: list[str]) -> bool:
    """A back-door path from treatment T is a path whose first edge points INTO
    T (T <- ...). The directed (front-door) path T -> ... -> Y is NOT a backdoor.
    """
    if len(path) < 2:
        return False
    t = path[0]
    nxt = path[1]
    # first edge orientation: backdoor iff the arrow points into T (nxt -> t).
    return G.has_edge(nxt, t)


def _path_edge_repr(G: nx.DiGraph, path: list[str]) -> str:
    parts = [path[0]]
    for a, b in zip(path, path[1:]):
        arrow = "->" if G.has_edge(a, b) else "<-"
        parts.append(arrow)
        parts.append(b)
    return " ".join(parts)


def find_backdoor_paths(G: nx.DiGraph, treatment: str, outcome: str) -> list[dict]:
    """Enumerate the back-door paths between treatment and outcome. Real."""
    out: list[dict] = []
    for path in _all_paths_undirected(G, treatment, outcome):
        if _is_backdoor_path(G, path):
            out.append({"path": path, "repr": _path_edge_repr(G, path)})
    return out


def _valid_adjustment_set(
    G: nx.DiGraph, treatment: str, outcome: str, candidates: list[str]
) -> Optional[list[str]]:
    """Find a minimal adjustment set Z ⊆ candidates that satisfies the back-door
    criterion (Pearl): (a) no node in Z is a descendant of the treatment, and
    (b) Z d-separates treatment and outcome in the graph with all edges OUT of
    treatment removed. Uses networkx d-separation. Returns the smallest valid Z
    (empty set is valid if there are no open backdoor paths)."""
    # back-door criterion forbids conditioning on descendants of T.
    descendants = nx.descendants(G, treatment)
    pool = [c for c in candidates if c not in descendants and c != treatment and c != outcome]

    # graph with edges leaving the treatment cut (the "proper back-door graph").
    Gbd = G.copy()
    Gbd.remove_edges_from(list(G.out_edges(treatment)))

    def blocks(Z: set[str]) -> bool:
        try:
            return nx.is_d_separator(Gbd, {treatment}, {outcome}, Z)
        except Exception:
            return False

    # try increasing sizes; return the first (smallest) valid set.
    for k in range(0, len(pool) + 1):
        for combo in combinations(pool, k):
            if blocks(set(combo)):
                return list(combo)
    return None


def _classify_nodes(G: nx.DiGraph, treatment: str, outcome: str) -> dict:
    """Tag each non-T/Y node by its causal role relative to (T, Y)."""
    roles: dict[str, str] = {}
    desc_t = nx.descendants(G, treatment)
    for n in G.nodes:
        if n in (treatment, outcome):
            continue
        children = set(G.successors(n))
        parents = set(G.predecessors(n))
        points_to_t = treatment in children
        points_to_y = outcome in children
        on_path_from_t = n in desc_t
        if points_to_t and points_to_y:
            roles[n] = "confounder"  # common cause of T and Y
        elif treatment in parents and outcome in children:
            roles[n] = "mediator"  # T -> n -> Y
        elif treatment in parents or outcome in parents:
            # collider iff two arrows point INTO it (e.g. T -> n <- Y)
            if len({p for p in parents if p in (treatment, outcome)}) >= 1 and len(parents) >= 2:
                roles[n] = "collider/descendant"
            elif on_path_from_t:
                roles[n] = "descendant of treatment"
            else:
                roles[n] = "downstream"
        elif len(parents) >= 2:
            roles[n] = "collider"
        elif points_to_t:
            roles[n] = "cause of treatment (instrument candidate)"
        elif points_to_y:
            roles[n] = "cause of outcome (precision covariate)"
        else:
            roles[n] = "other"
    return roles


# ---------------------------------------------------------------------------
# estimator recommendation (real assumptions + threats per design)
# ---------------------------------------------------------------------------
_DESIGN_RULES: list[tuple[str, re.Pattern]] = [
    ("RCT", re.compile(r"\b(rct|randomi[sz]ed|random assignment|randomly assigned|experiment(al)?)\b", re.I)),
    ("IV", re.compile(r"\b(instrument(al)?( variable)?|\biv\b|two[- ]?stage|2sls|exogenous (shock|variation))\b", re.I)),
    ("RDD", re.compile(r"\b(regression discontinuity|\brdd?\b|cutoff|threshold|running variable|forcing variable)\b", re.I)),
    ("DiD", re.compile(r"\b(difference[- ]in[- ]differences|\bdid\b|diff[- ]in[- ]diff|panel|two[- ]?way fixed effects|pre[- ]?post|before[- ]?after.*control)\b", re.I)),
    ("Matching", re.compile(r"\b(matching|propensity score|psm|inverse probability|ipw|nearest[- ]neighbou?r match)\b", re.I)),
    ("RegressionAdjustment", re.compile(r"\b(regression|covariate adjustment|ols|control for|multivariable|adjusted (model|analysis))\b", re.I)),
]

_ESTIMATOR_SPEC: dict[str, dict] = {
    "RCT": {
        "name": "Randomized experiment (ITT / unadjusted difference in means)",
        "identifies": "the ATE directly — randomization makes treatment independent of all confounders (observed and unobserved).",
        "assumptions": [
            "Successful randomization (treatment independent of potential outcomes).",
            "No interference between units (SUTVA).",
            "Full compliance, or analyze intention-to-treat / use CACE for non-compliance.",
        ],
        "threats": [
            "Attrition / differential dropout breaks randomization balance.",
            "Non-compliance dilutes the effect (report ITT and a compliance-adjusted estimate).",
            "Spillovers between treated and control units violate SUTVA.",
        ],
        "needs_adjustment": False,
    },
    "IV": {
        "name": "Instrumental variables (2SLS)",
        "identifies": "a LATE (local average treatment effect, for compliers) when an instrument shifts treatment but affects the outcome only through treatment.",
        "assumptions": [
            "Relevance: the instrument is strongly associated with treatment (check first-stage F > 10).",
            "Exclusion restriction: the instrument affects the outcome ONLY via the treatment.",
            "Independence: the instrument is as-good-as-randomly assigned (no common cause with the outcome).",
            "Monotonicity (no defiers) for the LATE interpretation.",
        ],
        "threats": [
            "Weak instruments bias 2SLS toward OLS and inflate standard errors.",
            "Any direct instrument→outcome path violates exclusion and is untestable from data.",
            "LATE ≠ ATE: the estimate applies only to compliers.",
        ],
        "needs_adjustment": False,
    },
    "RDD": {
        "name": "Regression discontinuity design (local polynomial at the cutoff)",
        "identifies": "a local ATE at the cutoff, where treatment status jumps discontinuously in a running variable.",
        "assumptions": [
            "Continuity: potential outcomes are continuous in the running variable at the cutoff (no other jump there).",
            "No precise manipulation of the running variable around the cutoff (McCrary density test).",
            "Correct bandwidth + polynomial order (use a data-driven optimal bandwidth).",
        ],
        "threats": [
            "Sorting/manipulation around the threshold invalidates the design.",
            "Other policies that change at the same cutoff confound the jump.",
            "Effect is local to the cutoff — limited external validity.",
        ],
        "needs_adjustment": False,
    },
    "DiD": {
        "name": "Difference-in-differences (two-way fixed effects / event study)",
        "identifies": "the ATT under parallel trends — treated and control groups would have moved in parallel absent treatment.",
        "assumptions": [
            "Parallel trends: counterfactual outcome trends are equal across groups (support with pre-trend / event-study plots).",
            "No anticipation effects before treatment onset.",
            "Stable composition / no treatment-driven sorting between groups.",
            "With staggered adoption, use a heterogeneity-robust estimator (Callaway-Sant'Anna / Sun-Abraham), not naive TWFE.",
        ],
        "threats": [
            "Differential pre-trends falsify the key assumption.",
            "Time-varying confounders that hit one group break parallel trends.",
            "Negative-weighting bias in TWFE under staggered timing + heterogeneous effects.",
        ],
        "needs_adjustment": False,
    },
    "Matching": {
        "name": "Matching / propensity-score weighting (selection on observables)",
        "identifies": "the ATT/ATE under conditional ignorability — adjusting for the measured confounders removes the bias.",
        "assumptions": [
            "Conditional ignorability / no unmeasured confounding (the adjustment set blocks all backdoor paths).",
            "Common support / overlap: treated and control units share covariate space.",
            "Correctly specified propensity / matching model; check covariate balance after matching.",
        ],
        "threats": [
            "Unmeasured confounding is the central, untestable threat — run a sensitivity analysis (E-value / Rosenbaum bounds).",
            "Poor overlap forces extrapolation or discards units.",
            "Conditioning on a collider or a post-treatment variable REINTRODUCES bias.",
        ],
        "needs_adjustment": True,
    },
    "RegressionAdjustment": {
        "name": "Regression adjustment (covariate-adjusted OLS / GLM)",
        "identifies": "the conditional effect under no-unmeasured-confounding, adjusting for the valid backdoor set.",
        "assumptions": [
            "No unmeasured confounding given the adjustment set (the set blocks every backdoor path).",
            "Correct functional form (linearity/link); consider interactions and nonlinearity.",
            "Adjust for confounders only — never for mediators, colliders, or post-treatment variables.",
        ],
        "threats": [
            "Omitted-variable bias from any unblocked backdoor path.",
            "Bad controls: adjusting for a collider/mediator biases the estimate (this tool's adjustment set avoids them).",
            "Model misspecification; extrapolation outside the covariate support.",
        ],
        "needs_adjustment": True,
    },
}


def _recommend_estimator(design: str, has_instrument: bool) -> tuple[str, dict, list[str]]:
    """Pick the estimator from the described design. Returns (key, spec, notes)."""
    notes: list[str] = []
    text = design or ""
    matched = [key for key, pat in _DESIGN_RULES if pat.search(text)]
    if has_instrument and "IV" not in matched:
        matched.insert(0, "IV")
        notes.append("An instrument was named, so IV is offered even though the design text did not call it out.")
    if matched:
        # priority: design with strongest identification first
        for pref in ("RCT", "RDD", "IV", "DiD", "Matching", "RegressionAdjustment"):
            if pref in matched:
                key = pref
                break
        else:
            key = matched[0]
    else:
        key = "RegressionAdjustment"
        notes.append(
            "No design keyword recognized — defaulting to covariate-adjusted regression on the "
            "valid backdoor set. If you have a randomization, a cutoff, an instrument, or panel "
            "data, name it in `design` for a stronger identification strategy."
        )
    return key, _ESTIMATOR_SPEC[key], notes


# ---------------------------------------------------------------------------
# orchestration
# ---------------------------------------------------------------------------
def _build_graph(treatment: str, outcome: str, confounders: list[str], edges: list[tuple[str, str]]) -> nx.DiGraph:
    G = nx.DiGraph()
    G.add_node(treatment)
    G.add_node(outcome)
    for c in confounders:
        G.add_node(c)
    if edges:
        G.add_edges_from(edges)
    else:
        # canonical confounding triangle: each confounder -> T and -> Y, plus T -> Y.
        for c in confounders:
            G.add_edge(c, treatment)
            G.add_edge(c, outcome)
    if not G.has_edge(treatment, outcome) and not edges:
        G.add_edge(treatment, outcome)
    return G


def design_study(payload: dict) -> dict:
    treatment = (payload.get("treatment") or "").strip()
    outcome = (payload.get("outcome") or "").strip()
    if not treatment or not outcome:
        return {"error": "both `treatment` and `outcome` are required"}
    if treatment == outcome:
        return {"error": "treatment and outcome must be different variables"}

    confounders = _as_list(payload.get("confounders"))
    edges = _parse_edges(payload.get("edges"))
    instrument = (payload.get("instrument") or "").strip()
    if instrument:
        # an instrument points at the treatment (and not at the outcome directly).
        edges.append((instrument, treatment))
    design = (payload.get("design") or "").strip()

    if len(confounders) + len(edges) > 400:
        return {"error": "graph too large (max 400 confounders/edges)"}

    G = _build_graph(treatment, outcome, confounders, edges)

    if treatment not in G or outcome not in G:
        return {"error": "treatment/outcome not present in the graph"}
    if not nx.is_directed_acyclic_graph(G):
        try:
            cyc = nx.find_cycle(G)
            cyc_repr = " -> ".join([e[0] for e in cyc] + [cyc[0][0]])
        except Exception:
            cyc_repr = "(cycle present)"
        return {"error": f"the causal graph has a cycle ({cyc_repr}); a DAG must be acyclic"}

    roles = _classify_nodes(G, treatment, outcome)
    backdoors = find_backdoor_paths(G, treatment, outcome)

    # candidate adjustment pool = every observed non-T/Y node that is not a
    # descendant of the treatment (the back-door criterion forbids descendants).
    descendants = nx.descendants(G, treatment)
    candidates = [n for n in G.nodes if n not in (treatment, outcome) and n not in descendants]
    adj_set = _valid_adjustment_set(G, treatment, outcome, candidates)

    has_instrument = bool(instrument) or any(
        "instrument" in v for v in roles.values()
    )
    est_key, est, est_notes = _recommend_estimator(design, has_instrument)

    # identifiability verdict
    if adj_set is not None:
        identifiable = True
        if adj_set:
            ident_msg = (
                f"Identifiable by adjustment: conditioning on {{{', '.join(adj_set)}}} blocks "
                f"all {len(backdoors)} backdoor path(s) and satisfies Pearl's back-door criterion."
            )
        else:
            ident_msg = "Identifiable with NO adjustment — there are no open backdoor paths between treatment and outcome."
    else:
        identifiable = False
        ident_msg = (
            "NOT identifiable by adjustment on the observed variables — at least one backdoor "
            "path runs through an unobserved/unconditionable node. Use a design that does not "
            "rely on selection-on-observables (IV / RDD / DiD / a randomized experiment)."
        )

    # warn about bad controls the user might be tempted to adjust for
    bad_controls = [n for n, r in roles.items() if r in ("mediator", "collider", "collider/descendant", "descendant of treatment")]

    return {
        "treatment": treatment,
        "outcome": outcome,
        "graph": {
            "nodes": sorted(G.nodes),
            "edges": [list(e) for e in G.edges],
            "is_dag": True,
            "node_roles": roles,
        },
        "backdoor_paths": backdoors,
        "n_backdoor_paths": len(backdoors),
        "adjustment_set": adj_set if adj_set is not None else None,
        "minimal_adjustment_set_size": (len(adj_set) if adj_set is not None else None),
        "identifiable_by_adjustment": identifiable,
        "identification": ident_msg,
        "do_not_adjust_for": bad_controls,
        "recommended_estimator": {
            "key": est_key,
            **est,
        },
        "estimator_notes": est_notes,
        "method": (
            "DAG construction (networkx) → back-door path enumeration (Pearl's "
            "back-door criterion) → valid minimal adjustment set via d-separation "
            "in the proper back-door graph (nx.is_d_separator) → estimator "
            "recommendation (DiD/RDD/IV/matching/regression) with identifying "
            "assumptions + threats to validity."
        ),
        "note": (
            "Field tool for econ-social: causal-inference tooling is a top unmet "
            "need (the reproducibility crisis is most acute here). The adjustment "
            "set is CHECKED to satisfy the back-door criterion (it blocks "
            "confounders and never conditions on colliders/mediators/post-treatment "
            "variables, which would introduce bias). It encodes YOUR causal "
            "assumptions — the DAG is an assumption, not a finding."
        ),
    }


def _demo_payload() -> dict:
    """Known confounding example with a hand-checkable answer.

    Smoking → cancer with a genetic confounder, plus a collider (hospitalization
    caused by both smoking and an unrelated injury) and a mediator (tar).
      gene -> smoking, gene -> cancer       (a confounder; backdoor smoking<-gene->cancer)
      smoking -> tar -> cancer              (mediator chain; the causal effect)
      smoking -> hospitalized <- injury     (hospitalized is a COLLIDER)
    Correct minimal adjustment set = {gene}. tar (mediator), hospitalized
    (collider) and injury must NOT be adjusted for.
    """
    return {
        "treatment": "smoking",
        "outcome": "cancer",
        "edges": [
            ["gene", "smoking"],
            ["gene", "cancer"],
            ["smoking", "tar"],
            ["tar", "cancer"],
            ["smoking", "hospitalized"],
            ["injury", "hospitalized"],
        ],
        "design": "observational cohort, adjust for measured covariates (propensity matching)",
    }


def run_causal_designer(payload: dict) -> dict:
    """payload: study description (treatment, outcome, confounders, edges, design,
    instrument) OR { demo: true } / treatment == "demo".

    Build the DAG, identify backdoor paths + a valid adjustment set (real
    do-calculus via networkx d-separation), and recommend an estimator with
    assumptions + threats. Deterministic; never raises on malformed input.
    """
    demo = bool(payload.get("demo")) or (
        isinstance(payload.get("treatment"), str)
        and payload.get("treatment", "").strip().lower() == "demo"
    )
    if demo:
        result = design_study(_demo_payload())
        if "error" in result:
            return result
        result["demo"] = True
        result["ground_truth"] = {
            "expected_adjustment_set": ["gene"],
            "must_not_adjust": ["tar", "hospitalized", "injury"],
            "n_backdoor_paths_expected": 1,
            "identifiable": True,
        }
        result["note"] = (
            "DEMO: smoking→cancer with a genetic confounder (gene→smoking, "
            "gene→cancer), a mediator (smoking→tar→cancer), and a collider "
            "(smoking→hospitalized←injury). The correct minimal adjustment set is "
            "{gene}; tar, hospitalized and injury must NOT be adjusted for. "
            + result["note"]
        )
        return result

    result = design_study(payload)
    result.setdefault("demo", False)
    return result


# Registry the gateway imports.
CAUSAL_RUNNERS = {
    "causaldesigner": run_causal_designer,
}
