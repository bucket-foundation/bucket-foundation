package com.polingual.app

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import foundation.bucket.core.engine.Streak
import foundation.bucket.core.ui.D8
import foundation.bucket.core.ui.FlagTile
import foundation.bucket.core.ui.LocalPalette
import foundation.bucket.core.ui.PrimaryButton
import foundation.bucket.core.ui.Type

@Composable
fun TodayScreen(graph: Graph, nav: NavHostController) {
    val app by graph.state.collectAsState()
    val p = LocalPalette.current
    val system = app?.system
    val study = system?.let { app?.study?.get(it.id) }
    Page {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Column(Modifier1) {
                Text("Today", style = Type.display, color = p.ink)
                Text(system?.name ?: "No language set yet", color = p.muted)
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("${Streak.count(study?.days.orEmpty(), today())}", style = Type.title.copy(color = D8.vermilion))
                Text("STREAK", style = Type.caps, color = p.muted)
            }
        }
        if (system != null) Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) { system.targets.forEach { FlagTile(it, 44.dp) } }
        if (system == null) PrimaryButton("Pick languages", color = D8.lapis) { nav.navigate("system/new") }
        TodayExtras(graph, nav)
    }
}

private val Modifier1 = androidx.compose.ui.Modifier
