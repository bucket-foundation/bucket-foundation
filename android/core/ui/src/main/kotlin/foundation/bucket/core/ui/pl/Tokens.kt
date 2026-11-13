package foundation.bucket.core.ui.pl

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

object PL {
    val Paper = Color(0xFFF6EEDC)
    val Paper2 = Color(0xFFEFE3C8)
    val Paper3 = Color(0xFFE3D6B8)
    val Card = Color(0xFFFFF8EA)
    val White = Color(0xFFFFFFFF)
    val Ink = Color(0xFF231F20)
    val Ink2 = Color(0xFF3A0F2F)
    val InkDim = Color(0xFF5D5650)
    val InkFaint = Color(0xFF8A8076)
    val Tyrian = Color(0xFF5B1A4A)
    val TyrianDeep = Color(0xFF3A0F2F)
    val Vermilion = Color(0xFFD9381E)
    val VermilionDeep = Color(0xFF8E2312)
    val Lapis = Color(0xFF26428B)
    val LapisDeep = Color(0xFF172A5C)
    val LapisSoft = Color(0xFFC9D3EA)
    val Ochre = Color(0xFFE9A23B)
    val OchreDeep = Color(0xFFA9701F)
    val Malachite = Color(0xFF1E7A5A)
    val MalachiteDeep = Color(0xFF124B37)
    val Maya = Color(0xFF6FB7C2)
    val Hairline = Color(0x1F231F20)
    val Hairline2 = Color(0x38231F20)
    val PaperDim = Color(0xFFC9BFAE)
    val Error = Color(0xFF9B2414)
    val Dot = Color(0x12231F20)
    val LipSoft = Color(0x14231F20)
    val CreamVeil = Color(0xEBF6EEDC)
    val Gloss = Color(0x73FFFFFF)
    val Shadow = Color(0x59000000)
    val colors: Map<String, Color> = mapOf(
        "paper" to Paper,
        "paper-2" to Paper2,
        "paper-3" to Paper3,
        "card" to Card,
        "white" to White,
        "ink" to Ink,
        "ink-2" to Ink2,
        "ink-dim" to InkDim,
        "ink-faint" to InkFaint,
        "tyrian" to Tyrian,
        "tyrian-deep" to TyrianDeep,
        "vermilion" to Vermilion,
        "vermilion-deep" to VermilionDeep,
        "lapis" to Lapis,
        "lapis-deep" to LapisDeep,
        "lapis-soft" to LapisSoft,
        "ochre" to Ochre,
        "ochre-deep" to OchreDeep,
        "malachite" to Malachite,
        "malachite-deep" to MalachiteDeep,
        "maya" to Maya,
        "hairline" to Hairline,
        "hairline-2" to Hairline2,
        "paper-dim" to PaperDim,
        "error" to Error,
        "dot" to Dot,
        "lip-soft" to LipSoft,
        "cream-veil" to CreamVeil,
        "gloss" to Gloss,
        "shadow" to Shadow,
    )
}

object PLRadius {
    val sm = 10.dp
    val md = 14.dp
    val lg = 20.dp
    val xl = 24.dp
    val pill = 999.dp
    val values: Map<String, Int> = mapOf("sm" to 10, "md" to 14, "lg" to 20, "xl" to 24, "pill" to 999)
}

object PLSpace {
    val s1 = 4.dp
    val s2 = 8.dp
    val s3 = 12.dp
    val s4 = 16.dp
    val s5 = 20.dp
    val s6 = 28.dp
    val s7 = 40.dp
    val s8 = 64.dp
    val values: Map<String, Int> = mapOf("1" to 4, "2" to 8, "3" to 12, "4" to 16, "5" to 20, "6" to 28, "7" to 40, "8" to 64)
}

object PLLip {
    val sm = 2.dp
    val md = 4.dp
    val lg = 6.dp
    val values: Map<String, Int> = mapOf("sm" to 2, "md" to 4, "lg" to 6)
}

object PLMotion {
    const val press = 100
    const val pop = 220
    const val settle = 420
    val ease = floatArrayOf(0.2f, 0.9f, 0.3f, 1.2f)
}

data class PLTypeSpec(val font: String, val size: Int, val weight: Int, val line: Float)

object PLTypeSpecs {
    val hero = PLTypeSpec("display", 52, 700, 1.05f)
    val title = PLTypeSpec("display", 36, 700, 1.1f)
    val heading = PLTypeSpec("display", 24, 600, 1.15f)
    val body = PLTypeSpec("body", 17, 500, 1.5f)
    val small = PLTypeSpec("body", 14, 600, 1.4f)
    val label = PLTypeSpec("mono", 11, 700, 1.3f)
    val word = PLTypeSpec("display", 44, 600, 1f)
    val all: Map<String, PLTypeSpec> = mapOf("hero" to hero, "title" to title, "heading" to heading, "body" to body, "small" to small, "label" to label, "word" to word)
}
