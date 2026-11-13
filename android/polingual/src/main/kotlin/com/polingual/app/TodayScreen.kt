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
import foundation.bucket.core.engine.Streak
import foundation.bucket.core.ui.pl.PL
import foundation.bucket.core.ui.pl.FlagTile
import foundation.bucket.core.ui.LocalPalette
import foundation.bucket.core.ui.pl.PrimaryButton

@Composable
fun TodayScreen(graph: Graph, nav: NavHostController) {
    val app by graph.state.collectAsState()
    val p = LocalPalette.current
    val system = app?.system
    val study = system?.let { app?.study?.get(it.id) }
    Page("Today", ground = Ground.Diagonal, stickers = listOf(Sticker("ticket", Alignment.CenterStart, 120.dp, -8f), Sticker("seal", Alignment.TopEnd, 58.dp, 10f), Sticker("script-ru", Alignment.BottomEnd, 72.dp, -5f, dx = (-8).dp))) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(system?.name ?: "No language set yet", style = Type.body, color = p.muted, modifier = Modifier.weight(1f))
            StreakFlame(Streak.count(study?.days.orEmpty(), today()))
        }
        if (system != null) Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) { system.targets.forEach { FlagTile(it, 44.dp) } }
        if (system == null) PrimaryButton("Pick languages", color = PL.Lapis) { nav.navigate("system/new") }
        TodayExtras(graph, nav)
    }
}

