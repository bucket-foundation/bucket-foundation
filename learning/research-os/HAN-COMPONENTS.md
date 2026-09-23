# Han Components

Chinese and Japanese words on the node page and on `/research-os/nsm` show each character with its meaning, and the components Wiktionary gives for it. Where Wiktionary gives none, the components now come from BabelStone IDS (Andrew West), stored in `graph.han_components` and marked "IDS, uncertain".

## Source

BabelStone `IDS.TXT` (Unicode 16.0, file date 2025-06-27, 97,680 entries). Its header says IDS sequences are facts and waives copyright in the data and its format, with no attribution asked; the pages credit it as thanks. The bronze is `_intake/cjkvi-ids/` (untracked). cjkvi-ids, derived from CHISE under GPLv2, was compared and is not used: on 100 characters that Wiktionary decomposes, both match Wiktionary's components on 63 once radical variants are mapped (𥫗 to 竹, 訁 to 言 and about 50 more).

## Rows

`scripts/research-os/han_ids.py` takes the first IDS of every character in the zh and ja rows of node_words and nsm_exponents, one level deep, and writes one row per component with its meaning (Wiktionary `zh`, then `ja`, then Unihan `kDefinition`) and a `confidence` on the shared thresholds: 0.9 when the component set agrees with Wiktionary's after the variant mapping, 0.6 when Wiktionary has none or disagrees. The pages show components only for characters Wiktionary leaves bare, so every one shown is at 0.6 and marked uncertain. Each row carries `decomposition_license` (the BabelStone waiver) and `meaning_license` (CC BY-SA 4.0 for Wiktionary, Unicode-3.0 for Unihan).

## Counts

Run of 2026-09-23: 522 characters, 516 decomposed, 1,060 component rows. Characters by band: 245 at 0.9 agreeing with Wiktionary, 132 at 0.6 disagreeing, 139 at 0.6 with no Wiktionary components. Meanings: 685 Wiktionary `zh`, 126 Wiktionary `ja`, 159 Unihan, 90 none. Of 986 shown zh and ja rows, 371 gain at least one decomposed character, 37.6%, against the 20% go line.

## Export

`GET /api/research-os/han-components/export` lists three CSV files; `?part=decompositions`, `?part=meanings-wiktionary` and `?part=meanings-unihan` serve them. Each file opens with a header row naming its terms, and no file mixes sources.

## Rerun

```bash
python3 scripts/research-os/han_ids.py --apply
```
