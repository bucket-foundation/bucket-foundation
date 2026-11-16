package foundation.bucket.core.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import foundation.bucket.core.model.Lang

@Composable
fun PrimaryButton(text: String, modifier: Modifier = Modifier, enabled: Boolean = true, color: Color = D8.vermilion, onClick: () -> Unit) {
    Button(
        onClick = onClick, enabled = enabled,
        modifier = modifier.fillMaxWidth().heightIn(min = 56.dp),
        shape = RoundedCornerShape(16.dp),
        colors = ButtonDefaults.buttonColors(containerColor = color, contentColor = D8.parchment),
    ) { Text(text, fontWeight = FontWeight.ExtraBold, fontSize = 17.sp) }
}

@Composable
fun PlainLink(text: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    TextButton(onClick = onClick, modifier = modifier) { Text(text, color = LocalPalette.current.muted, fontWeight = FontWeight.Bold) }
}

@Composable
fun Card(modifier: Modifier = Modifier, color: Color = LocalPalette.current.card, onClick: (() -> Unit)? = null, content: @Composable ColumnScope.() -> Unit) {
    val m = modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(color)
    Column(
        (if (onClick != null) m.clickable(role = Role.Button, onClick = onClick) else m).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp), content = content,
    )
}

@Composable
fun FlagTile(lang: String, size: Dp = 56.dp, selected: Boolean = false, onClick: (() -> Unit)? = null) {
    val p = LocalPalette.current
    val base = Modifier.size(size).clip(RoundedCornerShape(size / 4)).background(p.card)
        .border(if (selected) 3.dp else 1.dp, if (selected) D8.vermilion else p.rule, RoundedCornerShape(size / 4))
    Box((if (onClick != null) base.clickable(role = Role.Checkbox, onClick = onClick) else base), contentAlignment = Alignment.Center) {
        Text(Lang.flag(lang), fontSize = (size.value * 0.5f).sp)
    }
}

@Composable
fun ChoiceButton(text: String, state: ChoiceState, modifier: Modifier = Modifier, onClick: () -> Unit) {
    val p = LocalPalette.current
    val (bg, fg) = when (state) {
        ChoiceState.Idle -> p.card to p.ink
        ChoiceState.Right -> D8.malachite to D8.parchment
        ChoiceState.Wrong -> D8.vermilion to D8.parchment
        ChoiceState.Dim -> p.card to p.muted
    }
    Box(
        modifier.fillMaxWidth().heightIn(min = 56.dp).clip(RoundedCornerShape(14.dp)).background(bg)
            .border(1.dp, p.rule, RoundedCornerShape(14.dp)).clickable(enabled = state == ChoiceState.Idle, role = Role.Button, onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        contentAlignment = Alignment.Center,
    ) { Text(text, color = fg, fontWeight = FontWeight.Bold, fontSize = 18.sp, textAlign = TextAlign.Center) }
}

enum class ChoiceState { Idle, Right, Wrong, Dim }

@Composable
fun Pill(text: String, color: Color = D8.lapis) {
    Text(text, color = D8.parchment, style = Type.caps, modifier = Modifier.clip(RoundedCornerShape(50)).background(color).padding(horizontal = 10.dp, vertical = 4.dp))
}

@Composable
fun SectionTitle(text: String) {
    Text(text.uppercase(), style = Type.caps, color = LocalPalette.current.muted, modifier = Modifier.padding(top = 8.dp))
}

@Composable
fun ResultDots(results: List<Boolean>, total: Int) {
    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        repeat(total) { i ->
            val c = when (results.getOrNull(i)) { true -> D8.malachite; false -> D8.vermilion; null -> LocalPalette.current.rule }
            Box(Modifier.size(12.dp).clip(RoundedCornerShape(50)).background(c))
        }
    }
}
