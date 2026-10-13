# PI Fit

Embeds our research, past, present and planned, against a list of PIs and draws where each one sits.

## Inputs

Everything personal lives outside the repo, in `PI_FIT_DATA` (default `~/.local/share/bucket-pi-fit/`):

| File or variable | Content |
|------|---------|
| `self.tsv` | phase, year, label, text for each piece of our work |
| `network.tsv` | name, school, node, optional pinned OpenAlex author id |
| `PI_FIT_COCKPIT` | path to an advisor CSV with an `openalex_url` column |
| `PI_FIT_CONTACT` | contact address for the OpenAlex polite pool |

A network name resolves only when the OpenAlex candidate's institution matches the school, or when its author id is pinned. Anyone else is skipped and reported.

## Run

```bash
pip install -r requirements.txt
python3 fetch.py
HF_HUB_OFFLINE=1 python3 fitmap.py
python3 -m pytest tests
```

## Outputs

Written to `PI_FIT_DATA/<date>/`. `fitmap.py` refuses a path inside the repo.

| File | Content |
|------|---------|
| 00-semantic-circle.png | every PI, angle = topic position, radius = distance from our work |
| 01-star-plot.png | spokes are the top 8 principal directions of PI topic space; our work in three phases and the six closest PIs |
| 02-helix.png | one turn per fit decile, with our work as a line from 2022 to 2029 |
| 03-star-slices.png | spokes are our research directions; one panel per field |
| fit.csv, fit.json | fit and the closest topic pairs per PI, private |
| cards/ | one card per outreach PI: that PI's star against our directions, and no other PI |

Fit is cosine similarity between OpenAlex topic embeddings. It has not been validated against advising outcomes, and every card says so.
