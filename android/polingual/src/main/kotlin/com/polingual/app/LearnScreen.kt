package com.polingual.app

import foundation.bucket.core.ui.pl.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.navigation.NavHostController
import foundation.bucket.core.model.Lang
import foundation.bucket.core.model.validateSystem
import foundation.bucket.core.ui.pl.Card
import foundation.bucket.core.ui.pl.PL
import foundation.bucket.core.ui.pl.FlagTile
import foundation.bucket.core.ui.LocalPalette
import foundation.bucket.core.ui.pl.Pill
import foundation.bucket.core.ui.pl.PlainLink
import foundation.bucket.core.ui.pl.PrimaryButton
import foundation.bucket.core.ui.pl.SectionTitle
import kotlinx.coroutines.launch

@Composable
fun LearnScreen(graph: Graph, nav: NavHostController) {
    val app by graph.state.collectAsState()
    val p = LocalPalette.current
    val scope = rememberCoroutineScope()
    Page("Learn", stickers = listOf(Sticker("torn-label", Alignment.CenterStart, 110.dp, -8f), Sticker("calligraphy-yong", Alignment.TopEnd, 60.dp, 10f), Sticker("pebble", Alignment.BottomEnd, 40.dp, -5f, dx = (-8).dp))) {
        SectionTitle("Your language sets")
        val systems = app?.systems.orEmpty()
        if (systems.isEmpty()) EmptyState("kente", "Start a language set. The games use the words you study.")
        systems.forEach { s ->
            val active = s.id == app?.system?.id
            Card(onClick = { scope.launch { graph.store.update { it.copy(activeSystem = s.id) } } }) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    s.targets.forEach { FlagTile(it, 40.dp) }
                }
                Text(s.name, style = Type.title.copy(fontSize = 20.sp()), color = p.ink)
                val learned = app?.study?.get(s.id)?.cards?.size ?: 0
                Text(if (learned == 1) "1 word started" else "$learned words started", color = p.muted)
                if (active) Pill("Active", PL.Malachite)
                PlainLink("Remove") { scope.launch { graph.removeSystem(s.id) } }
            }
        }
        PrimaryButton("New language set", color = PL.Lapis) { nav.navigate("system/new") }
        LearnExtras(graph, nav)
    }
}

fun Int.sp() = androidx.compose.ui.unit.TextUnit(this.toFloat(), androidx.compose.ui.unit.TextUnitType.Sp)

@Composable
fun NewSystemScreen(graph: Graph, done: () -> Unit) {
    val root = remember { Interface.deviceRoot }
    var targets by remember { mutableStateOf(emptyList<String>()) }
    val scope = rememberCoroutineScope()
    Page(back = done) {
        Languages(root, targets) { targets = it }
        val problem = validateSystem(root, targets)
        if (targets.isNotEmpty() && problem != null) Text(problem.message, color = PL.Vermilion)
        Text("Learning from ${Lang.name(root)}", color = LocalPalette.current.muted)
        PrimaryButton("Create", enabled = problem == null) { scope.launch { graph.createSystem(root, targets); done() } }
    }
}
