package com.polingual.app

import foundation.bucket.core.ui.pl.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.navigation.NavHostController
import foundation.bucket.core.ui.pl.PL
import foundation.bucket.core.ui.pl.FlagTile
import foundation.bucket.core.ui.pl.PrimaryButton
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import foundation.bucket.core.engine.ProgressMetric
import foundation.bucket.core.engine.StudyState

@Composable
fun TodayScreen(graph: Graph, nav: NavHostController) {
    val app by graph.state.collectAsState()
    val system = app?.system
    val study = system?.let { app?.study?.get(it.id) }
    Page("Today", ground = Ground.Diagonal, stickers = listOf(Sticker("ticket", Alignment.CenterStart, 120.dp, -8f), Sticker("seal", Alignment.TopEnd, 58.dp, 10f), Sticker("script-ru", Alignment.BottomEnd, 72.dp, -5f, dx = (-8).dp))) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(system?.name ?: "No language set yet", style = Type.body, color = PL.InkDim, modifier = Modifier.weight(1f))
            StreakFlame(syncedStreak(study))
        }
        if (system != null) LangProgress(system.targets, study)
        if (system == null) PrimaryButton("Pick languages", color = PL.Lapis) { nav.navigate("system/new") }
        if (system != null) TodayPlanCard(graph, nav)
        if (system != null) AskNotificationsOnce(graph)
        TodayExtras(graph, nav)
    }
}


@Composable
fun LangProgress(langs: List<String>, study: StudyState?) {
    val cards = ProgressMetric.cards(study)
    val now = System.currentTimeMillis().toDouble()
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        langs.forEach { lang ->
            val m = ProgressMetric.langMetrics(lang, cards, emptyList(), now)
            val hours = if (m.inputSeconds > 0) m.inputHours.toString() else "\u2013"
            val label = stringResource(R.string.d_progress_for, lang.uppercase())
            Row(Modifier.semantics { contentDescription = label }, verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FlagTile(lang, 44.dp)
                PLBadge(stringResource(R.string.d_input_hours, hours), BadgeTone.Lapis)
                PLBadge(stringResource(R.string.d_known_words, m.knownWords), BadgeTone.Parchment)
            }
        }
    }
}
