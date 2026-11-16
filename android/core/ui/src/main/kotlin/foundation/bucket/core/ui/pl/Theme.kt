package foundation.bucket.core.ui.pl

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import foundation.bucket.core.ui.LocalPalette
import foundation.bucket.core.ui.Palette
import foundation.bucket.core.ui.R

object PLFonts {
    private fun variable(res: Int) = FontFamily((400..700 step 100).map { w -> Font(res, FontWeight(w), variationSettings = FontVariation.Settings(FontVariation.weight(w))) })
    val display = variable(R.font.pl_fredoka)
    val body = variable(R.font.pl_nunito)
    val mono = FontFamily(Font(R.font.pl_space_mono, FontWeight.Normal), Font(R.font.pl_space_mono_bold, FontWeight.Bold))
    fun of(name: String) = when (name) { "display" -> display; "mono" -> mono; else -> body }
}

private fun style(spec: PLTypeSpec, tracked: Boolean = false) = TextStyle(
    fontFamily = PLFonts.of(spec.font), fontSize = spec.size.sp, fontWeight = FontWeight(spec.weight),
    lineHeight = (spec.size * spec.line).sp, letterSpacing = if (tracked) (spec.size * 0.08f).sp else 0.sp,
)

object PLType {
    val hero = style(PLTypeSpecs.hero)
    val title = style(PLTypeSpecs.title)
    val heading = style(PLTypeSpecs.heading)
    val body = style(PLTypeSpecs.body)
    val small = style(PLTypeSpecs.small)
    val label = style(PLTypeSpecs.label, tracked = true)
    val word = style(PLTypeSpecs.word)
}

val PLPalette = Palette(paper = PL.Paper, card = PL.Card, ink = PL.Ink, muted = PL.InkDim, green = PL.Malachite, gold = PL.Ochre, rule = PL.Hairline2)

@Composable
fun PLTheme(content: @Composable () -> Unit) {
    val scheme = lightColorScheme(
        primary = PL.Vermilion, onPrimary = PL.Paper, secondary = PL.Lapis, onSecondary = PL.Paper, tertiary = PL.Malachite,
        background = PL.Paper, onBackground = PL.Ink, surface = PL.Card, onSurface = PL.Ink, surfaceVariant = PL.Paper2, onSurfaceVariant = PL.InkDim,
        outline = PL.Hairline2, outlineVariant = PL.Hairline, surfaceContainer = PL.Card, surfaceContainerLow = PL.Paper, surfaceContainerHigh = PL.Card,
        surfaceContainerHighest = PL.Paper2, secondaryContainer = PL.LapisSoft, onSecondaryContainer = PL.LapisDeep, primaryContainer = PL.Vermilion, onPrimaryContainer = PL.Paper,
    )
    val typography = MaterialTheme.typography.let { t ->
        t.copy(
            displayLarge = PLType.hero, headlineLarge = PLType.title, headlineMedium = PLType.heading, titleLarge = PLType.heading,
            titleMedium = PLType.body.copy(fontWeight = FontWeight.Bold), bodyLarge = PLType.body, bodyMedium = PLType.small.copy(fontWeight = FontWeight.Medium),
            labelLarge = PLType.small, labelMedium = PLType.small, labelSmall = PLType.label,
        )
    }
    CompositionLocalProvider(LocalPalette provides PLPalette) { MaterialTheme(colorScheme = scheme, typography = typography, content = content) }
}
