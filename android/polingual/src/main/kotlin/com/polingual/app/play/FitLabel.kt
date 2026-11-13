package com.polingual.app.play

import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.sp

object FitRules {
    const val MAX_SP = 14f
    const val MIN_SP = 10f

    fun pick(widthPx: Int, measure: (String, Float) -> Int, text: String, max: Float = MAX_SP, min: Float = MIN_SP): Pair<Float, Boolean> {
        val words = text.split(' ').filter { it.isNotEmpty() }.ifEmpty { listOf(text) }
        var s = max
        while (s > min && words.any { measure(it, s) > widthPx }) s -= 0.5f
        return s to words.any { measure(it, s) > widthPx }
    }

    fun clampCenter(x: Float, width: Float, canvas: Float, margin: Float = 4f): Float =
        if (width + 2 * margin >= canvas) canvas / 2f else x.coerceIn(width / 2f + margin, canvas - width / 2f - margin)
}

@Composable
fun FitLabel(text: String, style: TextStyle, color: Color, modifier: Modifier = Modifier, max: TextUnit = FitRules.MAX_SP.sp) {
    val measurer = rememberTextMeasurer()
    BoxWithConstraints(modifier) {
        val w = constraints.maxWidth
        val (size, ellipsize) = remember(text, w) {
            FitRules.pick(w, { word, sp -> measurer.measure(word, style.copy(fontSize = sp.sp), softWrap = false, maxLines = 1, constraints = Constraints()).size.width }, text, max.value)
        }
        Text(
            text, color = color, textAlign = TextAlign.Center, softWrap = !ellipsize,
            maxLines = if (ellipsize) 1 else Int.MAX_VALUE, overflow = TextOverflow.Ellipsis,
            style = style.copy(fontSize = size.sp, lineHeight = (size * 1.1f).sp),
        )
    }
}
