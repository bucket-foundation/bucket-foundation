package com.polingual.app

import foundation.bucket.core.engine.ExposureInput
import foundation.bucket.core.engine.InputBundle
import foundation.bucket.core.engine.InputStage
import foundation.bucket.core.engine.LangCorpus
import foundation.bucket.core.engine.LogRow
import foundation.bucket.core.engine.ReviewLog
import foundation.bucket.core.engine.SessionMix
import foundation.bucket.core.engine.StageChoice
import foundation.bucket.core.engine.StudySession
import java.util.TimeZone
import java.util.UUID

class InputPlanState(
    val lang: String,
    private val bundle: InputBundle,
    private val corpus: LangCorpus,
    private val resolve: (String, String) -> String?,
    private val mix: SessionMix.InputMix,
    private val systemId: String,
    private val started: Long,
    private val allowFallback: Boolean,
) {
    private val done = mutableSetOf<Int>()
    private val shown = mutableMapOf<String, Int>()
    private var units = 0
    private var seconds = 0.0
    private var ended = false
    private var current: Pair<Int, StageChoice>? = null

    val gloss: (String) -> String? = { lemma -> resolve(lang, lemma)?.substringAfter(':')?.let { corpus.byId[it]?.gloss } }

    fun due(answered: Int): StageChoice? {
        if (answered !in mix.positions || answered in done) return null
        current?.let { (i, c) -> if (i == answered) return c }
        return null
    }

    fun prepare(s: StudySession) {
        val i = s.answered
        if (i !in mix.positions || i in done || current?.first == i) return
        val learner = InputStage.learner(s.state, lang, resolve, System.currentTimeMillis(), shown, null)
        val choice = InputStage.choose(bundle, learner, allowFallback)
        if (choice == null) done += i else current = i to choice
    }

    fun finish(s: StudySession, rows: List<ExposureInput>, secs: Double) {
        val c = current ?: return
        done += c.first
        current = null
        val device = ReviewLog.deviceHash(INSTALL_SALT, "android")
        val tz = TimeZone.getDefault().id
        val now = System.currentTimeMillis()
        rows.forEach { s.log += InputStage.logRow(it, lang, UUID.randomUUID().toString(), now, device, tz, systemId) }
        if (rows.isNotEmpty()) {
            shown[c.second.unit.id] = (shown[c.second.unit.id] ?: 0) + 1
            units += 1
            seconds += secs
        }
    }

    fun end(s: StudySession) {
        if (ended) return
        ended = true
        val now = System.currentTimeMillis()
        val total = (now - started) / 1000.0
        val real = if (total > 0) Math.round(minOf(1.0, seconds / total) * 1e4) / 1e4 else 0.0
        s.log += LogRow.Session(UUID.randomUUID().toString(), now, ReviewLog.deviceHash(INSTALL_SALT, "android"), TimeZone.getDefault().id, systemId, lang, UUID.randomUUID().toString(), started, now, mix.target, real, null, minOf(units, 1000), minOf(s.answered, 1000))
    }

    companion object {
        private const val SALT_KEY = "polingual.reviewLog.salt"
        var INSTALL_SALT: String = ""

        suspend fun load(graph: Graph, s: StudySession, targets: List<String>, placement: Map<String, Double>, systemId: String): InputPlanState? {
            if (InputModeFlag.mode == InputModeFlag.Mode.Off) return null
            INSTALL_SALT = graph.kv.get(SALT_KEY) ?: UUID.randomUUID().toString().also { graph.kv.set(SALT_KEY, it) }
            val corpus = graph.corpus.load()
            for (lang in targets) {
                val bundle = graph.corpus.input(lang) ?: continue
                val resolve = InputStage.resolver(mapOf(lang to InputStage.lemmaCardMap(corpus, lang)))
                val learner = InputStage.learner(s.state, lang, resolve, System.currentTimeMillis(), emptyMap(), null)
                val demo = InputModeFlag.mode == InputModeFlag.Mode.Demo
                val eligible = InputStage.eligibleUnitSeconds(bundle, learner).ifEmpty { if (demo) listOfNotNull(InputStage.choose(bundle, learner, true)?.plan?.tokens?.times(1.5)) else emptyList() }
                val mix = SessionMix.planInputMix((placement[lang] ?: 0.0).toInt(), s.total, eligible)
                if (mix.units == 0) continue
                return InputPlanState(lang, bundle, corpus, resolve, mix, systemId, System.currentTimeMillis(), demo)
            }
            return null
        }
    }
}

object InputModeFlag {
    enum class Mode { Off, On, Demo }

    val mode: Mode = when (BuildConfig.INPUT_STAGE) {
        "demo" -> if (BuildConfig.DEBUG) Mode.Demo else Mode.Off
        "1", "on" -> Mode.On
        "0", "off" -> Mode.Off
        else -> if (BuildConfig.DEBUG) Mode.On else Mode.Off
    }
}
