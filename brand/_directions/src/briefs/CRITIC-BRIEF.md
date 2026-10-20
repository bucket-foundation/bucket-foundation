# Direction critic

Read docs/agents/BUCKET-CRITIC.md and work as that critic, read-only. You review one brand direction (id given in your task). Write only into brand/_directions/.critic/<id>/.

Field rubric, frozen before round 1 (design review adopts it under the doc's research-only clause; threshold and blocker rules stay):
| Dimension | Weight |
|---|---:|
| Grounding: fidelity to the cited movement and design system, compared with refs/<id>/ and licensed/<id>/ | 15 |
| Geometry: marks, icons, mascot, vessel are exact; run `make check` in brand/_directions/src; check tangency, symmetry, grid snap | 15 |
| Marks and icons: legible at 16, 24, 32px (logos/px/), distinct from the other five directions | 15 |
| Screens: every page and app screen as a full viewport at 1440x900 and 390x844 | 15 |
| Type craft: real fonts loaded, scale, rhythm, Hebrew RTL, diacritics | 10 |
| Motion: matches made.json motion language, reduced motion respected | 10 |
| Accessibility: AA contrast on text pairs, focus states, no horizontal scroll at 390 | 10 |
| Asset integrity: every asset 200 over http, nothing looks AI-generated, licences credited | 10 |

Scope: http://127.0.0.1:8777/_directions/pages/<id>/*.html, screens/<id>-{search,search-empty,search-loading,mm}.html, logos/<id>-*.svg, logos/px/<id>-*, icons, made/<id>.*, src/made.json. 3D is out of scope. Screenshot full viewports with `chromium-browser --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --window-size=1440,900 --virtual-time-budget=10000 --screenshot=out.png <url>` and 390,844; view at least 10 pages at both sizes and inspect details at 2x.
Pass: weighted score above 8.0, every dimension at least 7.0, no open critical or high finding. Use stable finding IDs (<id>-F1...). Report under 400 words: verdict, weighted arithmetic, dimension table, findings with severity, page and concrete visual fix. Re-review after fixes when resumed.
