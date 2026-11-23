package com.polingual.app

import androidx.compose.runtime.Composable
import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import com.polingual.brand.Card
import com.polingual.brand.PlainLink
import kotlinx.coroutines.launch
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.navigation.compose.composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.setValue

fun NavGraphBuilder.milestoneRoutes(graph: Graph, nav: NavHostController) {
    composable("listen") { ListenScreen(graph) { nav.popBackStack() } }
    composable("paywall") { PaywallScreen(graph) { graph.onboard.set(OnboardStage.Done); nav.popBackStack() } }
    composable("lobbies?code={code}", arguments = listOf(androidx.navigation.navArgument("code") { type = androidx.navigation.NavType.StringType; defaultValue = "" })) { e ->
        LobbiesScreen(graph, e.arguments?.getString("code").orEmpty()) { nav.popBackStack() }
    }
}

@Composable
fun TodayMore(graph: Graph, nav: NavHostController) {
    val now by graph.radio.now.collectAsState()
    val radio = now.station?.let { androidx.compose.ui.res.stringResource(if (now.playing) R.string.radio_playing else R.string.radio_paused, it.name) } ?: androidx.compose.ui.res.stringResource(R.string.radio_live)
    val tiles = listOf(
        Triple(androidx.compose.ui.res.stringResource(R.string.d_live), androidx.compose.ui.res.stringResource(R.string.d_live_blurb), com.polingual.brand.D8.tyrian) to "lobbies",
        Triple(androidx.compose.ui.res.stringResource(R.string.d_watch), androidx.compose.ui.res.stringResource(R.string.d_watch_blurb), com.polingual.brand.D8.ink) to "videos",
        Triple(androidx.compose.ui.res.stringResource(R.string.s_listen), radio, com.polingual.brand.D8.lapis) to "listen",
        Triple(androidx.compose.ui.res.stringResource(R.string.q_type), androidx.compose.ui.res.stringResource(R.string.d_translate_blurb), com.polingual.brand.D8.vermilion) to "translate",
    )
    TwoUp(tiles) { (t, route), m -> com.polingual.brand.GameCard(t.first, t.second, t.third, m) { nav.navigate(route) } }
}

