package com.polingual.app

import foundation.bucket.core.ui.pl.PL
import androidx.compose.foundation.layout.Row
import androidx.compose.ui.Modifier
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.ui.unit.dp
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.res.stringResource
import foundation.bucket.core.engine.CardState
import foundation.bucket.core.engine.ItemKind
import foundation.bucket.core.engine.LangCorpus
import foundation.bucket.core.engine.LangItem
import foundation.bucket.core.engine.Scheduler
import foundation.bucket.core.engine.SeededRandom
import foundation.bucket.core.engine.StudyState
import foundation.bucket.core.engine.usable
import foundation.bucket.core.model.Lang
import foundation.bucket.core.model.LangSystem
import foundation.bucket.core.ui.pl.Card
import foundation.bucket.core.ui.LocalPalette
import foundation.bucket.core.ui.pl.PlainLink
import foundation.bucket.core.ui.pl.PrimaryButton
import kotlinx.coroutines.launch
import kotlin.math.roundToInt
import kotlin.math.sqrt

enum class CefrBand(val label: String) { A1("A1"), A2("A2"), B1("B1"), B2("B2") }
enum class CefrTask { Recognize, Recall, Listen, Cloze, Grammar, Reading }

data class BandSpec(val band: CefrBand, val tierMin: Double, val tierMax: Double, val tasks: List<CefrTask>)
data class CefrAnswer(val band: CefrBand, val task: CefrTask, val itemId: String, val correct: Boolean)
data class BandResult(val band: CefrBand, val asked: Int, val right: Int, val recallRight: Int, val passed: Boolean, val failed: Boolean, val confidence: Double)
data class CefrStep(val done: Boolean, val level: String, val bands: List<BandResult>, val next: Pair<CefrBand, CefrTask>? = null, val unknownFrom: CefrBand? = null) {
    val stoppedHere: CefrStep get() = CefrStep(true, level, bands, unknownFrom = next?.first)
}
data class CefrPlacement(val level: String, val noCefr: Boolean, val floorTier: Double, val placeIds: List<String>, val bands: List<BandResult>, val unknownFrom: CefrBand?) {
    val label: String get() = if (noCefr) "band $level" else level
}

object Cefr {
    private val R_ = CefrTask.Recognize
    private val C = CefrTask.Recall
    private val L = CefrTask.Listen
    private val Z = CefrTask.Cloze
    private val G = CefrTask.Grammar
    private val D = CefrTask.Reading
    val bands = listOf(
        BandSpec(CefrBand.A1, 0.0, 3.0, listOf(R_, C, L, Z, G, R_, C, D)),
        BandSpec(CefrBand.A2, 4.0, 6.0, listOf(C, R_, Z, L, G, D, C, Z)),
        BandSpec(CefrBand.B1, 7.0, 8.0, listOf(C, Z, D, G, L, C, D, C)),
        BandSpec(CefrBand.B2, 9.0, 10.0, listOf(C, D, G, C, Z, L, D, C)),
    )
    const val BAND_ITEMS = 8
    const val BAND_PASS = 6
    const val BAND_FAIL = 3
    const val RECALL_PASS = 1
    const val MIN_BANDS = 2
    const val SKIP_CONFIDENCE = 0.5
    val noCefrLangs = setOf("la", "grc", "sa")
    val wordTasks = setOf(R_, C, L, Z)
    val fallback = mapOf(R_ to listOf(R_), C to listOf(C, R_), L to listOf(L, C, R_), Z to listOf(Z, C, R_), G to listOf(G, C, R_), D to listOf(D, Z, C, R_))

    fun spec(b: CefrBand) = bands.first { it.band == b }

    fun wilsonLower(right: Int, n: Int, z: Double = 1.96): Double {
        if (n <= 0) return 0.0
        val nn = n.toDouble()
        val p = right / nn
        val z2 = z * z
        val v = (p + z2 / (2 * nn) - z * sqrt((p * (1 - p)) / nn + z2 / (4 * nn * nn))) / (1 + z2 / nn)
        return (maxOf(0.0, v) * 100).roundToInt() / 100.0
    }

