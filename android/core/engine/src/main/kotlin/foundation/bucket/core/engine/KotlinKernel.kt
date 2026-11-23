package foundation.bucket.core.engine

import foundation.bucket.core.model.Lang

object KotlinKernel : CoreKernel {
    override val name = "kotlin"

    override fun grade(state: CardState, correct: Boolean, now: Long): CardState = if (correct) {
        val interval = if (state.reps == 0) 1.0 else maxOf(1.0, state.intervalDays * (if (state.lapses > 2) 1.8 else 2.5))
        state.copy(reps = state.reps + 1, intervalDays = interval, due = now + (interval * Scheduler.DAY_MS).toLong(), last = now)
    } else {
        state.copy(lapses = state.lapses + 1, intervalDays = 0.0, due = now + Scheduler.RELEARN_MS, last = now)
    }

    override fun streak(days: List<String>, today: String?): Int {
        if (days.isEmpty()) return 0
        val set = days.toSet()
        var d = java.time.LocalDate.parse(today ?: days.max())
        if (d.toString() !in set) d = d.minusDays(1)
        var n = 0
        while (d.toString() in set) { n += 1; d = d.minusDays(1) }
        return n
    }

    override fun balanced(words: List<GameWord>): List<GameWord> {
        val langs = mutableListOf<String>()
        val queues = linkedMapOf<String, ArrayDeque<GameWord>>()
        for (w in words) {
            if (w.lang !in queues) langs += w.lang
            queues.getOrPut(w.lang) { ArrayDeque() }.addLast(w)
        }
        val turns = mutableListOf<GameWord>()
        while (turns.size < words.size) for (l in langs) queues[l]?.removeFirstOrNull()?.let(turns::add)
        return turns.withIndex().sortedWith(compareBy<IndexedValue<GameWord>> { minOf(it.value.rank, GameWords.HELD_RANK) }.thenBy { it.index }).map { it.value }
    }

    override fun deck(deck: GameDeck): DeckKernel = KotlinDeck(deck)

    private class KotlinDeck(private val deck: GameDeck) : DeckKernel {
        override fun foils(word: GameWord, also: List<String>, count: Int, rng: SeededRandom): List<String> {
            val pool = deck.pool(word.lang)
            val category = deck.entry(word.itemId, word.lang)?.category
            val form = word.form.lowercase()
            val gloss = word.gloss.lowercase()
            val size = word.form.length
            val first = word.form.firstOrNull()
            val close = pool.asSequence()
                .filter { it.gloss.lowercase() != gloss && it.form.lowercase() != form }
                .map { e -> ((if (e.category == category) 0 else 4) + minOf(3, kotlin.math.abs(e.form.length - size)) + (if (e.form.firstOrNull() == first) 0 else 1)) to e }
                .sortedWith(compareBy<Pair<Int, GameDeck.Entry>> { it.first }.thenBy { it.second.itemId })
                .take(16).map { it.second }.toList()
            val taken = (listOf(form) + also.map { it.lowercase() }).toMutableSet()
            val out = also.filter { it.lowercase() != form }.toMutableList()
            for (e in mixed(close, rng)) {
                if (out.size >= count) break
                if (taken.add(e.form.lowercase())) out += e.form
            }
            return out.take(count)
        }

        override fun daily(count: Int, rng: SeededRandom): List<GameWord> {
            val langs = deck.targets.sorted()
            if (langs.isEmpty()) return emptyList()
            val used = mutableSetOf<String>()
            val out = mutableListOf<GameWord>()
            var i = 0
            val common = langs.map { l -> mixed(deck.pool(l).take(GameRounds.DAILY_POOL), rng) }
            val cursors = IntArray(langs.size)
            while (out.size < count && cursors.indices.any { cursors[it] < common[it].size }) {
                val k = i % langs.size
                i += 1
                while (cursors[k] < common[k].size) {
                    val e = common[k][cursors[k]]
                    cursors[k] += 1
                    if (used.add(e.itemId)) {
                        out += GameWord(e.itemId, langs[k], e.form, e.gloss, deck.root)
                        break
                    }
                }
            }
            return out
        }

        private fun formPrompt(id: Int, word: GameWord, also: List<String> = emptyList(), group: Int = 0, rng: SeededRandom): GamePrompt {
            val foils = foils(word, also, 3, rng)
            return GamePrompt(id, PromptMode.Form, word, mixed(listOf(word.form) + foils, rng), word.form, group)
        }

        override fun dailyRound(day: String): List<GamePrompt> {
            val rng = SeededRandom(GameSeed.daily(day, deck.root, deck.targets))
            return daily(GameRounds.DAILY_LENGTH, rng).mapIndexed { i, w -> formPrompt(i, w, rng = rng) }
        }

