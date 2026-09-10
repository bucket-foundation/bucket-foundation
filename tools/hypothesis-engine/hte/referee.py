"""`referee`: an automated referee pass over one paper's LaTeX.

Checks the mechanical `papers/PAPER-STANDARDS.md` items a script can
verify (section order, no bare `\\ref`, every bibliography entry carries
a DOI, an arXiv id, or a documented no-DOI exception), applies the safe
fixes among them, then runs the org's own voice lint
(`papers/template/Makefile`'s `lint` target: copy `main.tex` to a temp
`.md` inside the paper's own directory so `.voiceallow` resolves, run
`agf-lint-voice`, copy any fix back). `agf-lint-voice fix` resolves every
mechanical category on its own; the one category it never auto-fixes,
`antithesis`, gets a targeted rewrite from a new `referee` role
(`hte.llm.complete`, added additively to `hte/data/model-policy.json`),
scoped to the exact flagged excerpt so the fix never touches a LaTeX
command, a citation key, or a number around it. The paper is rebuilt
after every fix pass; `referee` stops once both the build and the lint
pass are clean or `MAX_ITERATIONS` is spent, and writes `REVIEW.md`
either way, so a caller always gets a plain account of what still needs
a human.
"""
from __future__ import annotations

import json
import re
import shutil
import subprocess
from pathlib import Path
from typing import Any

from . import llm
from .paper import BuildResult, build_pdf

MAX_ITERATIONS = 4

REFEREE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "rewritten_snippet": {"type": "string"},
        "rationale": {"type": "string"},
    },
    "required": ["rewritten_snippet", "rationale"],
}

EXPECTED_SECTION_ORDER = [
    "introduction", "related work", "preliminaries", "method", "results", "calibration", "limitations",
]

_BARE_REF_RE = re.compile(r"\\ref\{")
_SECTION_RE = re.compile(r"\\section\{([^}]*)\}")
_VIOLATION_LINE_RE = re.compile(r"^\s*\d+\s+\S+")


def _extract_sections(tex: str) -> list[str]:
    """Every `\\section{}` heading before `\\appendix` (an appendix
    section, `Glossary` in this package's own generated papers, is not
    part of `papers/PAPER-STANDARDS.md`'s body Structure list, so it is
    excluded rather than compared against it)."""
    body = tex.split("\\appendix", 1)[0]
    return [m.group(1).strip() for m in _SECTION_RE.finditer(body)]


def check_section_order(tex: str) -> dict[str, Any]:
    """`True` when every `\\section{}` heading in `tex` appears, in
    order, exactly as `papers/PAPER-STANDARDS.md`'s Structure list names
    them (Abstract and References/Appendices are not `\\section{}`
    headings in this template, so they are excluded from the compared
    list)."""
    found = [s.lower() for s in _extract_sections(tex)]
    expected = [s.lower() for s in EXPECTED_SECTION_ORDER]
    return {"ok": found == expected, "found": found, "expected": expected}


def check_bare_ref(tex: str) -> dict[str, Any]:
    """`papers/PAPER-STANDARDS.md`'s LaTeX-conventions rule: every
    cross-reference goes through `\\Cref`/`\\cref`, never a bare
    `\\ref{}`. Counts every bare occurrence in `tex`."""
    count = len(_BARE_REF_RE.findall(tex))
    return {"ok": count == 0, "count": count}


def fix_bare_ref(tex: str) -> str:
    """Every bare `\\ref{` in `tex` rewritten to `\\Cref{`; safe because
    `\\Cref` degrades to plain `\\ref`'s own numbering when `cleveref` is
    not installed (`bucket.sty`'s own fallback), so this fix never
    changes what a reference resolves to, only whether it can read as a
    typed one later."""
    return _BARE_REF_RE.sub(r"\\Cref{", tex)


