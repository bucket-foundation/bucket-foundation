# Contributing to bucket.foundation

Thanks for showing up. Here's the short version.

## What we need help with

1. **Protocol review** — read [`PROTOCOL.md`](./PROTOCOL.md) and tell us where it's wrong, unclear, or underspecified. File an issue.
2. **Reference site** — the Next.js app in `src/` was dormant from Feb 2025 to April 2026. It needs:
   - Dependency audit and upgrade
   - Secret rotation and `.env.example`
   - Local dev docs that actually work
3. **x402 buyer client** — a small library that fetches a paper from an x402-gated endpoint and writes a valid bucket (`<sha256>/paper.<ext>` + `canon.json`). Any language is fine. TypeScript and Go preferred because that's what we use.
4. **Test vectors** — concrete `canon.json` examples for common cases (open access paper, paywalled PubMed paper, preprint, dataset).
5. **Federation / mirroring** — a spec draft for how two buckets mirror each other's content.

## Rules

- **Be boring.** If there's a simpler way to do something, that's the right way.
- **Open-source everything.** No proprietary extensions. No "enterprise edition." The reference implementation is MIT and stays MIT.
- **Don't break `canon.json` v0.1.** Add fields, don't remove or rename them. We'll cut v0.2 when we're ready.
- **One PR per concern.** Easier to review, easier to revert.
- **Write the commit message like a lawyer.** What changed. Why. What breaks if you don't take it.

## Setup

```bash
git clone https://github.com/gianyrox/bucket-foundation
cd bucket-foundation
cp .env.example .env.local
npm install
npm run dev
```

If `.env.example` doesn't exist yet, that's one of the things we need help with — see item 2 above.

## Filing an issue

Please include:

- What you were trying to do
- What you expected
- What actually happened
- A minimum reproduction (code snippet, curl, or a failing test)

Drive-by ideas are welcome — label them `discussion`.

## Code of conduct

Be kind. Assume good faith. If someone is being difficult, tell a maintainer; don't retaliate in a thread.

## Maintainers

- **@gianyrox** — founder, protocol
- Open to adding more maintainers as the project finds its contributors.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
