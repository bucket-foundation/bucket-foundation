package com.polingual.app

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.unit.dp
import foundation.bucket.core.engine.YesNoTest
import foundation.bucket.core.ui.pl.ButtonVariant
import foundation.bucket.core.ui.pl.PL
import foundation.bucket.core.ui.pl.PLButton
import foundation.bucket.core.ui.pl.PLCard
import foundation.bucket.core.ui.pl.PlainLink
import foundation.bucket.core.ui.pl.PrimaryButton
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

object Ci14Copy {
    const val TITLE = "a study on reading time"
    const val BODY = "Polingual is testing how much of each session should go to reading and listening. If you take part, the app picks one of three settings for you at random, gives you a 3 minute word test now and another around day 28, and stores your study logs with the setting you got. Your logs stay tied to your account and are used only for this study and for Polingual itself."
    const val LEAVE_NOTE = "You can leave at any time from this page, and your sessions go back to the usual mix."
    const val ASK = "Do you know this word? Some of these are made up, so say no if you are not sure."
}

@Composable
fun Ci14Panel(graph: Graph, done: () -> Unit) {
    var step by remember { mutableStateOf(Ci14.step(graph.ci14Consent(), graph.ci14, System.currentTimeMillis())) }
    when (val st = step) {
        null -> LaunchedEffect(Unit) { done() }
        Ci14Step.Disclose -> PLCard {
            Text(Ci14Copy.TITLE, style = Type.title)
            Text(Ci14Copy.BODY, color = PL.InkDim)
            Text(Ci14Copy.LEAVE_NOTE, color = PL.InkDim)
            PrimaryButton("take part") { graph.ci14.join(); step = Ci14.step(graph.ci14Consent(), graph.ci14, System.currentTimeMillis()) }
            PLButton("no thanks", variant = ButtonVariant.Secondary) { graph.ci14.leave(); done() }
        }
        is Ci14Step.Test -> YesNoRun(graph, st.phase, done)
    }
}

@Composable
private fun YesNoRun(graph: Graph, phase: String, done: () -> Unit) {
    val system = graph.state.value?.system
    val lang = system?.targets?.firstOrNull { graph.yesNoForms(it) != null }
    var items by remember { mutableStateOf<List<YesNoTest.TestItem>?>(null) }
    var at by remember { mutableIntStateOf(0) }
    val yes = remember { mutableSetOf<String>() }
    val started = remember { System.currentTimeMillis() }
    LaunchedEffect(lang, phase) {
        val forms = lang?.let { withContext(Dispatchers.IO) { graph.yesNoForms(it) } }
        items = forms?.get(Ci14.formFor(phase)).orEmpty()
        if (items.isNullOrEmpty()) done()
    }
    val list = items ?: return
    if (list.isEmpty() || system == null || lang == null) return
    val answer: (Boolean) -> Unit = { known ->
        if (known) yes += list[at].word
        if (at + 1 >= list.size) {
            val now = System.currentTimeMillis()
            graph.recordStudy(listOf(Ci14.vocabRow(phase, list, yes, (now - started) / 1000.0, graph.ci14.enrolment(), java.util.UUID.randomUUID().toString(), now, graph.deviceId(), java.util.TimeZone.getDefault().id, system.id, lang)))
            graph.ci14.markTaken(phase)
            done()
        } else at += 1
    }
    PLCard {
        Text("word test · ${at + 1} / ${list.size}", color = PL.InkDim)
        Text(Ci14Copy.ASK, color = PL.InkDim)
        Text(list[at].word, style = Type.title)
        PrimaryButton("I know it") { answer(true) }
        PLButton("no", variant = ButtonVariant.Secondary) { answer(false) }
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            PlainLink("later", onClick = done)
            PlainLink("leave the study") { graph.ci14.leave(); done() }
        }
    }
}

@Composable
fun Ci14Leave(graph: Graph) {
    var left by remember { mutableStateOf(false) }
    if (left || !Ci14.showsLeave(graph.ci14Consent())) return
    PlainLink("leave the reading-time study") { graph.ci14.leave(); left = true }
}