        override fun sameWord(words: List<GameWord>, rng: SeededRandom): List<GamePrompt> {
            val ids = LinkedHashSet<String>()
            words.filter { it.root == deck.root }.forEach { ids += it.itemId }
            deck.shared().forEach { ids += it }
            val out = mutableListOf<GamePrompt>()
            var group = 0
            for (id in ids) {
                if (group >= GameRounds.SAME_WORD_MEANINGS) break
                val family = deck.targets.mapNotNull { deck.word(id, it) }.take(GameRounds.SAME_WORD_LANGS)
                if (family.size < 2 || family.map { it.form }.toSet().size != family.size) continue
                for (w in family) {
                    val other = family.firstOrNull { it.lang != w.lang }?.form
                    out += formPrompt(out.size, w, listOfNotNull(other), group, rng)
                }
                group += 1
            }
            return out
        }
    }

    private val classical = setOf("la", "ang", "grc", "sa")

    override fun distractors(lang: String, own: List<String>, excluding: Set<String>, count: Int, rng: SeededRandom): List<String> {
        val blocked = excluding + lang + (classical - own.toSet())
        val kin = GameFamilies.family(lang).filter { it !in blocked }
        val near = mixed(kin.filter { it in own }, rng) + mixed(kin.filter { it !in own }, rng)
        if (near.size >= 2) return near.take(count)
        val far = mixed(own.filter { it !in blocked && it !in near }, rng) +
            mixed(Lang.codes.filter { it !in blocked && it !in near && it !in own }, rng)
        return (near + far).take(count)
    }

    override fun flags(words: List<GameWord>, own: List<String>, mode: PromptMode, count: Int, sameForm: (GameWord, String) -> Boolean, rng: SeededRandom): List<GamePrompt> {
        val seen = mutableSetOf<String>()
        val unique = balanced(words).filter { seen.add(it.form.lowercase()) }
        return unique.take(count).mapIndexed { i, w ->
            val clash = Lang.codes.filter { sameForm(w, it) }.toSet()
            val wrong = distractors(w.lang, own, clash, 3, rng)
            GamePrompt(i, mode, w, mixed(listOf(w.lang) + wrong, rng), w.lang)
        }
    }

    private enum class Partition { Language, Theme, LanguageTheme }

    override fun wordGroups(words: List<GameWord>, day: String, root: String, targets: List<String>, theme: (GameWord) -> String?, sameForm: (GameWord, String) -> Boolean): WordGroupsPuzzle? {
        val seed = "groups|${WordGroupsPuzzle.boardKey(day, root, targets)}"
        val rng = SeededRandom(GameSeed.hash(seed))
        val pool = words.filter { it.lang in targets && fitsGroup(it) }
            .map { GameSeed.hash("$seed|${it.id}") to it }
            .sortedWith(compareBy<Pair<ULong, GameWord>> { it.first }.thenBy { it.second.id })
            .map { it.second }
        val distinct = pool.filter { w -> targets.none { it != w.lang && sameForm(w, it) } }
        for (partition in mixed(Partition.entries, rng)) {
            val source = if (partition == Partition.Theme) pool else distinct
            pick(source, partition, theme, rng)?.let { groups -> return WordGroupsPuzzle(groups, mixed(groups.flatMap { it.words }, rng)) }
        }
        return null
    }

    private fun fitsGroup(w: GameWord) = w.form.length <= WordGroupsPuzzle.LONGEST_FORM && ' ' !in w.form

    private fun link(w: GameWord, partition: Partition, theme: (GameWord) -> String?): GroupLink? {
        if (partition == Partition.Language) return GroupLink.Language(w.lang)
        val name = theme(w)?.takeIf { it in WordGroupsPuzzle.themes } ?: return null
        return if (partition == Partition.Theme) GroupLink.Theme(name) else GroupLink.LanguageTheme(w.lang, name)
    }

    private fun pick(words: List<GameWord>, partition: Partition, theme: (GameWord) -> String?, rng: SeededRandom): List<WordGroup>? {
        val buckets = linkedMapOf<GroupLink, MutableList<GameWord>>()
        for (w in words) link(w, partition, theme)?.let { buckets.getOrPut(it) { mutableListOf() } += w }
        var forms = setOf<String>()
        val groups = mutableListOf<WordGroup>()
        val links = buckets.keys.filter { buckets.getValue(it).size >= WordGroupsPuzzle.GROUP_SIZE }.sortedBy { it.key }
        for (l in mixed(links, rng)) {
            if (groups.size >= WordGroupsPuzzle.GROUP_COUNT) break
            val taken = mutableListOf<GameWord>()
            val meanings = mutableSetOf<String>()
            val spelled = forms.toMutableSet()
            for (w in buckets.getValue(l)) {
                if (taken.size >= WordGroupsPuzzle.GROUP_SIZE) break
                if (w.itemId in meanings || w.gloss.lowercase() in meanings || w.form.lowercase() in spelled) continue
                meanings += w.itemId
                meanings += w.gloss.lowercase()
                spelled += w.form.lowercase()
                taken += w
            }
            if (taken.size != WordGroupsPuzzle.GROUP_SIZE) continue
            forms = spelled
            groups += WordGroup(l, taken)
        }
        return if (groups.size == WordGroupsPuzzle.GROUP_COUNT) groups else null
    }

