Polingual screens follow `../docs/design/POLINGUAL-DESIGN.md`: theme and art come from `core`, generated from `polingual/src/ui/tokens.json`. Every web feature ships here too.

## Session Mix

`core/engine/SessionMix.kt` ports `SessionMix.swift` and `src/lib/academy/session-mix.ts`. The Android scheduler stores no FSRS stability, so mastery reads `1 - exp(-intervalDays / 21)`. Android intervals grow 1, 2.5, 6.25, 15.6 days against the web's 3, 11, 35, 101, so a run of correct answers crosses the 0.5 bar at grade 4 and the 0.8 bar at grade 5, where the web crosses both at grade 3. `WebGoldensTest` pins that gap.
