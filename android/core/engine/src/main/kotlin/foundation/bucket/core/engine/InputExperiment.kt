package foundation.bucket.core.engine

object InputExperiment {
    const val EXPERIMENT_ID = "ci14-share-v1"
    val ARM_SHARES = linkedMapOf("s50" to 0.5, "s70" to 0.7, "s90" to 0.9)
    const val NOT_FILLED_SUFFIX = "-x"
    const val FILL_SHARE = 0.9

    data class ExperimentMix(val mix: SessionMix.InputMix, val arm: String?)

    fun on(flag: String?): Boolean = flag == "1"

    fun stratum(tier: Int): String = if (tier <= SessionMix.A2_TOP_TIER) "to-a2" else "past-a2"

    fun fnv1a32(s: String): Long {
        var h = 0x811c9dc5L
        for (b in s.toByteArray(Charsets.UTF_8)) {
            h = h xor (b.toLong() and 0xff)
            h = (h * 0x01000193L) and 0xffffffffL
        }
        return h
    }

    fun assignArm(userKey: String, tier: Int): String {
        val ids = ARM_SHARES.keys.toList()
        return ids[(fnv1a32("$EXPERIMENT_ID:${stratum(tier)}:$userKey") % ids.size).toInt()]
    }

    fun canFill(cards: Int, eligibleUnitSeconds: List<Double>): Boolean {
        val eligible = eligibleUnitSeconds.filter { it > 0 }.sum()
        val cardTime = maxOf(0, cards) * SessionMix.CARD_SECONDS
        return eligible > 0 && (cardTime == 0.0 || eligible / (eligible + cardTime) >= FILL_SHARE)
    }

    fun mix(on: Boolean, userKey: String?, tier: Int, cards: Int, eligibleUnitSeconds: List<Double>): ExperimentMix {
        if (!on || userKey.isNullOrEmpty()) return ExperimentMix(SessionMix.planInputMix(tier, cards, eligibleUnitSeconds), null)
        val arm = assignArm(userKey, tier)
        if (!canFill(cards, eligibleUnitSeconds)) return ExperimentMix(SessionMix.planInputMix(tier, cards, eligibleUnitSeconds), arm + NOT_FILLED_SUFFIX)
        return ExperimentMix(SessionMix.planInputMix(tier, cards, eligibleUnitSeconds, ARM_SHARES.getValue(arm)), arm)
    }
}
