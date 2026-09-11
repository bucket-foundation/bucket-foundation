"""Generate `docs/RESEARCH-OS-INTEGRATION.md`'s "## Question map" section
from `learning/research-os/RESEARCH-QUESTIONS.md` plus the hand-maintained
registry at `hte/data/question-map.json`, so a Research OS plan revision
(`PLAN-REVISION-N.md`) needs no hand pass over that section to stay current.

The plan file states the questions; the registry states the engine's own
read of each one (`status`, `corpora`, `slot_frame`, `adapter_needed`,
`note`), since deciding whether a question is runnable, needs a new
adapter, or sits outside a slot-filled address space is a judgment call no
parser makes on its own. `compute_diff` cross-checks the two: a live
question with no registry entry, a registry entry whose question vanished
from the plan, a question whose text changed at the same id (reworded),
one that reappeared at a different id with the same text (renumbered), and
a registry corpus name absent from the live `hte.cli._CORPUS_LOADERS`
registry. `hte question-map --check` (`cli.py`) exits non-zero when any of
those five conditions holds; `--write` renders the section regardless,
folding the same findings into a changelog block so a stale registry is
visible in the doc itself rather than only in a CI failure.

Renumbering detection matches by question text alone: `RESEARCH-QUESTIONS.
md`'s own numbered list order plays no part in it, so a question that
moves from id 12 to id 30 is read identically to one that stays put,
provided its text does not change in the same revision. A question whose
text changes at the same time it moves reads as a new question, the same
ambiguity a human reviewer would face; `--check`'s report names it as
`new` and `vanished` in that case, leaving `renumbered` for the
unambiguous match, and the registry keeps its old entry until a person or
the next agent session resolves which is which.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable, Sequence

_PACKAGE_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _PACKAGE_DIR.parents[2]

DEFAULT_QUESTIONS_PATH = _REPO_ROOT / "learning" / "research-os" / "RESEARCH-QUESTIONS.md"
DEFAULT_REGISTRY_PATH = _PACKAGE_DIR / "data" / "question-map.json"
DEFAULT_DOC_PATH = _PACKAGE_DIR.parent / "docs" / "RESEARCH-OS-INTEGRATION.md"

BEGIN_MARKER = (
    "<!-- BEGIN GENERATED hte.question_map: run `make question-map` "
    "(`hte question-map --write`) to refresh; hand edits between these "
    "markers are overwritten on the next run -->"
)
END_MARKER = "<!-- END GENERATED hte.question_map -->"

# The heading `_replace_legacy_section` looks for on a doc that has never
# been written by this module before: the hand-written revision-1 pass
# (PR #39) starts its own question map here and ends it at the next H2.
_LEGACY_SECTION_HEADING = "## Question map"

_STATUS_LABELS = {
    "runnable": "runnable today",
    "needs_adapter": "needs adapter",
    "out_of_scope": "out of scope",
}

_SLOT_ORDER = ("actor", "action", "object", "place", "mechanism", "time")


# --------------------------------------------------------------------------
# Parsing `RESEARCH-QUESTIONS.md`
# --------------------------------------------------------------------------


@dataclass(frozen=True)
class Question:
    """One numbered question, as `RESEARCH-QUESTIONS.md` states it: `id` is
    the question's own number (a string, so a registry lookup needs no
    int/str coercion at the call site), `text` is the line following
    `"N. "` verbatim, and `section` is the nearest `## ` heading above it.
    A `*Pre-registered as of ...*` annotation line some questions carry
    directly beneath them is not part of `text`; it never matches the
    numbered-line pattern below, so it is skipped rather than merged in.
    """

    id: str
    text: str
    section: str


_HEADING_RE = re.compile(r"^##\s+(.+?)\s*$")
_ITEM_RE = re.compile(r"^(\d+)\.\s+(.+?)\s*$")


def parse_questions(text: str) -> list[Question]:
    """Every numbered question in `text`, in file order. A line is a
    section heading when it starts with exactly `## ` (the file's own H1
    title and any `### ` subheading are both left alone); a line is a
    question when it starts with one or more digits, a period, and a
    space, and a heading has already been seen above it. A question found
    before any heading is dropped rather than filed under an empty
    section, which cannot happen in a well-formed plan file and signals a
    parsing assumption worth revisiting if it ever does.
    """
    section: str | None = None
    questions: list[Question] = []
    for line in text.splitlines():
        stripped = line.strip()
        heading = _HEADING_RE.match(stripped)
        if heading:
            section = heading.group(1)
            continue
        item = _ITEM_RE.match(stripped)
        if item and section is not None:
            questions.append(Question(id=item.group(1), text=item.group(2), section=section))
    return questions


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


# --------------------------------------------------------------------------
# The registry
# --------------------------------------------------------------------------


def load_registry(path: str | Path) -> tuple[dict, dict[str, dict]]:
    """`(meta, entries)`: `data["_meta"]` (or `{}` when absent) and every
    other top-level key, each a question id mapping to its own registry
    entry. Question ids are the registry's only ordinary keys, matching
    `hte/data/question-map.json`'s own "keyed by question id" contract;
    `_meta` is the one reserved key a numeric id never collides with.
    """
    data = json.loads(Path(path).read_text())
    meta = data.pop("_meta", {})
    return meta, data


# --------------------------------------------------------------------------
# Diffing the plan against the registry
# --------------------------------------------------------------------------


@dataclass
class DiffReport:
    new: list[str] = field(default_factory=list)
    renumbered: list[tuple[str, str]] = field(default_factory=list)
    vanished: list[str] = field(default_factory=list)
    reworded: list[str] = field(default_factory=list)
    unregistered_corpora: list[tuple[str, str]] = field(default_factory=list)

    def is_clean(self) -> bool:
        return not (self.new or self.renumbered or self.vanished or self.reworded or self.unregistered_corpora)

    def lines(self) -> list[str]:
        out: list[str] = []
        for qid in self.new:
            out.append(f"question {qid} is new: present in the plan, missing from the registry.")
        for old_id, new_id in self.renumbered:
            out.append(
                f"question {old_id} was renumbered to {new_id}: the text matches an existing "
                f"registry entry filed under a different id. Rename that entry's key to {new_id} "
                f"and add {old_id!r} to its aliases."
            )
        for qid in self.vanished:
            out.append(f"registry question {qid} vanished from the plan: no live question matches its recorded text.")
        for qid in self.reworded:
            out.append(f"question {qid}'s text changed in the plan; the registry's recorded question_text is stale.")
        for qid, corpus in self.unregistered_corpora:
            out.append(f"registry question {qid} names corpus {corpus!r}, missing from the live corpus registry.")
        return out


def compute_diff(questions: Sequence[Question], registry: dict[str, dict], corpus_names: Iterable[str]) -> DiffReport:
    """Cross-check `questions` (the live plan) against `registry` (the
    hand-maintained map) and `corpus_names` (the live `_CORPUS_LOADERS`
    keys). See the module docstring for what each of the five findings
    means and how a renumbering is told apart from a new question sharing
    an old id's text.
    """
    live_by_id = {q.id: q for q in questions}
    corpus_set = set(corpus_names)

    registry_text_by_id = {qid: _normalize(entry.get("question_text", "")) for qid, entry in registry.items()}
    text_to_registry_id: dict[str, str] = {}
    for qid, norm_text in registry_text_by_id.items():
        text_to_registry_id.setdefault(norm_text, qid)

    new: list[str] = []
    renumbered: list[tuple[str, str]] = []
    matched_old_ids: set[str] = set()

    for qid, question in live_by_id.items():
        if qid in registry:
            continue
        old_id = text_to_registry_id.get(_normalize(question.text))
        if old_id is not None and old_id != qid and old_id not in live_by_id:
            renumbered.append((old_id, qid))
            matched_old_ids.add(old_id)
        else:
            new.append(qid)

    vanished = [qid for qid in registry if qid not in live_by_id and qid not in matched_old_ids]

    reworded = [
        qid
        for qid, question in live_by_id.items()
        if qid in registry and _normalize(question.text) != registry_text_by_id.get(qid, "")
    ]

    unregistered_corpora = [
        (qid, corpus)
        for qid, entry in sorted(registry.items(), key=lambda pair: int(pair[0]))
        for corpus in (entry.get("corpora") or [])
        if corpus not in corpus_set
    ]

    return DiffReport(
        new=sorted(new, key=int),
        renumbered=sorted(renumbered, key=lambda pair: int(pair[1])),
        vanished=sorted(vanished, key=int),
        reworded=sorted(reworded, key=int),
        unregistered_corpora=unregistered_corpora,
    )


# --------------------------------------------------------------------------
# Rendering
# --------------------------------------------------------------------------


def _format_id_ranges(ids: Sequence[str]) -> str:
    """`["1","2","3","5"]` reads as `"1-3, 5"`: a compact range list for the
    Count block, the same shape a person would write by hand."""
    nums = sorted(int(i) for i in ids)
    if not nums:
        return "(none)"
    ranges: list[str] = []
    start = prev = nums[0]
    for n in nums[1:]:
        if n == prev + 1:
            prev = n
            continue
        ranges.append(str(start) if start == prev else f"{start}-{prev}")
        start = prev = n
    ranges.append(str(start) if start == prev else f"{start}-{prev}")
    return ", ".join(ranges)


def _class_cell(entry: dict | None) -> str:
    if entry is None:
        return "unregistered"
    label = _STATUS_LABELS[entry["status"]]
    corpora = entry.get("corpora") or []
    if corpora:
        joined = ", ".join(f"`{c}`" for c in corpora)
        return f"{label} ({joined})"
    return label


def _slot_frame_cell(slot_frame: dict | None) -> str | None:
    if not slot_frame:
        return None
    return "; ".join(f"{key.upper()} = {slot_frame[key]}" for key in _SLOT_ORDER if key in slot_frame)


def _render_table(questions: Sequence[Question], registry: dict[str, dict]) -> str:
    has_slots = any((registry.get(q.id) or {}).get("slot_frame") for q in questions)
    header = ["#", "Question", "Class", "Reason"]
    if has_slots:
        header.append("Slot frame")
    lines = [
        "| " + " | ".join(header) + " |",
        "|" + "|".join("---" for _ in header) + "|",
    ]
    for question in questions:
        # `entry` is `None` for a question `--check` already reports as
        # `new`: `render_section` still owes this row a table line (the
        # doc must stay a complete, well-formed table even mid-drift), so
        # it renders as "unregistered" rather than raising.
        entry = registry.get(question.id)
        note = entry.get("note", "") if entry is not None else "Not yet in hte/data/question-map.json; run `hte question-map --check`."
        cells = [question.id, question.text, _class_cell(entry), note]
        if has_slots:
            cells.append(_slot_frame_cell(entry.get("slot_frame") if entry else None) or "-")
        cells = [str(c).replace("\n", " ").replace("|", "\\|") for c in cells]
        lines.append("| " + " | ".join(cells) + " |")
    return "\n".join(lines)


def _section_order(questions: Sequence[Question]) -> list[str]:
    seen: dict[str, None] = {}
    for q in questions:
        seen.setdefault(q.section, None)
    return list(seen)


def render_section(questions: Sequence[Question], registry: dict[str, dict], diff: DiffReport) -> str:
    """The full "## Question map" section body: intro, classification key,
    a changelog block, one table per plan section in the plan's own
    order, and a generated Count summary. Does not include the
    surrounding marker comments; `apply_to_doc` adds those.
    """
    by_section: dict[str, list[Question]] = {}
    for q in questions:
        by_section.setdefault(q.section, []).append(q)

    parts: list[str] = [
        "## Question map",
        "",
        "A question-by-question map from `learning/research-os/RESEARCH-QUESTIONS.md` "
        "onto the engine this repo ships: which questions the engine can run as a "
        "campaign today, which need a new corpus adapter, and which sit outside what a "
        "belief-fusion-and-tournament engine over a slot-filled address space answers "
        "at all. Generated by `hte.question_map` from `hte/data/question-map.json`; "
        "edit that registry to change what appears here.",
        "",
        "Classification key: **runnable today** (the engine can run this now against a "
        "named corpus, listed in parentheses in the Class column), **needs adapter** "
        "(the engine could answer this once a new corpus, evidence source, or "
        "Research-OS-side instrument exists, named in the Reason column), **out of "
        "scope** (an individual-learner, classroom, or product question no slot-filled "
        "address space and belief score answers; it needs a knowledge-tracing model, "
        "an RCT, or a survey instead).",
        "",
    ]

    if diff.is_clean():
        parts.append(
            "No drift detected between `RESEARCH-QUESTIONS.md` and `hte/data/question-map.json` "
            "as of this generation."
        )
    else:
        parts.append("Detected since the registry's own last sync:")
        parts.append("")
        parts.extend(f"- {line}" for line in diff.lines())
    parts.append("")

    for section in _section_order(questions):
        section_questions = by_section[section]
        parts.append(f"### {section}")
        parts.append("")
        parts.append(_render_table(section_questions, registry))
        parts.append("")

    parts.append("### Count")
    parts.append("")
    by_status: dict[str, list[str]] = {"runnable": [], "needs_adapter": [], "out_of_scope": []}
    for q in questions:
        entry = registry.get(q.id)
        if entry is not None:
            by_status[entry["status"]].append(q.id)
    parts.append(
        f"Runnable today: {len(by_status['runnable'])} "
        f"(questions {_format_id_ranges(by_status['runnable'])}). "
        f"Needs a new adapter: {len(by_status['needs_adapter'])} "
        f"(questions {_format_id_ranges(by_status['needs_adapter'])}). "
        f"Out of scope for hypothesis generation: {len(by_status['out_of_scope'])} "
        f"(questions {_format_id_ranges(by_status['out_of_scope'])})."
    )
    return "\n".join(parts).rstrip("\n") + "\n"


def apply_to_doc(doc_text: str, section_text: str) -> str:
    """`doc_text` with its question-map section replaced by
    `section_text`, wrapped in `BEGIN_MARKER`/`END_MARKER`. A doc that
    already carries the markers (every run after the first) has only the
    text between them replaced; a doc that does not yet (the hand-written
    revision-1 pass) has its `## Question map` ... next-`## ` span
    replaced instead, markers included from that point on.

    `after` (whatever text originally followed the replaced span) has its
    own leading newlines stripped and exactly one blank line put back
    before it: a fixed rule, independent of however many blank lines
    `doc_text` happened to carry in. Reusing that incoming count instead
    would grow it by one blank line on every `partition`/re-insert cycle,
    since inserting a fixed-length block ahead of an `after` that already
    starts with a blank line adds another. `--write` run twice in a row
    must produce byte-identical output, the idempotency this function
    exists to keep.
    """
    block = f"{BEGIN_MARKER}\n{section_text.strip(chr(10))}\n{END_MARKER}\n"
    if BEGIN_MARKER in doc_text and END_MARKER in doc_text:
        before, _, rest = doc_text.partition(BEGIN_MARKER)
        _, _, after = rest.partition(END_MARKER)
    else:
        lines = doc_text.splitlines(keepends=True)
        start = None
        end = len(lines)
        for i, line in enumerate(lines):
            if start is None and line.rstrip("\n") == _LEGACY_SECTION_HEADING:
                start = i
                continue
            if start is not None and line.startswith("## ") and line.rstrip("\n") != _LEGACY_SECTION_HEADING:
                end = i
                break
        if start is None:
            raise ValueError(f"could not find a {_LEGACY_SECTION_HEADING!r} heading to replace in the doc")
        before = "".join(lines[:start])
        after = "".join(lines[end:])

    after_stripped = after.lstrip("\n")
    tail = f"\n{after_stripped}" if after_stripped else ""
    return before + block + tail


# --------------------------------------------------------------------------
# Building a report and the two CLI verbs
# --------------------------------------------------------------------------


def _live_corpus_names() -> set[str]:
    # Deferred import: `cli.py` imports this module at its own top level,
    # so importing `cli` back from here at module scope would cycle.
    # Calling this only from inside a function, after both modules have
    # already finished loading, avoids that.
    from .cli import _CORPUS_LOADERS

    return set(_CORPUS_LOADERS)


def build_report(
    *,
    questions_path: str | Path | None = None,
    registry_path: str | Path | None = None,
    corpus_names: Iterable[str] | None = None,
) -> tuple[list[Question], dict[str, dict], DiffReport]:
    questions_path = Path(questions_path) if questions_path is not None else DEFAULT_QUESTIONS_PATH
    registry_path = Path(registry_path) if registry_path is not None else DEFAULT_REGISTRY_PATH
    questions = parse_questions(questions_path.read_text())
    _meta, registry = load_registry(registry_path)
    names = set(corpus_names) if corpus_names is not None else _live_corpus_names()
    diff = compute_diff(questions, registry, names)
    return questions, registry, diff


def cmd_check(
    *,
    questions_path: str | Path | None = None,
    registry_path: str | Path | None = None,
    corpus_names: Iterable[str] | None = None,
) -> int:
    questions, registry, diff = build_report(
        questions_path=questions_path, registry_path=registry_path, corpus_names=corpus_names
    )
    if diff.is_clean():
        print(f"question-map: {len(questions)} questions, {len(registry)} registry entries, no drift detected.")
        return 0
    print(f"question-map: drift detected ({len(diff.lines())} issue(s)):", file=sys.stderr)
    for line in diff.lines():
        print(f"  - {line}", file=sys.stderr)
    return 1


def cmd_write(
    *,
    questions_path: str | Path | None = None,
    registry_path: str | Path | None = None,
    doc_path: str | Path | None = None,
    corpus_names: Iterable[str] | None = None,
) -> int:
    questions, registry, diff = build_report(
        questions_path=questions_path, registry_path=registry_path, corpus_names=corpus_names
    )
    doc_path = Path(doc_path) if doc_path is not None else DEFAULT_DOC_PATH
    section_text = render_section(questions, registry, diff)
    doc_text = doc_path.read_text()
    new_text = apply_to_doc(doc_text, section_text)
    changed = new_text != doc_text
    doc_path.write_text(new_text)
    print(f"question-map: wrote {doc_path} ({'updated' if changed else 'unchanged'}, {len(questions)} questions).")
    if not diff.is_clean():
        print("question-map: drift was rendered into the changelog; the registry itself was not modified:", file=sys.stderr)
        for line in diff.lines():
            print(f"  - {line}", file=sys.stderr)
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="hte question-map")
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--check", action="store_true")
    group.add_argument("--write", action="store_true")
    args = parser.parse_args(argv)
    if args.write:
        return cmd_write()
    return cmd_check()


if __name__ == "__main__":
    raise SystemExit(main())


__all__ = [
    "Question",
    "DiffReport",
    "parse_questions",
    "load_registry",
    "compute_diff",
    "render_section",
    "apply_to_doc",
    "build_report",
    "cmd_check",
    "cmd_write",
    "main",
    "DEFAULT_QUESTIONS_PATH",
    "DEFAULT_REGISTRY_PATH",
    "DEFAULT_DOC_PATH",
]
