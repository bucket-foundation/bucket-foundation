package com.polingual.app

import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.compose.composable

fun NavGraphBuilder.parityRoutes(graph: Graph, nav: NavHostController) {
    composable("placement") {
        PlacementScreen(graph, back = { nav.popBackStack() }) { nav.navigate("study") { popUpTo("placement") { inclusive = true } } }
    }
    composable("letters/{lang}") { e -> LettersScreen(graph, e.arguments?.getString("lang").orEmpty()) { nav.popBackStack() } }
    composable("sounds/{lang}") { e -> SoundDrillScreen(graph, e.arguments?.getString("lang").orEmpty()) { nav.popBackStack() } }
}
