package foundation.bucket.core.engine

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlin.math.exp

enum class CurriculumStage { Word, Phrase, Sentence }

enum class Stage { Intro, Check, Review, Match, Letter }

data class QueueEntry(val itemId: String, val lang: String, val stage: Stage = Stage.Review)

data class ItemMastery(val id: String, val stage: CurriculumStage, val mastery: Double)

class SoundTally {
    var asked = 0
        private set
    var sounds = 0
        private set
    private val counted = mutableSetOf<String>()

    fun record(kind: ExerciseKind, key: String) {
        if (!counted.add(key)) return
        asked += 1
        if (kind.needsSound) sounds += 1
    }
}

class FrequencyRank(top: Map<String, List<Pair<String, Int>>>) {
    val ranks: Map<String, Map<String, Int>> = top.mapValues { (_, words) ->
        val m = linkedMapOf<String, Int>()
        for ((w, r) in words) m.putIfAbsent(w.lowercase(), r)
        m
    }

    fun fallback(item: LangItem): Int = 2000 + (item.tier * 100).toInt()

    fun rank(item: LangItem, lang: String): Int {
        val form = item.form(lang)?.lowercase() ?: return fallback(item)
        val table = ranks[lang] ?: return fallback(item)
        table[form]?.let { return it }
        val words = form.split(SPLIT).filter { it.isNotEmpty() }
        val hits = words.mapNotNull { table[it] }
        if (item.kind != ItemKind.Phrase || hits.isEmpty()) return fallback(item)
        val worst = hits.max()
        return if (hits.size == words.size) worst else maxOf(worst, fallback(item))
    }

    fun rank(item: LangItem, langs: List<String>): Int {
        val rs = langs.filter { item.form(it) != null }.map { rank(item, it) }
        return if (rs.isEmpty()) fallback(item) else rs.sum() / rs.size
    }

    companion object {
        const val UNRANKED = 5000
        private val SPLIT = Regex("[^\\p{L}\\p{M}']+")

        fun parse(top: Map<String, String>): FrequencyRank = FrequencyRank(
            top.mapValues { (_, text) ->
                Json.parseToJsonElement(text).jsonArray.map { it.jsonObject.let { o -> o.getValue("word").jsonPrimitive.content to o.getValue("rank").jsonPrimitive.int } }
            },
        )
    }
}

object SessionMix {
    const val MASTERY_BAR = 0.8
    const val FALSE_FRIEND_BAR = 0.5
    const val CHECK_GAP = 3

    fun mastery(card: CardState?): Double = if (card == null || card.reps == 0) 0.0 else (1 - exp(-card.intervalDays / 21)).coerceIn(0.0, 1.0)

    fun mastered(state: StudyState, lang: String, itemId: String, bar: Double = MASTERY_BAR) = mastery(state.cards["$lang:$itemId"]) >= bar

    fun sentenceItemId(sentenceId: String) = "sent:$sentenceId"

    fun isSentenceCard(id: String) = id.substringAfter(':', id).startsWith("sent:")

    fun startedCount(state: StudyState, targets: List<String>): Int =
        state.cards.keys.count { it.substringBefore(':') in targets && !isSentenceCard(it) && state.started(it) }

    const val INPUT_TARGET_TO_A2 = 0.7
    const val INPUT_TARGET_PAST_A2 = 0.6
    const val A2_TOP_TIER = 6
    const val CARD_SECONDS = 12.0

    data class InputMix(val target: Double, val share: Double, val units: Int, val positions: List<Int>, val plannedShare: Double)

    fun inputTarget(tier: Int): Double = if (tier <= A2_TOP_TIER) INPUT_TARGET_TO_A2 else INPUT_TARGET_PAST_A2

    fun inputShare(tier: Int, eligibleSeconds: Double, sessionSeconds: Double): Double =
        if (sessionSeconds <= 0 || eligibleSeconds <= 0) 0.0 else minOf(inputTarget(tier), eligibleSeconds / sessionSeconds)

    fun planInputMix(tier: Int, cards: Int, eligibleUnitSeconds: List<Double>, targetShare: Double? = null): InputMix {
        val target = targetShare ?: inputTarget(tier)
        val cardTime = maxOf(0, cards) * CARD_SECONDS
        val pool = eligibleUnitSeconds.filter { it > 0 }
        if (pool.isEmpty()) return InputMix(target, 0.0, 0, emptyList(), 0.0)
        val eligible = pool.sum()
        val avg = eligible / pool.size
        val share = if (cardTime > 0) minOf(target, eligible / (eligible + cardTime)) else target
        val want = if (cardTime > 0) share * cardTime / (1 - share) else avg
        val units = minOf(pool.size, maxOf(1, cards), maxOf(1, Math.round(want / avg).toInt()))
        val positions = (0 until units).map { minOf(maxOf(0, cards - 1), ((it + 1) * cards) / (units + 1)) }
        return InputMix(target, share, units, positions, units * avg / (units * avg + cardTime))
    }

    fun roundedItems(targetPermille: Int, items: Int): Int = (targetPermille * items + 500) / 1000

    const val IDLE_MS = 60_000L

    fun isActive(visible: Boolean, focused: Boolean, playing: Boolean, needsPlayer: Boolean, idle: Boolean = false): Boolean = visible && focused && (if (needsPlayer) playing else !idle)

