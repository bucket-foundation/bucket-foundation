package com.polingual.app

import androidx.compose.runtime.Composable
import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import foundation.bucket.core.ui.Card
import foundation.bucket.core.ui.PlainLink
import kotlinx.coroutines.launch

fun NavGraphBuilder.milestoneRoutes(graph: Graph, nav: NavHostController) {}

@Composable
fun TodayMore(graph: Graph, nav: NavHostController) {}

@Composable
fun AccountExtras(graph: Graph, nav: NavHostController) {}

@Composable
fun SignedInSection(graph: Graph, nav: NavHostController) {
    Card {
        androidx.compose.material3.Text("Signed in", style = foundation.bucket.core.ui.Type.title)
        val scope = androidx.compose.runtime.rememberCoroutineScope()
        PlainLink("Sign out") { scope.launch { graph.account.signOut() } }
    }
}
