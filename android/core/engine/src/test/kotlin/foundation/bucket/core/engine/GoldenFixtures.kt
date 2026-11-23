package foundation.bucket.core.engine

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals

class GoldenFixtures {
    private val k = KotlinKernel
    private val root = "en"
    private val targets = listOf("fr", "es", "it", "de", "hi", "th", "ta", "sa")
    private val deck = GameDeck(CorpusFixture.corpus, root, targets)
    private val days = listOf("2026-01-01", "2026-03-14", "2026-07-04", "2026-11-12", "2026-11-23", "2027-02-28")

    private fun s(v: String?): JsonElement = v?.let(::JsonPrimitive) ?: JsonNull
    private fun n(v: Number): JsonElement = JsonPrimitive(v)
    private fun u(v: ULong): JsonElement = JsonPrimitive(v.toString())
    private fun b(v: Boolean): JsonElement = JsonPrimitive(v)
    private fun arr(xs: List<JsonElement>): JsonElement = JsonArray(xs)
    private fun strs(xs: List<String>) = arr(xs.map(::s))
    private fun obj(vararg p: Pair<String, JsonElement>) = JsonObject(mapOf(*p))

    private fun word(w: GameWord) = obj("item_id" to s(w.itemId), "lang" to s(w.lang), "form" to s(w.form), "gloss" to s(w.gloss), "root" to s(w.root), "rank" to n(w.rank))
    private fun words(xs: List<GameWord>) = arr(xs.map(::word))
    private fun prompt(p: GamePrompt) = obj("id" to n(p.id), "mode" to s(p.mode.name), "word" to word(p.word), "choices" to strs(p.choices), "answer" to s(p.answer), "group" to n(p.group))
    private fun prompts(xs: List<GamePrompt>) = arr(xs.map(::prompt))
    private fun card(c: CardState) = obj("reps" to n(c.reps), "lapses" to n(c.lapses), "interval_days" to n(c.intervalDays), "due" to n(c.due), "last" to n(c.last))
    private fun link(l: GroupLink): JsonElement = when (l) {
        is GroupLink.Language -> obj("kind" to s("Language"), "lang" to s(l.lang))
        is GroupLink.Theme -> obj("kind" to s("Theme"), "theme" to s(l.theme))
        is GroupLink.LanguageTheme -> obj("kind" to s("LanguageTheme"), "lang" to s(l.lang), "theme" to s(l.theme))
    }

    private val allWords: List<GameWord> by lazy {
        targets.flatMap { l -> deck.pool(l).mapIndexed { i, e -> GameWord(e.itemId, l, e.form, e.gloss, root, i % 4) } }
    }
    private val sameForm: (GameWord, String) -> Boolean = { w, l -> l != w.lang && deck.word(w.itemId, l)?.form?.lowercase() == w.form.lowercase() }
    private val theme: (GameWord) -> String? = { w -> deck.entry(w.itemId, w.lang)?.category }

    private fun rngFixture(): JsonElement {
        val seeds = listOf(0uL, 1uL, 42uL, 0xFFFFFFFFFFFFFFFFuL, GameSeed.hash("polingual"))
        return arr(seeds.map { seed ->
            val a = SeededRandom(seed)
            val next = (0 until 8).map { u(a.next()) }
            val bounds = listOf(1, 2, 3, 7, 10, 29, 100, 1000)
            val below = bounds.map { n(a.nextBelow(it)) }
            val shuffled = a.shuffled((0 until 10).toList()).map { n(it) }
            val mix = mixed((0 until 10).toList(), a).map { n(it) }
            obj("seed" to u(seed), "next" to arr(next), "bounds" to arr(bounds.map { n(it) }), "below" to arr(below), "shuffled" to arr(shuffled), "mixed" to arr(mix), "state" to u(a.next()))
        })
    }

    private fun hashFixture() = arr(listOf("", "a", "polingual", "groups|2026-11-12|en|es,fr", "ñandú ü 日本").map { obj("text" to s(it), "hash" to u(GameSeed.hash(it))) })

    private fun gradeFixture(): JsonElement {
        val out = mutableListOf<JsonElement>()
        var c = CardState()
        val pattern = listOf(true, true, false, true, true, false, false, false, true, true, true)
        var now = 1_700_000_000_000L
        for (ok in pattern) {
            val next = k.grade(c, ok, now)
            out += obj("state" to card(c), "correct" to b(ok), "now" to n(now), "out" to card(next))
            c = next
            now += 3_600_000L * 7
        }
        return arr(out)
    }

    private fun streakFixture(): JsonElement {
        val cases = listOf(
            emptyList<String>() to null,
            listOf("2026-11-20", "2026-11-21", "2026-11-22") to null,
            listOf("2026-11-20", "2026-11-21", "2026-11-22") to "2026-11-23",
            listOf("2026-11-20", "2026-11-22") to "2026-11-24",
            listOf("2024-02-28", "2024-02-29", "2024-03-01") to "2024-03-01",
            listOf("2025-12-31", "2026-01-01") to null,
        )
        return arr(cases.map { (d, t) -> obj("days" to strs(d), "today" to s(t), "out" to n(k.streak(d, t))) })
    }