    data class ActivityMark(val at: Long, val visible: Boolean? = null, val focused: Boolean? = null, val playing: Boolean? = null, val idle: Boolean? = null)

    fun activeMs(marks: List<ActivityMark>, end: Long, needsPlayer: Boolean): Long {
        var visible = true
        var focused = true
        var playing = false
        var idle = false
        var since: Long? = null
        var total = 0L
        for (m in marks.sortedBy { it.at }) {
            if (m.at > end) break
            val s = since
            if (s != null && isActive(visible, focused, playing, needsPlayer, idle)) total += m.at - s
            m.visible?.let { visible = it }
            m.focused?.let { focused = it }
            m.playing?.let { playing = it }
            m.idle?.let { idle = it }
            since = m.at
        }
        val s = since
        if (s != null && isActive(visible, focused, playing, needsPlayer, idle) && end > s) total += end - s
        return total
    }

    fun soundShare(started: Int): Double = if (started < 40) 0.1 else if (started < 150) 0.25 else 0.4

    fun soundAllowed(tally: SoundTally, started: Int): Boolean = (tally.sounds + 1).toDouble() <= soundShare(started) * (tally.asked + 1)

    fun stage(item: LangItem, state: StudyState, lang: String): CurriculumStage = when {
        item.kind == ItemKind.Word && mastered(state, lang, item.id) -> CurriculumStage.Sentence
        item.kind == ItemKind.Phrase -> CurriculumStage.Phrase
        else -> CurriculumStage.Word
    }

    fun masteryTable(corpus: LangCorpus, root: String, state: StudyState, lang: String): List<ItemMastery> {
        val items = corpus.items.filter { usable(it, root, lang) && state.started("$lang:${it.id}") }
            .map { ItemMastery(it.id, if (it.kind == ItemKind.Phrase) CurriculumStage.Phrase else CurriculumStage.Word, mastery(state.cards["$lang:${it.id}"])) }
        val sentences = state.cards.entries.filter { (id, _) -> id.substringBefore(':') == lang && isSentenceCard(id) && state.started(id) }
            .map { (id, c) -> ItemMastery(id.substringAfter(':'), CurriculumStage.Sentence, mastery(c)) }
        return items + sentences
    }

    fun frequencyOrder(items: List<LangItem>, freq: FrequencyRank, langs: List<String>): List<LangItem> =
        items.map { it to freq.rank(it, langs) }.sortedWith(compareBy<Pair<LangItem, Int>> { it.second }.thenBy { if (it.first.kind == ItemKind.Word) 0 else 1 }).map { it.first }

    fun curriculum(corpus: LangCorpus, root: String, lang: String, freq: FrequencyRank): List<LangItem> =
        frequencyOrder(corpus.items.filter { usable(it, root, lang) }, freq, listOf(lang))

    fun compareReady(item: LangItem, state: StudyState, langs: List<String>, bar: Double = MASTERY_BAR) =
        langs.isNotEmpty() && langs.all { mastered(state, it, item.id, bar) }

    fun gateComparisons(queue: List<QueueEntry>, targets: List<String>, corpus: LangCorpus, state: StudyState): List<QueueEntry> = queue.filter { e ->
        if (e.stage != Stage.Match) return@filter true
        val item = corpus.byId[e.itemId] ?: return@filter false
        compareReady(item, state, targets.filter { item.form(it) != null })
    }

    fun <T> alternate(queue: List<T>, lang: (T) -> String, stage: (T) -> Stage = { Stage.Review }, key: (T) -> String = { lang(it) }, gap: Int = CHECK_GAP): List<T> {
        val order = mutableListOf<String>()
        val byLang = linkedMapOf<String, ArrayDeque<T>>()
        for (e in queue) byLang.getOrPut(lang(e)) { order += lang(e); ArrayDeque() }.addLast(e)
        val out = mutableListOf<T>()
        val introAt = mutableMapOf<String, Int>()
        var last = ""
        fun ready(e: T): Boolean {
            if (stage(e) != Stage.Check) return true
            val at = introAt[key(e)] ?: return true
            return out.size - at - 1 >= gap
        }
        while (out.size < queue.size) {
            val live = order.filter { byLang.getValue(it).isNotEmpty() }.sortedByDescending { byLang.getValue(it).size }
            val head = { l: String -> byLang.getValue(l).first() }
            val pick = live.firstOrNull { it != last && ready(head(it)) } ?: live.firstOrNull { ready(head(it)) } ?: live.firstOrNull { it != last } ?: live[0]
            val e = byLang.getValue(pick).removeFirst()
            if (stage(e) == Stage.Intro) introAt[key(e)] = out.size
            out += e
            last = pick
        }
        return out
    }

    fun alternate(queue: List<QueueEntry>, gap: Int = CHECK_GAP): List<QueueEntry> =
        alternate(queue, { it.lang }, { it.stage }, { "${it.lang}:${it.itemId}" }, gap)

    fun <T> longestRun(queue: List<T>, lang: (T) -> String): Int {
        var best = 0
        var run = 0
        var last: String? = null
        for (e in queue) {
            run = if (lang(e) == last) run + 1 else 1
            last = lang(e)
            best = maxOf(best, run)
        }
        return best
    }

    fun longestRun(queue: List<QueueEntry>): Int = longestRun(queue) { it.lang }
}
