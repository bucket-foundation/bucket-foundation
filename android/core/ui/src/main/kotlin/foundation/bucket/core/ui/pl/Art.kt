package foundation.bucket.core.ui.pl

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Matrix
import androidx.compose.ui.graphics.Paint
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.PathFillType
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextMeasurer
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.sp

sealed interface ArtPaint {
    class Solid(val argb: Long) : ArtPaint
    class Tile(val w: Float, val h: Float, val nodes: List<ArtNode>) : ArtPaint
}

sealed interface ArtNode {
    class Shape(val d: String, val fill: ArtPaint?, val stroke: Long?, val strokeWidth: Float, val dash: FloatArray?, val roundCap: Boolean, val roundJoin: Boolean, val fillAlpha: Float, val evenOdd: Boolean) : ArtNode {
        val path: Path by lazy { PathParser().parsePathString(d).toPath().also { if (evenOdd) it.fillType = PathFillType.EvenOdd } }
    }
    class Group(val nodes: List<ArtNode>, val clip: String?) : ArtNode {
        val clipPath: Path? by lazy { clip?.let { PathParser().parsePathString(it).toPath() } }
    }
    class Label(val text: String, val x: Float, val y: Float, val size: Float, val weight: Int, val argb: Long, val family: String, val anchor: Int, val central: Boolean, val tracking: Float, val alpha: Float) : ArtNode
    class Transform(val m: FloatArray, val alpha: Float, val node: ArtNode) : ArtNode {
        val matrix: Matrix by lazy { Matrix().apply { values[Matrix.ScaleX] = m[0]; values[Matrix.SkewY] = m[1]; values[Matrix.SkewX] = m[2]; values[Matrix.ScaleY] = m[3]; values[Matrix.TranslateX] = m[4]; values[Matrix.TranslateY] = m[5] } }
    }
}

class ArtPiece(val name: String, val label: String, val x: Float, val y: Float, val w: Float, val h: Float, val dark: Boolean, val nodes: List<ArtNode>)

private fun color(argb: Long, alpha: Float, tint: Color?) = (tint ?: Color(argb)).let { it.copy(alpha = it.alpha * alpha) }

private fun DrawScope.drawNodes(nodes: List<ArtNode>, measurer: TextMeasurer, tint: Color?, alpha: Float) {
    nodes.forEach { drawNode(it, measurer, tint, alpha) }
}

private fun DrawScope.drawNode(n: ArtNode, measurer: TextMeasurer, tint: Color?, alpha: Float) {
    when (n) {
        is ArtNode.Transform -> withTransform({ transform(n.matrix) }) { drawNode(n.node, measurer, tint, alpha * n.alpha) }
        is ArtNode.Group -> {
            val c = n.clipPath
            if (c != null) clipPath(c) { drawNodes(n.nodes, measurer, tint, alpha) } else drawNodes(n.nodes, measurer, tint, alpha)
        }
        is ArtNode.Shape -> {
            when (val f = n.fill) {
                is ArtPaint.Solid -> drawPath(n.path, color(f.argb, n.fillAlpha * alpha, tint))
                is ArtPaint.Tile -> clipPath(n.path) {
                    val b = n.path.getBounds()
                    var ty = kotlin.math.floor(b.top / f.h) * f.h
                    while (ty < b.bottom) {
                        var tx = kotlin.math.floor(b.left / f.w) * f.w
                        while (tx < b.right) {
                            translate(tx, ty) { drawNodes(f.nodes, measurer, tint, alpha * n.fillAlpha) }
                            tx += f.w
                        }
                        ty += f.h
                    }
                }
                null -> Unit
            }
            if (n.stroke != null) drawPath(
                n.path, color(n.stroke, alpha, tint),
                style = Stroke(
                    width = n.strokeWidth,
                    cap = if (n.roundCap) StrokeCap.Round else StrokeCap.Butt,
                    join = if (n.roundJoin) StrokeJoin.Round else StrokeJoin.Miter,
                    pathEffect = n.dash?.let { d -> PathEffect.dashPathEffect(FloatArray(d.size) { i -> if (d[i] == 0f) 0.01f else d[i] }) },
                ),
            )
        }
        is ArtNode.Label -> {
            val family = when {
                n.family.contains("Mono") -> PLFonts.mono
                n.family == "Fredoka" -> PLFonts.display
                else -> null
            }
            val style = TextStyle(color = color(n.argb, n.alpha * alpha, tint), fontSize = (n.size / density / fontScale).sp, fontWeight = FontWeight(n.weight), fontFamily = family, letterSpacing = (n.tracking / density / fontScale).sp)
            val r = measurer.measure(n.text, style)
            val dx = when (n.anchor) { 1 -> r.size.width / 2f; 2 -> r.size.width.toFloat(); else -> 0f }
            val dy = if (n.central) r.size.height / 2f else r.firstBaseline
            drawText(r, topLeft = Offset(n.x - dx, n.y - dy))
        }
    }
}

fun DrawScope.drawArt(piece: ArtPiece, measurer: TextMeasurer, tint: Color? = null, w: Float = size.width, h: Float = size.height) {
    val s = minOf(w / piece.w, h / piece.h)
    translate((w - piece.w * s) / 2f, (h - piece.h * s) / 2f) {
        scale(s, s, pivot = Offset.Zero) { translate(-piece.x, -piece.y) { drawNodes(piece.nodes, measurer, tint, 1f) } }
    }
}

@Composable
fun Art(name: String, modifier: Modifier = Modifier, shadow: Boolean = false, description: String? = null) {
    val piece = remember(name) { ArtLibrary[name] }
    val measurer = rememberTextMeasurer()
    val m = modifier.aspectRatio(piece.w / piece.h)
    Canvas(if (description != null) m.semantics { contentDescription = description } else m) {
        if (shadow) {
            val u = size.width / 96f
            drawIntoCanvas { it.saveLayer(androidx.compose.ui.geometry.Rect(Offset.Zero, size).inflate(16f * u), Paint().apply { alpha = 0.35f }) }
            translate(6f * u, 8f * u) { drawArt(piece, measurer, Color.Black) }
            drawIntoCanvas { it.restore() }
        }
        drawArt(piece, measurer)
    }
}
