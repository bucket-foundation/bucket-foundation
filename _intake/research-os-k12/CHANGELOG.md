# Changelog: _intake/research-os-k12/

## 2026-09-10

Folded in the system review pass from the main working tree (`RESEARCH-OS-K12-SYSTEM-REVIEW.md`
plus its four source reports) on top of what PR #3 already carried in this folder (`README.md`,
`funding-log.md`, `.status.json`, `03-data-services.md`, `04-funding-and-people.md`, `raw/*.md`).
No existing file was overwritten or deleted.

Added:
- `01-inventory.md`
- `02-architecture.md`
- `04-compliance-distribution.md`
- `RESEARCH-OS-K12-SYSTEM-REVIEW.md`

Collision: `03-data-services.md` already existed in this folder from PR #3. A byte-for-byte diff
against the incoming file found zero differences (both are the vendor and data-source map, verified
2026-09-09). Filed the incoming copy as `03-data-services-system-review.md` per the fold-in rule for
name collisions, and added a one-line pointer at the top of the existing `03-data-services.md`
back to this entry. `RESEARCH-OS-K12-SYSTEM-REVIEW.md`'s own file list was updated to cite the
`-system-review` filename so its cross-references resolve inside this folder.

Redactions made to the incoming files during the PR #3 review pass (see PR comment for the full
list): one local absolute path in `01-inventory.md` rewritten to a repo-relative description; ten
banned-word hits (`genuinely`, `actually`, `notably`, `deeply`) removed; ten em-dash or en-dash
characters replaced with a colon, a comma, or an ASCII hyphen across `01-inventory.md`. No secret
values, PII, or non-public server addresses were found in the incoming files.
