# Bobber Concept Art — v2 — 2026-05-03

Same six bobber concepts as `bobber-concept-art/2026-05-03/`, regenerated
in **two registers** (chalkboard + stone) with the **actual mathematics
visible inside each frame**. Generated with `dall-e-3` HD 1792×1024.

The registers map directly to `quantum-plates/` and `stone-plates/` —
this folder is the bridge between the parametric chalk/stone math plates
and the AI-rendered cinematic concepts.

**gdrive folder** (top, anyone-with-link reader):
https://drive.google.com/open?id=1R-okatI3ym8NX11kJJqa3RXKc7mvZ-hH

| Subset | Link |
|---|---|
| Chalkboard register | https://drive.google.com/open?id=19mGtdabq8BZ3E55fU_eZW2xEaUHDNZS_ |
| Stone register | https://drive.google.com/open?id=1283vyzqaZfz0DpEQEWzxFNANJHrWACRi |

## The six concepts × two registers

| # | Slug | Math baked in | Best in |
|---|---|---|---|
| 01 | `bobber-radial-wave` | $u(r,t) = \sin(kr - \omega t)/\sqrt{r}$, labeled $(k, \omega)$ wave crests, amplitude profile cross-section | both — chalk reads as a working derivation; stone reads as a votive tablet of the wave |
| 02 | `torus-architectural` | $x = (R + r\cos v)\cos u,\; y = (R + r\cos v)\sin u,\; z = r\sin v$, labels for $R, r, u, v$ | chalk — physics-textbook-plate register; stone — engraved cross-section |
| 03 | `vesica-flower` | $(x \pm \tfrac{1}{2})^2 + y^2 = 1$, vertices labeled $(0, \pm\sqrt{3}/2)$ | **stone wins decisively** — reads as carved relief, monumental |
| 04 | `quantum-particle-wave` | $e^{i\theta} = \cos\theta + i\sin\theta$, particle/wave dual rendering | chalk reads as a Feynman blackboard; stone reads as the monument |
| 05 | `earth-as-bobber-cosmic` | $\arc(p,q) = \arccos(p \cdot q)$ great-circle distance, geodesic between labeled points | **stone wins** — globe on carved tablet with toroidal field lines |
| 06 | `heart-as-torus` | $\ddot{x} + 2\gamma \dot{x} + \omega^2 x = 0$ phase-portrait equation, $(x, \dot{x})$ inset diagram | both — chalk for the working register, stone for monumental |

## Voice register (per AGFarms manifesto rules)

- **Chalkboard** = working register. Anywhere the manifesto is teaching,
  arguing, deriving — chalk.
- **Stone** = monument register. Anywhere the manifesto is declaring,
  carving, marking — stone.

Use both. They're siblings, not alternatives.

## Iterating

The generator is `gen_v2.py` (kept under `/tmp` during the run; see git
log for the prompt registers and the six concepts. To re-run with edited
prompts, restore the script and re-export `OPENAI_API_KEY` per the
checkpoint).
