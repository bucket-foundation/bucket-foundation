# 10 — Music

*Branch added 2026-05-10. Music is canon-relevant because it sits at the intersection of multiple foundational branches; it is itself a cross-branch phenomenon.*

## Why music is its own branch

Music is the **most cross-branch phenomenon in human culture**. It touches:
- **02-physics** — acoustics, sound waves, resonance, harmonics, Helmholtz
- **01-mathematics** — ratios, periodicity, group theory of pitch/rhythm, FFT
- **05-biophysics** — auditory perception, cochlea, brain oscillation entrainment
- **07-mind** — phenomenology of music, philosophy of music, music cognition
- **08-deep-history** — origins, oldest known instruments (40K-year flutes), evolution
- **09-art** — composition, performance, the aesthetic dimension
- **09-sacred-texts** — chant, ritual music, raga, qawwali, Gregorian, Vedic recitation

It deserves its own branch because:
1. The cross-branch overlap is so dense it functions as a unique research domain
2. Primary canonical sources (Pythagoras on harmonics, Boethius De Musica, Schoenberg Theory of Harmony, etc.) are music-specific even when they use math/physics/philosophy
3. Music is the empirical bridge between *light/sound* (the physics axis) and *mind/feeling* (the consciousness axis)

## Substructure

| # | Subfolder | Scope |
|---|---|---|
| 01 | `acoustics-physics/` | Sound waves, resonance, Helmholtz, Fourier on tone, room acoustics, psychoacoustics |
| 02 | `tuning-temperament/` | Pythagorean tuning, just intonation, equal temperament, Werckmeister, Partch's 43-tone, microtonal systems |
| 03 | `music-theory/` | Harmony, counterpoint, voice leading, set theory (Forte), Schenkerian analysis, Riemannian theory |
| 04 | `instruments/` | Organology, history of instruments, Sachs-Hornbostel classification, lutherie, organ-building, electronic instrument design |
| 05 | `history-pre-1500/` | Origins (Divje Babe flute ~50K years), ancient Greek modes, Vedic chant, Gregorian, Notre Dame school, Ars Nova |
| 06 | `history-1500-1900/` | Renaissance polyphony, Baroque (Bach, Handel), Classical (Mozart, Haydn, Beethoven), Romantic (Wagner, Mahler) |
| 07 | `history-modern/` | 20th c.: Debussy, Schoenberg, Stravinsky, Cage, Reich, Stockhausen, Ligeti, computer music |
| 08 | `classical-canon/` | The standard works — Bach WTC, Beethoven 9 symphonies, Brahms 4, Mahler symphonies, Stravinsky Rite, etc. |
| 09 | `jazz-canon/` | Real Book / standards, Armstrong, Ellington, Bird/Diz, Miles, Coltrane, Monk, Mingus, Bill Evans, Hancock, modern jazz |
| 10 | `world-traditions/` | Indian (Hindustani + Carnatic), African (Mali, Ewe, Gnawa), Persian dastgah, Arabic maqam, Indonesian gamelan, Brazilian, Cuban, Latin American, Native American, Aboriginal songlines |
| 11 | `philosophy-of-music/` | Aesthetics of music: Plato Republic on modes, Augustine De Musica, Schopenhauer (music = pure will), Nietzsche Birth of Tragedy, Adorno, Susanne Langer, Roger Scruton, Peter Kivy |
| 12 | `sacred-music/` | Ritual music across traditions: Vedic Sama, Sufi qawwali, Gregorian chant, Tibetan overtone, Jewish cantillation, Christian liturgical, Native ceremonial |
| 13 | `music-cognition/` | Auditory neuroscience, music + brain, emotion + music, language + music (Patel), Bharucha, Krumhansl, Levitin, Sacks Musicophilia |
| 14 | `education/` | Music pedagogy, Suzuki, Kodály, Orff, Dalcroze; ear training; analysis curricula; jazz pedagogy |
| 15 | `electronic-computer/` | Synthesis history (Theremin → Moog → DX7 → modern), MIDI, computer music (CCRMA, IRCAM), generative/AI music |