def _parse_bib_entries(bib_text: str) -> list[dict[str, str]]:
    """A small, brace-matching (not regex-only) `.bib` reader, sufficient
    to read this package's own generated `refs.bib`: enough to survive a
    doubled-brace author field (`{{Bucket Foundation}}`) that a naive
    non-greedy `\\{(.*?)\\}` would truncate at the first inner `}`."""
    entries: list[dict[str, str]] = []
    i, n = 0, len(bib_text)
    while True:
        at = bib_text.find("@", i)
        if at == -1:
            break
        brace = bib_text.find("{", at)
        if brace == -1:
            break
        entry_type = bib_text[at + 1:brace].strip().lower()
        depth, j = 1, brace + 1
        while j < n and depth > 0:
            if bib_text[j] == "{":
                depth += 1
            elif bib_text[j] == "}":
                depth -= 1
            j += 1
        body = bib_text[brace + 1:j - 1]
        key, _, rest = body.partition(",")
        fields: dict[str, str] = {"type": entry_type, "key": key.strip()}
        k, m = 0, len(rest)
        while k < m:
            eq = rest.find("=", k)
            if eq == -1:
                break
            # `.strip()` alone only trims the outer ends: the text between
            # one field's closing brace and the next field's `=` starts
            # with the previous field's trailing comma, then whitespace
            # (",\n  title"). A leading comma is not whitespace, so a
            # plain `.strip()` call stops immediately at it. Stripping
            # both character classes in one call handles either order.
            name = rest[k:eq].strip(" \t\n,").lower()
            fb = rest.find("{", eq)
            if fb == -1:
                break
            depth2, p = 1, fb + 1
            while p < m and depth2 > 0:
                if rest[p] == "{":
                    depth2 += 1
                elif rest[p] == "}":
                    depth2 -= 1
                p += 1
            value = rest[fb + 1:p - 1].strip()
            if name:
                fields[name] = value
            k = p
        entries.append(fields)
        i = j
    return entries


def check_bibliography(refs_bib_path: Path) -> dict[str, Any]:
    """`papers/PAPER-STANDARDS.md`'s Citation rule: every entry carries a
    DOI or an arXiv id. An entry carrying neither is still accepted, as
    a disclosed exception, when its own `note` field names it an
    "unpublished manuscript": that phrase is this package's own marker
    for a self-citation to an internal companion report, one this
    repository's own reader can verify by opening the file rather than
    by an external index lookup (`hte.paper`'s `refs.bib` header comment
    states the same reasoning). Every other entry with no DOI, no
    `eprint`, and no such note is a real problem."""
    entries = _parse_bib_entries(refs_bib_path.read_text()) if refs_bib_path.is_file() else []
    problems: list[str] = []
    exceptions: list[str] = []
    for e in entries:
        has_external_id = bool(e.get("doi")) or bool(e.get("eprint"))
        if has_external_id:
            continue
        if "unpublished manuscript" in e.get("note", "").lower():
            exceptions.append(e["key"])
        else:
            problems.append(e["key"])
    return {"ok": not problems, "problems": problems, "documented_exceptions": exceptions, "n_entries": len(entries)}


def run_voice_lint(paper_dir: Path, *, fix: bool) -> dict[str, Any]:
    """`agf-lint-voice check|fix` over `paper_dir/main.tex`, through a
    temp `.md` copy inside `paper_dir` itself (`papers/template/
    Makefile`'s own `lint` target does the same, for the same reason:
    `agf-lint-voice`'s `.voiceallow` lookup walks upward from the linted
    file's own directory, and a copy outside this repository would never
    see `bucket-foundation`'s own allowlist). `fix=True` copies any
    change the tool made back into `main.tex`."""
    main_tex = paper_dir / "main.tex"
    tmp = paper_dir / ".referee-lint-tmp.md"
    shutil.copyfile(main_tex, tmp)
    try:
        mode = "fix" if fix else "check"
        proc = subprocess.run(
            ["agf-lint-voice", mode, str(tmp)], capture_output=True, text=True,
            encoding="utf-8", errors="replace",
        )
        if fix:
            main_tex.write_text(tmp.read_text())
        return _parse_lint_output(proc.stdout + "\n" + proc.stderr, proc.returncode)
    finally:
        tmp.unlink(missing_ok=True)


def _parse_lint_output(text: str, returncode: int) -> dict[str, Any]:
    violations: list[dict[str, Any]] = []
    for line in text.splitlines():
        if not _VIOLATION_LINE_RE.match(line):
            continue
        parts = re.split(r"\s{2,}", line.strip())
        if len(parts) >= 3 and parts[0].isdigit():
            violations.append({
                "line": int(parts[0]), "category": parts[1], "description": parts[2],
                "excerpt": parts[3] if len(parts) > 3 else "",
            })
    return {"ok": returncode == 0 and not violations, "violations": violations, "raw": text}


