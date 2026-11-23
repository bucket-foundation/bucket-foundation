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
import com.polingual.brand.Card
import com.polingual.brand.D8
import com.polingual.brand.FlagTile
import foundation.bucket.core.ui.LocalPalette
import com.polingual.brand.Pill
import com.polingual.brand.PlainLink
import com.polingual.brand.PrimaryButton
import com.polingual.brand.SectionTitle
import com.polingual.brand.Type
import kotlinx.coroutines.launch

@Composable
fun LearnScreen(graph: Graph, nav: NavHostController) {
    val app by graph.state.collectAsState()
    val p = LocalPalette.current
    val scope = rememberCoroutineScope()
    Page(androidx.compose.ui.res.stringResource(R.string.s_learn)) {
        SectionTitle(androidx.compose.ui.res.stringResource(R.string.s_your_language_sets))
        val systems = app?.systems.orEmpty()
        if (systems.isEmpty()) Text(androidx.compose.ui.res.stringResource(R.string.s_start_a_language_set_the_games), color = p.muted)
        systems.forEach { s ->
            val active = s.id == app?.system?.id
            Card(onClick = { scope.launch { graph.store.update { it.copy(activeSystem = s.id) } } }) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    s.targets.forEach { FlagTile(it, 40.dp) }
                }
                Text(s.name, style = Type.title.copy(fontSize = 20.sp()), color = p.ink)
                val learned = app?.study?.get(s.id)?.cards?.size ?: 0
                Text(if (learned == 1) androidx.compose.ui.res.stringResource(R.string.s_1_word_started) else androidx.compose.ui.res.stringResource(R.string.s_x_words_started, learned), color = p.muted)
                if (active) Pill(androidx.compose.ui.res.stringResource(R.string.s_active), D8.malachite)
                PlainLink(androidx.compose.ui.res.stringResource(R.string.s_remove)) { scope.launch { graph.removeSystem(s.id) } }
            }
        }
        PrimaryButton(androidx.compose.ui.res.stringResource(R.string.s_new_language_set), color = D8.lapis) { nav.navigate("system/new") }
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
        Text(androidx.compose.ui.res.stringResource(R.string.s_learning_from_x, Lang.name(root)), color = LocalPalette.current.muted)
        PrimaryButton(androidx.compose.ui.res.stringResource(R.string.s_create), enabled = problem == null) { scope.launch { graph.createSystem(root, targets); done() } }
    }
}
