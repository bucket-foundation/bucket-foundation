# UX capture map — 2026-06-26

Companion evidence for `../UX-GAP-ANALYSIS.md`. Captured by Playwright driving a real
browser (headed) + ffmpeg frame extraction. **Videos** (animations) are mirrored to
gdrive (too large for the repo); **stills** live here.

## 🎥 Videos (gdrive)
Folder: **https://drive.google.com/open?id=1Tt9e7spkQSQWm2V9SFRcNZ6bvZ-QlR9q**
- `duolingo-onboarding-full.webm` (≈4 min) — **the ENTIRE Duolingo onboarding, end to end**, into the first lesson. Every step (see below). The reference for do-first onboarding + how a language course removes ambiguity.
- `duolingo-lesson-reward.mp4` (≈4 min, **founder-recorded** — automation is anti-bot-blocked) — a real logged-in lesson end to end: word-bank exercise, **green "Correct!" feedback**, the **score-unlock**, the **lesson-complete stats animation**, and the **streak-goal commitment**. The animations we couldn't automate.
- `our-academy.webm` — our Academy: 6-slide intro carousel → Skip → home → Study & Learn (reading) → drill → MAP / PROGRESS tabs. Note: **calm, but the home is a menu and the default is reading.**

### Duolingo lesson + reward — key frames (`map/duolingo-lesson/`, from the founder recording)
`01 exercise-wordbank-CORRECT-feedback` ("14 IN A ROW" combo + hearts + "Write this in Spanish" word bank + green **Correct!** bar) → `02 score-unlock` ("You unlocked your Duolingo Spanish Score!") → `03 lesson-complete-stats` (animated streak/XP tally) → `04 streak-goal-commit` ("Let's commit to a Streak Goal" 7/14/30/50) → `05 profile-stats`.
**Contrast w/ ours:** every rep ends in an **immediate, animated reward**; ours has no reward moment. And the exercise is **word-bank assembly** (recognition-assisted), not our **blank typed recall**.

### Duolingo onboarding — every step (captured, `map/duolingo-onboarding-full/`)
`00 landing` → `01 language-picker` ("I want to learn…") → `04 how-did-you-hear` → `05 learning-reason` (the "why") → `06 proficiency-placement` ("How much Spanish do you know?" — self-rated A1→C1) → `07 course-overview` → `08 daily-goal` → `09 notification-primer` → `10 choose-path` ("Start from scratch") → `13 first-lesson` (**"NEW WORD — Which one of these is 'tea'?"** with 3 image tiles + hearts + CHECK).
**The crux for our language fix:** Duolingo's *first* rep is a **3-image multiple-choice you cannot fail**; our language deck's first rep is **cold typed recall** ("type `oro`"). That single difference is most of why ours "feels confusing."

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

## Case-study completeness (per platform)
| Platform | Captured | Gated / missing |
|---|---|---|
| **Duolingo** | ✅ **Complete** — onboarding (every step) + lesson + reward (`map/duolingo*`, video) | — |
| **Brilliant** | landing + courses + **course detail = leveled path** (`map/brilliant-lesson/03-06`) | interactive problem-solving (age-gate/signup after preview) |
| **Khan** | landing + exercise page + hint (`map/khan-exercise/`) | exercise buried behind donation/cookie modals; full flow needs login |
| **Math Academy** | landing + `how-it-works` (product screenshots, `refs/d-mathacademy-how.png`) | **live app login-gated** (session expired) — our closest analog (diagnostic+graph+mastery) |
| **Anki** | manual reference only | desktop app, not installed; conceptually = our FSRS engine |
| **Apple HIG / Whop** | principles in `UX-CASE-STUDIES.md` | — (design refs, not apps to capture) |

**To finish the gated ones the reliable way:** screen-record them like Duolingo (Math Academy is the highest-value — it's the diagnostic→knowledge-graph→mastery analog).

## 🔓 Duolingo lesson + reward — CAPTURED (founder screen-recording)
The Duolingo lesson + reward animations are **anti-bot-blocked for automation** (a guest `/learn` reloads to the splash; logged-in automation gets dropped between navigations). Resolved by a **founder screen recording** (`duolingo-lesson-reward.mp4`) → key frames in `map/duolingo-lesson/`. Brilliant's interactive lesson is still un-captured (same gating) — record it the same way if needed.

## How to re-capture
Persistent profile: `~/.chromium-sessions/bucket-ux` (CDP via `chromium-session.sh url bucket-ux`).
Playwright attaches over CDP (logged-in flows) or launches fresh with `recordVideo` (logged-out funnels + our app).