    fun bandResult(band: CefrBand, answers: List<CefrAnswer>): BandResult {
        val at = answers.filter { it.band == band }
        val right = at.count { it.correct }
        val recall = at.count { it.correct && it.task == C }
        val passed = right >= BAND_PASS && recall >= RECALL_PASS
        val failed = !passed && (at.size - right >= BAND_FAIL || at.size >= BAND_ITEMS)
        return BandResult(band, at.size, right, recall, passed, failed, wilsonLower(right, at.size))
    }

    fun step(answers: List<CefrAnswer>, available: List<CefrBand> = CefrBand.entries): CefrStep {
        val results = mutableListOf<BandResult>()
        var level = "pre-A1"
        for (s in bands) {
            if (s.band !in available) return CefrStep(true, level, results, unknownFrom = s.band)
            val r = bandResult(s.band, answers)
            results += r
            if (r.passed) { level = s.band.label; continue }
            if (r.failed) return CefrStep(true, level, results)
            return CefrStep(false, level, results, next = s.band to s.tasks[r.asked])
        }
        return CefrStep(true, level, results)
    }

    fun pool(system: LangSystem, corpus: LangCorpus, lang: String, band: CefrBand): List<LangItem> {
        val s = spec(band)
        return corpus.items.filter { it.kind == ItemKind.Word && it.tier >= s.tierMin && it.tier <= s.tierMax && usable(it, system.root, lang) }
    }

    fun available(system: LangSystem, corpus: LangCorpus, lang: String) = bands.filter { pool(system, corpus, lang, it.band).size >= BAND_ITEMS }.map { it.band }

    private fun others(all: List<LangItem>, p: LangItem, lang: String, target: Boolean, rng: SeededRandom, n: Int = 3): List<String> {
        val out = mutableListOf<String>()
        for (q in rng.shuffled(all)) {
            if (out.size >= n) break
            val v = if (target) q.form(lang)!! else q.form(p.root ?: "")
            if (q.id == p.id || v == null) continue
            if (q.form(lang) == p.form(lang) || out.contains(v)) continue
            out += v
        }
        return out
    }

    fun build(task: CefrTask, band: CefrBand, system: LangSystem, corpus: LangCorpus, lang: String, seen: Set<String>, rng: SeededRandom): Question? {
        val root = system.root
        val all = pool(system, corpus, lang, band)
        val p = rng.shuffled(all.filterNot { it.id in seen }).firstOrNull() ?: return null
        val target = p.form(lang)!!
        val gloss = p.form(root)!!
        val rooted = all.map { it.copy(root = root) }
        val pr = p.copy(root = root)
        return when (task) {
            R_ -> Question(QuestionKind.Choose, p.id, gloss, root, target, lang, rng.shuffled(listOf(target) + others(rooted, pr, lang, true, rng)))
            C -> {
                val r = p.readings[lang]
                val accept = if (Lang.info[lang]?.latin != false) listOf(target) else listOfNotNull(target, r?.kana, r?.roman).filter { it.isNotBlank() }.distinct()
                Question(QuestionKind.Translate, p.id, gloss, root, target, lang, accept = accept)
            }
            L -> Question(QuestionKind.Listen, p.id, "", lang, gloss, root, rng.shuffled(listOf(gloss) + others(rooted, pr, lang, false, rng)), speak = target, speakLang = lang)
            else -> null
        }
    }

    fun question(band: CefrBand, task: CefrTask, system: LangSystem, corpus: LangCorpus, lang: String, seen: Set<String>, rng: SeededRandom, speech: Boolean = true): Pair<CefrTask, Question>? {
        for (t in fallback[task] ?: listOf(task)) {
            if (t == L && !speech) continue
            build(t, band, system, corpus, lang, seen, rng)?.let { return t to it }
        }
        return null
    }