    @Test
    fun writeGoldens() {
        val committed = File(CorpusFixture.dir, "../../../core/polingual-core/tests/fixtures/kotlin-golden.json")
        val out = System.getenv("POLINGUAL_GOLDEN_OUT")
        Kernels.override = KotlinKernel
        try {
            val pools = arr(targets.map { l -> obj("lang" to s(l), "entries" to arr(deck.pool(l).map { e -> obj("item_id" to s(e.itemId), "form" to s(e.form), "gloss" to s(e.gloss), "category" to s(e.category)) })) })
            val sample = targets.flatMap { l -> deck.pool(l).take(15).map { deck.word(it.itemId, l)!! } }
            val foils = sample.mapIndexed { i, w ->
                val also = if (i % 3 == 0) listOfNotNull(deck.word(w.itemId, targets[(targets.indexOf(w.lang) + 1) % targets.size])?.form) else emptyList()
                val seed = GameSeed.hash("foils|$i")
                val r = SeededRandom(seed)
                val f = deck.foils(w, also, 3, r)
                obj("word" to word(w), "also" to strs(also), "seed" to u(seed), "out" to strs(f), "state" to u(r.next()))
            }
            val dailyWords = listOf(4, 6, 20).map { c ->
                val r = SeededRandom(c.toULong() * 977uL)
                obj("count" to n(c), "seed" to u(c.toULong() * 977uL), "out" to words(deck.daily(c, r)), "state" to u(r.next()))
            }
            val dailyRounds = days.map { d -> obj("day" to s(d), "out" to prompts(GameRounds.daily(deck, d))) }
            val learned = allWords.filterIndexed { i, _ -> i % 37 == 0 }
            val sameWord = listOf(3uL, 99uL).map { seed ->
                val r = SeededRandom(seed)
                obj("seed" to u(seed), "words" to words(learned), "out" to prompts(GameRounds.sameWord(deck, learned, r)), "state" to u(r.next()))
            }
            val distractors = listOf("fr", "ru", "ja", "hi", "la", "xx").flatMap { l ->
                listOf(targets, listOf("ru", "el"), emptyList()).mapIndexed { i, own ->
                    val seed = GameSeed.hash("d|$l|$i")
                    val r = SeededRandom(seed)
                    val excl = if (i == 1) setOf("es") else emptySet()
                    obj("lang" to s(l), "own" to strs(own), "excluding" to strs(excl.toList()), "seed" to u(seed), "out" to strs(k.distractors(l, own, excl, 3, r)), "state" to u(r.next()))
                }
            }
            val flagWords = allWords.filterIndexed { i, _ -> i % 11 == 0 }.take(60)
            val flags = listOf(PromptMode.Flag, PromptMode.Voice).mapIndexed { i, m ->
                val seed = 7uL + i.toULong()
                val r = SeededRandom(seed)
                obj("mode" to s(m.name), "seed" to u(seed), "out" to prompts(GameRounds.flags(flagWords, targets, m, sameForm = sameForm, rng = r)), "state" to u(r.next()))
            }
            val groupWords = arr(allWords.map { w -> obj("word" to word(w), "theme" to s(theme(w)), "same_form" to strs(targets.filter { sameForm(w, it) })) })
            val groups = days.map { d ->
                val p = WordGroupsPuzzle.daily(allWords, d, root, targets, theme, sameForm)
                obj("day" to s(d), "out" to (p?.let { obj("groups" to arr(it.groups.map { g -> obj("link" to link(g.link), "words" to words(g.words)) }), "tiles" to words(it.tiles)) } ?: JsonNull))
            }
            val minis = days.map { d ->
                val p = MiniPuzzle.daily(allWords, d, root, targets)
                obj("day" to s(d), "out" to (p?.let { obj("lang" to s(it.lang), "keys" to strs(it.keys), "entries" to arr(it.entries.map { e -> obj("word" to word(e.word), "letters" to strs(e.letters), "row" to n(e.row), "col" to n(e.col), "across" to b(e.across), "number" to n(e.number)) })) } ?: JsonNull))
            }
            val balancedIn = allWords.filterIndexed { i, _ -> i % 13 == 0 }
            val fixture = obj(
                "rng" to rngFixture(),
                "hash" to hashFixture(),
                "daily_seed" to arr(days.map { d -> obj("day" to s(d), "out" to u(GameSeed.daily(d, root, targets))) }),
                "grade" to gradeFixture(),
                "streak" to streakFixture(),
                "balanced" to obj("in" to words(balancedIn), "out" to words(k.balanced(balancedIn))),
                "deck" to obj("root" to s(root), "targets" to strs(targets), "pools" to pools),
                "foils" to arr(foils),
                "daily_words" to arr(dailyWords),
                "daily_rounds" to arr(dailyRounds),
                "same_word" to arr(sameWord),
                "distractors" to arr(distractors),
                "flags" to obj("words" to words(flagWords), "own" to strs(targets), "clash" to arr(flagWords.map { w -> strs(foundation.bucket.core.model.Lang.codes.filter { sameForm(w, it) }) }), "cases" to arr(flags)),
                "word_groups" to obj("words" to groupWords, "cases" to arr(groups)),
                "mini" to obj("words" to words(allWords), "cases" to arr(minis)),
            )
            if (out != null) File(out).apply { parentFile.mkdirs() }.writeText(fixture.toString())
            else assertEquals(committed.readText(), fixture.toString(), "kotlin-golden.json is stale; regenerate with POLINGUAL_GOLDEN_OUT")
        } finally {
            Kernels.override = null
        }
    }
}
