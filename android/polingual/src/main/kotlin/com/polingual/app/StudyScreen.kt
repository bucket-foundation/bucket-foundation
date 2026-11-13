package com.polingual.app

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.VolumeUp
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import foundation.bucket.core.engine.ExerciseKind
import foundation.bucket.core.engine.SeededRandom
import foundation.bucket.core.engine.StudySession
import foundation.bucket.core.engine.StudyState
import foundation.bucket.core.model.Lang
import foundation.bucket.core.ui.Card
import foundation.bucket.core.ui.ChoiceButton
import foundation.bucket.core.ui.ChoiceState
import foundation.bucket.core.ui.D8
import foundation.bucket.core.ui.LocalPalette
import foundation.bucket.core.ui.Pill
import foundation.bucket.core.ui.PrimaryButton
import foundation.bucket.core.ui.Type
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun StudyScreen(graph: Graph, done: () -> Unit) {
    val p = LocalPalette.current
    var session by remember { mutableStateOf<StudySession?>(null) }
    var tick by remember { mutableIntStateOf(0) }
    var picked by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    LaunchedEffect(Unit) {
        val app = graph.store.current()
        val system = app.system ?: return@LaunchedEffect
        val corpus = graph.corpus.load()
        session = StudySession(corpus, system.root, system.targets, app.study[system.id] ?: StudyState(), today(), System.currentTimeMillis(), SeededRandom(System.nanoTime().toULong()))
    }
    val s = session
    Page(back = done) {
        if (s == null) { Text("Loading", color = p.muted); return@Page }
        tick.let { }
        val ex = s.current
        if (ex == null) {
            Text(if (s.total == 0) "Nothing due" else "Session done", style = Type.display, color = p.ink)
            Text(if (s.total == 0) "Come back tomorrow for new words, or play a game." else "${s.correct} of ${s.answered} right. Misses come back in your next session.", color = p.muted)
            PrimaryButton("Back to Today") { done() }
            return@Page
        }
        LinearProgressIndicator(progress = { s.answered.toFloat() / maxOf(1, s.answered + s.remaining) }, modifier = Modifier.fillMaxWidth(), color = D8.malachite)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(Lang.flag(ex.word.lang))
            Text(Lang.name(ex.word.lang), style = Type.caps, color = p.muted)
            if (ex.isNew) Pill("New", D8.lapis)
        }
        Card {
            Text(if (ex.kind == ExerciseKind.Recognize) "What does this mean?" else "Pick the ${Lang.name(ex.word.lang)} word", color = p.muted)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(ex.prompt, style = Type.word, color = p.ink, modifier = Modifier.weight(1f))
                if (ex.kind == ExerciseKind.Recognize) IconButton(onClick = { graph.voice.speak(ex.word.form, ex.word.lang) }) { Icon(Icons.AutoMirrored.Outlined.VolumeUp, "Speak") }
            }
        }
        LaunchedEffect(ex) { if (ex.kind == ExerciseKind.Recognize) graph.voice.speak(ex.word.form, ex.word.lang) }
        ex.options.forEach { o ->
            val state = when {
                picked == null -> ChoiceState.Idle
                o == ex.answer -> ChoiceState.Right
                o == picked -> ChoiceState.Wrong
                else -> ChoiceState.Dim
            }
            ChoiceButton(o, state) {
                picked = o
                scope.launch {
                    delay(if (o == ex.answer) 600 else 1400)
                    s.answer(o)
                    val sys = graph.store.current().system
                    if (sys != null) graph.store.update { it.copy(study = it.study + (sys.id to s.state)) }
                    picked = null
                    tick += 1
                }
            }
        }
    }
}
