from __future__ import annotations

from .schema import Series


def card(
    series: Series,
    interp_method: str,
    loo: dict | None,
    projection: dict | None,
    input_sha256: str,
    omega: float,
    no_projection: str = "not requested",
) -> dict:
    return {
        "series": series.slug,
        "kind": series.kind,
        "slices": int(len(series.t)),
        "primes": list(series.primes),
        "normalization": f"raw {series.unit} divided by the slice total",
        "dropped_slices": list(series.dropped),
        "helix": f"phase_k(t) = k/K + omega*(t - t0) turns, omega = {omega:.6g} per {series.time_unit}",
        "interpolation": interp_method,
        "interpolation_error": loo or "fewer than 3 slices, no leave-one-out estimate",
        "projection": (
            {k: projection[k] for k in ("method", "n_boot", "seed", "step", "min_slices")}
            | {"horizon": len(projection["t"])}
            if projection
            else f"none, {no_projection}"
        ),
        "source": series.source,
        "input_sha256": input_sha256,
    }


def footer(c: dict) -> str:
    err = c["interpolation_error"]
    err_txt = f"LOO max L1 {err['max_l1']:.3f}, mean {err['mean_l1']:.3f}" if isinstance(err, dict) else err
    proj = c["projection"]
    proj_txt = (
        f"projection {proj['horizon']} steps, ALR linear trend, bootstrap n={proj['n_boot']}, bands 80/95"
        if isinstance(proj, dict)
        else f"projection {proj}"
    )
    return (
        f"{c['slices']} slices, {len(c['primes'])} primes. {c['interpolation']} interpolation, {err_txt}. "
        f"{proj_txt}. Source: {c['source']['title']} ({c['source']['retrieved']}). {c['helix']}."
    )
