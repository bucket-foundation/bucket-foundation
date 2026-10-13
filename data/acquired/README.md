# Acquired Datasets

Open datasets Bucket holds on Drive for the knowledge graph, training and Explore, one row per dataset in `datasets.jsonl`. Bead bkt-qkfv. The files themselves stay on Drive and no data is committed here.

## Row Fields

| Field | Meaning |
|---|---|
| `id` | Stable dataset key, also the Drive folder name |
| `name`, `what` | Title and one line on the content |
| `drive_path` | Folder on Drive holding the files as published, with `manifest.json`, `checksums.md5` and `LICENCE.txt` |
| `branch` | `open` for public domain, CC0, CC BY, CC BY-SA, permissive code and government open licences; `nc` for non-commercial sets |
| `licence`, `terms_url` | Licence as the publisher states it and the address of its terms page |
| `training_permitted` | `yes` or `non-commercial-only` |
| `use` | `training`, `eval-only`, or a note on held-out splits |
| `personal_data` | `none`, `public-professional` or `public-use-deidentified` |
| `graph_link` | Canon branch, product or Explore mode the dataset feeds |
| `date` | Day the snapshot was taken |
| `status` | `held` when every file is on Drive with a manifest, `in transfer` before that |
| `bytes` | Total size once held |

## Rules

- A dataset enters the file after its terms page was read and the clause recorded in its `LICENCE.txt`.
- Sets in the `nc` branch stay out of every shipped product and every shipped model. Bucket is a nonprofit in intent and has not filed.
- Sets marked `eval-only` stay out of training.
- Health rows are public-use de-identified files, kept as published. No row is joined to another at the level of a person.
- Share-alike sets keep their licence on any derived table.

## Research OS

Each row maps to one Research OS item: `id` is the item key, `name` the title, `graph_link` the facet, and `drive_path` the pointer to the bytes. The per-dataset `manifest.json` on Drive lists every file with its size, hash and source address.
