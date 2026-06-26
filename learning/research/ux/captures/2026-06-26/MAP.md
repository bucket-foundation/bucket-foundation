# UX capture map — 2026-06-26

Companion evidence for `../UX-GAP-ANALYSIS.md`. Captured by Playwright driving a real
browser (headed) + ffmpeg frame extraction. **Videos** (animations) are mirrored to
gdrive (too large for the repo); **stills** live here.

## 🎥 Videos (gdrive)
Folder: **https://drive.google.com/open?id=1Tt9e7spkQSQWm2V9SFRcNZ6bvZ-QlR9q**
- `duolingo-onboarding.webm` — Duolingo's logged-out onboarding funnel: mascot "Hi there! I'm Duo!" welcome → single green CONTINUE → language picker → goal → "how did you hear" choice screen. Note the **do-first, one-decision-per-screen, progress-bar, friendly-motion** pacing.
- `our-academy.webm` — our Academy: 6-slide intro carousel → Skip → home → Study & Learn (reading) → drill → MAP / PROGRESS tabs. Note: **calm, but the home is a menu and the default is reading.**

## 🖼 Stills

### ours/ — our Academy (real screens)
| file | screen | the gap |
|---|---|---|
| `ours/m-00-first.png` | onboarding welcome | a **6-slide intro carousel** (telling), not do-the-first-atom |
| `ours/clean-10-home.png` | home (Biophysics) | **menu of concepts + Study&Learn**, not a computed "Today's Route" |
| `ours/clean-30-lang-card.png` | "Study & learn" view | **reading-first** (LESSON/PLAIN/CORE/DEEP), not retrieval-first |

### map/duolingo/ — Duolingo onboarding funnel (logged-out, fully captured)
`00-landing` → `06-onboarding-step`: landing → GET STARTED → language picker → goal/why → **"How did you hear about Duolingo?"** choice screen (mascot + progress bar + big tiles + one CONTINUE). The canonical **do-first, zero-ambiguity** onboarding our spec says to copy.

### map/brilliant/ — Brilliant entry (logged-out)
`00–03`: landing → onboarding start. (Interactive do-to-learn lesson is login-gated — see below.)

### refs/ — reference landings (mobile/desktop)
Duolingo, Brilliant, Khan, Math Academy (`how-it-works` shows the real product: diagnostic → knowledge-graph → tasks), Anki manual.

## 🔒 What is login-gated (needs founder login to capture)
The **in-app lesson flows** — Duolingo's lesson (format rotation + correct/incorrect feedback + the **lesson-complete XP/streak reward animation**) and Brilliant's interactive lesson — **bounce back to the landing/onboarding without an account** (verified: a guest `/learn` reloads to the splash). To film those animations side-by-side, log into Duolingo/Brilliant once in the persistent `bucket-ux` Chromium profile and I'll re-record. That's the only missing piece; everything else here is captured.

## How to re-capture
Persistent profile: `~/.chromium-sessions/bucket-ux` (CDP via `chromium-session.sh url bucket-ux`).
Playwright attaches over CDP (logged-in flows) or launches fresh with `recordVideo` (logged-out funnels + our app).
