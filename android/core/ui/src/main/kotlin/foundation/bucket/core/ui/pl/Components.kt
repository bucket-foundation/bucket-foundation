package foundation.bucket.core.ui.pl

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import foundation.bucket.core.model.Lang

enum class ButtonVariant(val bg: Color, val fg: Color, val lip: Color, val line: Color = Color.Transparent) {
    Primary(PL.Vermilion, PL.Paper, PL.VermilionDeep),
    Secondary(PL.White, PL.Ink, PL.Hairline2, PL.Hairline2),
    Accent(PL.Lapis, PL.Paper, PL.LapisDeep),
    Success(PL.Malachite, PL.Paper, PL.MalachiteDeep),
    Gold(PL.Ochre, PL.TyrianDeep, PL.OchreDeep),
    Ghost(Color.Transparent, PL.Tyrian, Color.Transparent, PL.Tyrian),
    Quiet(Color.Transparent, PL.Lapis, Color.Transparent),
}

enum class ButtonSize(val minHeight: Dp, val padX: Dp, val font: Int, val radius: Dp) {
    Sm(36.dp, 14.dp, 15, PLRadius.sm), Md(48.dp, 20.dp, 17, PLRadius.md), Lg(56.dp, 28.dp, 19, PLRadius.md), Xl(68.dp, 36.dp, 24, 18.dp)
}

@Composable
fun PLButton(
    text: String,
    modifier: Modifier = Modifier,
    variant: ButtonVariant = ButtonVariant.Primary,
    size: ButtonSize = ButtonSize.Lg,
    block: Boolean = true,
    onDark: Boolean = false,
    enabled: Boolean = true,
    leading: (@Composable RowScope.() -> Unit)? = null,
    onClick: () -> Unit,
) {
    val source = remember { MutableInteractionSource() }
    val pressed by source.collectIsPressedAsState()
    val flat = variant == ButtonVariant.Ghost || variant == ButtonVariant.Quiet
    val lipDp = if (flat) 0.dp else PLLip.md
    val press by animateDpAsState(if (pressed && enabled && !flat) 3.dp else 0.dp, tween(PLMotion.press), label = "press")
    val bg = if (onDark && variant == ButtonVariant.Secondary) PL.Paper.copy(alpha = 0.1f) else variant.bg
    val fg = if (onDark && variant in setOf(ButtonVariant.Secondary, ButtonVariant.Ghost, ButtonVariant.Quiet)) PL.Paper else variant.fg
    val line = when {
        onDark && variant == ButtonVariant.Secondary -> PL.Paper.copy(alpha = 0.35f)
        onDark && variant == ButtonVariant.Ghost -> PL.Paper.copy(alpha = 0.6f)
        else -> variant.line
    }
    val shape = RoundedCornerShape(size.radius)
    val base = if (block) modifier.fillMaxWidth() else modifier
    Box(
        base.alpha(if (enabled) 1f else 0.55f).heightIn(min = size.minHeight + lipDp)
            .clickable(source, null, enabled = enabled, role = Role.Button, onClick = onClick),
    ) {
        if (!flat) Box(Modifier.matchParentSize().padding(top = lipDp).clip(shape).background(variant.lip))
        Row(
            Modifier.then(if (block) Modifier.fillMaxWidth() else Modifier).heightIn(min = size.minHeight).offset(y = press).clip(shape).background(bg)
                .then(if (line != Color.Transparent) Modifier.border(2.dp, line, shape) else Modifier).padding(horizontal = if (variant == ButtonVariant.Quiet) 6.dp else size.padX),
            horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally), verticalAlignment = Alignment.CenterVertically,
        ) {
            leading?.invoke(this)
            Text(
                text, color = fg, maxLines = 1, overflow = TextOverflow.Ellipsis,
                style = (if (variant == ButtonVariant.Quiet) PLType.small.copy(fontFamily = PLFonts.body, textDecoration = TextDecoration.Underline) else PLType.heading).copy(fontSize = size.font.sp, lineHeight = size.font.sp),
            )
        }
    }
}

private val lipFor = mapOf(PL.Vermilion to ButtonVariant.Primary, PL.Lapis to ButtonVariant.Accent, PL.Malachite to ButtonVariant.Success, PL.Ochre to ButtonVariant.Gold, PL.White to ButtonVariant.Secondary)

@Composable
fun PrimaryButton(text: String, modifier: Modifier = Modifier, enabled: Boolean = true, color: Color = PL.Vermilion, onClick: () -> Unit) =
    PLButton(text, modifier, variant = lipFor[color] ?: ButtonVariant.Primary, enabled = enabled, onClick = onClick)

@Composable
fun PlainLink(text: String, modifier: Modifier = Modifier, onDark: Boolean = false, onClick: () -> Unit) =
    PLButton(text, modifier, variant = ButtonVariant.Quiet, size = ButtonSize.Md, block = false, onDark = onDark, onClick = onClick)

