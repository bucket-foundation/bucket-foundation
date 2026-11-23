package com.polingual.brand

import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.FiniteAnimationSpec
import androidx.compose.animation.core.tween
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import foundation.bucket.core.ui.LocalPalette
import foundation.bucket.core.ui.Palette

object D8 {
    val parchment = Color(0xFFF6EEDC)
    val parchment2 = Color(0xFFEBDDBE)
    val cream = Color(0xFFFFF8EA)
    val tyrian = Color(0xFF5B1A4A)
    val tyrianDeep = Color(0xFF3A0F2F)
    val ink = Color(0xFF231F20)
    val ink2 = Color(0xFF5D5650)
    val vermilion = Color(0xFFD9381E)
    val vermilionLip = Color(0xFF8E2312)
    val malachite = Color(0xFF1E7A5A)
    val malachiteLip = Color(0xFF124B37)
    val lapis = Color(0xFF26428B)
    val lapisLip = Color(0xFF172A5C)
    val ochre = Color(0xFFE9A23B)
    val ochreLip = Color(0xFFA9701F)
    val maya = Color(0xFF6FB7C2)
    val mayaLip = Color(0xFF3F8691)
    val hair = Color(0x24231F20)
    val keyline = Color(0xFFE3D6B8)
    val white = Color(0xFFFFFFFF)

    fun lip(c: Color): Color = when (c) {
        vermilion -> vermilionLip
        malachite -> malachiteLip
        lapis -> lapisLip
        ochre -> ochreLip
        maya -> mayaLip
        tyrian -> tyrianDeep
        tyrianDeep -> Color(0xFF1E0718)
        ink -> Color(0xFF000000)
        else -> Color(0x2E231F20)
    }

    fun on(c: Color): Color = when (c) {
        ochre -> tyrianDeep
        parchment, parchment2, cream, white, keyline, maya -> ink
        else -> parchment
    }
}

object Fonts {
    val fredoka = FontFamily(
        Font(R.font.fredoka_500, FontWeight.Medium),
        Font(R.font.fredoka_600, FontWeight.SemiBold),
        Font(R.font.fredoka_700, FontWeight.Bold),
    )
    val nunito = FontFamily(
        Font(R.font.nunito_400, FontWeight.Normal),
        Font(R.font.nunito_700, FontWeight.Bold),
        Font(R.font.nunito_800, FontWeight.ExtraBold),
        Font(R.font.nunito_900, FontWeight.Black),
    )
    val mono = FontFamily(
        Font(R.font.spacemono_400, FontWeight.Normal),
        Font(R.font.spacemono_700, FontWeight.Bold),
    )
}

object Type {
    val display = TextStyle(fontFamily = Fonts.fredoka, fontWeight = FontWeight.Bold, fontSize = 34.sp, lineHeight = 36.sp)
    val title = TextStyle(fontFamily = Fonts.fredoka, fontWeight = FontWeight.Bold, fontSize = 24.sp, lineHeight = 28.sp)
    val word = TextStyle(fontFamily = Fonts.fredoka, fontWeight = FontWeight.Bold, fontSize = 32.sp, lineHeight = 36.sp)
    val caps = TextStyle(fontFamily = Fonts.mono, fontWeight = FontWeight.Bold, fontSize = 12.sp, letterSpacing = 1.2.sp)
    val body = TextStyle(fontFamily = Fonts.nunito, fontWeight = FontWeight.Normal, fontSize = 16.sp, lineHeight = 22.sp)
    val strong = TextStyle(fontFamily = Fonts.nunito, fontWeight = FontWeight.ExtraBold, fontSize = 15.sp, lineHeight = 20.sp)
    val mono = TextStyle(fontFamily = Fonts.mono, fontWeight = FontWeight.Bold, fontSize = 22.sp)
    val button = TextStyle(fontFamily = Fonts.fredoka, fontWeight = FontWeight.SemiBold, fontSize = 19.sp)
}

object Motion {
    val easeOut = CubicBezierEasing(0f, 0f, 0.58f, 1f)
    val easeInOut = CubicBezierEasing(0.42f, 0f, 0.58f, 1f)
    const val POP_MS = 160
    const val SLIDE_MS = 300
    const val COUNT_MS = 600
    const val PRESS_MS = 80
    fun <T> pop(): FiniteAnimationSpec<T> = tween(POP_MS, easing = easeOut)
    fun <T> slide(): FiniteAnimationSpec<T> = tween(SLIDE_MS, easing = easeOut)
    fun <T> count(): FiniteAnimationSpec<T> = tween(COUNT_MS, easing = easeOut)
    fun <T> press(): FiniteAnimationSpec<T> = tween(PRESS_MS)
}

val BrandPalette = Palette(
    paper = D8.parchment,
    card = D8.cream,
    ink = D8.ink,
    muted = D8.ink2,
    green = D8.malachite,
    gold = D8.ochre,
    rule = D8.hair,
)

private val brandTypography = Typography().let { t ->
    Typography(
        displayLarge = t.displayLarge.copy(fontFamily = Fonts.fredoka),
        displayMedium = t.displayMedium.copy(fontFamily = Fonts.fredoka),
        displaySmall = t.displaySmall.copy(fontFamily = Fonts.fredoka),
        headlineLarge = t.headlineLarge.copy(fontFamily = Fonts.fredoka),
        headlineMedium = t.headlineMedium.copy(fontFamily = Fonts.fredoka),
        headlineSmall = t.headlineSmall.copy(fontFamily = Fonts.fredoka),
        titleLarge = t.titleLarge.copy(fontFamily = Fonts.fredoka),
        titleMedium = t.titleMedium.copy(fontFamily = Fonts.nunito, fontWeight = FontWeight.ExtraBold),
        titleSmall = t.titleSmall.copy(fontFamily = Fonts.nunito, fontWeight = FontWeight.ExtraBold),
        bodyLarge = t.bodyLarge.copy(fontFamily = Fonts.nunito),
        bodyMedium = t.bodyMedium.copy(fontFamily = Fonts.nunito, fontSize = 16.sp),
        bodySmall = t.bodySmall.copy(fontFamily = Fonts.nunito),
        labelLarge = t.labelLarge.copy(fontFamily = Fonts.nunito, fontWeight = FontWeight.ExtraBold),
        labelMedium = t.labelMedium.copy(fontFamily = Fonts.mono, fontWeight = FontWeight.Bold),
        labelSmall = t.labelSmall.copy(fontFamily = Fonts.mono, fontWeight = FontWeight.Bold),
    )
}

@Composable
fun PolingualTheme(content: @Composable () -> Unit) {
    val scheme = lightColorScheme(
        primary = D8.vermilion, onPrimary = D8.parchment, secondary = D8.malachite, onSecondary = D8.parchment, tertiary = D8.lapis,
        background = D8.parchment, onBackground = D8.ink, surface = D8.cream, onSurface = D8.ink, surfaceVariant = D8.cream, onSurfaceVariant = D8.ink2,
        outline = D8.hair, surfaceContainer = D8.cream, surfaceContainerLow = D8.parchment, surfaceContainerHigh = D8.cream,
        secondaryContainer = D8.lapis, onSecondaryContainer = D8.parchment, primaryContainer = D8.vermilion, onPrimaryContainer = D8.parchment,
    )
    CompositionLocalProvider(LocalPalette provides BrandPalette) {
        MaterialTheme(colorScheme = scheme, typography = brandTypography, content = content)
    }
}
