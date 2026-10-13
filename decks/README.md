# Curated decks

Each folder holds the manifest of one deck Bucket Foundation has checked. `catalog.json` lists them with their checksums, and `catalog.json.sig` is its signature. The app shows a catalog only after that signature verifies against the key compiled into it.

## Signing key

Create the key once, on the founder's machine, with a passphrase:

```bash
ssh-keygen -t ed25519 -C deck-catalog@bucket.foundation -f ~/.config/bucket/deck_catalog_ed25519
```

Paste the line from `~/.config/bucket/deck_catalog_ed25519.pub` into `DECK_CATALOG_PUBKEY` in `packages/bkt/src/library.ts`. The private key stays outside the repo.

## Publishing

```bash
cd packages/bkt && bun run src/pack/decks.ts --publish
scripts/release/sign-deck-catalog.sh
```

Commit `catalog.json` and `catalog.json.sig`. The key path comes from `BUCKET_DECK_CATALOG_KEY` or the second argument.
