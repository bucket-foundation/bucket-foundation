# Gamification pages

For each of your directions write five pages in brand/_directions/pages/<id>/, using that direction's made layer (_directions/made/<id>.*), tokens, fonts and the made.json spec (medium, motion, accents):
- game-progress.html: streak display with streak freeze, XP bar and level-up moment, daily goal ring or bar.
- game-badges.html: 6 badges or achievements drawn by hand as SVG in the medium (d1 Swiss numerals, d2 kamon crests, d3 Memphis stickers, d4 constructivist medals, d5 girih medallions, d6 Bauhaus primitives), each with earned, locked and in-progress states; mastery map for Spanish and for the Information canon branch.
- game-social.html: leaderboard or study group card, plus notification and reminder cards: push, email snippet, in-app.
- game-celebrate.html: three live celebration moments (correct answer, lesson complete, level up) in the direction's animation language with the mascot reacting (mascot SVG at ../../logos/<id>-mascot.svg, inline it). Buttons replay each moment. Respect prefers-reduced-motion.
- game-summary.html: lesson-complete summary screen: XP earned, accuracy, words learned (cent, cien, מאה), streak, next lesson.
Base the mechanics on real precedents (Duolingo streak freeze and leagues, Brilliant progress paths, Khan mastery levels, Anki review stats) and name each precedent in a small caption. All art is hand-built SVG or code geometry; nothing that looks AI-generated. Keep tokens, the 4px rhythm, AA contrast (compute it), no horizontal scroll at 390, and check every asset returns 200 over http://127.0.0.1:8777. Thumbnails go in pages/<id>/thumbs/<page>-{1440,390}.png at 1440x900 and 390x844; view a sample at 2x. No code comments, no commits. Report under 60 words.