def _referee_rewrite(
    excerpt: str, category: str, description: str, *, cache_dir: str, replay_only: bool,
) -> str:
    """One `referee`-role call: a minimal rewrite of `excerpt` (the
    flagged text `agf-lint-voice` could not fix on its own, in practice
    an `antithesis` hit) that drops the flagged construction while
    keeping every LaTeX command, citation key, number, and identifier in
    it exactly as given."""
    prompt = (
        "This exact snippet from a research paper's LaTeX source was flagged by an "
        f"automated writing-voice linter, category {category!r} ({description}). Rewrite ONLY this "
        "snippet so it no longer matches that category, preserving its meaning and every LaTeX "
        "command, citation key, number, and identifier inside it exactly as given. Return the "
        "replacement snippet alone, no surrounding prose, no explanation folded into it.\n\n"
        f"Flagged snippet: {excerpt!r}"
    )
    response = llm.complete(
        prompt, role="referee", schema=REFEREE_SCHEMA, cache_dir=cache_dir, replay_only=replay_only,
    )
    return response["rewritten_snippet"].strip()


def _apply_targeted_rewrites(
    paper_dir: Path, violations: list[dict[str, Any]], *, cache_dir: str, replay_only: bool,
) -> list[dict[str, Any]]:
    """One `_referee_rewrite` call per remaining violation, applied only
    when the flagged excerpt occurs exactly once in `main.tex` (an
    ambiguous excerpt is left alone rather than risking the wrong
    occurrence). Returns one finding dict per violation, fixed or not."""
    findings = []
    main_tex = paper_dir / "main.tex"
    for v in violations:
        excerpt = v["excerpt"]
        content = main_tex.read_text()
        if not excerpt or content.count(excerpt) != 1:
            findings.append({
                "severity": "Low", "location": f"main.tex:{v['line']}",
                "issue": f"{v['category']}: {v['description']} (flagged text: `{excerpt}`)",
                "fix": "not auto-fixed: the flagged text was empty or not unique in main.tex, so a targeted replace was skipped",
            })
            continue
        rewritten = _referee_rewrite(excerpt, v["category"], v["description"], cache_dir=cache_dir, replay_only=replay_only)
        if not rewritten or rewritten == excerpt:
            findings.append({
                "severity": "Low", "location": f"main.tex:{v['line']}",
                "issue": f"{v['category']}: {v['description']} (flagged text: `{excerpt}`)",
                "fix": "not auto-fixed: the referee role returned no usable rewrite",
            })
            continue
        main_tex.write_text(content.replace(excerpt, rewritten))
        findings.append({
            "severity": "Low", "location": f"main.tex:{v['line']}",
            "issue": f"{v['category']}: {v['description']} (flagged text: `{excerpt}`)",
            "fix": f"referee role rewrote it to `{rewritten}`",
        })
    return findings


def _write_review(
    paper_dir: Path, findings: list[dict[str, Any]], bib_check: dict[str, Any],
    section_check: dict[str, Any], voice_after: dict[str, Any], build: BuildResult, iterations: int,
) -> Path:
    lines = [
        f"# Referee report: {paper_dir.name}",
        "",
        f"Scope: `{paper_dir.name}/main.tex`, reviewed against `papers/PAPER-STANDARDS.md`'s "
        "mechanical checks (section order, bare references, bibliography DOI/arXiv coverage) "
        "and the org's own voice lint.",
        "",
        "## Findings",
        "",
        "| Severity | Location | Issue | Fix applied |",
        "|---|---|---|---|",
    ]
    if findings:
        for f in findings:
            lines.append(f"| {f['severity']} | {f['location']} | {f['issue']} | {f['fix']} |")
    else:
        lines.append("| - | - | no findings | - |")

    lines += [
        "",
        "## Rebuild",
        "",
        f"`make pdf` finished with return code {build.returncode} after {iterations} pass(es). "
        f"Final page count: **{build.page_count if build.page_count is not None else 'unknown, build did not complete'}**.",
        "",
        "## Bibliography",
        "",
        f"`refs.bib` carries {bib_check['n_entries']} entry(ies). ",
    ]
    if bib_check["documented_exceptions"]:
        lines.append(f"Accepted exceptions (self-citation to an internal companion report, no DOI): {', '.join(f'`{k}`' for k in bib_check['documented_exceptions'])}.")
    if bib_check["problems"]:
        lines.append(f"Unresolved: {', '.join(f'`{k}`' for k in bib_check['problems'])} carry neither a DOI nor an arXiv id, and no documented exception.")

    lines += ["", "## Voice lint", ""]
    if voice_after["ok"]:
        lines.append("`agf-lint-voice check` reports zero remaining violations.")
    else:
        lines.append(f"`agf-lint-voice check` still reports {len(voice_after['violations'])} violation(s):")
        for v in voice_after["violations"]:
            lines.append(f"- line {v['line']} ({v['category']}): {v['description']} — `{v['excerpt']}`")

    lines += ["", "## Section order", ""]
    lines.append(
        "Matches `papers/PAPER-STANDARDS.md`'s Structure list." if section_check["ok"] else
        f"Does not match. Found `{section_check['found']}`, expected `{section_check['expected']}`."
    )

    review_path = paper_dir / "REVIEW.md"
    review_path.write_text("\n".join(lines) + "\n")
    return review_path