    fun trustedBands(results: List<BandResult>): Set<CefrBand> {
        val out = mutableSetOf<CefrBand>()
        results.forEachIndexed { k, b -> if (b.passed && b.confidence >= SKIP_CONFIDENCE) bands.take(k + 1).forEach { out += it.band } }
        return out
    }

    fun skipFloor(results: List<BandResult>): Double {
        var floor = 0.0
        var k = 0
        while (k + 2 < bands.size) {
            val above = listOf(k + 1, k + 2).map { results.getOrNull(it) }
            if (above.all { it != null && it.passed && it.confidence >= SKIP_CONFIDENCE }) floor = bands[k + 1].tierMin else break
            k += 1
        }
        return floor
    }

    fun placement(lang: String, answers: List<CefrAnswer>, step: CefrStep): CefrPlacement {
        val passed = step.bands.filter { it.passed }.map { it.band }.toSet()
        val noCefr = lang in noCefrLangs
        if (passed.size < MIN_BANDS) return CefrPlacement(step.level, noCefr, 0.0, emptyList(), step.bands, step.unknownFrom)
        val ids = answers.filter { it.correct && it.task in wordTasks && it.band in passed }.map { it.itemId }.distinct()
        return CefrPlacement(step.level, noCefr, skipFloor(step.bands), ids, step.bands, step.unknownFrom)
    }

    fun apply(state: StudyState, system: LangSystem, corpus: LangCorpus, lang: String, p: CefrPlacement, now: Long): StudyState {
        val known = corpus.items.filter { it.kind == ItemKind.Word && usable(it, system.root, lang) && (it.tier < p.floorTier || it.id in p.placeIds) }
        val cards = state.cards.toMutableMap()
        for (i in known) {
            val id = "$lang:${i.id}"
            if (id !in cards) cards[id] = CardState(reps = 2, intervalDays = 7.0, due = now + 7 * Scheduler.DAY_MS, last = now)
        }
        return state.copy(cards = cards)
    }
}

@Composable
fun PlacementScreen(graph: Graph, back: () -> Unit, study: () -> Unit) {
    val p = LocalPalette.current
    val scope = rememberCoroutineScope()
    var corpus by remember { mutableStateOf<LangCorpus?>(null) }
    var system by remember { mutableStateOf<LangSystem?>(null) }
    var known by remember { mutableStateOf(setOf<String>()) }
    var queue by remember { mutableStateOf<List<String>?>(null) }
    var answers by remember { mutableStateOf(listOf<CefrAnswer>()) }
    var seen by remember { mutableStateOf(setOf<String>()) }
    var current by remember { mutableStateOf<Triple<CefrBand, CefrTask, Question>?>(null) }
    var result by remember { mutableStateOf<CefrPlacement?>(null) }
    var asked by remember { mutableIntStateOf(0) }
    val rng = remember { SeededRandom(System.nanoTime().toULong()) }
    LaunchedEffect(Unit) { corpus = graph.corpus.load(); system = graph.store.current().system }
    val sys = system
    val c = corpus
    fun lang() = queue?.firstOrNull()
    fun finish(step: CefrStep) {
        val lang = lang()!!
        val r = Cefr.placement(lang, answers, step)
        result = r
        current = null
        scope.launch {
            graph.store.update { s -> s.copy(study = s.study + (sys!!.id to Cefr.apply(s.study[sys.id] ?: StudyState(), sys, c!!, lang, r, System.currentTimeMillis()))) }
            graph.kv.set("placement.${sys!!.id}.$lang", r.label)
        }
    }
    fun advance() {
        val lang = lang() ?: return
        if (sys == null || c == null) return
        val step = Cefr.step(answers, Cefr.available(sys, c, lang))
        if (step.done) return finish(step)
        val (band, task) = step.next!!
        val q = Cefr.question(band, task, sys, c, lang, seen, rng) ?: return finish(step.stoppedHere)
        asked += 1
        current = Triple(band, q.first, q.second)
    }
    Page(stringResource(R.string.placement), back = back) {
        if (sys == null || c == null) { Text(stringResource(R.string.placement_loading), color = p.muted); return@Page }
        val r = result
        val q = current
        when {
            queue == null -> PlacementPick(sys, known, { l -> known = if (l in known) known - l else known + l }) {
                val order = sys.targets.filter { it in known }
                if (order.isEmpty()) study() else { queue = order; advance() }
            }
            r != null -> PlacementResult(r, answers.size, queue!!.drop(1).firstOrNull(), study) {
                queue = queue!!.drop(1); answers = emptyList(); seen = emptySet(); result = null; asked = 0; advance()
            }
            q != null -> PlacementAsk(graph, sys.root, lang()!!, asked, q) { ok ->
                answers = answers + CefrAnswer(q.first, q.second, q.third.itemId, ok)
                seen = seen + q.third.itemId
                current = null
                advance()
            }
            else -> Text(stringResource(R.string.placement_picking), color = p.muted)
        }
    }
}

