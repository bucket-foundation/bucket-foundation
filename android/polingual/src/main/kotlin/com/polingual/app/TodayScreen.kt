package com.polingual.app

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.polingual.brand.BrandBar
import com.polingual.brand.BrandButton
import com.polingual.brand.Counter
import com.polingual.brand.D8
import com.polingual.brand.FlagTile
import com.polingual.brand.Heading
import com.polingual.brand.Hero
import com.polingual.brand.Label
import com.polingual.brand.PopIn
import com.polingual.brand.Pulse
import com.polingual.brand.PrimaryButton
import foundation.bucket.core.engine.Streak

@Composable
fun TodayScreen(graph: Graph, nav: NavHostController) {
    val app by graph.state.collectAsState()
    val xp by graph.rewards.xp.collectAsState()
    val system = app?.system
    val study = system?.let { app?.study?.get(it.id) }
    val played by graph.rewards.streak.collectAsState()
    val streak = maxOf(played, Streak.count(study?.days.orEmpty(), today()))
    val due = study?.cards?.values?.count { it.due <= System.currentTimeMillis() } ?: 0
    Page {
        BrandBar { XpChip(xp) }
        PopIn {
            Hero {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Pulse()
                    Label(system?.name ?: androidx.compose.ui.res.stringResource(R.string.s_today), color = D8.parchment)
                }
                Heading(if (system == null) androidx.compose.ui.res.stringResource(R.string.d_pick_your_languages) else androidx.compose.ui.res.stringResource(R.string.d_play_in_x_languages, system.targets.size + 1), color = D8.parchment, size = 30)
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Counter("$streak", androidx.compose.ui.res.stringResource(R.string.d_day_streak), Modifier.weight(1f))
                    Counter("%,d".format(xp), androidx.compose.ui.res.stringResource(R.string.d_xp), Modifier.weight(1f))
                }
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Counter("$due", androidx.compose.ui.res.stringResource(R.string.d_due_reviews), Modifier.weight(1f))
                    Counter("${study?.cards?.size ?: 0}", androidx.compose.ui.res.stringResource(R.string.d_words), Modifier.weight(1f))
                }
                if (system == null) PrimaryButton(androidx.compose.ui.res.stringResource(R.string.s_pick_languages)) { nav.navigate("system/new") }
                else Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
                    BrandButton(androidx.compose.ui.res.stringResource(R.string.d_quick_play)) { nav.navigate("game/${GameKind.Daily.route}") }
                    Row(Modifier.weight(1f), horizontalArrangement = Arrangement.spacedBy(6.dp, Alignment.End)) {
                        (listOf(system.root) + system.targets).take(4).forEach { FlagTile(it, 30.dp) }
                    }
                }
            }
        }
        TodayPlanCard(graph, nav)
        SaveProgressGate(graph)
        TodayExtras(graph, nav)
    }
}

@Composable
fun XpChip(xp: Int) {
    com.polingual.brand.Coins(xp)
}

@Composable
fun <T> TwoUp(items: List<T>, gap: androidx.compose.ui.unit.Dp = 12.dp, cell: @Composable (T, Modifier) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(gap)) {
        items.chunked(2).forEach { row ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(gap)) {
                row.forEach { cell(it, Modifier.weight(1f)) }
                if (row.size == 1) Box(Modifier.weight(1f))
            }
        }
    }
}
