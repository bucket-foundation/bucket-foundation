package foundation.bucket.core.engine

import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min

data class InputLearner(
    val p: (String) -> Double,
    val due: Set<String>,
    val rank: (String) -> Double?,
    val recent: Map<String, Int>,
    val lastVideo: String?,
)

data class InputPlan(
    val unit: String,
    val tokens: Int,
    val media: Boolean,
    val coverage: Double,
    val newWords: List<String>,
    val glossed: List<String>,
    val eligible: Boolean,
    val score: Double,
)

data class SelectorWeights(val due: Double, val frequency: Double, val repeat: Double, val continuity: Double)

val UnfittedSelectorWeights = SelectorWeights(due = 2.0, frequency = 1.0, repeat = 3.0, continuity = 1.5)

object InputSelector {
    const val MIN_UNIT_TOKENS = 40
    const val TEXT_LOW = 0.95
    const val TEXT_HIGH = 0.98
    const val MEDIA_FLOOR = 0.9
    const val MAX_NEW = 3
    const val NEW_SHARE = 0.05
    const val UNKNOWN_BELOW = 0.5

    private fun bonus(rank: Double?) = if (rank == null) 0.0 else 1000.0 / (1000.0 + max(1.0, rank))

    fun plan(unit: String, lemmas: List<String>, targets: List<String>, media: Boolean, video: String?, l: InputLearner, w: SelectorWeights = UnfittedSelectorWeights): InputPlan {
        val n = lemmas.size
        val distinct = lemmas.toSortedSet().toList()
        val unknown = distinct.filter { l.p(it) < UNKNOWN_BELOW }
        val pool = if (targets.isEmpty()) distinct.toSet() else targets.toSet()
        val room = min(MAX_NEW, floor(NEW_SHARE * n).toInt())
        val byFreq = unknown.filter { it in pool }.sortedWith(compareBy<String> { l.rank(it) ?: Double.POSITIVE_INFINITY }.thenBy { it })
        val newWords = byFreq.take(max(0, room))
        val keep = newWords.toSet()
        val glossed = unknown.filter { it !in keep }
        val g = glossed.toSet()
        var sum = 0.0
        for (x in lemmas) sum += if (x in g) 1.0 else min(1.0, max(0.0, l.p(x)))
        val coverage = if (n > 0) sum / n else 0.0
        val band = if (media) coverage >= MEDIA_FLOOR else coverage >= TEXT_LOW && coverage <= TEXT_HIGH
        val k = newWords.size
        val eligible = n >= MIN_UNIT_TOKENS && band && k >= 1 && k <= MAX_NEW && k <= NEW_SHARE * n
        val dueHits = distinct.count { it in l.due }
        var freq = 0.0
        for (x in newWords) freq += bonus(l.rank(x))
        val score = w.due * dueHits + w.frequency * freq - w.repeat * (l.recent[unit] ?: 0) + if (video != null && video == l.lastVideo) w.continuity else 0.0
        return InputPlan(unit, n, media, coverage, newWords, glossed, eligible, score)
    }

    fun rawCoverage(lemmas: List<String>, l: InputLearner): Double {
        if (lemmas.isEmpty()) return 0.0
        var s = 0.0
        for (x in lemmas) s += min(1.0, max(0.0, l.p(x)))
        return s / lemmas.size
    }

    fun select(plans: List<InputPlan>, l: InputLearner, lemmasOf: (String) -> List<String>): Pair<InputPlan, Boolean>? {
        val ok = plans.filter { it.eligible }.sortedWith(compareByDescending<InputPlan> { it.score }.thenBy { it.unit })
        if (ok.isNotEmpty()) return ok.first() to false
        val big = plans.filter { it.tokens >= MIN_UNIT_TOKENS }
        if (big.isEmpty()) return null
        var best = big.first()
        var bestCov = rawCoverage(lemmasOf(best.unit), l)
        for (p in big.drop(1)) {
            val c = rawCoverage(lemmasOf(p.unit), l)
            if (c > bestCov || (c == bestCov && p.unit < best.unit)) {
                best = p
                bestCov = c
            }
        }
        val all = lemmasOf(best.unit).toSortedSet().filter { l.p(it) < UNKNOWN_BELOW }
        return best.copy(newWords = emptyList(), glossed = all, coverage = 1.0) to true
    }
}
