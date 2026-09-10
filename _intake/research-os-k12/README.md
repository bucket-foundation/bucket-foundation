# Research OS for K-12 intake

Holding area for the research that shaped `learning/research-os/PLAN.md`. Compiled 2026-09-09.

| File | What it holds |
|---|---|
| `03-data-services.md` | Vendors and data sources across eleven categories, verified against vendor pages on 2026-09-09; Phase 0 and Phase 2 stacks with monthly cost; licensing landmines |
| `04-funding-and-people.md` | Funding flows (philanthropy, government, venture, hackathons and web3, nonprofit analogs) and a ranked map of researchers, open-knowledge leaders, industry leaders, investors, educators, and policy voices, with first asks |
| `raw/` | Sixteen verbatim research-agent reports plus three literature reviews (`lit-educational-methods.md`, 49 sources; `lit-hci-human-ai.md`, 56 sources; `lit-ai-for-science.md`, 42 papers) with identifiers resolved against Crossref, OpenAlex, and arXiv. Each carries every table row and citation the syntheses compress. Marked voice-ignore as evidence |
| `funding-log.md` | Wave 1 funding submissions and decisions |
| `.status.json` | Intake status |

Verification rule: anything marked unverified was not confirmed against a primary source and must be re-checked before it enters a grant application, a filing, or public copy.

The three literature reviews extend `learning/research-os/RESEARCH-QUESTIONS.md` (49 questions) and set the constraints in `learning/research-os/PLAN.md`. Next intake: compliance artifacts under `compliance/` (bead ros-07) and the Phase 0 corpus index.

## Site registry registration

**Done**, landed via `feat(site): align public site with Research OS for
K-12 (#12)` on `main`, merged into this intake pass 2026-09-10. Research OS
for K-12 has its own page (`src/app/research-os/page.tsx`, shipped in
Iteration 1), its own `/research-os` entry in `src/app/sitemap.ts`, and now
a `{ href: "/research-os", label: "Research OS" }` entry in
`src/components/Header.tsx`'s `NAV` array, landing between `Academy` and
`Access` rather than the after-`Build` placement this section originally
recommended below; both are product-entry positions and the ship decision
was the site pass's to make. The search below is kept as the record of
what was checked before that PR landed, useful if a future collection
needs the same registration.

Checked 2026-09-10 for a data-driven (JSON- or array-backed, edit-to-register)
registry of branches or collections under `src/`, the kind `src/lib/
tools.ts`'s `TOOLS` array is for the 30 research tools:

- `src/lib/canon-fs.ts`'s `getBranches()` walks `bucket-canon/` on disk for
  the 9 numbered canon branches. Filesystem-driven, not an edit-to-register
  list, and scoped to canon branches specifically; Research OS is not a
  canon branch, so this is not the right registry regardless.
- `src/components/Header.tsx`'s `const NAV: NavItem[]` (lines 14-38) is
  the actual top-level site registry: it lists every top-nav collection
  (Canon, What's new, Build, Academy, Access, Chat, About) with an `href`,
  a `label`, and an optional `sub` array of child links, and it drives
  both the desktop and mobile nav (both iterate the same `NAV` constant).
  Research OS is not in it today. This is a **hardcoded literal array in a
  UI component**, not a data file, so per this pass's scope (canon intake,
  not a site-nav change) the registration is documented here instead of
  applied at the time of this check.

**To register** (the path PR #12 then took), add an entry to `NAV` in
`src/components/Header.tsx` following the `Academy` entry's shape (a
top-level product with its own page and no further canon-style
sub-branches):

```ts
{ href: "/research-os", label: "Research OS" },
```

or, if it earns a dropdown once the workspace ships, follow `Academy`'s
`sub` shape instead:

```ts
{
  href: "/research-os",
  label: "Research OS",
  sub: [
    { href: "/research-os", label: "Open Research OS", meta: "K-12 frontier routing" },
  ],
},
```

PR #12 shipped the plain (no-`sub`) form, placed between `Academy` and
`Access`. `npm run build` gates any change to this file since it is under
`src/`.
