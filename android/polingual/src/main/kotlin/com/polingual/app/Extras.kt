package com.polingual.app

import androidx.compose.runtime.Composable
import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import kotlinx.coroutines.launch

fun NavGraphBuilder.extraRoutes(graph: Graph, nav: NavHostController) {}

@Composable
fun TodayExtras(graph: Graph, nav: NavHostController) {}

@Composable
fun LearnExtras(graph: Graph, nav: NavHostController) {}

@Composable
fun AccountExtras(graph: Graph, nav: NavHostController) {}

@Composable
fun SignedInSection(graph: Graph, nav: NavHostController) {
    foundation.bucket.core.ui.Card {
        androidx.compose.material3.Text("Signed in", style = foundation.bucket.core.ui.Type.title)
        val scope = androidx.compose.runtime.rememberCoroutineScope()
        foundation.bucket.core.ui.PlainLink("Sign out") { scope.launch { graph.account.signOut() } }
    }
}