enum class CardTone { Paper, Ink, Tyrian, Plain }

@Composable
fun PLCard(modifier: Modifier = Modifier, tone: CardTone = CardTone.Paper, pad: Dp = PLSpace.s5, onClick: (() -> Unit)? = null, content: @Composable ColumnScope.() -> Unit) {
    val (bg, line, lip) = when (tone) {
        CardTone.Paper -> Triple(PL.Card, PL.Hairline, PL.Ink.copy(alpha = 0.08f))
        CardTone.Plain -> Triple(PL.White, PL.Hairline, PL.Ink.copy(alpha = 0.08f))
        CardTone.Ink -> Triple(PL.Ink, PL.Ink, Color.Black.copy(alpha = 0.35f))
        CardTone.Tyrian -> Triple(PL.Tyrian, PL.TyrianDeep, PL.TyrianDeep)
    }
    val lipDp = if (tone == CardTone.Paper || tone == CardTone.Plain) PLLip.md else PLLip.lg
    val shape = RoundedCornerShape(PLRadius.lg)
    Box(modifier.fillMaxWidth().padding(bottom = lipDp)) {
        Box(Modifier.matchParentSize().offset(y = lipDp).clip(shape).background(lip))
        val m = Modifier.fillMaxWidth().clip(shape).background(bg).border(2.dp, line, shape)
        Column(
            (if (onClick != null) m.clickable(role = Role.Button, onClick = onClick) else m).padding(pad),
            verticalArrangement = Arrangement.spacedBy(PLSpace.s2), content = content,
        )
    }
}

@Composable
fun Card(modifier: Modifier = Modifier, color: Color = PL.Card, onClick: (() -> Unit)? = null, content: @Composable ColumnScope.() -> Unit) {
    val tone = when (color) { PL.Tyrian -> CardTone.Tyrian; PL.Ink -> CardTone.Ink; PL.White -> CardTone.Plain; else -> CardTone.Paper }
    if (tone == CardTone.Paper && color != PL.Card) {
        val shape = RoundedCornerShape(PLRadius.lg)
        Box(modifier.fillMaxWidth().padding(bottom = PLLip.md)) {
            Box(Modifier.matchParentSize().offset(y = PLLip.md).clip(shape).background(PL.Ink.copy(alpha = 0.25f)))
            val m = Modifier.fillMaxWidth().clip(shape).background(color)
            Column((if (onClick != null) m.clickable(role = Role.Button, onClick = onClick) else m).padding(PLSpace.s5), verticalArrangement = Arrangement.spacedBy(PLSpace.s2), content = content)
        }
    } else PLCard(modifier, tone, onClick = onClick, content = content)
}

@Composable
fun PLPill(text: String, active: Boolean = false, small: Boolean = false, onClick: (() -> Unit)? = null) {
    val shape = RoundedCornerShape(PLRadius.pill)
    val m = Modifier.heightIn(min = if (small) 28.dp else 36.dp).clip(shape).background(if (active) PL.Lapis else PL.White)
        .border(2.dp, if (active) PL.Lapis else PL.Ink.copy(alpha = 0.16f), shape)
    Box(
        (if (onClick != null) m.clickable(role = Role.Button, onClick = onClick) else m).padding(horizontal = if (small) 10.dp else 14.dp),
        contentAlignment = Alignment.Center,
    ) { Text(text, color = if (active) PL.Paper else PL.Ink, style = PLType.small.copy(fontSize = if (small) 12.sp else 14.sp, fontWeight = androidx.compose.ui.text.font.FontWeight.ExtraBold)) }
}

enum class BadgeTone(val bg: Color, val fg: Color) {
    Parchment(PL.Paper2, PL.TyrianDeep), Vermilion(PL.Vermilion, PL.Paper), Lapis(PL.Lapis, PL.Paper), Malachite(PL.Malachite, PL.Paper),
    Ochre(PL.Ochre, PL.TyrianDeep), Tyrian(PL.Tyrian, PL.Paper), Maya(PL.Maya, PL.TyrianDeep), Ink(PL.Ink, PL.Paper),
}

@Composable
fun PLBadge(text: String, tone: BadgeTone = BadgeTone.Parchment, large: Boolean = false) {
    val shape = RoundedCornerShape(PLRadius.pill)
    Box(Modifier.padding(bottom = 2.dp)) {
        Box(Modifier.matchParentSize().offset(y = 2.dp).clip(shape).background(PL.Ink.copy(alpha = 0.15f)))
        Text(
            text.uppercase(), color = tone.fg, style = PLType.label.copy(fontSize = if (large) 13.sp else 11.sp),
            modifier = Modifier.clip(shape).background(tone.bg).padding(horizontal = if (large) 12.dp else 9.dp, vertical = if (large) 5.dp else 3.dp),
        )
    }
}