@Composable
fun AccountExtras(graph: Graph, nav: NavHostController) {
    NotificationSettings(graph)
    BetaSharing(graph)
    val access by graph.billing.access.collectAsState()
    val activity = graph.activity?.get()
    if (activity != null && graph.ads.shouldShow(access) && graph.ads.privacyOptionsRequired(activity)) {
        com.polingual.brand.SectionTitle(androidx.compose.ui.res.stringResource(R.string.s_ads))
        Card(onClick = { graph.ads.showPrivacyOptions(activity) }) {
            androidx.compose.material3.Text(androidx.compose.ui.res.stringResource(R.string.s_privacy_choices), style = com.polingual.brand.Type.title.copy(fontSize = 18.sp()))
            androidx.compose.material3.Text(androidx.compose.ui.res.stringResource(R.string.s_change_how_ads_use_your_data), color = foundation.bucket.core.ui.LocalPalette.current.muted)
        }
    }
    com.polingual.brand.SectionTitle(androidx.compose.ui.res.stringResource(R.string.s_subscription))
    Card(onClick = { nav.navigate("paywall") }) {
        androidx.compose.material3.Text(when (val a = access) {
            is Access.Subscribed -> androidx.compose.ui.res.stringResource(R.string.sub_subscribed, androidx.compose.ui.res.stringResource(Plan.title(a.productId)))
            is Access.Trial -> androidx.compose.ui.res.stringResource(R.string.s_free_trial)
            Access.Beta -> androidx.compose.ui.res.stringResource(R.string.s_free_beta_access)
            Access.Checking -> androidx.compose.ui.res.stringResource(R.string.s_checking)
            Access.Locked -> androidx.compose.ui.res.stringResource(R.string.s_learning_is_locked_games_stay_free)
        }, style = com.polingual.brand.Type.title.copy(fontSize = 18.sp()))
        androidx.compose.material3.Text(androidx.compose.ui.res.stringResource(R.string.s_plans_restore_and_manage), color = foundation.bucket.core.ui.LocalPalette.current.muted)
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
        try { graph.api.profile(t)?.let { pr -> display = pr.displayName.orEmpty(); handle = pr.handle.orEmpty() } } catch (e: foundation.bucket.core.model.BucketError) { problem = graph.context.getString(R.string.s_your_profile_did_not_load_x, e.message) }
    }
    fun act(block: suspend () -> Unit) = scope.launch {
        problem = null; note = null; busy = true
        try { block() } catch (e: foundation.bucket.core.model.BucketError) { problem = e.message } finally { busy = false }
    }
    Card {
        androidx.compose.material3.Text(androidx.compose.ui.res.stringResource(R.string.s_profile), style = com.polingual.brand.Type.title)
        androidx.compose.material3.OutlinedTextField(display, { display = it.take(60) }, singleLine = true, label = { androidx.compose.material3.Text(androidx.compose.ui.res.stringResource(R.string.s_display_name)) }, modifier = androidx.compose.ui.Modifier.fillMaxWidth())
        androidx.compose.material3.OutlinedTextField(handle, { handle = it.lowercase().filter { c -> c.isLetterOrDigit() || c == '-' || c == '_' }.take(32) }, singleLine = true,
            label = { androidx.compose.material3.Text(androidx.compose.ui.res.stringResource(R.string.s_username)) }, prefix = { androidx.compose.material3.Text("@") }, modifier = androidx.compose.ui.Modifier.fillMaxWidth())
        androidx.compose.material3.Text(androidx.compose.ui.res.stringResource(R.string.s_3_to_32_lowercase_letters_numbers), color = p.muted)
        com.polingual.brand.PrimaryButton(if (busy) androidx.compose.ui.res.stringResource(R.string.s_saving) else androidx.compose.ui.res.stringResource(R.string.s_save_profile), enabled = !busy && handle.length >= 3, color = com.polingual.brand.D8.lapis) {
            act {
                val t = graph.account.token() ?: throw foundation.bucket.core.model.BucketError.Revoked
                val saved = graph.api.saveProfile(t, handle, display.trim())
                display = saved.displayName.orEmpty(); handle = saved.handle.orEmpty()
                if (display.isNotBlank()) graph.store.update { it.copy(nickname = display) }
                note = "Saved."
            }
        }
        note?.let { androidx.compose.material3.Text(it, color = com.polingual.brand.D8.malachite) }
    }
    Card {
        androidx.compose.material3.Text(graph.account.email.ifEmpty { androidx.compose.ui.res.stringResource(R.string.s_signed_in) }, color = p.ink)
        PlainLink(androidx.compose.ui.res.stringResource(R.string.s_sign_out)) { scope.launch { problem = null; pendingSync = false; try { graph.account.signOut() } catch (e: foundation.bucket.core.model.BucketError.SyncPending) { problem = e.message; pendingSync = true } catch (e: foundation.bucket.core.model.BucketError) { problem = e.message } } }
        if (pendingSync) PlainLink(androidx.compose.ui.res.stringResource(R.string.s_sign_out_anyway)) { scope.launch { graph.account.signOut(force = true); problem = null } }
    }
    Card {
        androidx.compose.material3.Text(androidx.compose.ui.res.stringResource(R.string.s_delete_account), style = com.polingual.brand.Type.title)
        androidx.compose.material3.Text(androidx.compose.ui.res.stringResource(R.string.s_deletes_your_account_progress_profile_and), color = p.muted)
        if (!confirming) PlainLink(androidx.compose.ui.res.stringResource(R.string.s_delete_my_account)) { confirming = true } else {
            androidx.compose.material3.Text(androidx.compose.ui.res.stringResource(R.string.s_this_cannot_be_undone), color = com.polingual.brand.D8.vermilion)
            com.polingual.brand.PrimaryButton(if (busy) androidx.compose.ui.res.stringResource(R.string.s_deleting) else androidx.compose.ui.res.stringResource(R.string.s_delete_forever), enabled = !busy) {
                act { try { graph.account.deleteAccount(); graph.store.clearLocal() } finally { confirming = false } }
            }
            PlainLink(androidx.compose.ui.res.stringResource(R.string.s_keep_my_account)) { confirming = false }
        }
    }
    problem?.let { androidx.compose.material3.Text(it, color = com.polingual.brand.D8.vermilion) }
}
