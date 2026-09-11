# Fixture Plan: Open Questions

Seeded for `tests/test_question_map.py`: two sections, four questions, one
`*Pre-registered*` annotation line, and a `Source:` line, exercising every
line shape `hte.question_map.parse_questions` has to skip past.

## Alpha section

1. Does alpha cause beta? Study: alpha study.
*Pre-registered as of 2026-01-01: an annotation line, never a question of its own.*
2. Does gamma predict delta? Study: gamma study.

## Beta section

Source: `some/fixture/path.md`, a citation line the parser skips.

10. Does the parser assign item 10 its own two-digit id? Study: index study.
11. Does eleven follow ten by the file's own position? Study: eleven study.
