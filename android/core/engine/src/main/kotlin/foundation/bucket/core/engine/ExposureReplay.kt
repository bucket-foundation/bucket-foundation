package foundation.bucket.core.engine

import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow

data class ExposureCard(
    val state: String,
    val stability: Double?,
    val lastReview: Double?,
    val due: Double?,
    val exposureDay: String? = null,
)

object ExposureReplay {
    const val ALPHA = 0.0
    const val FIRE_MAX_STABILITY_GAIN = 0.15
    const val FIRE_MIN_RETRIEVABILITY = 0.6
    private const val DAY_MS = 86_400_000.0
    private const val DECAY = -0.5
    private val FACTOR = 0.9.pow(1 / DECAY) - 1

    fun gain(alpha: Double): Double = min(FIRE_MAX_STABILITY_GAIN, max(0.0, alpha) * FIRE_MAX_STABILITY_GAIN)

    fun interval(s: Double): Double {
        val ivl = (s / FACTOR) * (0.9.pow(1 / DECAY) - 1)
        return min(max(1.0, Math.round(ivl).toDouble()), 3650.0)
    }

    private fun retrievability(t: Double, s: Double): Double = if (s <= 0) 0.0 else (1 + FACTOR * (t / s)).pow(DECAY)

    fun credit(card: ExposureCard?, at: Double, day: String, alpha: Double): ExposureCard? {
        val s = card?.stability ?: return card
        if (card.state == "new" || s <= 0 || card.exposureDay == day) return card
        val last = card.lastReview ?: at
        if (retrievability(max(0.0, (at - last) / DAY_MS), s) < FIRE_MIN_RETRIEVABILITY) return card
        val next = s * (1 + gain(alpha))
        val due = max(card.due ?: 0.0, last + interval(next) * DAY_MS)
        return card.copy(stability = next, due = due, exposureDay = day)
    }

    fun tap(card: ExposureCard?, at: Double): ExposureCard? = card?.copy(due = at)

    fun group(card: ExposureCard?, tapped: List<Boolean>, at: Double, day: String, alpha: Double): ExposureCard? {
        var c = card
        for (t in tapped) if (!t) c = credit(c, at, day, alpha)
        for (t in tapped) if (t) c = tap(c, at)
        return c
    }
}