private val badgeFor = BadgeTone.entries.associateBy { it.bg }

@Composable
fun Pill(text: String, color: Color = PL.Lapis) = PLBadge(text, badgeFor[color] ?: BadgeTone.Lapis)

@Composable
fun SectionTitle(text: String, onDark: Boolean = false) {
    Text(text.uppercase(), style = PLType.label, color = if (onDark) PL.Paper.copy(alpha = 0.8f) else PL.InkDim, modifier = Modifier.padding(top = PLSpace.s2))
}

enum class ChoiceState { Idle, Right, Wrong, Dim }

@Composable
fun ChoiceButton(text: String, state: ChoiceState, modifier: Modifier = Modifier, onClick: () -> Unit) {
    val (bg, fg, lip) = when (state) {
        ChoiceState.Idle -> Triple(PL.White, PL.Ink, PL.Hairline2)
        ChoiceState.Right -> Triple(PL.Malachite, PL.Paper, PL.MalachiteDeep)
        ChoiceState.Wrong -> Triple(PL.Vermilion, PL.Paper, PL.VermilionDeep)
        ChoiceState.Dim -> Triple(PL.Paper2, PL.InkFaint, PL.Hairline)
    }
    val shape = RoundedCornerShape(PLRadius.md)
    Box(modifier.fillMaxWidth().padding(bottom = PLLip.md).clickable(enabled = state == ChoiceState.Idle, role = Role.Button, onClick = onClick)) {
        Box(Modifier.matchParentSize().offset(y = PLLip.md).clip(shape).background(lip))
        Box(
            Modifier.fillMaxWidth().heightIn(min = 56.dp).clip(shape).background(bg).border(2.dp, if (state == ChoiceState.Idle) PL.Hairline2 else Color.Transparent, shape)
                .padding(horizontal = PLSpace.s4, vertical = PLSpace.s3),
            contentAlignment = Alignment.Center,
        ) { Text(text, color = fg, style = PLType.heading.copy(fontSize = 19.sp), textAlign = TextAlign.Center) }
    }
}

@Composable
fun ResultDots(results: List<Boolean>, total: Int) {
    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        repeat(total) { i ->
            val c = when (results.getOrNull(i)) { true -> PL.Malachite; false -> PL.Vermilion; null -> PL.Paper3 }
            Box(Modifier.size(12.dp).clip(CircleShape).background(c).border(1.5.dp, PL.Ink.copy(alpha = 0.25f), CircleShape))
        }
    }
}

@Composable
fun FlagSwatch(lang: String, modifier: Modifier) {
    val layers = FlagLibrary.flags[lang].orEmpty()
    Box(modifier.drawBehind {
        if (layers.isEmpty()) drawRect(PL.Paper3)
        layers.forEach { l ->
            if (l.kind == 4) {
                l.colors.drop(1).firstOrNull { it != 0L }?.let { drawRect(Color(it)) }
                if (l.colors[0] != 0L) drawCircle(Color(l.colors[0]), radius = l.ends[0] * size.minDimension * 1.4f)
                return@forEach
            }
            var start = 0f
            l.colors.forEachIndexed { i, c ->
                val end = l.ends[i]
                if (c != 0L) {
                    val col = Color(c)
                    when (l.kind) {
                        0 -> drawRect(col)
                        1 -> drawRect(col, Offset(0f, start * size.height), Size(size.width, (end - start) * size.height))
                        2 -> drawRect(col, Offset(start * size.width, 0f), Size((end - start) * size.width, size.height))
                        3 -> if (i == 0) drawRect(col) else drawPath(androidx.compose.ui.graphics.Path().apply { moveTo(size.width, 0f); lineTo(size.width, size.height); lineTo(0f, size.height); close() }, col)
                        4 -> if (i == 0) Unit else Unit
                    }
                }
                start = end
            }
        }
    })
}

@Composable
fun FlagTile(lang: String, size: Dp = 56.dp, selected: Boolean = false, onClick: (() -> Unit)? = null) {
    val shape = RoundedCornerShape(size / 5)
    val lip = (size.value / 12f).coerceIn(3f, 6f).dp
    val base = Modifier.size(size + lip).semantics { contentDescription = Lang.name(lang) }
    Box(if (onClick != null) base.clickable(role = Role.Checkbox, onClick = onClick) else base) {
        Box(Modifier.size(size).offset(y = lip).clip(shape).background(if (selected) PL.VermilionDeep else PL.Ink.copy(alpha = 0.35f)))
        FlagSwatch(lang, Modifier.size(size).clip(shape).border(if (selected) 3.dp else 2.dp, if (selected) PL.Vermilion else PL.Ink.copy(alpha = 0.2f), shape))
    }
}