## Cross-branch tags

Each entry under 10-music should be tagged with which other branches it touches:
- `bridges/sound` — new bridge to add (sister to `light`)
- `bridges/resonance` (already exists)
- `bridges/symmetry` (rhythm, periodicity)
- `bridges/coherence` (harmonic coherence, ensemble synchrony)
- `bridges/time` (music IS structured time)

## Top-priority canonical sources to ingest

Public domain (mostly pre-1929 or US-PD):

| Source | Branch | Notes |
|---|---|---|
| Pythagoras (via Boethius) — De Institutione Musica | 11/02 | Harmonic ratios |
| Boethius — De Musica (5 books, ~520 CE) | 11/05 | Foundational medieval music theory |
| Guido d'Arezzo — Micrologus (~1025) | 03/05 | Solmization, staff notation origin |
| Zarlino — Le Istitutioni Harmoniche (1558) | 03/06 | Counterpoint canon |
| Rameau — Traité de l'Harmonie (1722) | 03/06 | Tonal harmony foundations |
| Helmholtz — On the Sensations of Tone (1863, English ✅ already in archive) | 01/02/13 | Psychoacoustics, just intonation |
| Riemann — Musical Logic + Harmony Simplified | 03 | Functional harmony |
| Schoenberg — Theory of Harmony (1922) | 03/07 | Modern harmony |
| Cooper-Meyer — The Rhythmic Structure of Music (1960) | 03 | Rhythm theory |
| Tovey — Essays in Musical Analysis | 08 | Listener-friendly classical analysis |
| Schweitzer — J.S. Bach (1908) | 08/06 | Bach analysis + theology |
| Sachs — The History of Musical Instruments (1940) | 04/05 | Foundational organology |
| Plato — Republic Book III + Timaeus | 11/12 | Modes + planetary harmony |
| Augustine — De Musica (~390 CE) | 11/12 | Christian theology of music |
| Sufi sama' literature (Hujwiri, Ghazali) | 12 | Ritual music in Islam |
| Vedic chant manuals (Samaveda + commentaries) | 12 | Earliest preserved sacred music |
| Wagner — Opera and Drama, Religion and Art | 11/06 | Music + drama unity |
| Adorno — Philosophy of Modern Music (1949) | 11/07 | Critical theory of music |
| Susanne Langer — Philosophy in a New Key (1942) | 11/13 | Music as symbolic form |
| Cage — Silence (1961) | 07/11 | Indeterminacy, sound philosophy |
| Sacks — Musicophilia (2007) | 13/07 | Music + brain |
| Levitin — This Is Your Brain on Music (2006) | 13 | Pop neurosci of music |
| Patel — Music, Language, and the Brain (2008) | 13 | Music cognition canon |

## Ingestion plan

1. Pull Helmholtz + Riemann + Schoenberg + Sachs from archive.org (Gutenberg has none of these)
2. OpenAlex author batch: Schoenberg, Stravinsky, Adorno, Schenker, Riemann, Forte, Tovey, Cooper, Patel, Bharucha, Krumhansl, Levitin, Lerdahl, Jackendoff, Huron, Margulis, Honing, Trainor, Bergeson, Trehub, Zatorre, Peretz, McAdams, Fitch, Hauser-Chomsky-Fitch, Pinker on music, Sloboda, Deutsch, Cross
3. YouTube: classical analysis lectures (Inside the Score, Listening to Beethoven, etc.), jazz pedagogy (Aebersold, Ralph Patt, Hal Galper), Indian classical (Ravi Shankar interviews), African (Mickey Hart docs), Adam Neely, Rick Beato
4. Sacred-Texts.com: any music subdomain crawl
5. Wikisource: PD music theory translations

The first concrete tasks are queued in `_intake/.music-targets.txt`.
