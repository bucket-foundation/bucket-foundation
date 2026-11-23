package com.polingual.app

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.polingual.brand.BrandButton
import com.polingual.brand.CountUp
import com.polingual.brand.D8
import com.polingual.brand.FlagTile
import com.polingual.brand.Label
import com.polingual.brand.Meter
import com.polingual.brand.Pill
import com.polingual.brand.PopIn
import com.polingual.brand.Type
import com.polingual.brand.chunky

object Level {
    const val STEP = 500
    fun of(xp: Int): Int = xp / STEP + 1
    fun progress(xp: Int): Float = (xp % STEP) / STEP.toFloat()
}

@Composable
fun ProfileCard(graph: Graph, onShare: (() -> Unit)? = null) {
    val app by graph.state.collectAsState()
    val xp by graph.rewards.xp.collectAsState()
    val streak by graph.rewards.streak.collectAsState()
    val name = app?.nickname?.ifBlank { null } ?: androidx.compose.ui.res.stringResource(R.string.d_player)
    val langs = app?.systems.orEmpty().flatMap { listOf(it.root) + it.targets }.distinct()
    val games = app?.played?.size ?: 0
    PopIn {
        Column(
            Modifier.fillMaxWidth().chunky(D8.tyrian, radius = 28.dp, depth = 6.dp, lip = D8.lip(D8.ink).copy(alpha = 0.25f)).clip(RoundedCornerShape(28.dp))
                .drawBehind {
                    val p = Path().apply { moveTo(0f, size.height * 0.62f); lineTo(size.width, size.height * 0.42f); lineTo(size.width, size.height); lineTo(0f, size.height); close() }
                    drawPath(p, D8.tyrianDeep)
                }
                .padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Pill(androidx.compose.ui.res.stringResource(R.string.d_level_x, Level.of(xp)), D8.malachite)
            Box(
                Modifier.size(120.dp).clip(CircleShape).background(D8.maya).border(6.dp, D8.ochre, CircleShape),
                contentAlignment = Alignment.Center,
            ) { Text(name.take(1).uppercase(), style = Type.display.copy(fontSize = 56.dp.value.let { androidx.compose.ui.unit.TextUnit(it, androidx.compose.ui.unit.TextUnitType.Sp) }), color = D8.tyrianDeep) }
            Text(name, style = Type.title.copy(fontSize = 28.sp()), color = D8.parchment)
            Label(androidx.compose.ui.res.stringResource(R.string.d_level_x_progress, Level.of(xp), (Level.progress(xp) * 100).toInt()), color = D8.parchment)
            Meter(Level.progress(xp), Modifier.fillMaxWidth(), color = D8.ochre, track = D8.parchment.copy(alpha = 0.18f), height = 12.dp)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Stat(games, androidx.compose.ui.res.stringResource(R.string.d_games), Modifier.weight(1f))
                Stat(xp, androidx.compose.ui.res.stringResource(R.string.d_xp), Modifier.weight(1f))
                Stat(streak, androidx.compose.ui.res.stringResource(R.string.d_day_streak_lower), Modifier.weight(1f))
            }
            if (langs.isNotEmpty()) {
                Label(androidx.compose.ui.res.stringResource(R.string.d_flag_passport), color = D8.parchment)
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) { langs.take(7).forEach { FlagTile(it, 32.dp) } }
            }
            if (onShare != null) BrandButton(androidx.compose.ui.res.stringResource(R.string.d_share_card), onClick = onShare)
        }
    }
}

@Composable
fun Stat(value: Int, label: String, modifier: Modifier = Modifier) {
    Column(modifier.clip(RoundedCornerShape(14.dp)).background(D8.parchment.copy(alpha = 0.1f)).padding(8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        CountUp(value)
        Text(label, style = Type.strong.copy(fontSize = 12.sp()), color = D8.parchment, textAlign = TextAlign.Center)
    }
}
