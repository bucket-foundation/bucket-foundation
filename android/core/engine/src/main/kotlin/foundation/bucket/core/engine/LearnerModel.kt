package foundation.bucket.core.engine

import kotlin.math.exp
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow

data class FreqPrior(val rank: Double, val derived: Boolean)

data class LemmaEvidence(
    val stability: Double? = null,
    val lastReview: Double? = null,
    val lastTap: Double? = null,
    val exposures: Int = 0,
    val freq: FreqPrior? = null,
)

data class Known(val p: Double, val known: Boolean, val source: String)

object LearnerModel {
    const val KNOWN_R = 0.9
    const val TAP_WINDOW_DAYS = 7.0
    const val EXPOSURE_LAMBDA = 0.0
    const val PRIOR_HALF_RANK = 500.0
    const val PRIOR_SLOPE = 2.0
    const val DERIVED_RANK_FACTOR = 2.0
    private const val DAY_MS = 86_400_000.0
    private const val DECAY = -0.5
    private val FACTOR = 0.9.pow(1 / DECAY) - 1

    fun retrievability(elapsedDays: Double, stability: Double): Double =
        if (stability <= 0) 0.0 else (1 + FACTOR * (max(0.0, elapsedDays) / stability)).pow(DECAY)

    fun freqFromRow(row: List<Any?>): FreqPrior? {
        val rank = (row.getOrNull(7) as? Number)?.toDouble() ?: return null
        if (!rank.isFinite() || rank < 1) return null
        return FreqPrior(rank, (row.getOrNull(8) as? Number)?.toInt() == 1)
    }

    fun frequencyPrior(freq: FreqPrior?, tier: Int): Double {
        if (freq == null) return 0.0
        val rank = if (freq.derived) freq.rank * DERIVED_RANK_FACTOR else freq.rank
        val half = PRIOR_HALF_RANK * (1 + max(0, tier))
        return 1 / (1 + (rank / half).pow(PRIOR_SLOPE))
    }

    fun exposureGain(n: Int, lambda: Double = EXPOSURE_LAMBDA): Double = if (n > 0 && lambda > 0) 1 - exp(-lambda * n) else 0.0

    private fun clamp(x: Double) = min(1.0, max(0.0, x))

    fun known(e: LemmaEvidence, now: Double, tier: Int, lambda: Double = EXPOSURE_LAMBDA): Known {
        val tap = e.lastTap
        if (tap != null && now - tap >= 0 && now - tap < TAP_WINDOW_DAYS * DAY_MS) return Known(0.0, false, "tap")
        val s = e.stability
        val last = e.lastReview
        if (s != null && s > 0 && last != null) {
            val r = clamp(retrievability((now - last) / DAY_MS, s))
            return Known(r, r >= KNOWN_R, "card")
        }
        val prior = frequencyPrior(e.freq, tier)
        val gain = exposureGain(e.exposures, lambda)
        val p = clamp(1 - (1 - prior) * (1 - gain))
        return Known(p, p >= KNOWN_R, if (gain > 0) "exposure" else "prior")
    }

    fun knownCount(lemmas: Map<String, LemmaEvidence>, now: Double, tier: Int, lambda: Double = EXPOSURE_LAMBDA): Double =
        lemmas.keys.sorted().sumOf { known(lemmas.getValue(it), now, tier, lambda).p }
}
