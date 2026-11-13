package com.polingual.app.play

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.unit.dp
import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.compose.composable
import com.polingual.app.Graph
import com.polingual.app.Type
import foundation.bucket.core.ui.pl.Art
import foundation.bucket.core.ui.pl.CardTone
import foundation.bucket.core.ui.pl.PL
import foundation.bucket.core.ui.pl.PLCard

object WebGames {
    val ready = setOf("polyword")
}

@Composable
fun WebGameTile(game: WebGame, onClick: () -> Unit) {
    PLCard(tone = CardTone.Tyrian, onClick = onClick) {
        Row(horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(64.dp), contentAlignment = Alignment.Center) { Art(game.art, Modifier.size(58.dp).rotate(game.tilt), shadow = true) }
            Column(Modifier.weight(1f)) {
                Text(game.title, style = Type.title, color = PL.Paper)
                Text(game.blurb, style = Type.small, color = PL.Paper.copy(alpha = 0.9f))
            }
        }
    }
}

fun playRoutes(builder: NavGraphBuilder, graph: Graph, nav: NavHostController) {
    val back: () -> Unit = { nav.popBackStack() }
    builder.composable("play/polyword") { PolywordScreen(graph, back) }
}
