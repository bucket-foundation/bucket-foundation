package com.polingual.app

import androidx.compose.material3.adaptive.layout.AnimatedPane
import android.annotation.SuppressLint
import android.content.Context
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebView
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayCircle
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableDoubleStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.navigation.NavHostController
import foundation.bucket.core.model.Lang
import com.polingual.brand.D8
import foundation.bucket.core.ui.LocalPalette
import com.polingual.brand.Type
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.launch
import java.net.HttpURLConnection
import java.net.URL

class VideoRepo(private val context: Context, private val base: String = BASE) {
    suspend fun index(): VideoIndex = withContext(Dispatchers.IO) {
        runCatching { VideoLogic.parseIndex(fetch("$base/videos/index.json")) }.getOrNull()?.takeIf { it.videos.isNotEmpty() }
            ?: VideoLogic.parseIndex(asset("videos/index.json"))
    }

    suspend fun video(id: String): VideoDoc = withContext(Dispatchers.IO) {
        val safe = id.filter { it.isLetterOrDigit() || it == '-' || it == '_' }
        runCatching { VideoLogic.parseDoc(fetch("$base/videos/$safe.json")) }.getOrNull()?.takeIf { it.cues.isNotEmpty() }
            ?: VideoLogic.parseDoc(asset("videos/sample.json")).takeIf { it.id == safe }
            ?: throw NoSuchElementException("video $safe")
    }

    private fun asset(path: String): String = context.assets.open(path).bufferedReader().use { it.readText() }

    private fun fetch(url: String): String {
        val c = URL(url).openConnection() as HttpURLConnection
        c.connectTimeout = 8_000
        c.readTimeout = 15_000
        try {
            check(c.responseCode == 200) { "HTTP ${c.responseCode}" }
            return c.inputStream.bufferedReader().use { it.readText() }
        } finally {
            c.disconnect()
        }
    }

    companion object {
        const val BASE = "https://polingual.com"
    }
}

@Composable
fun VideoTile(onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(D8.ink).clickable(role = Role.Button, onClick = onClick).padding(horizontal = 12.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Filled.PlayCircle, contentDescription = null, tint = D8.parchment, modifier = Modifier.size(44.dp))
        Column(Modifier.weight(1f)) {
            Text(androidx.compose.ui.res.stringResource(R.string.s_watch), style = Type.title.copy(fontSize = 19.sp()), color = D8.parchment)
            Text(androidx.compose.ui.res.stringResource(R.string.s_videos_with_live_subtitles_in_up), color = D8.parchment.copy(alpha = 0.9f))
        }
    }
}

@Composable
fun VideoListScreen(graph: Graph, nav: NavHostController, selected: String? = null, onPick: (String) -> Unit = { nav.navigate("video/$it") }) {
    var index by remember { mutableStateOf<VideoIndex?>(null) }
    var failed by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { runCatching { graph.videos.index() }.onSuccess { index = it }.onFailure { failed = true } }
    val p = LocalPalette.current
    PlayPage(androidx.compose.ui.res.stringResource(R.string.s_watch), back = { nav.popBackStack() }, trailing = { RewardBar(graph.rewards) }) {
        val list = index?.videos
        when {
            failed -> Text(androidx.compose.ui.res.stringResource(R.string.s_videos_could_not_load_check_your), color = p.muted)
            list == null -> Text(androidx.compose.ui.res.stringResource(R.string.s_loading_videos), color = p.muted)
            else -> list.forEach { v ->
                com.polingual.brand.Card(color = if (v.id == selected) D8.parchment2 else D8.white, onClick = { onPick(v.id) }) {
                    Text(v.title, style = Type.title.copy(fontSize = 19.sp()), color = D8.tyrian)
                    Text("${v.channel}  ${VideoLogic.clock(v.duration)}  ${v.langs.joinToString(" ") { Lang.flag(it) }}", color = p.muted)
                }
            }
        }
    }
}

class PlayerBridge {
    var onTime: (Double) -> Unit = {}
    var onReady: () -> Unit = {}

    @JavascriptInterface
    fun time(t: Double) { onTime(t) }

    @JavascriptInterface
    fun ready() { onReady() }
}

object PlayerHosts {
    private val allowed = listOf("youtube.com", "youtube-nocookie.com", "ytimg.com", "googlevideo.com", "polingual.com")

    fun allows(url: String): Boolean {
        if (url == "about:blank") return true
        val uri = runCatching { java.net.URI(url) }.getOrNull() ?: return false
        if (uri.scheme != "https") return false
        val host = uri.host?.lowercase() ?: return false
        return allowed.any { host == it || host.endsWith(".$it") }
    }
}

class PlayerClient : android.webkit.WebViewClient() {
    override fun shouldOverrideUrlLoading(view: WebView, request: android.webkit.WebResourceRequest): Boolean = !PlayerHosts.allows(request.url.toString())
}

