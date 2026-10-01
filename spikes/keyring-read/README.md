# Spike S2: Rust Reads the Keys TypeScript Stored

Date: 2026-10-01. Bead: `bkt-neoj.3`. Evidence for `docs/ARCHITECTURE-TARGET.md` in PR #518. Throwaway code.

## Question

Can a Rust program read the data key and the device key that today's `bkt` stored, on each operating system, with no prompt and with no change to the stored item? A no on any system means an upgraded app cannot open that user's data.

## Answer

| OS | What works | What fails | What the Rust engine must do |
|---|---|---|---|
| Linux, Secret Service unlocked | Secret Service search by `service` and `account` through the `secret-service` crate; `secret-tool lookup`. Bytes equal, no prompt, item unchanged | The `keyring` crate 3.6.3 finds nothing: it searches `service` and `username` | Call the Secret Service API with the attributes `service=bucket-bkt` and `account=<account>`. Keep `account` when it writes |
| Linux, collection locked | The API reports the item as present and locked in 40 ms | No route returns the secret. `secret-tool lookup` exits 1 with no output. An unlock request asks for a prompt, and with no display it returns at once | Report "keyring locked" and make no key, as `bkt` does today. Never call unlock from a background process |
| macOS 26.6 arm64, macOS 15.7 Intel | `/usr/bin/security find-generic-password -s bucket-bkt -a <account> -w`, then base64 decode. Bytes equal, no prompt, item unchanged, 41 to 220 ms | The `keyring` crate and `SecItemCopyMatching` both raise the keychain password dialog and hang. Same result for a linker-signed, an ad hoc signed and an unsigned binary. With the dialog disabled the call returns `errSecAuthFailed` -25293 | Read through `/usr/bin/security`, as the TypeScript does, and keep writing through it. Set `SecKeychainSetUserInteractionAllowed(false)` before any native call |
| Windows Server 2025 | `CryptUnprotectData` on the base64-decoded file with `CRYPTPROTECT_UI_FORBIDDEN`, 42 ms; the same PowerShell call the TypeScript makes, 325 ms. Bytes equal, file unchanged | The `keyring` crate finds nothing: it reads Credential Manager and the keys live in files | Read `%LOCALAPPDATA%\bkt\keys\bucket-bkt.<account>.dpapi`, base64 decode, `CryptUnprotectData` |

The 0.4.0 entries and the scoped entries from PR #516 behave the same way on every runner. No read changed an item, and the TypeScript read the same four values back after every Rust run.

## Storage Today

Read from `packages/bkt/src` at `origin/dev` b8af4d78c. The 0.4.0 tag stores keys the same way.

| | Linux | macOS | Windows |
|---|---|---|---|
| Code | `SecretToolKeyring`, `keyring.ts` lines 53 to 91 | `KeychainKeyring`, `platform.ts` lines 82 to 100 | `DpapiKeyring`, `platform.ts` lines 102 to 147 |
| Write | `secret-tool store --label "bkt <account>" service bucket-bkt account <account>`, secret on stdin | `security -i` fed `add-generic-password -s bucket-bkt -a <account> -l "bkt <account>" -w <base64>` | PowerShell `ProtectedData.Protect(bytes, $null, 'CurrentUser')`, output written as base64 text |
| Location | Default collection, attributes `service`, `account`, and `xdg:schema=org.freedesktop.Secret.Generic` added by libsecret | Default keychain, generic password, service `bucket-bkt`, account `<account>` | `%LOCALAPPDATA%\bkt\keys\bucket-bkt.<account>.dpapi` |
| Stored bytes | The secret as UTF-8 | Base64 of the UTF-8 secret | Base64 of the DPAPI blob of the UTF-8 secret |
| Read | `secret-tool lookup service bucket-bkt account <account>` | `security find-generic-password -s bucket-bkt -a <account> -w` | PowerShell `ProtectedData.Unprotect` |

Accounts, from `device.ts`: `db-data-key` holds 64 hex characters, and `device-ed25519` holds a PKCS8 PEM of 119 bytes. PR #516 adds `db-data-key.<scope>` and `device-ed25519.<scope>`, where the scope is 32 hex characters kept in the data folder's `keyring-scope` file and in `meta.keyring_scope`.

## Method

`.github/workflows/spike-keyring-read.yml` runs on pushes to `spike/keyring-read`, with no secrets, on `ubuntu-latest`, `macos-latest`, `macos-15-intel` and `windows-latest`. Each job:

1. Builds `bkt` from this branch with `scripts/release/build-binaries.sh` and downloads the released `bkt-v0.4.0` binary, checked against its published sha256.
2. Runs `bkt init` with each binary against a fresh `BKT_HOME`. The 0.4.0 binary writes `db-data-key` and `device-ed25519`. The branch binary writes the scoped pair.
3. Reads all four through the TypeScript keyring class and saves them as the expected bytes (`ts/write-keys.mjs`).
4. Runs `keyring-read run`. Every read is a child process with a 20 second limit, with a metadata snapshot of the item before and after.
5. Reads all four through the TypeScript again.

Read methods in `src/main.rs`:

