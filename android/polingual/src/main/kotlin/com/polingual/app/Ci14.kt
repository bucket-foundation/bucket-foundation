package com.polingual.app

import foundation.bucket.core.auth.KeyValue
import foundation.bucket.core.engine.InputExperiment
import foundation.bucket.core.engine.LogRow
import foundation.bucket.core.engine.UploadGate
import foundation.bucket.core.engine.YesNoTest

class Ci14Prefs(private val kv: KeyValue, private val account: () -> String?) {
    private val scope: String get() = "$BASE.${account()?.takeIf { it.isNotEmpty() } ?: "anon"}"
    private val disclosedKey get() = "$scope.disclosed"
    private val optedOutKey get() = "$scope.optedOut"
    private val enrolmentKey get() = "$scope.enrolment"
    private val takenKey get() = "$scope.taken"

    val disclosed: Boolean get() = kv.get(disclosedKey) == "1"
    val optedOut: Boolean get() = kv.get(optedOutKey) == "1"

    fun join() { kv.set(disclosedKey, "1"); kv.set(optedOutKey, null) }

    fun leave() { kv.set(disclosedKey, "1"); kv.set(optedOutKey, "1") }

    fun consent(flag: Boolean, gate: UploadGate) = InputExperiment.Consent(flag, gate == UploadGate.Open, disclosed, optedOut)

    fun enrolment(): InputExperiment.Enrolment? = InputExperiment.parseEnrolment(kv.get(enrolmentKey))

    fun cache(e: InputExperiment.Enrolment) = kv.set(enrolmentKey, InputExperiment.encode(e))

    fun taken(): YesNoTest.Taken = (kv.get(takenKey) ?: "").let { YesNoTest.Taken("baseline" in it, "day28" in it) }

    fun markTaken(phase: String) {
        val t = taken()
        kv.set(takenKey, listOfNotNull("baseline".takeIf { t.baseline || phase == "baseline" }, "day28".takeIf { t.day28 || phase == "day28" }).joinToString(","))
    }

    companion object {
        const val BASE = "polingual.ci14"
    }
}

interface ExperimentApi {
    suspend fun fetch(): Fetched?
    suspend fun register(stratum: String): InputExperiment.Enrolment?

    data class Fetched(val enrolment: InputExperiment.Enrolment?)
}

sealed interface Ci14Step {
    data object Disclose : Ci14Step
    data class Test(val phase: String) : Ci14Step
}

object Ci14 {
    private const val DAY_MS = 86_400_000L

    val flag: Boolean get() = InputExperiment.on(BuildConfig.INPUT_EXPERIMENT)

    fun step(consent: InputExperiment.Consent, prefs: Ci14Prefs, now: Long): Ci14Step? {
        if (!consent.flag || !consent.uploadOpen || consent.optedOut) return null
        if (!consent.disclosed) return Ci14Step.Disclose
        val taken = prefs.taken()
        if (!taken.baseline) return Ci14Step.Test("baseline")
        val due = YesNoTest.due(prefs.enrolment()?.at, now, taken)
        return if (due == "day28") Ci14Step.Test("day28") else null
    }

    fun showsLeave(consent: InputExperiment.Consent): Boolean = consent.flag && consent.disclosed && !consent.optedOut

    fun formFor(phase: String): String = if (phase == "baseline") "A" else "B"

    fun vocabRow(
        phase: String, items: List<YesNoTest.TestItem>, yes: Set<String>, seconds: Double, enrolment: InputExperiment.Enrolment?,
        id: String, now: Long, device: String, tz: String, systemId: String, lang: String,
    ): LogRow.VocabTest {
        val s = YesNoTest.score(items, yes)
        val day = enrolment?.let { maxOf(0L, Math.floorDiv(now - it.at, DAY_MS)).toInt() } ?: 0
        return LogRow.VocabTest(
            id, now, device, tz, systemId, lang, phase, formFor(phase), enrolment?.arm, s.hits, s.words, s.falseAlarms, s.pseudowords,
            Math.round(s.known * 10) / 10.0, minOf(3650, day), minOf(3600, Math.round(seconds).toInt()),
        )
    }

    suspend fun <T> choose(
        consent: InputExperiment.Consent, prefs: Ci14Prefs, api: ExperimentApi?, accountId: String?, device: String,
        attempt: (InputExperiment.Consent, InputExperiment.Enrolment?, String?) -> T?, enrolmentOf: (T) -> InputExperiment.Enrolment?,
    ): T? {
        val stored = (if (InputExperiment.mayTakePart(consent) && api != null) api.fetch() else null)
            ?: return attempt(consent.copy(flag = false), null, null)
        val known = stored.enrolment
        known?.let(prefs::cache)
        val key = if (!accountId.isNullOrEmpty() && prefs.taken().baseline) InputExperiment.enrolmentKey(accountId, device) else null
        val planned = attempt(consent, known, key) ?: return null
        val fresh = enrolmentOf(planned)
        if (fresh == null || known != null) return planned
        val saved = api?.register(fresh.stratum)
        saved?.let(prefs::cache)
        return attempt(if (saved != null) consent else consent.copy(flag = false), saved, null)
    }
}
