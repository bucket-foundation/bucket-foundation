package com.polingual.app.play

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import foundation.bucket.core.ui.pl.Art
import foundation.bucket.core.ui.pl.PL
import foundation.bucket.core.ui.pl.starLattice

data class Prop(val art: String, val align: Alignment, val width: Dp, val tilt: Float, val dx: Dp = 0.dp, val dy: Dp = 0.dp)

object Scenes {
    val flagTiles = listOf(Prop("kente", Alignment.TopStart, 64.dp, -6f, 6.dp, 4.dp), Prop("seal", Alignment.TopEnd, 34.dp, 10f, (-8).dp, 4.dp), Prop("bunting", Alignment.TopCenter, 70.dp, 3f, 30.dp, 2.dp), Prop("pebble", Alignment.BottomEnd, 26.dp, -12f, (-6).dp, (-6).dp), Prop("star", Alignment.BottomStart, 30.dp, 8f, 6.dp, (-6).dp))
    val babel = listOf(Prop("blocks", Alignment.TopStart, 40.dp, -8f, 6.dp, 4.dp), Prop("seal", Alignment.TopEnd, 34.dp, 9f, (-6).dp, 4.dp), Prop("torn-label", Alignment.BottomStart, 52.dp, -5f, 8.dp, (-4).dp), Prop("script-he", Alignment.BottomCenter, 44.dp, 4f, 0.dp, (-4).dp), Prop("script-ru", Alignment.BottomEnd, 48.dp, -6f, (-6).dp, (-4).dp))
    val shift = listOf(Prop("torn-label", Alignment.TopStart, 52.dp, -7f, 6.dp, 4.dp), Prop("seal", Alignment.TopCenter, 34.dp, 6f, 0.dp, 2.dp), Prop("script-ru", Alignment.TopEnd, 46.dp, 10f, (-6).dp, 6.dp), Prop("script-ko", Alignment.BottomStart, 30.dp, -10f, 8.dp, (-6).dp), Prop("script-he", Alignment.BottomCenter, 40.dp, 3f, 0.dp, (-4).dp), Prop("ticket", Alignment.BottomEnd, 56.dp, -8f, (-6).dp, (-6).dp))
    val snake = listOf(Prop("brush", Alignment.TopStart, 58.dp, -6f, 6.dp, 4.dp), Prop("script-ko", Alignment.TopCenter, 28.dp, 6f, 0.dp, 4.dp), Prop("kente", Alignment.TopEnd, 60.dp, 5f, (-6).dp, 4.dp), Prop("pebble", Alignment.BottomStart, 30.dp, -12f, 8.dp, (-6).dp), Prop("seal", Alignment.BottomEnd, 32.dp, 8f, (-8).dp, (-6).dp))
    val atlas = listOf(Prop("ticket", Alignment.TopStart, 58.dp, -8f, 6.dp, 4.dp), Prop("script-ru", Alignment.TopCenter, 44.dp, 4f, 0.dp, 2.dp), Prop("azulejo", Alignment.TopEnd, 38.dp, 10f, (-6).dp, 4.dp), Prop("seal", Alignment.BottomStart, 34.dp, -6f, 8.dp, (-6).dp), Prop("pebble", Alignment.BottomCenter, 26.dp, 12f, 30.dp, (-4).dp), Prop("star", Alignment.BottomEnd, 30.dp, -8f, (-8).dp, (-6).dp))
}

@Composable
fun SceneFrame(props: List<Prop>, modifier: Modifier = Modifier, inset: Dp = 34.dp, content: @Composable BoxScope.() -> Unit) {
    Box(modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).starLattice()) {
        Box(Modifier.matchParentSize().drawBehind {
            drawPath(Path().apply { moveTo(0f, 0f); lineTo(size.width * 0.38f, 0f); lineTo(size.width * 0.22f, size.height); lineTo(0f, size.height); close() }, PL.TyrianDeep.copy(alpha = 0.55f))
        })
        props.forEach { p -> Art(p.art, Modifier.align(p.align).offset(p.dx, p.dy).width(p.width).rotate(p.tilt), shadow = true) }
        Box(Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = inset), content = content)
    }
}