@Composable
private fun PlacementPick(sys: LangSystem, known: Set<String>, flip: (String) -> Unit, go: () -> Unit) {
    Text(stringResource(R.string.placement_which), style = Type.title, color = PL.Tyrian)
    Text(stringResource(R.string.placement_which_detail), color = LocalPalette.current.muted)
    sys.targets.forEach { l ->
        foundation.bucket.core.ui.pl.PLTile(l in known, Modifier.fillMaxWidth().heightIn(min = 52.dp), onClick = { flip(l) }) {
            Text("${Lang.flag(l)} ${Lang.name(l)}", style = Type.title, color = if (l in known) PL.Paper else PL.Ink)
        }
    }
    PrimaryButton(stringResource(if (known.isEmpty()) R.string.placement_first_words else R.string.placement_test), onClick = go)
}

@Composable
private fun PlacementResult(r: CefrPlacement, count: Int, nextLang: String?, study: () -> Unit, next: () -> Unit) {
    val p = LocalPalette.current
    Text(stringResource(R.string.placement_level, r.label), style = Type.display, color = PL.Tyrian)
    Text(stringResource(R.string.placement_count, count) + " " +
        (if (r.placeIds.isEmpty() && r.floorTier == 0.0) stringResource(R.string.placement_from_first) else stringResource(R.string.placement_known, r.placeIds.size)) + " " +
        stringResource(if (r.noCefr) R.string.placement_no_cefr else R.string.placement_proxy), color = p.muted)
    r.unknownFrom?.let { Text(stringResource(R.string.placement_unknown_from, it.label), color = p.muted) }
    Card {
        r.bands.forEach { b -> Text(stringResource(if (b.passed) R.string.placement_band_pass else R.string.placement_band_fail, b.band.label, b.right, b.asked), color = p.ink) }
    }
    if (nextLang != null) PrimaryButton(stringResource(R.string.placement_place, Lang.name(nextLang)), onClick = next)
    else PrimaryButton(stringResource(R.string.placement_start_studying), onClick = study)
}

@Composable
private fun PlacementAsk(graph: Graph, root: String, lang: String, asked: Int, q: Triple<CefrBand, CefrTask, Question>, answer: (Boolean) -> Unit) {
    Text(stringResource(R.string.placement_pair, Lang.name(root), Lang.name(lang)), style = Type.title, color = PL.Tyrian)
    if (asked == 1) Text(stringResource(R.string.placement_intro), color = LocalPalette.current.muted)
    Text(stringResource(R.string.placement_question, asked, q.first.label), style = Type.caps, color = PL.Vermilion)
    QuestionView(graph, q.third, answer)
    PlainLink(stringResource(R.string.placement_dont_know)) { answer(false) }
}
