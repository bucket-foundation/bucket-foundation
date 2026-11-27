package foundation.bucket.core.engine

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.put

object InputExperiment {
    const val EXPERIMENT_ID = "ci14-share-v1"
    val ARM_SHARES = linkedMapOf("s50" to 0.5, "s70" to 0.7, "s90" to 0.9)
    const val NOT_FILLED_SUFFIX = "-x"
    const val FILL_SHARE = 0.9

    data class Consent(val flag: Boolean, val uploadOpen: Boolean, val disclosed: Boolean, val optedOut: Boolean)
    data class Enrolment(val experiment: String, val key: String, val arm: String, val stratum: String, val at: Long)
    data class ExperimentMix(val mix: SessionMix.InputMix, val arm: String?, val enrolment: Enrolment?)

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

    fun enrolmentKey(accountId: String?, device: String): String = if (!accountId.isNullOrEmpty()) "acct:$accountId" else "dev:$device"

    fun assignArm(key: String): String {
        val ids = ARM_SHARES.keys.toList()
        return ids[(fnv1a32("$EXPERIMENT_ID:$key") % ids.size).toInt()]
    }

    fun canFill(cards: Int, eligibleUnitSeconds: List<Double>): Boolean {
        val eligible = eligibleUnitSeconds.filter { it > 0 }.sum()
        val cardTime = maxOf(0, cards) * SessionMix.CARD_SECONDS
        return eligible > 0 && (cardTime == 0.0 || eligible / (eligible + cardTime) >= FILL_SHARE)
    }

    fun mayTakePart(c: Consent): Boolean = c.flag && c.uploadOpen && c.disclosed && !c.optedOut

    fun mix(consent: Consent, enrolment: Enrolment?, key: String?, tier: Int, cards: Int, eligibleUnitSeconds: List<Double>, now: Long): ExperimentMix {
        val plain = SessionMix.planInputMix(tier, cards, eligibleUnitSeconds)
        if (!mayTakePart(consent)) return ExperimentMix(plain, null, enrolment)
        val filled = canFill(cards, eligibleUnitSeconds)
        val e = enrolment ?: run {
            if (!filled || key.isNullOrEmpty()) return ExperimentMix(plain, null, null)
            val s = stratum(tier)
            Enrolment(EXPERIMENT_ID, key, assignArm(key), s, now)
        }
        if (!filled) return ExperimentMix(plain, e.arm + NOT_FILLED_SUFFIX, e)
        return ExperimentMix(SessionMix.planInputMix(tier, cards, eligibleUnitSeconds, ARM_SHARES.getValue(e.arm)), e.arm, e)
    }

    fun encode(e: Enrolment): String = buildJsonObject {
        put("experiment", e.experiment); put("key", e.key); put("arm", e.arm); put("stratum", e.stratum); put("at", e.at)
    }.toString()

    fun parseEnrolment(text: String?): Enrolment? = runCatching {
        val o = Json.parseToJsonElement(text ?: return null) as JsonObject
        fun s(k: String) = (o[k] as? JsonPrimitive)?.takeIf { it.isString }?.content
        val at = (o["at"] as? JsonPrimitive)?.doubleOrNull?.toLong() ?: return null
        val key = s("key")?.takeIf { it.isNotEmpty() } ?: return null
        val arm = s("arm")?.takeIf { it in ARM_SHARES } ?: return null
        val st = s("stratum")?.takeIf { it == "to-a2" || it == "past-a2" } ?: return null
        if (s("experiment") != EXPERIMENT_ID) return null
        Enrolment(EXPERIMENT_ID, key, arm, st, at)
    }.getOrNull()

    fun heldOutWords(forms: Map<String, List<YesNoTest.TestItem>>?): Set<String> =
        forms.orEmpty().values.flatten().filter { it.real }.map { it.word }.toSet()
}
