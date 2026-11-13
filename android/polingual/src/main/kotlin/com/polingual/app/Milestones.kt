package com.polingual.app

import androidx.compose.runtime.Composable
import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import foundation.bucket.core.ui.Card
import foundation.bucket.core.ui.PlainLink
import kotlinx.coroutines.launch
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.navigation.compose.composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.setValue

fun NavGraphBuilder.milestoneRoutes(graph: Graph, nav: NavHostController) {
    composable("listen") { ListenScreen(graph) { nav.popBackStack() } }
    composable("paywall") { PaywallScreen(graph) { nav.popBackStack() } }
    composable("lobbies?code={code}", arguments = listOf(androidx.navigation.navArgument("code") { type = androidx.navigation.NavType.StringType; defaultValue = "" })) { e ->
        LobbiesScreen(graph, e.arguments?.getString("code").orEmpty()) { nav.popBackStack() }
    }
}

@Composable
fun TodayMore(graph: Graph, nav: NavHostController) {
    Card(color = foundation.bucket.core.ui.D8.malachite, onClick = { nav.navigate("lobbies") }) {
        androidx.compose.material3.Text("Live rooms", style = foundation.bucket.core.ui.Type.title, color = foundation.bucket.core.ui.D8.parchment)
        androidx.compose.material3.Text("Play the same round with friends, live", color = foundation.bucket.core.ui.D8.parchment.copy(alpha = 0.9f))
    }
    val now by graph.radio.now.collectAsState()
    Card(color = foundation.bucket.core.ui.D8.lapis, onClick = { nav.navigate("listen") }) {
        androidx.compose.material3.Text("Listen", style = foundation.bucket.core.ui.Type.title, color = foundation.bucket.core.ui.D8.parchment)
        androidx.compose.material3.Text(now.station?.let { "${if (now.playing) "Playing" else "Paused"}: ${it.name}" } ?: "Live radio in your languages", color = foundation.bucket.core.ui.D8.parchment.copy(alpha = 0.9f))
    }
}

@Composable
fun AccountExtras(graph: Graph, nav: NavHostController) {
    val access by graph.billing.access.collectAsState()
    val activity = graph.activity?.get()
    if (activity != null && graph.ads.shouldShow(access) && graph.ads.privacyOptionsRequired(activity)) {
        foundation.bucket.core.ui.SectionTitle("Ads")
        Card(onClick = { graph.ads.showPrivacyOptions(activity) }) {
            androidx.compose.material3.Text("Privacy choices", style = foundation.bucket.core.ui.Type.title.copy(fontSize = 18.sp()))
            androidx.compose.material3.Text("Change how ads use your data", color = foundation.bucket.core.ui.LocalPalette.current.muted)
        }
    }
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
    val p = foundation.bucket.core.ui.LocalPalette.current
    var problem by androidx.compose.runtime.remember { androidx.compose.runtime.mutableStateOf<String?>(null) }
    var note by androidx.compose.runtime.remember { androidx.compose.runtime.mutableStateOf<String?>(null) }
    var display by androidx.compose.runtime.remember { androidx.compose.runtime.mutableStateOf("") }
    var handle by androidx.compose.runtime.remember { androidx.compose.runtime.mutableStateOf("") }
    var confirming by androidx.compose.runtime.remember { androidx.compose.runtime.mutableStateOf(false) }
    var busy by androidx.compose.runtime.remember { androidx.compose.runtime.mutableStateOf(false) }
    var pendingSync by androidx.compose.runtime.remember { androidx.compose.runtime.mutableStateOf(false) }
    androidx.compose.runtime.LaunchedEffect(Unit) {
        val t = graph.account.token() ?: return@LaunchedEffect
        try { graph.api.profile(t)?.let { pr -> display = pr.displayName.orEmpty(); handle = pr.handle.orEmpty() } } catch (e: foundation.bucket.core.model.BucketError) { problem = "Your profile did not load. ${e.message}" }
    }
    fun act(block: suspend () -> Unit) = scope.launch {
        problem = null; note = null; busy = true
        try { block() } catch (e: foundation.bucket.core.model.BucketError) { problem = e.message } finally { busy = false }
    }
    Card {
        androidx.compose.material3.Text("Profile", style = foundation.bucket.core.ui.Type.title)
        androidx.compose.material3.OutlinedTextField(display, { display = it.take(60) }, singleLine = true, label = { androidx.compose.material3.Text("Display name") }, modifier = androidx.compose.ui.Modifier.fillMaxWidth())
        androidx.compose.material3.OutlinedTextField(handle, { handle = it.lowercase().filter { c -> c.isLetterOrDigit() || c == '-' || c == '_' }.take(32) }, singleLine = true,
            label = { androidx.compose.material3.Text("Username") }, prefix = { androidx.compose.material3.Text("@") }, modifier = androidx.compose.ui.Modifier.fillMaxWidth())
        androidx.compose.material3.Text("3 to 32 lowercase letters, numbers, - or _.", color = p.muted)
        foundation.bucket.core.ui.PrimaryButton(if (busy) "Saving" else "Save profile", enabled = !busy && handle.length >= 3, color = foundation.bucket.core.ui.D8.lapis) {
            act {
                val t = graph.account.token() ?: throw foundation.bucket.core.model.BucketError.Revoked
                val saved = graph.api.saveProfile(t, handle, display.trim())
                display = saved.displayName.orEmpty(); handle = saved.handle.orEmpty()
                if (display.isNotBlank()) graph.store.update { it.copy(nickname = display) }
                note = "Saved."
            }
        }
        note?.let { androidx.compose.material3.Text(it, color = foundation.bucket.core.ui.D8.malachite) }
    }
    Card {
        androidx.compose.material3.Text(graph.account.email.ifEmpty { "Signed in" }, color = p.ink)
        PlainLink("Sign out") { scope.launch { problem = null; pendingSync = false; try { graph.account.signOut() } catch (e: foundation.bucket.core.model.BucketError.SyncPending) { problem = e.message; pendingSync = true } catch (e: foundation.bucket.core.model.BucketError) { problem = e.message } } }
        if (pendingSync) PlainLink("Sign out anyway") { scope.launch { graph.account.signOut(force = true); problem = null } }
    }
    Card {
        androidx.compose.material3.Text("Delete account", style = foundation.bucket.core.ui.Type.title)
        androidx.compose.material3.Text("Deletes your account, progress, profile and live room history on every device. A Google Play subscription keeps billing until you cancel it in Google Play.", color = p.muted)
        if (!confirming) PlainLink("Delete my account") { confirming = true } else {
            androidx.compose.material3.Text("This cannot be undone.", color = foundation.bucket.core.ui.D8.vermilion)
            foundation.bucket.core.ui.PrimaryButton(if (busy) "Deleting" else "Delete forever", enabled = !busy) {
                act { try { graph.account.deleteAccount(); graph.store.clearLocal() } finally { confirming = false } }
            }
            PlainLink("Keep my account") { confirming = false }
        }
    }
    problem?.let { androidx.compose.material3.Text(it, color = foundation.bucket.core.ui.D8.vermilion) }
}
