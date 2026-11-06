# Audio Sources

Each file is synthesized with eSpeak NG 1.51.1 (GPL-3.0 engine; the generated audio carries no license restriction). Command: `espeak-ng -v <voice> -s 135 -w <code>.wav "<word>"`, then AAC 64 kbps. Words come from Wiktionary via Kaikki, CC BY-SA 4.0.

Word pages at /word and /<lang>/word play pronunciation recordings straight from Wikimedia Commons, chosen from the Wiktionary entry for each form (Kaikki sounds first, then the entry wikitext). Each recording keeps its own license and author, listed under the tiles on its page. scripts/fetch_word_audio.mjs refreshes scripts/word-audio.json and scripts/build_words.mjs merges it into src/data/words.json. Forms without a recording fall back to the browser speech voice for that language, and the button hides when no voice is installed.