    fun letters(form: String): List<String>? {
        val chars = form.codePoints().toArray().map { String(Character.toChars(it)) }
        if (chars.size !in 3..MiniPuzzle.SIDE || !chars.all { Character.isLetter(it.codePointAt(0)) }) return null
        return chars.map { c -> c.uppercase().let { if (it.codePointCount(0, it.length) == 1) it else c } }
    }

    override fun mini(words: List<GameWord>, day: String, root: String, targets: List<String>): MiniPuzzle? {
        val rng = SeededRandom(GameSeed.hash("mini|$day|$root|${targets.sorted().joinToString(",")}"))
        val langs = rng.shuffled(targets.sorted().filter { l -> words.count { it.lang == l && letters(it.form) != null } >= 8 })
        for (lang in langs) build(words.filter { it.lang == lang }, lang, rng)?.let { return it }
        return null
    }

    private fun build(words: List<GameWord>, lang: String, rng: SeededRandom): MiniPuzzle? {
        val seen = mutableSetOf<String>()
        val pool = words.sortedBy { it.id }.mapNotNull { w -> letters(w.form)?.takeIf { seen.add(it.joinToString("")) }?.let { w to it } }
        var best = emptyList<MiniEntry>()
        repeat(30) {
            if (best.size >= MiniPuzzle.WANTED) return@repeat
            val placed = attempt(rng.shuffled(pool), rng)
            if (placed.size > best.size) best = placed
        }
        if (best.size < 3) return null
        val top = best.minOf { it.row }
        val left = best.minOf { it.col }
        val shifted = best.map { it.copy(row = it.row - top, col = it.col - left) }
        val starts = shifted.map { MiniCell(it.row, it.col) }.toSet().sortedWith(compareBy({ it.row }, { it.col }))
        val numbered = shifted.map { e -> e.copy(number = starts.indexOf(MiniCell(e.row, e.col)) + 1) }
            .sortedWith(compareBy({ it.number }, { if (it.across) 0 else 1 }))
        val keys = numbered.flatMap { it.letters }.toMutableSet()
        for (l in rng.shuffled(pool.flatMap { it.second })) if (keys.size < 18) keys += l
        return MiniPuzzle(lang, numbered, keys.sorted())
    }

    private fun attempt(pool: List<Pair<GameWord, List<String>>>, rng: SeededRandom): List<MiniEntry> {
        val first = pool.firstOrNull() ?: return emptyList()
        val placed = mutableListOf(MiniEntry(first.first, first.second, 0, 0, true))
        for ((word, letters) in pool.drop(1)) {
            if (placed.size >= MiniPuzzle.WANTED) break
            val spots = mutableListOf<MiniEntry>()
            for (e in placed) for ((i, a) in e.letters.withIndex()) for ((j, b) in letters.withIndex()) {
                if (a != b) continue
                val cross = e.cells[i]
                val spot = MiniEntry(word, letters, if (e.across) cross.row - j else cross.row, if (e.across) cross.col else cross.col - j, !e.across)
                if (fits(spot, placed)) spots += spot
            }
            rng.element(spots)?.let(placed::add)
        }
        return placed
    }

    private fun fits(e: MiniEntry, placed: List<MiniEntry>): Boolean {
        val cells = placed.flatMap { it.cells } + e.cells
        if (cells.maxOf { it.row } - cells.minOf { it.row } >= MiniPuzzle.SIDE || cells.maxOf { it.col } - cells.minOf { it.col } >= MiniPuzzle.SIDE) return false
        val letter = mutableMapOf<MiniCell, String>()
        val sameWay = mutableSetOf<MiniCell>()
        for (p in placed) for ((c, l) in p.cells.zip(p.letters)) {
            letter[c] = l
            if (p.across == e.across) sameWay += c
        }
        val before = if (e.across) MiniCell(e.row, e.col - 1) else MiniCell(e.row - 1, e.col)
        val end = e.cells.last()
        val after = if (e.across) MiniCell(end.row, end.col + 1) else MiniCell(end.row + 1, end.col)
        if (letter[before] != null || letter[after] != null) return false
        for ((c, l) in e.cells.zip(e.letters)) {
            if (c in sameWay) return false
            val there = letter[c]
            if (there != null) {
                if (there != l) return false
                continue
            }
            val sides = if (e.across) listOf(MiniCell(c.row - 1, c.col), MiniCell(c.row + 1, c.col)) else listOf(MiniCell(c.row, c.col - 1), MiniCell(c.row, c.col + 1))
            if (sides.any { letter[it] != null }) return false
        }
        return true
    }
}
