# Medallion Layers

Bead bkt-oxyy. Research material moves through three layers before it reaches the graph, in the shape of `POLINGUAL-ROOTS.md`: bronze holds bytes and their rights, silver holds parsed items with a confidence and a span, gold is `graph.nodes` and `graph.edges`. Migration: `supabase/migrations/20260924000000_research_os_medallion.sql`. Code: `src/lib/research-os/medallion/`.

## Bronze

A bronze source is a row in `graph.evidence_source_admissions` with `origin = 'medallion'` and scope `index`, written only by `graph.admit_bronze_sources`. Hashes, the rights rule and withdrawal live on that row. The public id is `file:<sha256>`, the hash of the bytes, so it names no path and no work. The repo-relative path sits in `graph.bronze_file_paths`, which only the service role reads; a CHECK refuses a leading `/`, `~`, a backslash, `.` or `..` segments, `//`, control characters, and any root outside `_intake/`, `bucket-canon/`, `learning/app/corpus/`, `supabase/seed/`, `canon-figures/` and `src/data/`. `checkRepoPath` applies the same rules in code, and a test holds the two together.

A file's rights are the most restrictive `rights-policy.json` index rule over the nodes it feeds; a type no rule names is refused. Evidence search and the corpus admit step ignore medallion rows.

## Silver

`graph.silver_items` holds one row per parsed claim or term: its bronze source, a byte span in `nfc-lf/1` text, a text hash, the parser and its revision, a confidence that is the lowest of its parts, and the gold row it proposes. Below 0.5 is hidden and never promotes; 0.5 to 0.75 is uncertain. A trigger refuses stored text for a source whose rule refuses it, and a rights change to refused clears the text already stored. `publicSilver` and `publicCitation` show a refused or withdrawn source by id and hash alone, with text and locator withheld.

## Gold

`graph.gold_lineage` links a gold node or edge to the silver item it came from, with `promoted_by` of `reviewer`, `importer` or `backfill`. A reviewer is a person on the `RESEARCH_OS_REVIEWER_EMAILS` allowlist, checked by `isGraphReviewer`; the founder reviews through that list. Approving a proposal that carries `silver_item_id` at `/research-os/edges` writes the lineage row. `academy-import` and `canon-import` may promote without review, because their input is curated: Academy lessons written in this repo and canon dossiers chosen by hand. A trigger allows `importer` only on `academy_atom`, `canon_entry` and canon primary-papers sources, and refuses a `derives_from` or `prerequisite` edge from an excerpt.

Withdrawing a bronze source with `graph.withdraw_evidence_source` marks its silver withdrawn, makes private every gold node whose sources are all withdrawn, and queues it in `graph.medallion_withdrawn_nodes` with its prior visibility.

## Importers

With `--apply`, all four importers run the medallion leg after their gold write; `--medallion` runs it on a dry run too, and `--no-medallion` restores the stage 1 behavior. The leg writes bronze and silver, logs its failures and never stops the run. `--strict-shadow` makes a run with a shadow failure exit 1 after its gold write; CI and the importer tests pass it, and production runs leave it off.

- `academy-import` and `canon-import` write gold as before, then `promoted_by = importer` lineage.
- `canon-all` and `intake-all` write gold only for nodes already in the graph and for edges other than `derives_from` and `prerequisite`. A new lexical dependency edge becomes a silver `edge_candidate` and an `edge_proposals` row with `confidence_source = 'medallion_lexical'`, `proposed_kind` and its `silver_item_id`, reviewed at `/research-os/edges`; below 0.5 it stays in silver. A dependency edge already in gold is left as it is. A new node becomes a `node_proposals` row carrying its `draft`, and approving it creates that node with its kind and provenance.
- `backfill.ts --apply` writes bronze, silver and `promoted_by = backfill` lineage for every mapped node. A rerun writes nothing new.

Before stage 2 a run of `canon-all` wrote 50 lexical `derives_from` edges and `intake-all` 44; after it both write 0.

## Demotions

`enqueue-demotions.ts --apply` queues each `concept_lexical` `derives_from` edge from a canon concept tag as an `edge_proposals` row with `action = 'demote'`, the atom as factor and the tag's backfill silver item. On the local graph that is 50 edges on 28 tags, decided by the founder under bead bkt-cc3t. At `/research-os/edges`, approve keeps the edge and writes reviewer lineage. Reject calls `graph.recast_edge_to_cites`, which in one transaction locks the proposal and the edge by its (from, to, kind) key, adds a `cites` edge carrying the old provenance, moves learner flags to it, deletes the `derives_from` row and stores it as `prior_edge`. The function refuses a null reviewer and is granted to the service role alone; the route checks `RESEARCH_OS_REVIEWER_EMAILS` first. `restore-recast.ts --apply --proposal=<id>` or `--all` calls `graph.restore_recast_edge`, which puts the edge back with its id, returns the flags, removes only a `cites` edge the recast added, and reopens the proposal.

## Withdrawal

`withdraw.ts --source=file:<sha256>` or `--path=<repo path>`, with a required `--reason`, is a dry run by default. A path resolves to every source it has held. The run lists the source ids and their admission status, how many silver items would go withdrawn, and the node slugs that would go private or keep another source; it prints no path. `--apply` calls `graph.withdraw_evidence_source` once per source id. `--queue` lists the withdrawn nodes waiting for a reviewer. `--restore=<slug> --reviewer=<email> --apply` calls `graph.restore_withdrawn_node` for a reviewer on `RESEARCH_OS_REVIEWER_EMAILS`; it refuses while the source is withdrawn, and after a readmission under a newer rights revision it restores the node's prior visibility and revives the silver items of the active revision.

## Lineage Report

`/research-os/primes` and `scripts/research-os/primes-report.ts` show a lineage block: public nodes with backfill, importer and reviewer lineage, nodes with none before and after the first backfill, transcript-lineage nodes on a dependency path with the deepest layer, and pending review work. It shows counts and slugs, and a failed read of it leaves the rest of the report. Local graph, 2026-09-23: backfill 1,900, importer 494, reviewer 0, none 4 and 0; 28 of 734 transcript-lineage nodes on a dependency path, all canon concept tags, reaching layer 16; 50 demotions pending.

## Backfill Dry Run

Run of 2026-09-23 on the local graph, 1,924 gold nodes:

| Lineage | Nodes |
|---|---|
| Bronze file | 1,796 |
| Bronze directory listing | 105 |
| Upload with a stored file | 18 |
| Unknown | 5 |

The five unknown are three learner productions, one import with no file and one test node with no provenance. The run plans 958 bronze sources, 817 with text withheld, and 1,847 silver items.

Transcript lineage covers 734 nodes: 599 excerpts, 105 canon concept tags named after sub-claims folders, and 30 bridges. Baseline for the plan's check: 28 of them sit on a dependency path, all canon concept tags with lexical `derives_from` edges to Academy atoms, reaching layer 16. Excerpts and bridges sit on none.

## Rerun

```bash
npx ts-node --compiler-options '{"module":"commonjs"}' scripts/research-os/medallion/backfill.ts
npx ts-node --compiler-options '{"module":"commonjs"}' scripts/research-os/ingest/academy-import.ts --medallion
npx ts-node --compiler-options '{"module":"commonjs"}' scripts/test-research-os-medallion.ts
RESEARCH_OS_REQUIRE_DB=1 npx ts-node --compiler-options '{"module":"commonjs"}' scripts/test-research-os-medallion-db.ts
```
