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
import com.polingual.brand.Card
import com.polingual.brand.D8
import foundation.bucket.core.ui.LocalPalette
import com.polingual.brand.PlainLink
import com.polingual.brand.PrimaryButton
import com.polingual.brand.SectionTitle
import com.polingual.brand.Type
import kotlinx.coroutines.launch
import androidx.compose.ui.draw.alpha

fun NavGraphBuilder.extraRoutes(graph: Graph, nav: NavHostController) {
    composable("study") { StudyScreen(graph) { nav.popBackStack() } }
    composable("game/{kind}", arguments = listOf(navArgument("kind") { type = NavType.StringType })) { e ->
        val kind = GameKind.entries.firstOrNull { it.route == e.arguments?.getString("kind") }
        if (kind == null) androidx.compose.runtime.LaunchedEffect(Unit) { nav.popBackStack() } else GameScreen(graph, kind) { nav.popBackStack() }
    }
    composable("videos") { WatchPanes(graph, nav) }
    composable("video/{id}") { e -> VideoScreen(graph, e.arguments?.getString("id").orEmpty()) { nav.popBackStack() } }
    composable("word/{id}") { e -> WordDetailScreen(graph, e.arguments?.getString("id").orEmpty()) { nav.popBackStack() } }
    composable("translate?text={text}", arguments = listOf(navArgument("text") { type = NavType.StringType; defaultValue = "" })) { e ->
        TranslateScreen(graph, e.arguments?.getString("text").orEmpty()) { nav.popBackStack() }
    }
    milestoneRoutes(graph, nav)
    parityRoutes(graph, nav)
}

@Composable
fun TodayExtras(graph: Graph, nav: NavHostController) {
    val app by graph.state.collectAsState()
    val p = LocalPalette.current
    val system = app?.system
    if (system == null) { TodayMore(graph, nav); return }
    val due = app?.study?.get(system.id)?.cards?.values?.count { it.due <= System.currentTimeMillis() } ?: 0
    Card(color = D8.tyrianDeep) {
        com.polingual.brand.Label(androidx.compose.ui.res.stringResource(R.string.s_daily_session), color = D8.ochre)
        Text(if (due > 0) androidx.compose.ui.res.stringResource(R.string.s_x_reviews_and_new_words, due) else androidx.compose.ui.res.stringResource(R.string.s_new_words_in_x_languages, system.targets.size), style = Type.title.copy(fontSize = 21.sp()), color = D8.parchment)
        val access by graph.billing.access.collectAsState()
        PrimaryButton(if (access.unlocked || access == Access.Checking) androidx.compose.ui.res.stringResource(R.string.s_start) else androidx.compose.ui.res.stringResource(R.string.s_unlock_learning)) { nav.navigate(if (access.unlocked) "study" else "paywall") }
    }
    SectionTitle(androidx.compose.ui.res.stringResource(R.string.s_daily_games))
    val games = GameKind.entries.filter { it != GameKind.Letters || system.targets.any { l -> foundation.bucket.core.model.Lang.info[l]?.latin == false } }
    TwoUp(games) { k, m ->
        val played = app?.played(k, system)?.let { r -> androidx.compose.ui.res.stringResource(R.string.d_x_of_x_today, r.count { it == '1' }, r.length) }
        GameTile(k, played, m) { nav.navigate("game/${k.route}") }
    }
    SectionTitle("More ways to play")
    TodayMore(graph, nav)
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
    Card(color = D8.ink) {
        Text(androidx.compose.ui.res.stringResource(R.string.s_learning), style = Type.caps, color = D8.parchment.copy(alpha = 0.7f))
        Text(androidx.compose.ui.res.stringResource(R.string.s_daily_sessions_every_word_you_miss), style = Type.title.copy(fontSize = 20.sp()), color = D8.parchment)
        Text(androidx.compose.ui.res.stringResource(R.string.s_games_and_live_rooms_stay_free), color = D8.parchment.copy(alpha = 0.85f))
        PrimaryButton(androidx.compose.ui.res.stringResource(R.string.s_see_plans)) { nav.navigate("paywall") }
    }
}
