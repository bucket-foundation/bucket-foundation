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
    companion object {
        const val GROUP_COUNT = 4
        const val GROUP_SIZE = 4
        const val MISTAKES = 4
        const val LONGEST_FORM = 14
        val themes = setOf("adjective", "animal", "body", "color", "family", "food", "nature", "number", "object", "time", "verb")

        fun boardKey(day: String, root: String, targets: List<String>) = "$day|$root|${targets.toSet().sorted().joinToString(",")}"

        fun daily(words: List<GameWord>, day: String, root: String, targets: List<String>, theme: (GameWord) -> String?, sameForm: (GameWord, String) -> Boolean = { _, _ -> false }): WordGroupsPuzzle? =
            Kernels.active.wordGroups(words, day, root, targets, theme, sameForm)
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

        fun letters(form: String): List<String>? = KotlinKernel.letters(form)

        fun daily(words: List<GameWord>, day: String, root: String, targets: List<String>): MiniPuzzle? = Kernels.active.mini(words, day, root, targets)
    }
}
