# Demo Script

Ten minutes with one first user. Bead bkt-y425.4. Results go in `docs/growth/BRAND-PLAN.md`, First-user funnel.

## Before the Session

- Ask for consent to take notes and, if wanted, a 30 s screen clip. No recording without a yes.
- Use a fresh browser profile or a private window. A leftover session skips the guest path.
- Pick the persona tag below and open `https://www.bucket.foundation/?demo=<tag>`. The tag rides on every analytics event for that tab, so the session's funnel can be filtered in Vercel Analytics by the `demo` property.
- Start a timer. Hand over the device and stay quiet unless the user is stuck for 30 s.

## Steps

| Min | Step | What the user does | Watch and record |
|---|---|---|---|
| 0 to 1 | Landing | Reads the page, picks an action | Seconds to first click. Did they read the line? Any hesitation over Sign in |
| 1 to 2 | Start learning | Taps Start learning | Lands on Learn with no sign-in. Event `start_learning_click`, then `open_research_os` with `guest: true` |
| 2 to 3 | Language system | Learn opens on the language system picker. Picks a root and a preset or languages, taps create system | Seconds to create. Did they find the presets. Any language they looked for and missed |
| 3 to 6 | First lesson | Studies one Polingual lesson as a guest, kept on the device | Time to first card. Exercise types they hit, PLAY audio, a quote |
| 6 to 7 | Sign-in modal | Starts a second lesson, a second system or save to your account; the modal opens | Did they read Enter your email. Time from email to code. Link or code. Event `sign_in_complete` |
| 7 to 8 | Age range | Picks 18 or older | Any pause. The guest system and progress merge at this step |
| 8 to 9 | Second lesson | Finishes the lesson the modal interrupted | Does the first lesson's progress show on the system card |
| 9 to 10 | Progress | Opens Learn home | Do they notice xp, streak and started counts. One sentence on what they would do tomorrow |

Close with two questions: "What was this for?" and "Would you open it tomorrow?" Write both answers verbatim.

## Personas

| Tag | Persona | First lesson | Second lesson | Notes |
|---|---|---|---|---|
| `ru-en` | English speaker who knows Russian, the 2026-10-18 profile | System with root English and target Russian, `en-ru` | Second `en-ru` lesson | Watch whether Cyrillic cards and PLAY audio read well |
| `es` | Spanish learner, English root | System with Spanish and Portuguese, `en-es-pt` | Second `en-es-pt` lesson | Watch cognate recognition |
| `he` | Hebrew learner, English root | System with Hebrew, `en-he` | Second `en-he` lesson | Right-to-left layout and niqqud audio from #866. Record any RTL break with a screenshot |
| `sci` | Science learner | `00-learning-to-learn` deck | `01-mathematics` deck | The second deck opens the modal on its first card |
| `res` | Researcher | Canon search at `/canon/search`, one query from their field | `01-mathematics` lesson, then the modal | Search needs no account. Record the query, the first result opened, and whether they would cite it |

A guest keeps one language system and one Polingual lesson on the device. A second lesson, a second system, save to your account and other tabs open the modal. The `sci` and `res` personas scroll past the picker to the science decks. `tests/e2e/demo-script.spec.ts` runs every persona path end to end.

## Session Log

Copy one block per session into the brand plan.

```
date:
tag:
consent: notes / clip
time to first click:
time to first card:
sign-in: link / code, seconds
second lesson finished: yes / no
quote:
would return tomorrow:
breaks seen:
```

## Funnel Events

| Event | Fires on | Props |
|---|---|---|
| `start_learning_click` | Start learning on the landing | `from`, `demo` |
| `open_research_os` | First Research OS page of a browser tab | `guest`, `path`, `demo` |
| `sign_in_complete` | Sign-in page or modal success | `next`, `resumed`, `demo` |
| `download_click` | Download link in the footer | `from`, `demo` |
| `download_complete` | Installer link on `/download` | `target`, `demo` |
