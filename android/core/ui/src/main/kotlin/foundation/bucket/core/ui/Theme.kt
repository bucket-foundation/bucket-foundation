package foundation.bucket.core.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

object D8 {
    val parchment = Color(0xFFF6EEDC)
    val ink = Color(0xFF231F20)
    val vermilion = Color(0xFFD9381E)
    val vermilionLip = Color(0xFF8E2312)
    val malachite = Color(0xFF1E7A5A)
    val malachiteLip = Color(0xFF135440)
    val lapis = Color(0xFF1F4E9A)
    val lapisLip = Color(0xFF12326A)
    val keyline = Color(0xFFE3D6B8)
}

@Immutable
data class Palette(
    val paper: Color,
    val card: Color,
    val ink: Color,
    val muted: Color,
    val green: Color,
    val gold: Color,
    val rule: Color,
)

val LightPalette = Palette(Color(0xFFEFE8D4), Color(0xFFF7F2E4), Color(0xFF23201A), Color(0xFF6B6455), Color(0xFF3B5E2B), Color(0xFFB08A2E), Color(0xFFD8CFB6))
val DarkPalette = Palette(Color(0xFF1F1C16), Color(0xFF2A2620), Color(0xFFECE5D3), Color(0xFFA79F8C), Color(0xFF8DB87A), Color(0xFFD9B45A), Color(0xFF3A352C))

val LocalPalette = staticCompositionLocalOf { LightPalette }

object Type {
    val display = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.ExtraBold, fontSize = 34.sp, lineHeight = 38.sp)
    val title = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.ExtraBold, fontSize = 24.sp, lineHeight = 28.sp)
    val word = TextStyle(fontFamily = FontFamily.Serif, fontWeight = FontWeight.Bold, fontSize = 30.sp, lineHeight = 36.sp)
    val caps = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Black, fontSize = 11.sp, letterSpacing = 1.4.sp)
}

@Composable
fun PolingualTheme(dark: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    val p = if (dark) DarkPalette else LightPalette
    val scheme = if (dark) darkColorScheme(
        primary = D8.vermilion, onPrimary = D8.parchment, secondary = D8.malachite, tertiary = D8.lapis,
        background = p.paper, surface = p.card, onBackground = p.ink, onSurface = p.ink, surfaceVariant = p.card, onSurfaceVariant = p.muted, outline = p.rule,
        surfaceContainer = p.card, surfaceContainerLow = p.paper, surfaceContainerHigh = p.card,
        secondaryContainer = if (dark) Color(0xFF4A3A22) else D8.keyline, onSecondaryContainer = p.ink, primaryContainer = D8.vermilion, onPrimaryContainer = D8.parchment,
    ) else lightColorScheme(
        primary = D8.vermilion, onPrimary = D8.parchment, secondary = D8.malachite, tertiary = D8.lapis,
        background = p.paper, surface = p.card, onBackground = p.ink, onSurface = p.ink, surfaceVariant = p.card, onSurfaceVariant = p.muted, outline = p.rule,
        surfaceContainer = p.card, surfaceContainerLow = p.paper, surfaceContainerHigh = p.card,
        secondaryContainer = if (dark) Color(0xFF4A3A22) else D8.keyline, onSecondaryContainer = p.ink, primaryContainer = D8.vermilion, onPrimaryContainer = D8.parchment,
    )
    androidx.compose.runtime.CompositionLocalProvider(LocalPalette provides p) {
        MaterialTheme(colorScheme = scheme, content = content)
    }
}
