package com.polingual.app

import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import foundation.bucket.core.model.Lang
import foundation.bucket.core.ui.pl.ButtonVariant
import foundation.bucket.core.ui.pl.EmptyState
import foundation.bucket.core.ui.pl.Ground
import foundation.bucket.core.ui.pl.PL
import foundation.bucket.core.ui.pl.PLButton
import foundation.bucket.core.ui.pl.PLCard
import foundation.bucket.core.ui.pl.SectionTitle
import foundation.bucket.core.ui.pl.Sticker

@Composable
fun PlayScreen(graph: Graph, nav: NavHostController) {
    val app by graph.state.collectAsState()
    val access by graph.billing.access.collectAsState()
    val system = app?.system
    Page("Play", ground = Ground.Lattice, stickers = listOf(Sticker("bunting", Alignment.CenterStart, 110.dp, -6f), Sticker("star", Alignment.TopEnd, 56.dp, 12f), Sticker("blocks", Alignment.BottomEnd, 64.dp, -9f, dx = (-8).dp))) {
        Text("Every game is free. Words you miss come back in Learn.", style = Type.body, color = PL.Paper)
        PLButton("Start learning", variant = ButtonVariant.Secondary, onDark = true) { nav.navigate(PlayRules.startLearningRoute(access)) }
        PLCard(tone = foundation.bucket.core.ui.pl.CardTone.Paper, onClick = { nav.navigate("lobbies") }) {
            Text("Live rooms", style = Type.title, color = PL.Ink)
            Text("Play the same round with friends. Web and iPhone players join with one code.", style = Type.small, color = PL.InkDim)
        }
        SectionTitle("Daily games", onDark = true)
        if (system == null) {
            EmptyState("kente", "Pick languages first. The games use the words you study.", onDark = true)
            PLButton("Pick languages", variant = ButtonVariant.Accent) { nav.navigate("system/new") }
        } else GameKind.entries.filter { it != GameKind.Letters || system.targets.any { l -> Lang.info[l]?.latin == false } }.forEach { k ->
            val played = app?.played(k, system)?.let { r -> "${r.count { it == '1' }} of ${r.length} today. Play again." }
            GameTile(k, played) { nav.navigate("game/${k.route}") }
        }
        AdBanner(graph)
    }
}
