package com.polingual.app

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.material3.adaptive.navigationsuite.NavigationSuiteDefaults
import androidx.compose.material3.adaptive.navigationsuite.NavigationSuiteScaffold
import androidx.compose.foundation.layout.size
import androidx.compose.ui.unit.dp
import foundation.bucket.core.ui.pl.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import foundation.bucket.core.ui.LocalPalette

enum class Tab(val route: String, val label: String, val art: String) {
    Today("today", "Today", "streak-flame"),
    Learn("learn", "Learn", "seal"),
    Play("play", "Play", "blocks"),
    Account("account", "Account", "azulejo"),
}

@Composable
fun Root(graph: Graph, link: Link?, consumed: () -> Unit) {
    val state by graph.state.collectAsState()
    val s = state
    when {
        s == null -> GroundBox(Ground.Paper, Modifier.fillMaxSize()) { CircularProgressIndicator(Modifier.align(Alignment.Center), color = PL.Vermilion) }
        !s.onboarded -> Onboarding(graph)
        else -> Main(graph, link, consumed)
    }
}

@Composable
fun Main(graph: Graph, link: Link?, consumed: () -> Unit) {
    val nav = rememberNavController()
    val entry by nav.currentBackStackEntryAsState()
    val route = entry?.destination?.route
    LaunchedEffect(link) {
        val route = when (link) {
            is Link.Room -> "lobbies?code=${android.net.Uri.encode(link.code)}"
            is Link.Translate -> "translate?text=${android.net.Uri.encode(link.text)}"
            null -> return@LaunchedEffect
        }
        runCatching { nav.navigate(route) }
        consumed()
    }
    NavigationSuiteScaffold(
        navigationSuiteItems = {
            Tab.entries.forEach { t ->
                item(
                    selected = route == t.route,
                    onClick = { nav.navigate(t.route) { popUpTo(Tab.Today.route) { saveState = true }; launchSingleTop = true; restoreState = true } },
                    icon = { Art(t.art, Modifier.size(26.dp)) },
                    label = { Text(t.label, style = Type.small) },
                )
            }
        },
        navigationSuiteColors = NavigationSuiteDefaults.colors(navigationBarContainerColor = PL.Card, navigationRailContainerColor = PL.Card),
        containerColor = PL.Paper,
    ) {
        val access by graph.billing.access.collectAsState()
        val rootLang = graph.state.collectAsState().value?.system?.root ?: "en"
        androidx.compose.runtime.CompositionLocalProvider(LocalRootLang provides rootLang, LocalStartLearning provides { nav.navigate(PlayRules.startLearningRoute(access)) { launchSingleTop = true } }) {
            Box(Modifier.fillMaxSize()) { Routes(graph, nav) }
        }
    }
}

@Composable
fun Routes(graph: Graph, nav: NavHostController) {
    NavHost(nav, startDestination = Tab.Today.route) {
        composable(Tab.Today.route) { TodayScreen(graph, nav) }
        composable(Tab.Learn.route) { LearnScreen(graph, nav) }
        composable(Tab.Play.route) { PlayScreen(graph, nav) }
        composable(Tab.Account.route) { AccountScreen(graph, nav) }
        composable("system/new") { NewSystemScreen(graph) { nav.popBackStack() } }
        extraRoutes(graph, nav)
    }
}

val LocalStartLearning = androidx.compose.runtime.staticCompositionLocalOf<() -> Unit> { {} }
