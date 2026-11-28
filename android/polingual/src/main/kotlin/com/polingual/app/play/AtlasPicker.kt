package com.polingual.app.play

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import foundation.bucket.core.ui.pl.PL
import foundation.bucket.core.ui.pl.PLRadius

@Composable
fun AtlasPicker(pin: LatLon?, enabled: Boolean, onPin: (LatLon) -> Unit) {
    val context = LocalContext.current
    val land = remember { PathParser().parsePathString(context.assets.open("play/land.txt").bufferedReader().use { it.readText().trim() }).toPath() }
    Canvas(
        Modifier.testTag("atlas-map").fillMaxWidth().aspectRatio(2f).clip(RoundedCornerShape(PLRadius.sm)).pointerInput(enabled) {
            detectTapGestures { o -> if (enabled) onPin(Atlas.unproject(o.x / size.width * Atlas.MAP_W, o.y / size.height * Atlas.MAP_H)) }
        },
    ) {
        drawRect(PL.LapisSoft)
        val k = size.width / Atlas.MAP_W.toFloat()
        scale(k, k, pivot = Offset.Zero) { drawPath(land, PL.Paper3) }
        pin?.let { p -> Atlas.project(p.lon, p.lat).let { drawCircle(PL.Vermilion, 6.dp.toPx(), Offset(it.first.toFloat() * k, it.second.toFloat() * k)) } }
    }
}
