package com.polingual.app

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AccountCircle
import androidx.compose.material.icons.outlined.MenuBook
import androidx.compose.material.icons.outlined.WbSunny
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.adaptive.navigationsuite.NavigationSuiteScaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import foundation.bucket.core.ui.LocalPalette

enum class Tab(val route: String, val label: String, val icon: ImageVector) {
    Today("today", "Today", Icons.Outlined.WbSunny),
    Learn("learn", "Learn", Icons.Outlined.MenuBook),
    Account("account", "Account", Icons.Outlined.AccountCircle),
}

@Composable
fun Root(graph: Graph, link: Link?, consumed: () -> Unit) {
    val state by graph.state.collectAsState()
    val s = state
    when {
        s == null -> Box(Modifier.fillMaxSize().background(LocalPalette.current.paper), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
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
        when (link) {
            is Link.Room -> nav.navigate("lobbies?code=${link.code}")
            is Link.Translate -> nav.navigate("translate?text=${android.net.Uri.encode(link.text)}")
            null -> return@LaunchedEffect
        }
        consumed()
    }
    NavigationSuiteScaffold(
        navigationSuiteItems = {
            Tab.entries.forEach { t ->
                item(
                    selected = route == t.route,
                    onClick = { nav.navigate(t.route) { popUpTo(Tab.Today.route) { saveState = true }; launchSingleTop = true; restoreState = true } },
                    icon = { Icon(t.icon, contentDescription = null) },
                    label = { Text(t.label) },
                )
            }
        },
    ) {
        Box(Modifier.fillMaxSize().background(LocalPalette.current.paper)) { Routes(graph, nav) }
    }
}

@Composable
fun Routes(graph: Graph, nav: NavHostController) {
    NavHost(nav, startDestination = Tab.Today.route) {
        composable(Tab.Today.route) { TodayScreen(graph, nav) }
        composable(Tab.Learn.route) { LearnScreen(graph, nav) }
        composable(Tab.Account.route) { AccountScreen(graph, nav) }
        composable("system/new") { NewSystemScreen(graph) { nav.popBackStack() } }
        extraRoutes(graph, nav)
    }
}
