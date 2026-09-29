# Provenance Setup

`prov` signs, timestamps and seals generation manifests. Run it as `python3 -m prov` from `tools/provenance`.

## Tools

| Tool | Version | Install |
|---|---|---|
| age, age-keygen | 1.2.1 | release tarball `age-v1.2.1-linux-amd64.tar.gz`, sha256 `7df45a6cc87d4da11cc03a539a7470c15b1041ab2b396af088fe9990f7c79d50`, copy both binaries to `~/bin` |
| ots | 0.7.2 | `python3 -m venv ~/.local/share/ots-venv && ~/.local/share/ots-venv/bin/pip install -r tools/provenance/requirements.txt`, link `ots` into `~/bin` |
| ssh-keygen | OpenSSH 8.2 or later | system package |

## Founder Setup

The founder runs these once on the founder machine. No agent runs them, and none of their secret output enters the repo.

1. Online age identity:
   ```
   mkdir -p ~/.config/bucket-provenance && chmod 700 ~/.config/bucket-provenance
   age-keygen -o ~/.config/bucket-provenance/age-identity.txt
   chmod 600 ~/.config/bucket-provenance/age-identity.txt
   ```
2. Offline backup identity, on an air-gapped machine or straight to paper:
   ```
   age-keygen
   ```
   Print or write down the `AGE-SECRET-KEY-1...` line and store it offline. Keep the `# public key: age1...` line.
3. Recipients, both public keys, committed:
   ```
   age-keygen -y ~/.config/bucket-provenance/age-identity.txt > tools/provenance/recipients.txt
   echo age1...backup >> tools/provenance/recipients.txt
   ```
4. BBS issuer key, only when the BBS flag is to be turned on:
   ```
   npx tsx scripts/provenance-bbs-keygen.ts
   ```
   The secret lands in `private/provenance/bbs-issuer.json`, which git ignores; its contents go to the Vercel env `PROVENANCE_BBS_ISSUER_KEY`. The public key lands in `public/.well-known/bbs-issuer.json` and is committed.

## Daily Use

```
cd tools/provenance
python3 -m prov build ~/agfarms/provenance/2026-09-29 FILES... --author founder+ai --visibility private
python3 -m prov seal ~/agfarms/provenance/2026-09-29 --remove-plain
python3 -m prov sign ~/agfarms/provenance/2026-09-29/manifest.jsonl
python3 -m prov stamp ~/agfarms/provenance/2026-09-29/merkle-root.txt
python3 -m prov upgrade ~/agfarms/provenance
python3 -m prov verify ~/agfarms/provenance/2026-09-29/manifest.jsonl
```

Sign after sealing, since sealing fills `sealed_sha256` and changes the root.

## Keys

| Key | Lives | Committed |
|---|---|---|
| Founder ssh-ed25519 secret, signs | `~/.ssh/id_ed25519` | never |
| Founder public key | `allowed_signers` in each day folder | yes |
| Online age identity, decrypts | `~/.config/bucket-provenance/age-identity.txt`, mode 600 | never |
| Offline age identity, decrypts | paper or hardware token | never |
| Both age public keys, encrypt | `tools/provenance/recipients.txt` | yes |
| BBS issuer secret | Vercel env `PROVENANCE_BBS_ISSUER_KEY`, local `private/provenance/bbs-issuer.json` | never |
| BBS issuer public | `public/.well-known/bbs-issuer.json` | yes |

## Compromise Runbook

Signing key leaked:
1. Append the old public key to `revoked_signers` beside `allowed_signers`; `prov verify` passes it to `ssh-keygen -Y verify -r`.
2. Make a new ssh-ed25519 key, add it to `allowed_signers`, sign a rotation note with it.
3. Re-sign and re-stamp every manifest dated after the last Bitcoin-attested timestamp before the leak.

Age identity leaked:
1. Replace its line in `recipients.txt` with a fresh `age-keygen` public key.
2. `python3 -m prov reseal --identity BACKUP_IDENTITY_FILE` decrypts each sealed file with the backup and re-encrypts to the new recipients, checking the plaintext hash first.
3. Delete the old ciphertext mirror on gdrive and record the rotation in a signed manifest.

BBS issuer key leaked: turn `PROVENANCE_BBS` off, mark every issued index revoked in the status list, rotate with the keygen script, publish the new public key.
