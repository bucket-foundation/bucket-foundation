package com.polingual.app

import androidx.compose.runtime.collectAsState
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import foundation.bucket.core.engine.LangCorpus
import foundation.bucket.core.engine.SeededRandom
import foundation.bucket.core.engine.StudyState
import com.polingual.brand.D8
import foundation.bucket.core.ui.LocalPalette
import com.polingual.brand.Type
import kotlinx.coroutines.launch

@Composable
fun LettersScreen(graph: Graph, lang: String, back: () -> Unit) {
    val p = LocalPalette.current
    val unit = remember(lang) { Letters.unit(lang) }
    val rng = remember { SeededRandom(System.nanoTime().toULong()) }
    val scope = rememberCoroutineScope()
    var queue by remember { mutableStateOf<List<Letter>?>(null) }
    var i by remember { mutableIntStateOf(0) }
    var right by remember { mutableIntStateOf(0) }
    var finished by remember { mutableStateOf(false) }
    LaunchedEffect(lang) {
        val app = graph.store.current()
        val st = app.system?.let { app.study[it.id] } ?: StudyState()
        queue = Letters.queue(st, lang, System.currentTimeMillis())
    }
    Page(unit?.title ?: stringResource(R.string.letters), back = back) {
        val q = queue
        if (unit == null) { Text(stringResource(R.string.letters_latin), color = p.muted); return@Page }
        if (q == null) return@Page
        if (i >= q.size) {
            Text(stringResource(if (q.isEmpty()) R.string.letters_none else R.string.letters_done), style = Type.display, color = D8.tyrian)
            if (q.isNotEmpty()) Text(stringResource(R.string.letters_score, right, q.size), color = p.muted)
            LaunchedEffect(Unit) {
                if (!finished && q.isNotEmpty()) {
                    finished = true
                    val plan = graph.todayPlan.load()
                    graph.todayPlan.save(plan.setDone(TodayItem.of(TodayActivity.Alphabet(lang), "").id, true, today(), System.currentTimeMillis().toDouble()))
                }
            }
            return@Page
        }
        com.polingual.brand.Meter(i.toFloat() / q.size, Modifier.fillMaxWidth())
        Text("${i + 1}/${q.size}", style = Type.caps, color = D8.vermilion)
        val letter = q[i]
        val question = remember(i) { Letters.question(lang, letter, unit, rng, hear = i % 2 == 1) }
        QuestionView(graph, question) { ok ->
            if (ok) right += 1
            scope.launch {
                graph.store.update { s ->
                    val sys = s.system ?: return@update s
                    s.copy(study = s.study + (sys.id to Letters.grade(s.study[sys.id] ?: StudyState(), lang, letter.ch, ok, System.currentTimeMillis())))
                }
            }
            i += 1
        }
    }
}

@Composable
fun SoundDrillScreen(graph: Graph, lang: String, back: () -> Unit) {
    val p = LocalPalette.current
    val rng = remember { SeededRandom(System.nanoTime().toULong()) }
    var corpus by remember { mutableStateOf<LangCorpus?>(null) }
    var round by remember { mutableIntStateOf(0) }
    var right by remember { mutableIntStateOf(0) }
    LaunchedEffect(Unit) { corpus = graph.corpus.load() }
    Page(stringResource(R.string.sounds), back = back) {
        val c = corpus ?: return@Page
        val app = graph.state.collectAsState().value
        val sys = app?.system ?: return@Page
        if (round >= ROUNDS) {
            Text(stringResource(R.string.sounds_right), style = Type.display, color = D8.tyrian)
            Text(stringResource(R.string.sounds_score, right, ROUNDS), color = p.muted)
            return@Page
        }
        Text(stringResource(R.string.sounds_detail), color = p.muted)
        val q = remember(round) { SoundDrills.pair(c, sys.root, lang, app.study[sys.id] ?: StudyState(), rng) }
        if (q == null) { Text(stringResource(R.string.letters_none), color = p.muted); return@Page }
        QuestionView(graph, q) { ok -> if (ok) right += 1; round += 1 }
    }
}

private const val ROUNDS = 8