| Method | Linux | macOS | Windows |
|---|---|---|---|
| `crate-default` | `keyring` 3.6.3, `Entry::new("bucket-bkt", account)` | same | same |
| `api` | `secret-service` 4.0.0, search `service` and `account`, no unlock | `security-framework` 3.7.0 `get_generic_password` | `CryptUnprotectData` |
| `api-unlock`, `api-noui` | `api`, then `Item::unlock` on a locked item | `api` with user interaction disabled | none |
| `tool`, `tool-after` | `secret-tool lookup` | `/usr/bin/security` | PowerShell |

Local Linux run, private D-Bus session, temporary home, no display:

```
cargo build --release
./linux.sh "$PWD/work" bin/bkt-0.4.0 bin/branch/bkt-linux-x64 target/release/keyring-read
```

## Runs

- Run 36915038681: ubuntu, macOS arm64 and macOS Intel complete. https://github.com/bucket-foundation/bucket-foundation/actions/runs/36915038681
- Run 36919432926: all four complete, with one dialog for each macOS read. https://github.com/bucket-foundation/bucket-foundation/actions/runs/36919432926
- Local Fedora 42 run, three times, same table as ubuntu.

Each job's summary page holds the full tables, and its artifact holds `results-*.jsonl` and the screenshots.

## Results

Counts are reads across the four entries.

### Linux

| State | `tool` | `crate-default` | `api` | `api-unlock` |
|---|---|---|---|---|
| Unlocked | 8 of 8 found, equal | 0 of 4 found | 4 of 4 found, equal | 4 of 4 found, equal |
| Locked | 8 of 8 locked | 0 of 4 found | 4 of 4 locked | 4 of 4 locked, error `Prompt`, 40 to 80 ms |

The collection stayed locked after the locked run, and the keyring listed the same four items. On a desktop with a display, `api-unlock` opens the keyring password dialog; that case was left unmeasured.

### macOS

Same counts on arm64 and Intel, for each of the three signing variants: 12 runs of four entries.

| Method | Outcome |
|---|---|
| `tool`, `tool-after` | found and equal after base64 decode, every read |
| `api-noui` | error -25293, every read, 44 to 289 ms |
| `crate-default` | timeout at 20 s, every read |
| `api` | timeout at 20 s, every read |

The access list on each item, from `security dump-keychain -a`: decrypt is granted to `/usr/bin/security` with the requirement `identifier "com.apple.security" and anchor apple`, and the partition list is `apple-tool:`. The screenshot taken at the first timeout shows the dialog "reader-linker wants to use your confidential information stored in "bkt db-data-key" in your keychain", asking for the keychain password, with Always Allow, Deny and Allow.

Signing variants: the cargo output is linker-signed ad hoc on arm64 and unsigned on Intel; `codesign -s -` with an identifier; `codesign --remove-signature`. The unsigned arm64 copy ran and behaved the same.

An item stored by the ad hoc signed Rust binary through `set_generic_password`:

| Reader | Outcome |
|---|---|
| The binary that stored it | found, no prompt, 42 to 186 ms |
| A rebuild with the same identifier, ad hoc signed | timeout; -25293 with the dialog disabled |
| The linker-signed copy | timeout; -25293 with the dialog disabled |
| `/usr/bin/security` | timeout |

Its access list names the storing binary by `cdhash`. An ad hoc signed engine that re-stores the keys under its own access list loses them at its next update, and the 0.4.0 app can no longer read them.

### Windows

| Method | Outcome |
|---|---|
| `tool`, `tool-after` | 8 of 8 found, equal, 324 to 327 ms |
| `api` | 4 of 4 found, equal, 42 ms |
| `crate-default` | 0 of 4 found |

File hash and modified time were the same before and after each read.

## Upgrade Rule

No system needs user interaction when the engine uses the adapter in the Answer table. The engine reads the existing items in place and re-stores nothing. On macOS a move to native keychain items needs a Developer ID signature with a stable designated requirement and one user approval per item, and it breaks rollback to the TypeScript app.

## Limits

- No Developer ID certificate was used, since the workflow carries no secrets. A Developer ID signed reader of items made by `security`, and of items it stored itself across an update, is unmeasured.
- The macOS keychain was a fresh file keychain set as default on the runner, standing in for the login keychain. The access list mechanism is the same; iCloud Keychain and the data protection keychain were out of scope.
- Run 36915038681 sent SIGTERM to SecurityAgent after each timeout and the first dialog stayed on screen, so its later screenshots show that first dialog. Run 36919432926 sends SIGKILL, a new SecurityAgent answers each read, and each screenshot names its own binary and item, for example "reader-adhoc wants to use your confidential information stored in "bkt device-ed25519"". Its macOS counts match run 36915038681.
- Linux was measured with the gnome-keyring of `ubuntu-latest` and gnome-keyring 48.0 on Fedora 42. KWallet and KeePassXC as the Secret Service provider are unmeasured.
- The locked Linux case ran with no display. The dialog path on a desktop session is unmeasured.
- One local run of three failed inside the TypeScript writer: `secret-tool store` returned "The secret was transferred or encrypted in an invalid way" during the branch binary's `bkt init`. The cause was left unexamined.
- `keyring` 4.x splits the stores into separate crates and was left untested.
- Windows ran as one user on one machine. A roaming profile and a password reset by an administrator, both of which affect DPAPI, are unmeasured.
- The 0.4.0 Windows binary calls `whoami` by name. Under Git Bash it found the coreutils `whoami` and `bkt init` failed until System32 led `PATH`. `dev` already calls it by full path.