fun playerHtml(videoId: String): String = """
<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;height:100%;background:#000}#p{width:100%;height:100%}</style></head>
<body><div id="p"></div><script src="https://www.youtube.com/iframe_api"></script><script>
var player;
function onYouTubeIframeAPIReady(){player=new YT.Player('p',{videoId:'$videoId',playerVars:{playsinline:1,rel:0,modestbranding:1,cc_load_policy:0},events:{onReady:function(){Android.ready()}}});
setInterval(function(){if(player&&player.getCurrentTime){Android.time(player.getCurrentTime())}},250);}
function seekTo(t){if(player){player.seekTo(t,true);player.playVideo()}}
</script></body></html>
""".trimIndent()

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun YouTubePlayer(videoId: String, seek: Pair<Int, Double>?, onTime: (Double) -> Unit, modifier: Modifier = Modifier) {
    val bridge: PlayerBridge = remember { PlayerBridge() }
    bridge.onTime = onTime
    var web by remember { mutableStateOf<WebView?>(null) }
    var ready by remember { mutableStateOf(false) }
    val host = androidx.compose.ui.platform.LocalView.current
    bridge.onReady = { host.post { ready = true } }
    val owner = androidx.lifecycle.compose.LocalLifecycleOwner.current
    AndroidView(
        modifier = modifier,
        factory = { ctx ->
            WebView(ctx).apply {
                settings.javaScriptEnabled = true
                settings.mediaPlaybackRequiresUserGesture = false
                settings.domStorageEnabled = true
                webChromeClient = WebChromeClient()
                webViewClient = PlayerClient()
                addJavascriptInterface(bridge as PlayerBridge, "Android")
                loadDataWithBaseURL(VideoRepo.BASE, playerHtml(videoId.filter { it.isLetterOrDigit() || it == '-' || it == '_' }), "text/html", "utf-8", null)
                web = this
            }
        },
    )
    LaunchedEffect(seek, ready) { if (ready) seek?.let { (_, t) -> web?.evaluateJavascript("seekTo($t)", null) } }
    DisposableEffect(owner) {
        val observer = androidx.lifecycle.LifecycleEventObserver { _, event ->
            when (event) {
                androidx.lifecycle.Lifecycle.Event.ON_PAUSE -> web?.let { it.evaluateJavascript("if(player&&player.pauseVideo){player.pauseVideo()}", null); it.onPause() }
                androidx.lifecycle.Lifecycle.Event.ON_RESUME -> web?.onResume()
                else -> Unit
            }
        }
        owner.lifecycle.addObserver(observer)
        onDispose {
            owner.lifecycle.removeObserver(observer)
            web?.let { w ->
                w.stopLoading()
                w.removeJavascriptInterface("Android")
                (w.parent as? android.view.ViewGroup)?.removeView(w)
                w.loadUrl("about:blank")
                w.destroy()
            }
            web = null
        }
    }
}

