package com.polingual.app

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
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import foundation.bucket.core.model.Lang
import foundation.bucket.core.model.validateSystem
import foundation.bucket.core.ui.Card
import foundation.bucket.core.ui.D8
import foundation.bucket.core.ui.FlagTile
import foundation.bucket.core.ui.LocalPalette
import foundation.bucket.core.ui.Pill
import foundation.bucket.core.ui.PlainLink
import foundation.bucket.core.ui.PrimaryButton
import foundation.bucket.core.ui.SectionTitle
import foundation.bucket.core.ui.Type
import kotlinx.coroutines.launch

@Composable
fun LearnScreen(graph: Graph, nav: NavHostController) {
    val app by graph.state.collectAsState()
    val p = LocalPalette.current
    val scope = rememberCoroutineScope()
    Page("Learn") {
        SectionTitle("Your language sets")
        val systems = app?.systems.orEmpty()
        if (systems.isEmpty()) Text("Start a language set. The games use the words you study.", color = p.muted)
        systems.forEach { s ->
            val active = s.id == app?.system?.id
            Card(onClick = { scope.launch { graph.store.update { it.copy(activeSystem = s.id) } } }) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    s.targets.forEach { FlagTile(it, 40.dp) }
                }
                Text(s.name, style = Type.title.copy(fontSize = 20.sp()), color = p.ink)
                val learned = app?.study?.get(s.id)?.cards?.size ?: 0
                Text(if (learned == 1) "1 word started" else "$learned words started", color = p.muted)
                if (active) Pill("Active", D8.malachite)
                PlainLink("Remove") { scope.launch { graph.removeSystem(s.id) } }
            }
        }
        PrimaryButton("New language set", color = D8.lapis) { nav.navigate("system/new") }
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
        if (targets.isNotEmpty() && problem != null) Text(problem.message, color = D8.vermilion)
        Text("Learning from ${Lang.name(root)}", color = LocalPalette.current.muted)
        PrimaryButton("Create", enabled = problem == null) { scope.launch { graph.createSystem(root, targets); done() } }
    }
}
