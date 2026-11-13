package com.polingual.app

import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import foundation.bucket.core.ui.pl.Card
import foundation.bucket.core.ui.pl.PL
import foundation.bucket.core.ui.LocalPalette
import foundation.bucket.core.ui.pl.PlainLink
import foundation.bucket.core.ui.pl.PrimaryButton
import foundation.bucket.core.ui.pl.SectionTitle
import kotlinx.coroutines.launch
import androidx.compose.ui.draw.alpha

fun NavGraphBuilder.extraRoutes(graph: Graph, nav: NavHostController) {
    composable("study") { StudyScreen(graph) { nav.popBackStack() } }
    composable("game/{kind}", arguments = listOf(navArgument("kind") { type = NavType.StringType })) { e ->
        val kind = GameKind.entries.firstOrNull { it.route == e.arguments?.getString("kind") }
        if (kind == null) androidx.compose.runtime.LaunchedEffect(Unit) { nav.popBackStack() } else GameScreen(graph, kind) { nav.popBackStack() }
    }
    composable("word/{id}") { e -> WordDetailScreen(graph, e.arguments?.getString("id").orEmpty()) { nav.popBackStack() } }
    composable("translate?text={text}", arguments = listOf(navArgument("text") { type = NavType.StringType; defaultValue = "" })) { e ->
        TranslateScreen(graph, e.arguments?.getString("text").orEmpty()) { nav.popBackStack() }
    }
    milestoneRoutes(graph, nav)
}

@Composable
fun TodayExtras(graph: Graph, nav: NavHostController) {
    val app by graph.state.collectAsState()
    val p = LocalPalette.current
    val system = app?.system
    if (system == null) { TodayMore(graph, nav); return }
    val due = app?.study?.get(system.id)?.cards?.values?.count { it.due <= System.currentTimeMillis() } ?: 0
    Card(color = PL.Ink) {
        Text("Daily session", style = Type.title, color = PL.Paper)
        Text(if (due > 0) "$due reviews and new words" else "New words in ${system.targets.size} languages", color = PL.Paper.copy(alpha = 0.85f))
        val access by graph.billing.access.collectAsState()
        PrimaryButton(if (access.unlocked || access == Access.Checking) "Start" else "Unlock learning") { nav.navigate(if (access.unlocked) "study" else "paywall") }
    }
    Card(color = PL.Vermilion, onClick = { nav.navigate("translate") }) {
        Text("Translate", style = Type.word.copy(fontSize = 24.sp()), color = PL.Paper)
        Text("Any word, every language you study", color = PL.Paper.copy(alpha = 0.9f))
    }
    TodayMore(graph, nav)
    Card(color = PL.Tyrian, onClick = { nav.navigate(Tab.Play.route) { launchSingleTop = true } }) {
        Text("Daily games", style = Type.title, color = PL.Paper)
        Text("${GameKind.entries.count { app?.played(it, system) != null }} of ${GameKind.entries.size} played today. Games are free.", color = PL.Paper.copy(alpha = 0.9f))
    }
    AdBanner(graph)
}

@Composable
fun LearnExtras(graph: Graph, nav: NavHostController) {
    val access by graph.billing.access.collectAsState()
    if (access == Access.Locked) {
        LockedPreview(nav)
        androidx.compose.foundation.layout.Box(androidx.compose.ui.Modifier.alpha(0.35f)) { androidx.compose.foundation.layout.Column { LearnedWords(graph, nav) } }
    } else LearnedWords(graph, nav)
}

@Composable
fun LockedPreview(nav: NavHostController) {
    Card(color = PL.Ink) {
        Text("LEARNING", style = Type.caps, color = PL.Paper.copy(alpha = 0.7f))
        Text("Daily sessions, every word you miss, all your languages", style = Type.title.copy(fontSize = 20.sp()), color = PL.Paper)
        Text("Games and live rooms stay free. Polingual Pro opens learning and removes ads.", color = PL.Paper.copy(alpha = 0.85f))
        PrimaryButton("See plans") { nav.navigate("paywall") }
    }
}
