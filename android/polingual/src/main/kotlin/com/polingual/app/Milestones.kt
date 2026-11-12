package com.polingual.app

import androidx.compose.runtime.Composable
import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import foundation.bucket.core.ui.Card
import foundation.bucket.core.ui.PlainLink
import kotlinx.coroutines.launch
import androidx.navigation.compose.composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.setValue

fun NavGraphBuilder.milestoneRoutes(graph: Graph, nav: NavHostController) {
    composable("listen") { ListenScreen(graph) { nav.popBackStack() } }
    composable("paywall") { PaywallScreen(graph) { nav.popBackStack() } }
}

@Composable
fun TodayMore(graph: Graph, nav: NavHostController) {
    val now by graph.radio.now.collectAsState()
    Card(color = foundation.bucket.core.ui.D8.lapis, onClick = { nav.navigate("listen") }) {
        androidx.compose.material3.Text("Listen", style = foundation.bucket.core.ui.Type.title, color = foundation.bucket.core.ui.D8.parchment)
        androidx.compose.material3.Text(now.station?.let { "${if (now.playing) "Playing" else "Paused"}: ${it.name}" } ?: "Live radio in your languages", color = foundation.bucket.core.ui.D8.parchment.copy(alpha = 0.9f))
    }
}

@Composable
fun AccountExtras(graph: Graph, nav: NavHostController) {
    val access by graph.billing.access.collectAsState()
    foundation.bucket.core.ui.SectionTitle("Subscription")
    Card(onClick = { nav.navigate("paywall") }) {
        androidx.compose.material3.Text(when (val a = access) {
            is Access.Subscribed -> "Subscribed: ${Plan.title(a.productId)}"
            is Access.Trial -> "Free trial"
            Access.Beta -> "Free beta access"
            Access.Checking -> "Checking"
            Access.Locked -> "Learning is locked. Games stay free."
        }, style = foundation.bucket.core.ui.Type.title.copy(fontSize = 18.sp()))
        androidx.compose.material3.Text("Plans, restore and manage", color = foundation.bucket.core.ui.LocalPalette.current.muted)
    }
}

@Composable
fun SignedInSection(graph: Graph, nav: NavHostController) {
    val scope = androidx.compose.runtime.rememberCoroutineScope()
    var problem by androidx.compose.runtime.remember { androidx.compose.runtime.mutableStateOf<String?>(null) }
    Card {
        androidx.compose.material3.Text("Signed in", style = foundation.bucket.core.ui.Type.title)
        PlainLink("Sign out") {
            scope.launch {
                try { graph.account.signOut() } catch (e: foundation.bucket.core.model.BucketError) { problem = e.message }
            }
        }
        problem?.let {
            androidx.compose.material3.Text(it, color = foundation.bucket.core.ui.D8.vermilion)
            PlainLink("Sign out anyway") { scope.launch { graph.account.signOut(force = true); problem = null } }
        }
    }
}
