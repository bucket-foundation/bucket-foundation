package com.polingual.app

import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.unit.dp
import foundation.bucket.core.ui.pl.ButtonVariant
import foundation.bucket.core.ui.pl.Ground
import foundation.bucket.core.ui.pl.PL
import foundation.bucket.core.ui.pl.PLButton
import foundation.bucket.core.ui.pl.PrimaryButton
import foundation.bucket.core.ui.pl.ResultDots
import foundation.bucket.core.ui.pl.Sticker

@Composable
fun GameScaffold(
    graph: Graph,
    title: String,
    art: String,
    tilt: Float,
    corner: String,
    soundOnly: Boolean,
    back: () -> Unit,
    banner: (@Composable ColumnScope.() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    LaunchedEffect(title) { graph.ads.enteredGame() }
    Page(
        title, back = { graph.ads.leftFinishedGame(graph.activity?.get()); back() }, ground = Ground.Lattice, panel = true,
        stickers = listOf(Sticker(art, Alignment.CenterStart, 70.dp, tilt), Sticker("seal", Alignment.TopEnd, 50.dp, 9f), Sticker(corner, Alignment.BottomEnd, 80.dp, -5f, dx = (-8).dp)),
    ) {
        banner?.invoke(this)
        val silent by graph.silent.collectAsState()
        if (!SoundRules.needsSoundCard(silent, soundOnly)) SilentSwitch(graph, compact = true)
        content()
    }
}

@Composable
fun ResultBlock(title: String, line: String, dots: Pair<List<Boolean>, Int>?, again: (() -> Unit)?, againLabel: String = "Play again", ad: (@Composable () -> Unit)? = null, reveal: @Composable () -> Unit = {}) {
    Text(title, style = Type.display, color = PL.Ink)
    dots?.let { (r, total) -> ResultDots(r, total) }
    Text(line, style = Type.body, color = PL.InkDim)
    reveal()
    if (again != null) PrimaryButton(againLabel, color = PL.Malachite, onClick = again)
    PLButton("Start learning", variant = ButtonVariant.Secondary, onClick = LocalStartLearning.current)
    ad?.invoke()
}
