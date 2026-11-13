package com.polingual.app

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import foundation.bucket.core.model.BucketError
import foundation.bucket.core.model.Lang
import foundation.bucket.core.net.RadioApi
import foundation.bucket.core.net.RadioStation
import foundation.bucket.core.ui.Card
import foundation.bucket.core.ui.D8
import foundation.bucket.core.ui.LocalPalette
import foundation.bucket.core.ui.Type
import kotlinx.coroutines.launch

@Composable
fun ListenScreen(graph: Graph, back: () -> Unit) {
    val p = LocalPalette.current
    val app by graph.state.collectAsState()
    val now by graph.radio.now.collectAsState()
    val langs = app?.system?.targets.orEmpty().filter { RadioApi.radioName(it) != null }.ifEmpty { listOf("es", "fr") }
    var lang by remember { mutableStateOf(langs.first()) }
    var stations by remember { mutableStateOf<List<RadioStation>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    LaunchedEffect(lang) {
        stations = null
        error = null
        try { stations = graph.radioApi.stations(lang) } catch (e: BucketError) { error = e.message; stations = emptyList() }
    }
    Page("Listen", back = back) {
        Text("Live radio in the languages you study. It keeps playing when you leave the app.", color = p.muted)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            langs.forEach { l -> FilterChip(selected = l == lang, onClick = { lang = l }, label = { Text("${Lang.flag(l)} ${Lang.name(l)}") }) }
        }
        now.station?.let { s ->
            Card(color = D8.ink, onClick = { scope.launch { graph.radio.play(s) } }) {
                Text("NOW PLAYING", style = Type.caps, color = D8.parchment.copy(alpha = 0.7f))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(s.name, style = Type.title.copy(fontSize = 20.sp()), color = D8.parchment, modifier = Modifier.weight(1f))
                    if (now.buffering) CircularProgressIndicator(color = D8.parchment) else Icon(if (now.playing) Icons.Filled.Pause else Icons.Filled.PlayArrow, if (now.playing) "Pause" else "Play", tint = D8.parchment)
                }
                now.error?.let { Text(it, color = D8.parchment) }
            }
        }
        val list = stations
        when {
            list == null -> CircularProgressIndicator(color = D8.vermilion)
            list.isEmpty() -> Text(error ?: "No stations found for ${Lang.name(lang)}.", color = p.muted)
            else -> list.forEach { s ->
                val active = now.station?.stationuuid == s.stationuuid
                Card(onClick = { scope.launch { graph.radio.play(s) } }) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(s.name, color = p.ink, style = Type.caps.copy(fontSize = 15.sp()))
                            Text(listOf(s.country, s.tags.split(",").take(2).joinToString(", ")).filter { it.isNotBlank() }.joinToString(" · "), color = p.muted)
                        }
                        Icon(if (active && now.playing) Icons.Filled.Pause else Icons.Filled.PlayArrow, if (active && now.playing) "Pause ${s.name}" else "Play ${s.name}", tint = D8.vermilion)
                    }
                }
            }
        }
        Text("Stations from radio-browser.info", style = Type.caps, color = p.muted, modifier = Modifier.fillMaxWidth())
    }
}
