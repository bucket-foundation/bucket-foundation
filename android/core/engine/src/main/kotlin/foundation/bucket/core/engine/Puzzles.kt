package foundation.bucket.core.engine

sealed interface GroupLink {
    data class Language(val lang: String) : GroupLink
    data class Theme(val theme: String) : GroupLink
    data class LanguageTheme(val lang: String, val theme: String) : GroupLink

    val key: String get() = when (this) {
        is Language -> "l:$lang"
        is Theme -> "t:$theme"
        is LanguageTheme -> "c:$lang:$theme"
    }
}

data class WordGroup(val link: GroupLink, val words: List<GameWord>) {
    val id: String get() = words.map { it.id }.sorted().joinToString(",")
}

data class WordGroupsPuzzle(val groups: List<WordGroup>, val tiles: List<GameWord>) {
    private enum class Partition { Language, Theme, LanguageTheme }

    companion object {
        const val GROUP_COUNT = 4
        const val GROUP_SIZE = 4
        const val MISTAKES = 4
        const val LONGEST_FORM = 14
        val themes = setOf("adjective", "animal", "body", "color", "family", "food", "nature", "number", "object", "time", "verb")

        fun boardKey(day: String, root: String, targets: List<String>) = "$day|$root|${targets.toSet().sorted().joinToString(",")}"

        fun daily(words: List<GameWord>, day: String, root: String, targets: List<String>, theme: (GameWord) -> String?, sameForm: (GameWord, String) -> Boolean = { _, _ -> false }): WordGroupsPuzzle? {
            val seed = "groups|${boardKey(day, root, targets)}"
            val rng = SeededRandom(GameSeed.hash(seed))
            val pool = words.filter { it.lang in targets && fits(it) }
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

        private fun fits(w: GameWord) = w.form.length <= LONGEST_FORM && ' ' !in w.form

        private fun link(w: GameWord, partition: Partition, theme: (GameWord) -> String?): GroupLink? {
            if (partition == Partition.Language) return GroupLink.Language(w.lang)
            val name = theme(w)?.takeIf { it in themes } ?: return null
            return if (partition == Partition.Theme) GroupLink.Theme(name) else GroupLink.LanguageTheme(w.lang, name)
        }

        private fun pick(words: List<GameWord>, partition: Partition, theme: (GameWord) -> String?, rng: SeededRandom): List<WordGroup>? {
            val buckets = linkedMapOf<GroupLink, MutableList<GameWord>>()
            for (w in words) link(w, partition, theme)?.let { buckets.getOrPut(it) { mutableListOf() } += w }
            var forms = setOf<String>()
            val groups = mutableListOf<WordGroup>()
            val links = buckets.keys.filter { buckets.getValue(it).size >= GROUP_SIZE }.sortedBy { it.key }
            for (l in mixed(links, rng)) {
                if (groups.size >= GROUP_COUNT) break
                val taken = mutableListOf<GameWord>()
                val meanings = mutableSetOf<String>()
                val spelled = forms.toMutableSet()
                for (w in buckets.getValue(l)) {
                    if (taken.size >= GROUP_SIZE) break
                    if (w.itemId in meanings || w.gloss.lowercase() in meanings || w.form.lowercase() in spelled) continue
                    meanings += w.itemId
                    meanings += w.gloss.lowercase()
                    spelled += w.form.lowercase()
                    taken += w
                }
                if (taken.size != GROUP_SIZE) continue
                forms = spelled
                groups += WordGroup(l, taken)
            }
            return if (groups.size == GROUP_COUNT) groups else null
        }
    }
}

class WordGroupsRound(val puzzle: WordGroupsPuzzle) {
    sealed interface Outcome {
        data class Solved(val group: WordGroup) : Outcome
        data object OneAway : Outcome
        data object Miss : Outcome
        data object Repeated : Outcome
        data object Ignored : Outcome
    }

    var tiles: List<GameWord> = puzzle.tiles
        private set
    var selected: Set<String> = emptySet()
        private set
    val solved = mutableListOf<WordGroup>()
    val results = mutableListOf<Boolean>()
    private val tried = mutableSetOf<Set<String>>()

    val mistakes get() = results.count { !it }
    val mistakesLeft get() = maxOf(0, WordGroupsPuzzle.MISTAKES - mistakes)
    val won get() = solved.size == puzzle.groups.size
    val finished get() = won || mistakesLeft == 0
    val canSubmit get() = !finished && selected.size == WordGroupsPuzzle.GROUP_SIZE
    val unsolved get() = puzzle.groups.filter { it !in solved }

    fun toggle(id: String) {
        if (finished || tiles.none { it.id == id }) return
        selected = if (id in selected) selected - id else if (selected.size < WordGroupsPuzzle.GROUP_SIZE) selected + id else selected
    }

    fun shuffle(rng: SeededRandom) { tiles = mixed(tiles, rng) }

    fun submit(): Outcome {
        if (!canSubmit) return Outcome.Ignored
        if (!tried.add(selected)) return Outcome.Repeated
        val group = puzzle.groups.firstOrNull { g -> g.words.map { it.id }.toSet() == selected }
        if (group != null) {
            results += true
            solved += group
            tiles = tiles.filterNot { it.id in selected }
            selected = emptySet()
            return Outcome.Solved(group)
        }
        results += false
        val best = puzzle.groups.maxOf { g -> g.words.count { it.id in selected } }
        return if (best == WordGroupsPuzzle.GROUP_SIZE - 1) Outcome.OneAway else Outcome.Miss
    }
}

data class MiniCell(val row: Int, val col: Int)

data class MiniEntry(val word: GameWord, val letters: List<String>, val row: Int, val col: Int, val across: Boolean, val number: Int = 0) {
    val id: String get() = "${if (across) "a" else "d"}$row:$col"
    val cells: List<MiniCell> get() = letters.indices.map { if (across) MiniCell(row, col + it) else MiniCell(row + it, col) }
}

data class MiniPuzzle(val lang: String, val entries: List<MiniEntry>, val keys: List<String>) {
    val rows: Int get() = (entries.flatMap { it.cells }.maxOfOrNull { it.row } ?: -1) + 1
    val cols: Int get() = (entries.flatMap { it.cells }.maxOfOrNull { it.col } ?: -1) + 1
    val answers: Map<MiniCell, String> get() = buildMap { for (e in this@MiniPuzzle.entries) e.cells.zip(e.letters).forEach { (c, l) -> put(c, l) } }
    val numbers: Map<MiniCell, Int> get() = entries.associate { MiniCell(it.row, it.col) to it.number }

    companion object {
        const val SIDE = 6
        const val WANTED = 5

        fun letters(form: String): List<String>? {
            val chars = form.codePoints().toArray().map { String(Character.toChars(it)) }
            if (chars.size !in 3..SIDE || !chars.all { Character.isLetter(it.codePointAt(0)) }) return null
            return chars.map { c -> c.uppercase().let { if (it.codePointCount(0, it.length) == 1) it else c } }
        }

        fun daily(words: List<GameWord>, day: String, root: String, targets: List<String>): MiniPuzzle? {
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
                if (best.size >= WANTED) return@repeat
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
                if (placed.size >= WANTED) break
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
            if (cells.maxOf { it.row } - cells.minOf { it.row } >= SIDE || cells.maxOf { it.col } - cells.minOf { it.col } >= SIDE) return false
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
}
