# Open Content Sources

Epic bkt-2r04o. Founder rule: input comes from existing open-access human work with transcripts and human translations. No AI-generated content.

Language check uses `src/lib/research-os/work-quiz/languages.ts`, which lists 28 codes today. CLAUDE.md names 35 in the photon index; the brief names 34.

Status keys: **ship** means use now, **cond** means ship with the listed condition, **blocked** means keep out. Unit types: passage, episode, audio clip. Verified 2026-11-26 from each source's licence page unless marked "check at build".

## Ranked List

| # | Source | Licence | Store and show | Human translations | Unit | Status |
|---|--------|---------|----------------|--------------------|------|--------|
| 1 | VOA Learning English | US public domain | text, MP3, video | English only; pair with VOA language services | episode, passage | cond |
| 2 | Global Voices and Lingua | CC BY 3.0 | text | yes, volunteer Lingua translators | passage | cond |
| 3 | StoryWeaver | CC BY 4.0, some public domain | text, images, some audio | yes, community and Pratham editors | passage | ship |
| 4 | Global Storybooks | CC BY 4.0, check at build | text, audio | yes | passage, audio clip | ship |
| 5 | African Storybook | CC BY 4.0 | text, images | yes, 9,133 translations | passage | ship |
| 6 | Tatoeba | text CC BY 2.0 FR; audio per contributor | text; audio when licence allows | yes, volunteers | audio clip | cond |
| 7 | Wikinews | CC BY 4.0 after 2024-12-16, CC BY 2.5 before | text | separate articles per language | passage | cond |
| 8 | Wikisource, Gutenberg, LibriVox | public domain | text, audio | published human translations of classics | passage, episode | cond |
| 9 | Wikimedia Commons video with timed text | per file, CC BY, CC BY-SA, CC0 | video, subtitles | volunteer subtitles | episode | cond |
| 10 | Vikidia, Simple English Wikipedia | CC BY-SA 3.0 and 4.0 | text | interlanguage articles, written separately | passage | cond |
| 11 | TED and TEDx | CC BY-NC-ND 4.0 | embed only | yes, TED Translators | episode | cond |
| 12 | Creative Commons YouTube | CC BY on the video | embed only through the IFrame API | captions vary | episode | cond |
| 13 | Easy Languages and similar | standard YouTube licence | embed only | yes, their own subtitles | episode | cond |
| 14 | Public podcasts with transcripts | per show | per show | rare | episode | cond |
| 15 | Mozilla Common Voice | CC0 | audio, text | none; read sentences | audio clip | cond |
| 16 | Jamendo, Free Music Archive | per track CC | audio | lyrics rare, translations none | audio clip | blocked |
| 17 | OPUS parallel corpora | per sub-corpus | varies | mixed, some machine-aligned or machine-made | passage | blocked |
| 18 | Radio-browser plus Whisper | streams copyrighted | none | machine output | episode | blocked |

## Notes Per Source

**1. VOA Learning English.** The site states texts, MP3s, photos and videos are public domain and may be reprinted for commercial use with credit to learningenglish.voanews.com. Condition: strip AP, Reuters and AFP photos and wire copy, which stay copyrighted. VOA language services (es, fa, ru, zh, id, ko, tr, vi and more) are also US government work. These are parallel stories, paired by topic. Attribution: "Source: VOA Learning English, learningenglish.voanews.com". Access: RSS per program, HTML scrape of article pages.

**2. Global Voices.** Content created by Global Voices is CC BY 3.0. Attribution text: "This story by {author} originally appeared on Global Voices on {date}", author and link at the top, link to the licence, and a changes note. Condition: third-party photos, video and audio are excluded; text only. Lingua translates the same article into 30+ languages, which gives true parallel passages for most of our 28. Access: per-language WordPress sites with RSS.

**3. StoryWeaver.** CC BY 4.0 across the library, a few stories public domain. Thousands of stories in 100+ languages including hi, ta, pa, id, vi, es, fr. Translations come from Pratham staff and volunteers; drop any whose credits list machine translation. Attribution: the per-story credit block StoryWeaver prints on each book. Access: download per book as PDF and ePub; bulk Markdown for Pratham-original titles in the `global-asp/pb-source` GitHub repo.

**4. Global Storybooks.** 40 African Storybook tales retold in 60+ languages, many with native-speaker audio. Licence CC BY 4.0 from the project's history; read the per-site footer at build.

**5. African Storybook.** CC BY 4.0, © Saide. 5,504 storybooks, 262 languages, 9,133 translations. Covers English, French, Portuguese and Arabic among ours. Condition: take only "ASb approved" books; books marked "not checked" skip review.

**6. Tatoeba.** Sentences CC BY 2.0 FR with author credit. Audio licence is set per contributor and some carry a no-commercial condition. Condition: import only audio whose contributor licence permits commercial use, keep the contributor name. Bulk exports at downloads.tatoeba.org.

**7. Wikinews.** Credit "Wikinews". Editions write separate articles, so pairs are topic matches.

**8. Wikisource, Project Gutenberg, LibriVox.** LibriVox recordings are public domain worldwide; Gutenberg texts are public domain in the US. Condition: the translation must also be public domain, which means pre-1930 published translations; check the year per title. Pairs are chapter-aligned classics, such as Tolstoy beside the Garnett English.

**9. Wikimedia Commons video.** Licence per file, read from the file page. TimedText subtitles are CC BY-SA. Condition: per-file licence check and credit line.

**10. Vikidia and Simple English Wikipedia.** CC BY-SA 3.0 and 4.0, attribution plus share-alike on our passage text. Condition: the passage page carries the share-alike licence. Vikidia covers fr, es, it, ru and others.

**11. TED.** CC BY-NC-ND 4.0. Transcripts and subtitles may be used only alongside the video, in TED's embeddable player, shown in full. Condition: embed only, on free pages, with no paywall around it. Human translations by TED Translators, up to 30+ languages per talk. Blocked inside paid Learn.

**12. YouTube under CC BY.** YouTube API terms III.E.1 forbid downloading or storing audiovisual content without written approval, whatever the video licence. The IFrame API forbids modifying or overlaying the player (I.6) and background play (I.9). The captions API downloads tracks for the channel owner alone. Condition: embed with YouTube's built-in captions, our word panel beside the player, and no stored transcript unless the channel owner grants it in writing.

**13. Easy Languages.** Standard YouTube licence, all rights reserved. Embed only, using YouTube's own captions. A licence deal would let us store their subtitles.

**14. Podcasts.** An RSS feed grants playback alone. Condition: a show licensed CC (for example some university and public broadcaster shows) or a written grant; transcript must be human-made, so check the show's process. Case by case.

**15. Common Voice.** CC0 audio of read sentences. No translations and the sentences are short and unrelated. Use as word pronunciation clips.

**16. Jamendo and FMA.** Track licences vary, many NC. Lyrics are rarely published and translations do not exist. Blocked until a source of human lyric translations appears.

**17. OPUS.** A collection: OpenSubtitles is copyrighted film dialogue, several sets are machine-aligned or machine-translated. Internal alignment tests only.

**18. Radio-browser plus Whisper.** The directory is open data; the streams are copyrighted broadcasts, so recording and storing them needs the broadcaster's permission. Whisper output is machine transcription. Under the founder rule, model-made text counts as AI-generated content, and its translations would need a machine step too. Blocked.

## Open Items

- Reconcile 28 language codes with the 34 named in the brief.
- Read the Global Storybooks per-site licence footer.
- Founder outreach: Easy Languages licence for stored subtitles; VOA language services contact at learningenglish@voanews.com.
