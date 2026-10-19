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
| 2 to 4 | First lesson | Opens the persona's first lesson as a guest, reads it, answers one card | Time to first card. Did they find show the answer and the rating buttons. Quote any reaction |
| 4 to 6 | Sign-in modal | Starts the second lesson; the modal opens | Did they read Enter your email. Time from email to code. Link or code. Event `sign_in_complete` |
| 6 to 7 | Age range | Picks 18 or older | Any pause. Guest progress merges at this step |
| 7 to 9 | Second lesson | Language personas: one Polingual lesson in their new language system. Others: the lesson the modal interrupted | Exercise types they hit, PLAY audio, how many they answer before stopping |
| 9 to 10 | Progress | Opens Learn home | Do they notice xp, streak and started counts. One sentence on what they would do tomorrow |

Close with two questions: "What was this for?" and "Would you open it tomorrow?" Write both answers verbatim.

## Personas

| Tag | Persona | First lesson | Second lesson | Notes |
|---|---|---|---|---|
| `ru-en` | English speaker who knows Russian, the 2026-10-18 profile | `00-learning-to-learn` card | Create a system with root English and target Russian, then study `en-ru` | Watch whether Cyrillic cards and PLAY audio read well |
| `es` | Spanish learner, English root | `00-learning-to-learn` card | Create a system with Spanish and Portuguese, then study `en-es-pt` | Watch cognate recognition |
| `he` | Hebrew learner, English root | `00-learning-to-learn` card | Create a system with Hebrew, then study `en-he` | Right-to-left layout and niqqud audio from #866. Record any RTL break with a screenshot |
| `sci` | Science learner | `00-learning-to-learn` deck | `01-mathematics` deck | The second deck opens the modal on its first card |
| `res` | Researcher | Canon search at `/canon/search`, one query from their field | `01-mathematics` lesson, then the modal | Search needs no account. Record the query, the first result opened, and whether they would cite it |

Creating a language system needs an account, so the Polingual lesson always comes after the modal. `tests/e2e/demo-script.spec.ts` runs every persona path end to end.

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