@OptIn(ExperimentalLayoutApi::class, ExperimentalFoundationApi::class)
@Composable
fun VideoScreen(graph: Graph, id: String, back: () -> Unit) {
    var doc by remember { mutableStateOf<VideoDoc?>(null) }
    var failed by remember { mutableStateOf(false) }
    LaunchedEffect(id) { runCatching { graph.videos.video(id) }.onSuccess { doc = it }.onFailure { failed = true } }
    val app by graph.state.collectAsState()
    val p = LocalPalette.current
    val view = rememberHost()
    val d = doc
    PlayPage(d?.title ?: androidx.compose.ui.res.stringResource(R.string.s_watch), back = back, scroll = false, trailing = { RewardBar(graph.rewards) }) {
        if (d == null) {
            Text(if (failed) androidx.compose.ui.res.stringResource(R.string.s_this_video_could_not_load) else androidx.compose.ui.res.stringResource(R.string.s_loading), color = p.muted)
            return@PlayPage
        }
        val preferred = app?.system?.let { listOf(it.root) + it.targets }.orEmpty()
        var langs by remember(d.id) { mutableStateOf(VideoLogic.defaultLangs(d.langs.ifEmpty { d.cues.firstOrNull()?.text?.keys?.toList().orEmpty() }, preferred, d.source_lang)) }
        var now by remember { mutableDoubleStateOf(0.0) }
        var seek by remember { mutableStateOf<Pair<Int, Double>?>(null) }
        var seeks by remember { mutableIntStateOf(0) }
        var toast by remember { mutableStateOf<String?>(null) }
        var saved by remember { mutableStateOf(loadSaved(graph)) }
        val active = VideoLogic.activeCue(d.cues, now)
        val list = rememberLazyListState()
        LaunchedEffect(active) { if (active >= 0) list.animateScrollToItem(maxOf(0, active - 1)) }
        LaunchedEffect(toast) { if (toast != null) { kotlinx.coroutines.delay(1500); toast = null } }

        YouTubePlayer(d.id, seek, onTime = { t -> view.post { now = t } }, modifier = Modifier.fillMaxWidth().aspectRatio(16f / 9f).clip(RoundedCornerShape(10.dp)))
        Row(Modifier.fillMaxWidth().horizontalScroll(androidx.compose.foundation.rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
            d.langs.forEach { l -> com.polingual.brand.Chip("${Lang.flag(l)} ${l.uppercase()}", l in langs) { langs = VideoLogic.toggleLang(langs, l) } }
        }
        toast?.let { Text(it, color = D8.malachite, style = Type.title.copy(fontSize = 14.sp())) }
        LazyColumn(state = list, modifier = Modifier.weight(1f).fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            itemsIndexed(d.cues) { i, cue ->
                val on = i == active
                Column(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(if (on) D8.lapis.copy(alpha = 0.14f) else Color.Transparent)
                        .clickable { seeks += 1; seek = seeks to cue.start; view.performHapticFeedback(android.view.HapticFeedbackConstants.KEYBOARD_TAP) }
                        .padding(horizontal = 8.dp, vertical = 6.dp),
                ) {
                    Text(VideoLogic.clock(cue.start), color = p.muted, style = Type.caps)
                    langs.forEach { l ->
                        val line = cue.text[l] ?: return@forEach
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(4.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                            Text(Lang.flag(l), color = p.ink)
                            VideoLogic.words(line).forEach { token ->
                                Text(
                                    token,
                                    color = if (on) p.ink else p.ink.copy(alpha = 0.75f),
                                    style = if (on && l == langs.first()) Type.title.copy(fontSize = 17.sp()) else com.polingual.brand.Type.body,
                                    modifier = Modifier.combinedClickable(
                                        onClick = { seeks += 1; seek = seeks to cue.start },
                                        onLongClick = {
                                            val w = VideoLogic.clean(token)
                                            val next = VideoLogic.addSaved(saved, SavedWord(w, l, d.id, cue.start))
                                            if (next.size > saved.size) {
                                                saved = next
                                                storeSaved(graph, saved)
                                                graph.rewards.addXp(SAVE_XP)
                                                graph.rewards.tap(view)
                                                toast = view.context.getString(R.string.d_saved_x, w)
                                            } else if (w.isNotBlank()) toast = view.context.getString(R.string.d_x_is_saved, w)
                                        },
                                    ),
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

fun loadSaved(graph: Graph): List<SavedWord> = runCatching {
    VideoLogic.json.decodeFromString(kotlinx.serialization.builtins.ListSerializer(SavedWord.serializer()), graph.kv.get(SAVED_KEY) ?: "[]")
}.getOrDefault(emptyList())

fun storeSaved(graph: Graph, list: List<SavedWord>) {
    graph.kv.set(SAVED_KEY, VideoLogic.json.encodeToString(kotlinx.serialization.builtins.ListSerializer(SavedWord.serializer()), list))
}

const val SAVED_KEY = "video.saved"
const val SAVE_XP = 2

@OptIn(androidx.compose.material3.adaptive.ExperimentalMaterial3AdaptiveApi::class)
@Composable
fun WatchPanes(graph: Graph, nav: NavHostController) {
    val navigator = androidx.compose.material3.adaptive.navigation.rememberListDetailPaneScaffoldNavigator<String>()
    val scope = androidx.compose.runtime.rememberCoroutineScope()
    val two = navigator.scaffoldValue[androidx.compose.material3.adaptive.layout.ListDetailPaneScaffoldRole.List] == androidx.compose.material3.adaptive.layout.PaneAdaptedValue.Expanded &&
        navigator.scaffoldValue[androidx.compose.material3.adaptive.layout.ListDetailPaneScaffoldRole.Detail] == androidx.compose.material3.adaptive.layout.PaneAdaptedValue.Expanded
    val current = navigator.currentDestination?.contentKey
    androidx.compose.material3.adaptive.navigation.NavigableListDetailPaneScaffold(
        navigator = navigator,
        listPane = {
            AnimatedPane {
                VideoListScreen(graph, nav, selected = current) { id ->
                    scope.launch { navigator.navigateTo(androidx.compose.material3.adaptive.layout.ListDetailPaneScaffoldRole.Detail, id) }
                }
            }
        },
        detailPane = {
            AnimatedPane {
                val id = current
                if (id != null) androidx.compose.runtime.key(id) {
                    VideoScreen(graph, id) { if (two) nav.popBackStack() else scope.launch { navigator.navigateBack() } }
                } else Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                    Text(androidx.compose.ui.res.stringResource(R.string.d_pick_a_video), style = Type.title.copy(fontSize = 20.sp()), color = D8.ink2)
                }
            }
        },
    )
}
