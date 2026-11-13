package com.polingual.app.play

import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.sp

object FitRules {
    const val MAX_SP = 14f
    const val MIN_SP = 10f

    fun pick(widthPx: Int, measure: (String, Float) -> Int, text: String, max: Float = MAX_SP, min: Float = MIN_SP): Pair<Float, Float> {
        val words = text.split(' ').filter { it.isNotEmpty() }.ifEmpty { listOf(text) }
        var s = max
        while (s > min && words.any { measure(it, s) > widthPx }) s -= 0.5f
        val widest = words.maxOf { measure(it, s) }
        val squeeze = if (widest > widthPx) widthPx.toFloat() / widest else 1f
        return s to squeeze
    }
}

@Composable
fun FitLabel(text: String, style: TextStyle, color: Color, modifier: Modifier = Modifier, max: TextUnit = FitRules.MAX_SP.sp) {
    val measurer = rememberTextMeasurer()
    BoxWithConstraints(modifier) {
        val w = constraints.maxWidth
        val (size, squeeze) = remember(text, w) {
            FitRules.pick(w, { word, sp -> measurer.measure(word, style.copy(fontSize = sp.sp), softWrap = false, maxLines = 1, constraints = Constraints()).size.width }, text, max.value)
        }
        Text(
            text, color = color, textAlign = TextAlign.Center, softWrap = true,
            style = style.copy(fontSize = size.sp, lineHeight = (size * 1.1f).sp),
            modifier = Modifier.graphicsLayer { scaleX = squeeze },
        )
    }
}
