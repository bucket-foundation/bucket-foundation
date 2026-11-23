package com.polingual.brand

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.Image
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
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import foundation.bucket.core.model.Lang
import foundation.bucket.core.ui.ChoiceState

fun Modifier.dotGrid(color: Color = D8.parchment, dot: Color = Color(0x12231F20)): Modifier = drawBehind {
    drawRect(color)
    val step = 22.dp.toPx()
    val r = 1.dp.toPx()
    var y = step / 2
    while (y < size.height) {
        var x = step / 2
        while (x < size.width) {
            drawCircle(dot, r, Offset(x, y))
            x += step
        }
        y += step
    }
}

fun Modifier.chunky(bg: Color, radius: Dp = 20.dp, depth: Dp = 5.dp, lip: Color = D8.lip(bg), border: Color? = null, pressed: Float = 0f): Modifier =
    padding(bottom = depth).drawBehind {
        val r = CornerRadius(radius.toPx())
        val d = depth.toPx()
        val sink = d * pressed
        drawRoundRect(lip, topLeft = Offset(0f, d), size = Size(size.width, size.height), cornerRadius = r)
        drawRoundRect(bg, topLeft = Offset(0f, sink), size = size, cornerRadius = r)
        if (border != null) drawRoundRect(border, topLeft = Offset(0f, sink), size = size, cornerRadius = r, style = Stroke(2.dp.toPx()))
    }.graphicsLayer { translationY = depth.toPx() * pressed }


@Composable
fun PopIn(key: Any = Unit, modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    val t = remember(key) { Animatable(0f) }
    LaunchedEffect(key) { t.animateTo(1f, Motion.pop()) }
    Box(modifier.graphicsLayer {
        alpha = t.value
        translationY = (1 - t.value) * 4.dp.toPx()
        scaleX = 0.98f + 0.02f * t.value
        scaleY = 0.98f + 0.02f * t.value
    }) { content() }
}

@Composable
fun PrimaryButton(text: String, modifier: Modifier = Modifier, enabled: Boolean = true, color: Color = D8.vermilion, onClick: () -> Unit) {
    BrandButton(text, modifier.fillMaxWidth(), enabled, color, onClick = onClick)
}

@Composable
fun BrandButton(
    text: String,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    color: Color = D8.vermilion,
    small: Boolean = false,
    fg: Color = D8.on(color),
    outline: Color? = if (color == D8.white || color == D8.cream) D8.hair else null,
    onClick: () -> Unit,
) {
    val source = remember { MutableInteractionSource() }
    val down by source.collectIsPressedAsState()
    val press by animateFloatAsState(if (down && enabled) 0.75f else 0f, Motion.press(), label = "press")
    Box(
        modifier
            .heightIn(min = if (small) 40.dp else 54.dp)
            .alpha(if (enabled) 1f else 0.55f)
            .chunky(color, radius = 14.dp, depth = 4.dp, border = outline, pressed = press)
            .clip(RoundedCornerShape(14.dp))
            .clickable(source, indication = null, enabled = enabled, role = Role.Button, onClick = onClick)
            .padding(horizontal = if (small) 14.dp else 22.dp, vertical = if (small) 8.dp else 14.dp),
        contentAlignment = Alignment.Center,
    ) { Text(text, style = Type.button.copy(fontSize = if (small) 16.sp else 19.sp), color = fg, textAlign = TextAlign.Center, maxLines = 2) }
}

@Composable
fun PlainLink(text: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    TextButton(onClick = onClick, modifier = modifier) { Text(text, color = D8.lapis, style = Type.strong) }
}

@Composable
fun Card(modifier: Modifier = Modifier, color: Color = D8.cream, onClick: (() -> Unit)? = null, content: @Composable ColumnScope.() -> Unit) {
    val light = color == D8.cream || color == D8.white || color == D8.parchment
    val lip = if (light) Color(0x14231F20) else D8.lip(color)
    val m = modifier.fillMaxWidth().chunky(color, radius = 20.dp, depth = if (light) 4.dp else 6.dp, lip = lip, border = if (light) Color(0x1F231F20) else null).clip(RoundedCornerShape(20.dp))
    Column(
        (if (onClick != null) m.clickable(role = Role.Button, onClick = onClick) else m).padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp), content = content,
    )
}

@Composable
fun Hero(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Box(modifier.fillMaxWidth().clip(RoundedCornerShape(28.dp)).background(D8.tyrian)) {
        Box(Modifier.align(Alignment.TopEnd).offset(x = 60.dp, y = (-60).dp).size(220.dp).clip(CircleShape).background(D8.vermilion.copy(alpha = 0.35f)))
        Column(Modifier.fillMaxWidth().padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp), content = content)
    }
}

