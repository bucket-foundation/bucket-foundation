# Class

The Class step (INTEGRATION-PLAN.md section 7 and 10; ros-27 roles). Teachers and librarians run a class: assign a target, override a level with a reason, manage member roles, review productions. Kept simple; closer to feature than core; required for a school or a library to adopt it.

## Roles as grants

`supabase/migrations/20260915020000_research_os_roles_assignments.sql`, rules in `src/lib/research-os/roles.ts` (tested by `scripts/test-research-os-roles-assignments.ts`).

A membership in `graph.class_members` carries a role: `learner` (default), `teacher`, `librarian`, `parent`, `peer`, `reviewer`, `researcher`. A person can hold several across classes.

| Role | Runs the class | Reviews | Sees |
|---|---|---|---|
| teacher, librarian | yes | yes | every learner |
| reviewer | no | yes | every learner |
| researcher | no | no | every learner's accepted productions |
| parent | no | no | the one learner in `related_learner_id` |
| peer | no | no | peers' shared nodes (access.ts decides per node) |
| learner | no | no | themselves |

Staff identity today: the class's `reviewer_email` (the Phase 0 teacher) or a teacher or librarian membership. `verifyClassStaff` in `class-db.ts` resolves both and returns the caller's roles.

## Assignments

`graph.assignments`: a target node, a title, instructions, a due date, `required`, `requires_production`. Decision 6 as settled: a teacher assigns a paper and requires the class to write it in Research OS; the finished paper is the production and is required as the assignment; acceptance into the public graph is never required.

Status per learner (`assignments.ts`): `not_started`, `in_progress` (any level above access), `produced` (a production exists), `accepted` (an accepted production, or understanding reached when no production is required), `overdue`.

Routes: `GET /api/research-os/assignments?class=` (staff), `GET ?mine=1` (learner, with status), `POST` create and close. The workspace shows the learner's open assignments in a banner; `?target=<slug>` opens the assigned target.

## Level overrides

`graph.level_overrides`: learner, node, who set it, class, from and to level, the reason (required). `POST /api/research-os/override` writes the row and an `override` evidence event through `recordEvidence`, so the class grid, the evidence log, and the game layer read it like any transition. The class grid carries an override control on each learner row.

## Members

`GET /api/research-os/members?class=` lists the roster with roles; `POST` sets a member's role (teacher or librarian only), with `relatedLearnerId` for a parent.

## Roster sync

`OneRosterCsvSource` applies today. `CleverSource`, `ClassLinkSource`, and `GoogleClassroomSource` share the interface and throw until a school connects credentials, so a misconfigured sync never writes an empty roster.

## Later

Parent view of payments (ros-32), the review queue reading `reviewer` memberships beside the email allowlist, roster sync writing roles from the OneRoster `role` column, assignment progress summarized on the class grid.
