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
import androidx.compose.runtime.setValue
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
    val stage by graph.onboard.stage.collectAsState()
    val notify = androidx.activity.compose.rememberLauncherForActivityResult(androidx.activity.result.contract.ActivityResultContracts.RequestPermission()) { }
    var lastStage by androidx.compose.runtime.remember { androidx.compose.runtime.mutableStateOf(stage) }
    LaunchedEffect(stage) {
        when (stage) {
            OnboardStage.Lesson -> runCatching { nav.navigate("game/${GameKind.Daily.route}") }
            OnboardStage.Paywall -> {
                kotlinx.coroutines.delay(2600)
                runCatching { nav.navigate("paywall") { popUpTo(Tab.Today.route) } }
            }
            OnboardStage.Done -> if (lastStage == OnboardStage.Paywall && android.os.Build.VERSION.SDK_INT >= 33 && graph.kv.get("notify.asked") == null) {
                graph.kv.set("notify.asked", "1")
                notify.launch(android.Manifest.permission.POST_NOTIFICATIONS)
            }
        }
        lastStage = stage
    }
    LaunchedEffect(link) {
        val route = when (link) {
            is Link.Room -> "lobbies?code=${android.net.Uri.encode(link.code)}"
            is Link.Translate -> "translate?text=${android.net.Uri.encode(link.text)}"
            null -> return@LaunchedEffect
        }
        runCatching { nav.navigate(route) }
        consumed()
    }
    val playing = route != null && (route.startsWith("game/") || route.startsWith("video") || route == "paywall")
    val itemColors = navItemColors()
    NavigationSuiteScaffold(
        navigationSuiteColors = androidx.compose.material3.adaptive.navigationsuite.NavigationSuiteDefaults.colors(
            navigationBarContainerColor = com.polingual.brand.D8.tyrianDeep,
            navigationRailContainerColor = com.polingual.brand.D8.tyrianDeep,
            navigationDrawerContainerColor = com.polingual.brand.D8.tyrianDeep,
        ),
        layoutType = if (playing) androidx.compose.material3.adaptive.navigationsuite.NavigationSuiteType.None else androidx.compose.material3.adaptive.navigationsuite.NavigationSuiteScaffoldDefaults.calculateFromAdaptiveInfo(androidx.compose.material3.adaptive.currentWindowAdaptiveInfo()),
        navigationSuiteItems = {
            Tab.entries.forEach { t ->
                item(
                    selected = route == t.route,
                    onClick = { nav.navigate(t.route) { popUpTo(Tab.Today.route) { saveState = true }; launchSingleTop = true; restoreState = true } },
                    icon = { Icon(t.icon, contentDescription = null) },
                    label = { Text(t.label.uppercase(), style = com.polingual.brand.Type.caps.copy(fontSize = 11.sp())) },
                    colors = itemColors,
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

@Composable
fun navItemColors() = androidx.compose.material3.adaptive.navigationsuite.NavigationSuiteDefaults.itemColors(
    navigationBarItemColors = androidx.compose.material3.NavigationBarItemDefaults.colors(
        selectedIconColor = com.polingual.brand.D8.parchment, selectedTextColor = com.polingual.brand.D8.ochre, indicatorColor = com.polingual.brand.D8.vermilion,
        unselectedIconColor = com.polingual.brand.D8.parchment.copy(alpha = 0.7f), unselectedTextColor = com.polingual.brand.D8.parchment.copy(alpha = 0.7f),
    ),
    navigationRailItemColors = androidx.compose.material3.NavigationRailItemDefaults.colors(
        selectedIconColor = com.polingual.brand.D8.parchment, selectedTextColor = com.polingual.brand.D8.ochre, indicatorColor = com.polingual.brand.D8.vermilion,
        unselectedIconColor = com.polingual.brand.D8.parchment.copy(alpha = 0.7f), unselectedTextColor = com.polingual.brand.D8.parchment.copy(alpha = 0.7f),
    ),
)
