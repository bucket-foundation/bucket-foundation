package foundation.bucket.core.ui.pl

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import foundation.bucket.core.model.Lang

enum class Ground { Paper, Lattice, Diagonal }

fun Modifier.dotPaper(): Modifier = background(PL.Paper).drawBehind {
    val step = 22.dp.toPx()
    val r = 1.4.dp.toPx()
    val c = PL.Ink.copy(alpha = 0.12f)
    var y = step / 2
    while (y < size.height) {
        var x = step / 2
        while (x < size.width) { drawCircle(c, r, Offset(x, y)); x += step }
        y += step
    }
}

@Composable
fun Modifier.starLattice(): Modifier {
    val piece = remember { ArtLibrary["girih"] }
    val measurer = rememberTextMeasurer()
    return background(PL.Tyrian).drawBehind {
        val tile = 120.dp.toPx()
        var y = 0f
        while (y < size.height) {
            var x = 0f
            while (x < size.width) {
                translate(x, y) { drawArt(piece, measurer, null, tile, tile) }
                x += tile
            }
            y += tile
        }
    }
}

@Composable
fun GroundBox(ground: Ground, modifier: Modifier = Modifier, content: @Composable BoxScope.() -> Unit) {
    when (ground) {
        Ground.Paper -> Box(modifier.dotPaper(), content = content)
        Ground.Lattice -> Box(modifier.starLattice(), content = content)
        Ground.Diagonal -> {
            val lattice = Modifier.starLattice()
            Box(modifier.dotPaper()) {
                Box(Modifier.matchParentSize().clipDiagonal().then(lattice))
                content()
            }
        }
    }
}

private fun Modifier.clipDiagonal(): Modifier = drawWithContent {
    val path = Path().apply { moveTo(size.width, size.height * 0.42f); lineTo(size.width, size.height); lineTo(0f, size.height); lineTo(0f, size.height * 0.78f); close() }
    clipPath(path) { this@drawWithContent.drawContent() }
}

@Composable
fun FlagBand(modifier: Modifier = Modifier) {
    val piece = remember { ArtLibrary["flag-band"] }
    val measurer = rememberTextMeasurer()
    Canvas(modifier.fillMaxWidth().height(10.dp)) {
        val tileW = size.height * piece.w / piece.h
        var x = 0f
        while (x < size.width) {
            translate(x, 0f) { drawArt(piece, measurer, null, tileW, size.height) }
            x += tileW
        }
    }
}

@Composable
fun StreakFlame(count: Int, modifier: Modifier = Modifier, onDark: Boolean = false) {
    Row(modifier, verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(PLSpace.s2)) {
        Art("streak-flame", Modifier.height(40.dp), description = "Streak")
        Column {
            Text("$count", style = PLType.title.copy(fontSize = 30.sp, lineHeight = 30.sp), color = if (onDark) PL.Paper else PL.Vermilion)
            Text(if (count == 1) "DAY" else "DAYS", style = PLType.label, color = if (onDark) PL.Paper.copy(alpha = 0.8f) else PL.InkDim)
        }
    }
}

data class Sticker(val art: String, val align: Alignment, val width: Dp, val rotate: Float, val dx: Dp = 0.dp, val dy: Dp = 0.dp)

@Composable
fun Stage(stickers: List<Sticker>, modifier: Modifier = Modifier, height: Dp = 200.dp, outline: Boolean = false, content: @Composable BoxScope.() -> Unit = {}) {
    BoxWithConstraints(modifier.fillMaxWidth().height(height)) {
        val scale = (maxWidth / 390.dp).coerceIn(0.7f, 1.4f)
        stickers.forEach { s ->
            Art(s.art, Modifier.align(s.align).offset(s.dx, s.dy).width(s.width * scale).rotate(s.rotate.coerceIn(-14f, 14f)), shadow = true, outline = outline)
        }
        Box(Modifier.align(Alignment.Center), content = content)
    }
}

@Composable
fun EmptyState(art: String, line: String, modifier: Modifier = Modifier, onDark: Boolean = false) {
    Column(modifier.fillMaxWidth().padding(vertical = PLSpace.s6), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(PLSpace.s3)) {
        Art(art, Modifier.width(110.dp).rotate(-6f), shadow = true)
        Text(line, style = PLType.body, color = if (onDark) PL.Paper else PL.InkDim, textAlign = TextAlign.Center)
    }
}

@Composable
fun WordTile(lang: String?, word: String, modifier: Modifier = Modifier, ipa: String? = null, gloss: String? = null, tilt: Float = -2f, onSpeak: (() -> Unit)? = null) {
    val shape = RoundedCornerShape(PLRadius.xl)
    Box(modifier.widthIn(max = 420.dp).fillMaxWidth().rotate(tilt).padding(bottom = PLLip.lg)) {
        Box(Modifier.matchParentSize().offset(y = PLLip.lg).clip(shape).background(PL.TyrianDeep))
        Column(Modifier.fillMaxWidth().clip(shape).background(PL.Card)) {
            if (lang != null) FlagSwatch(lang, Modifier.fillMaxWidth().height(14.dp)) else Box(Modifier.fillMaxWidth().height(14.dp).background(PL.Paper3))
            Column(Modifier.padding(PLSpace.s5), verticalArrangement = Arrangement.spacedBy(PLSpace.s2)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(lang?.let { Lang.name(it).uppercase() } ?: "WHICH LANGUAGE?", style = PLType.label, color = PL.InkDim, modifier = Modifier.weight(1f))
                    if (onSpeak != null) Box(Modifier.size(44.dp).clip(RoundedCornerShape(PLRadius.md)).background(PL.Lapis).clickable(role = Role.Button, onClickLabel = "Play audio", onClick = onSpeak), contentAlignment = Alignment.Center) {
                        Glyph("speaker", null, PL.Paper, Modifier.size(22.dp))
                    }
                }
                Text(word, style = PLType.word, color = PL.Ink)
                if (!ipa.isNullOrBlank()) Text(ipa, style = PLType.small, color = PL.InkDim)
                if (!gloss.isNullOrBlank()) Text(gloss, style = PLType.body, color = PL.Ink)
            }
        }
    }
}