@Composable
fun Counter(value: String, label: String, modifier: Modifier = Modifier) {
    Column(
        modifier.clip(RoundedCornerShape(16.dp)).background(D8.parchment.copy(alpha = 0.1f)).border(1.dp, D8.parchment.copy(alpha = 0.2f), RoundedCornerShape(16.dp)).padding(12.dp),
    ) {
        Text(value, style = Type.mono.copy(fontSize = 24.sp), color = D8.ochre, maxLines = 1)
        Text(label, style = Type.strong.copy(fontSize = 13.sp), color = D8.parchment)
    }
}

@Composable
fun CountUp(target: Int, style: androidx.compose.ui.text.TextStyle = Type.mono, color: Color = D8.ochre, prefix: String = "", suffix: String = "") {
    val v = remember { Animatable(target.toFloat()) }
    LaunchedEffect(target) { v.animateTo(target.toFloat(), Motion.count()) }
    Text("$prefix${"%,d".format(v.value.toInt())}$suffix", style = style, color = color, maxLines = 1)
}

@Composable
fun GameCard(title: String, blurb: String, color: Color, modifier: Modifier = Modifier, icon: (@Composable () -> Unit)? = null, onClick: () -> Unit) {
    val source = remember { MutableInteractionSource() }
    val down by source.collectIsPressedAsState()
    val press by animateFloatAsState(if (down) 0.7f else 0f, Motion.press(), label = "press")
    Column(
        modifier.heightIn(min = 120.dp).chunky(color, radius = 20.dp, depth = 5.dp, lip = Color(0x40231F20), pressed = press).clip(RoundedCornerShape(20.dp))
            .clickable(source, indication = null, role = Role.Button, onClick = onClick).padding(16.dp),
        verticalArrangement = Arrangement.SpaceBetween,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(title, style = Type.title.copy(fontSize = 22.sp, lineHeight = 24.sp), color = D8.on(color), modifier = Modifier.weight(1f))
            icon?.invoke()
        }
        Box(Modifier.height(10.dp))
        Text(blurb, style = Type.strong.copy(fontSize = 13.sp, lineHeight = 17.sp), color = D8.on(color).copy(alpha = 0.9f))
    }
}

@Composable
fun ChoiceButton(text: String, state: ChoiceState, modifier: Modifier = Modifier, color: Color? = null, onClick: () -> Unit) {
    val (bg, fg) = when (state) {
        ChoiceState.Idle -> (color ?: D8.white) to D8.on(color ?: D8.white)
        ChoiceState.Right -> D8.malachite to D8.parchment
        ChoiceState.Wrong -> D8.vermilion to D8.parchment
        ChoiceState.Dim -> (color ?: D8.white) to D8.on(color ?: D8.white)
    }
    val scale by animateFloatAsState(if (state == ChoiceState.Right) 1.03f else 1f, Motion.pop(), label = "right")
    val source = remember { MutableInteractionSource() }
    val down by source.collectIsPressedAsState()
    val press by animateFloatAsState(if (down) 0.75f else 0f, Motion.press(), label = "press")
    Box(
        modifier.fillMaxWidth().heightIn(min = 58.dp).graphicsLayer { scaleX = scale; scaleY = scale; alpha = if (state == ChoiceState.Dim) 0.25f else 1f }
            .then(if (state == ChoiceState.Right) Modifier.border(4.dp, D8.ochre, RoundedCornerShape(18.dp)) else Modifier)
            .chunky(bg, radius = 16.dp, depth = 5.dp, lip = if (bg == D8.white) Color(0x2E231F20) else D8.lip(bg), border = if (bg == D8.white) Color(0x2E231F20) else null, pressed = press)
            .clip(RoundedCornerShape(16.dp))
            .clickable(source, indication = null, enabled = state == ChoiceState.Idle, role = Role.Button, onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        contentAlignment = Alignment.Center,
    ) { Text(text, color = fg, style = Type.button.copy(fontSize = 20.sp), textAlign = TextAlign.Center) }
}

@Composable
fun Pill(text: String, color: Color = D8.lapis) {
    Text(
        text.uppercase(), color = D8.on(color), style = Type.caps.copy(fontSize = 11.sp),
        modifier = Modifier.chunky(color, radius = 999.dp, depth = 2.dp, lip = Color(0x33231F20)).padding(horizontal = 10.dp, vertical = 4.dp),
    )
}

@Composable
fun Chip(text: String, selected: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Text(
        text, style = Type.strong.copy(fontSize = 14.sp), color = if (selected) D8.parchment else D8.ink,
        modifier = modifier.clip(RoundedCornerShape(999.dp)).background(if (selected) D8.lapis else D8.white)
            .border(2.dp, if (selected) D8.lapis else Color(0x29231F20), RoundedCornerShape(999.dp))
            .clickable(role = Role.Checkbox, onClick = onClick).padding(horizontal = 14.dp, vertical = 8.dp),
    )
}

@Composable
fun SectionTitle(text: String) {
    Label(text, Modifier.padding(top = 6.dp))
}

@Composable
fun Label(text: String, modifier: Modifier = Modifier, color: Color = D8.vermilion) {
    Text(text.uppercase(), style = Type.caps, color = color, modifier = modifier)
}

@Composable
fun Heading(text: String, modifier: Modifier = Modifier, color: Color = D8.tyrian, size: Int = 26) {
    Text(text, style = Type.title.copy(fontSize = size.sp, lineHeight = (size + 2).sp), color = color, modifier = modifier)
}

@Composable
fun ResultDots(results: List<Boolean>, total: Int) {
    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        repeat(total) { i ->
            val c = when (results.getOrNull(i)) { true -> D8.malachite; false -> D8.vermilion; null -> D8.parchment2 }
            val s by animateDpAsState(if (i == results.size) 16.dp else 12.dp, Motion.pop(), label = "dot")
            Box(Modifier.size(s).clip(CircleShape).background(c))
        }
    }
}

