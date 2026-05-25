# World Indicators — globe layer

**build history.** A real-data earth-observation layer for the canon globe.

`src/data/world-indicators.json` — 211 countries, 32 World Bank indicators each (+ global averages), in the same marker schema the globe already renders for `canon-sites.json`.

## Source
World Bank Open Data API (`mrnev=1` = latest non-empty value per country), CC-BY-4.0 — which itself aggregates WHO, FAO, UNESCO, IEA, IMF, UN. Built by `~/agfarms/world-data/build_bucket_globe_layer.py` from `world_bank_wide.csv`. Re-run to refresh. OWID obesity series + raw WB long/wide tables live in `~/agfarms/world-data/`.

## Shape
```jsonc
{
  "branch": "10-earth", "kind": "world-indicator", "count": 211,
  "indicators": { "<label>": "<label>", ... },        // 32 metric labels
  "global_average": { "<label>": <number>, ... },      // World aggregate row
  "countries": [
    {
      "id": "wb-usa", "title": "United States", "iso3": "USA",
      "lat": 38.8895, "lng": -77.032,                  // WB capital coords
      "capital": "Washington D.C.", "region": "North America", "income": "High income",
      "branch": "10-earth", "kind": "world-indicator",
      "values": { "Life expectancy at birth (years)": 78.89, "GDP per capita (current US$)": 84534.04, ... }
    }
  ]
}
```

## Indicators (across the board)
Health/obesity (overweight %, life expectancy, health spend, mortality, suicide, death rate) · economy (GDP, GDP/cap, inflation, unemployment, Gini, consumption) · demographics (population, urban %, growth, density, fertility) · education (spend, literacy, tertiary) · environment/earth (CO₂/cap, forest %, renewables, freshwater, PM2.5) · food/agriculture (food production index, ag land %, undernourishment, cereal yield) · tech (internet %, mobile/100).

## Render it on the canon globe (CanonMarkers)
The layer matches the `canon-sites.json` contract, so it drops into the existing R3F marker pipeline:
1. Import `worldData from "@/data/world-indicators.json"` in `src/app/canon/CanonGlobeMount.tsx` (next to `sitesData`).
2. Map `worldData.countries` → markers (they already have `lat`, `lng`, `title`, `branch`, `kind`) and feed them to `CanonMarkers` as an additional layer behind a toggle (e.g., "Earth data").
3. Color/scale a marker by a selected indicator (dropdown over `worldData.indicators`); show `country.values` + `region`/`income` on hover/click.
4. Show `worldData.global_average` in the legend as the world baseline.

Outcome-tier, not canon: per the canon thesis, world outcomes (obesity, GDP, emissions) are **downstream applications**, not foundations — this layer is earth-observation context for the canon, scoped to branch `10-earth`.
