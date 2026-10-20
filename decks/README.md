# Curated decks

Each folder holds the manifest of one deck Bucket Foundation has checked. `catalog.json` lists them with their checksums, and `catalog.json.sig` is its signature. The app shows a catalog only after that signature verifies against the key compiled into it.

## Signing key

Create the key once, on the founder's machine, with a passphrase:

```bash
ssh-keygen -t ed25519 -C deck-catalog@bucket.foundation -f ~/.config/bucket/deck_catalog_ed25519
```

Paste the line from `~/.config/bucket/deck_catalog_ed25519.pub` into `DECK_CATALOG_PUBKEY` in `packages/bkt/src/library.ts`. The private key stays outside the repo.

## Deck files

The deck files live as assets of a GitHub release tagged `decks-<date>`. Each manifest names its file in `file_url`. The app takes a `file_url` only under `github.com/bucket-foundation/bucket-foundation/releases/download/`, follows one redirect to `release-assets.githubusercontent.com`, and installs the file only when its sha256 matches the signed catalog.

```bash
gh release create decks-<date> --latest=false --notes-file NOTES.md
gh release upload decks-<date> <packs>/*/*.sqlite.zst
```

The release notes carry the Wiktionary via Kaikki attribution and the CC-BY-SA 3.0 licence. A `bkt-v*` tag starts the desktop build, so deck releases keep the `decks-` prefix.

## Publishing

```bash
cd packages/bkt && bun run src/pack/decks.ts --publish
scripts/release/sign-deck-catalog.sh
```

Commit `catalog.json` and `catalog.json.sig`.

`--publish` raises `serial` by one whenever the decks change. The app takes a refreshed catalog only when its serial is higher than the one it holds, so an older signed catalog cannot be served again. Sign after every publish.

## Refresh

The site serves the two committed files at `https://www.bucket.foundation/decks/catalog.json` and `catalog.json.sig`, read from this folder by `src/app/decks/[file]/route.ts`. The signature path answers 404 until `catalog.json.sig` is committed, and the app keeps its bundled catalog. A change here reaches the app's refresh when `dev` is promoted to `main`. The key path comes from `BUCKET_DECK_CATALOG_KEY` or the second argument.
