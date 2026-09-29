# Profile Builder

Builds a Bucket profile for one person from opt-in sources, each tied to a sign-in method.

```
python3 -m profile_builder --list-sources
python3 -m profile_builder --name "Ada Lovelace" --github ada --orcid 0000-0000-0000-0000 \
  --web https://ada.example --local ~/projects --max-links 50 --out ~/.local/share/bucket-profiles/ada.json
```

`--max-links` caps each source. Output: branch weights across the canon, interest terms after boilerplate removal, languages, and every evidence link with its errors. Profiles hold personal data and stay out of the repo.

Tests: `cd tools/profile-builder && python3 -m unittest discover -s tests -t .`