@Composable
fun Meter(progress: Float, modifier: Modifier = Modifier, color: Color = D8.malachite, track: Color = D8.parchment2, height: Dp = 8.dp) {
    val p by animateFloatAsState(progress.coerceIn(0f, 1f), Motion.slide(), label = "meter")
    Box(modifier.height(height).clip(RoundedCornerShape(999.dp)).background(track)) {
        Box(Modifier.fillMaxHeight().fillMaxWidth(p).clip(RoundedCornerShape(999.dp)).background(color))
    }
}

@Composable
fun FlagTile(lang: String, size: Dp = 56.dp, selected: Boolean = false, onClick: (() -> Unit)? = null) {
    val shape = RoundedCornerShape(size / 4)
    val base = Modifier.size(size).clip(shape).background(D8.white).border(if (selected) 3.dp else 1.dp, if (selected) D8.vermilion else Color(0x2E231F20), shape)
    Box((if (onClick != null) base.clickable(role = Role.Checkbox, onClick = onClick) else base), contentAlignment = Alignment.Center) {
        Text(Lang.flag(lang), fontSize = (size.value * 0.5f).sp)
    }
}

@Composable
fun Mark(size: Dp = 36.dp, dark: Boolean = false) {
    Image(painterResource(if (dark) R.drawable.brand_mark_dark else R.drawable.brand_mark), contentDescription = "Polingual", modifier = Modifier.size(size))
}

@Composable
fun Wordmark(height: Dp = 28.dp, dark: Boolean = false) {
    Image(painterResource(if (dark) R.drawable.brand_wordmark_dark else R.drawable.brand_wordmark), contentDescription = "Polingual", modifier = Modifier.height(height))
}

@Composable
fun BrandBar(modifier: Modifier = Modifier, trailing: @Composable RowScope.() -> Unit = {}) {
    Row(modifier.fillMaxWidth().heightIn(min = 52.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Mark(34.dp)
        Text("polingual play", style = Type.title.copy(fontSize = 19.sp, fontWeight = androidx.compose.ui.text.font.FontWeight.SemiBold), color = D8.tyrian, modifier = Modifier.weight(1f), maxLines = 1)
        trailing()
    }
}

@Composable
fun Coins(amount: Int, modifier: Modifier = Modifier) {
    Row(
        modifier.clip(RoundedCornerShape(999.dp)).background(D8.white).border(2.dp, D8.ochre, RoundedCornerShape(999.dp)).padding(start = 5.dp, end = 12.dp, top = 4.dp, bottom = 4.dp),
        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Coin(18.dp)
        CountUp(amount, Type.mono.copy(fontSize = 14.sp), D8.ink)
    }
}

@Composable
fun Coin(size: Dp = 18.dp) {
    Box(
        Modifier.size(size).clip(CircleShape)
            .background(Brush.radialGradient(0f to Color(0xFFFFD98A), 0.3f to Color(0xFFFFD98A), 0.31f to D8.ochre, 0.7f to D8.ochre, 0.71f to Color(0xFFC98A2E)))
            .border(2.dp, Color(0xFFC98A2E), CircleShape),
    )
}

@Composable
fun Pulse(color: Color = Color(0xFF3BD18A)) {
    val t = remember { Animatable(0f) }
    LaunchedEffect(Unit) { while (true) { t.snapTo(0f); t.animateTo(1f, androidx.compose.animation.core.tween(1600)) } }
    Box(Modifier.size(20.dp), contentAlignment = Alignment.Center) {
        Box(Modifier.size(10.dp + 10.dp * t.value).clip(CircleShape).background(color.copy(alpha = 0.7f * (1 - t.value))))
        Box(Modifier.size(10.dp).clip(CircleShape).background(color))
    }
}
