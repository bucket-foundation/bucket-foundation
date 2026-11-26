package com.polingual.app

import foundation.bucket.core.engine.ExposureInput
import foundation.bucket.core.engine.FreqPrior
import foundation.bucket.core.engine.InputBundle
import foundation.bucket.core.engine.InputExperiment
import foundation.bucket.core.engine.InputStage
import foundation.bucket.core.engine.LogRow
import foundation.bucket.core.engine.ReviewLog
import foundation.bucket.core.engine.SessionMix
import foundation.bucket.core.engine.StageChoice
import foundation.bucket.core.engine.StudySession
import foundation.bucket.core.engine.StudyState
import java.util.TimeZone
import java.util.UUID

interface SessionView {
    val answered: Int
    val state: StudyState
    val log: MutableList<LogRow>
}

fun StudySession.view(): SessionView = object : SessionView {
    override val answered get() = this@view.answered
    override val state get() = this@view.state
    override val log get() = this@view.log
}

class InputPlanState(
    val lang: String,
    private val bundle: InputBundle,
    private val glossOf: (String) -> String?,
    private val resolve: (String, String) -> String?,
    val mix: SessionMix.InputMix,
    private val tier: Int,
    private val systemId: String,
    private val started: Long,
    private val allowFallback: Boolean,
    private val device: String,
    private val clock: () -> Long = System::currentTimeMillis,
    private val ids: () -> String = { UUID.randomUUID().toString() },
    private val tz: String = TimeZone.getDefault().id,
    private val freq: (String) -> FreqPrior? = { null },
    val arm: String? = null,
) {
    private val done = mutableSetOf<Int>()
    private val shown = mutableMapOf<String, Int>()
    private var units = 0
    private var seconds = 0.0
    private var ended = false
    private var current: Pair<Int, StageChoice>? = null

    val gloss: (String) -> String? = { lemma -> resolve(lang, lemma)?.substringAfter(':')?.let(glossOf) }

    fun due(answered: Int): StageChoice? = current?.takeIf { it.first == answered && answered in mix.positions && answered !in done }?.second

    fun prepare(s: SessionView) {
        val i = s.answered
        if (i !in mix.positions || i in done || current?.first == i) return
        val now = clock()
        val learner = InputStage.learner(s.state, lang, resolve, now, tier, InputStage.dueLemmas(bundle, s.state, lang, resolve, now), shown, null, freq)
        val choice = InputStage.choose(bundle, learner, allowFallback)
        if (choice == null) done += i else current = i to choice
    }

    fun finish(s: SessionView, rows: List<ExposureInput>, secs: Double) {
        val c = current ?: return
        done += c.first
        current = null
        val now = clock()
        rows.forEach { s.log += InputStage.logRow(it, lang, ids(), now, device, tz, systemId) }
        if (rows.isNotEmpty()) {
            shown[c.second.unit.id] = (shown[c.second.unit.id] ?: 0) + 1
            units += 1
            seconds += secs
        }
    }

    fun end(s: SessionView) {
        if (ended) return
        ended = true
        val now = clock()
        val total = (now - started) / 1000.0
        val real = if (total > 0) Math.round(minOf(1.0, seconds / total) * 1e4) / 1e4 else 0.0
        s.log += LogRow.Session(ids(), now, device, tz, systemId, lang, ids(), started, now, mix.target, real, arm, minOf(units, 1000), minOf(s.answered, 1000))
    }

    companion object {
        private const val SALT_KEY = "polingual.reviewLog.salt"

        fun plan(
            mode: InputModeFlag.Mode, lang: String, bundle: InputBundle, glossOf: (String) -> String?, resolve: (String, String) -> String?,
            state: StudyState, cards: Int, tier: Int, systemId: String, device: String, now: Long,
            clock: () -> Long = System::currentTimeMillis, ids: () -> String = { UUID.randomUUID().toString() }, tz: String = TimeZone.getDefault().id,
            freq: (String) -> FreqPrior? = { null },
            experiment: Boolean = false,
        ): InputPlanState? {
            if (mode == InputModeFlag.Mode.Off) return null
            val learner = InputStage.learner(state, lang, resolve, now, tier, InputStage.dueLemmas(bundle, state, lang, resolve, now), emptyMap(), null, freq)
            val demo = mode == InputModeFlag.Mode.Demo
            val eligible = InputStage.eligibleUnitSeconds(bundle, learner).ifEmpty { if (demo) listOfNotNull(InputStage.choose(bundle, learner, true)?.plan?.tokens?.times(1.5)) else emptyList() }
            val planned = InputExperiment.mix(experiment, device, tier, cards, eligible)
            val mix = planned.mix
            if (mix.units == 0) return null
            return InputPlanState(lang, bundle, glossOf, resolve, mix, tier, systemId, now, demo, device, clock, ids, tz, freq, planned.arm)
        }

        suspend fun load(graph: Graph, s: StudySession, targets: List<String>, placement: Map<String, Double>, systemId: String): InputPlanState? {
            val mode = InputModeFlag.mode
            if (mode == InputModeFlag.Mode.Off) return null
            val salt = graph.kv.get(SALT_KEY) ?: UUID.randomUUID().toString().also { graph.kv.set(SALT_KEY, it) }
            val device = ReviewLog.deviceHash(salt, graph.kv.get("polingual.install") ?: UUID.randomUUID().toString().also { graph.kv.set("polingual.install", it) })
            val corpus = graph.corpus.load()
            for (lang in targets) {
                val now = System.currentTimeMillis()
                val resolve = InputStage.resolver(mapOf(lang to InputStage.lemmaCardMap(corpus, lang)))
                val bundle = graph.inputs.bundle(lang, InputStage.bandsFor(InputStage.knownWords(s.state, lang, now))) ?: continue
                val freq = InputStage.freqIndex(graph.corpus.frequency(listOf(lang)).ranks[lang].orEmpty().map { (w, r) -> Triple(w, r.toDouble(), false) })
                plan(mode, lang, bundle, { corpus.byId[it]?.gloss }, resolve, s.state, s.total, (placement[lang] ?: 0.0).toInt(), systemId, device, now, freq = freq, experiment = InputExperiment.on(BuildConfig.INPUT_EXPERIMENT))?.let { return it }
            }
            return null
        }
    }
}

object InputModeFlag {
    enum class Mode { Off, On, Demo }

    fun of(flag: String, debug: Boolean): Mode = when (flag) {
        "demo" -> if (debug) Mode.Demo else Mode.Off
        "1", "on" -> Mode.On
        "0", "off" -> Mode.Off
        else -> if (debug) Mode.On else Mode.Off
    }

    val mode: Mode = of(BuildConfig.INPUT_STAGE, BuildConfig.DEBUG)
}
