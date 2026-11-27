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

typealias Probability = Double
typealias HardCutAtKnownR = Boolean
typealias SumOfProbabilities = Double

data class Known(val p: Probability, val known: HardCutAtKnownR, val source: String)

data class FrequencyPriors(val halfRank: Double = 500.0, val slope: Double = 2.0, val derivedRankFactor: Double = 2.0, val cap: Double = 0.85) {
    fun bounded(): FrequencyPriors {
        fun b(v: Double, r: ClosedFloatingPointRange<Double>, d: Double) = if (v.isFinite()) v.coerceIn(r) else d
        val z = FrequencyPriors()
        return FrequencyPriors(b(halfRank, HALF_RANK, z.halfRank), b(slope, SLOPE, z.slope), b(derivedRankFactor, DERIVED, z.derivedRankFactor), b(cap, CAP, z.cap))
    }

    companion object {
        val UNSTUDIED = FrequencyPriors()
        val HALF_RANK = 50.0..20_000.0
        val SLOPE = 0.5..5.0
        val DERIVED = 1.0..10.0
        val CAP = 0.0..0.89
    }
}

object LearnerModel {
    const val KNOWN_R = 0.9
    const val TAP_WINDOW_DAYS = 7.0
    const val EXPOSURE_LAMBDA = 0.0
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

    fun frequencyPrior(freq: FreqPrior?, tier: Int, priors: FrequencyPriors = FrequencyPriors.UNSTUDIED): Probability {
        if (freq == null) return 0.0
        val rank = if (freq.derived) freq.rank * priors.derivedRankFactor else freq.rank
        val half = priors.halfRank * (1 + max(0, tier))
        return min(priors.cap, 1 / (1 + (rank / half).pow(priors.slope)))
    }

    fun exposureGain(n: Int, lambda: Double = EXPOSURE_LAMBDA): Double = if (n > 0 && lambda > 0) 1 - exp(-lambda * n) else 0.0

    private fun clamp(x: Double) = min(1.0, max(0.0, x))

    fun known(e: LemmaEvidence, now: Double, tier: Int, lambda: Double = EXPOSURE_LAMBDA, priors: FrequencyPriors = FrequencyPriors.UNSTUDIED): Known {
        val tap = e.lastTap
        if (tap != null && now - tap >= 0 && now - tap < TAP_WINDOW_DAYS * DAY_MS) return Known(0.0, false, "tap")
        val s = e.stability
        val last = e.lastReview
        if (s != null && s > 0 && last != null) {
            val r = clamp(retrievability((now - last) / DAY_MS, s))
            return Known(r, r >= KNOWN_R, "card")
        }
        val prior = frequencyPrior(e.freq, tier, priors)
        val gain = exposureGain(e.exposures, lambda)
        val p = clamp(1 - (1 - prior) * (1 - gain))
        return Known(p, p >= KNOWN_R, if (gain > 0) "exposure" else "prior")
    }

    fun knownCount(lemmas: Map<String, LemmaEvidence>, now: Double, tier: Int, lambda: Double = EXPOSURE_LAMBDA, priors: FrequencyPriors = FrequencyPriors.UNSTUDIED): SumOfProbabilities =
        lemmas.keys.sorted().sumOf { known(lemmas.getValue(it), now, tier, lambda, priors).p }
}