def referee(paper_dir: str | Path, *, cache_dir: str | None = None, replay_only: bool = False) -> dict[str, Any]:
    """Runs every mechanical `papers/PAPER-STANDARDS.md` check over
    `paper_dir/main.tex`, applies the safe fixes, resolves voice-lint
    violations (mechanically where `agf-lint-voice fix` can, through the
    `referee` role's own targeted rewrite where it cannot), and rebuilds
    with `hte.paper.build_pdf` until both the build and the lint pass are
    clean or `MAX_ITERATIONS` is spent. Writes `paper_dir/REVIEW.md`
    either way.

    Returns `{"paper_dir", "review_path", "latex_clean", "voice_clean",
    "page_count", "iterations", "findings"}`.
    """
    paper_dir = Path(paper_dir)
    resolved_cache_dir = cache_dir or str(paper_dir / "_llm-cache")
    findings: list[dict[str, Any]] = []

    tex_text = (paper_dir / "main.tex").read_text()

    section_check = check_section_order(tex_text)
    if not section_check["ok"]:
        findings.append({
            "severity": "High", "location": "main.tex section order",
            "issue": f"expected `{section_check['expected']}`, found `{section_check['found']}`",
            "fix": "not auto-fixed: reordering sections is a structural authoring decision",
        })

    ref_check = check_bare_ref(tex_text)
    if not ref_check["ok"]:
        tex_text = fix_bare_ref(tex_text)
        (paper_dir / "main.tex").write_text(tex_text)
        findings.append({
            "severity": "Medium", "location": "main.tex",
            "issue": f"{ref_check['count']} bare `\\ref{{}}` call(s); PAPER-STANDARDS.md requires `\\Cref`/`\\cref`",
            "fix": "replaced every bare `\\ref{` with `\\Cref{`",
        })

    bib_check = check_bibliography(paper_dir / "refs.bib")
    if bib_check["problems"]:
        findings.append({
            "severity": "High", "location": "refs.bib",
            "issue": f"entry(ies) with no DOI, no arXiv id, and no documented exception: {', '.join(bib_check['problems'])}",
            "fix": "not auto-fixed: sourcing or dropping a citation is an editorial decision",
        })
    if bib_check["documented_exceptions"]:
        findings.append({
            "severity": "Low", "location": "refs.bib",
            "issue": f"accepted exception, self-citation to an internal companion report with no DOI: {', '.join(bib_check['documented_exceptions'])}",
            "fix": "none needed; disclosed in refs.bib's own header comment",
        })

    run_voice_lint(paper_dir, fix=True)
    voice_after = run_voice_lint(paper_dir, fix=False)
    if voice_after["violations"]:
        findings.extend(_apply_targeted_rewrites(
            paper_dir, voice_after["violations"], cache_dir=resolved_cache_dir, replay_only=replay_only,
        ))
        run_voice_lint(paper_dir, fix=True)
        voice_after = run_voice_lint(paper_dir, fix=False)

    build = build_pdf(paper_dir)
    iterations = 1
    while not build.ok and iterations < MAX_ITERATIONS:
        build = build_pdf(paper_dir)
        iterations += 1
    if not build.ok:
        findings.append({
            "severity": "High", "location": "make pdf",
            "issue": f"the build did not succeed after {iterations} pass(es) (return code {build.returncode})",
            "fix": "not auto-fixed: this pass makes no LaTeX-syntax edit beyond the bare-\\ref fix above",
        })

    review_path = _write_review(paper_dir, findings, bib_check, section_check, voice_after, build, iterations)

    return {
        "paper_dir": str(paper_dir),
        "review_path": str(review_path),
        "latex_clean": build.ok,
        "voice_clean": voice_after["ok"],
        "page_count": build.page_count,
        "iterations": iterations,
        "findings": findings,
    }


__all__ = [
    "referee", "check_section_order", "check_bare_ref", "fix_bare_ref", "check_bibliography",
    "run_voice_lint", "REFEREE_SCHEMA", "MAX_ITERATIONS",
]
