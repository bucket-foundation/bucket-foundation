package com.polingual.app

import androidx.compose.foundation.clickable
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.VolumeUp
import androidx.compose.material.icons.filled.SwapHoriz
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import foundation.bucket.core.engine.LangCorpus
import foundation.bucket.core.engine.LangItem
import foundation.bucket.core.engine.TranslateAnswer
import foundation.bucket.core.engine.TranslateEngine
import foundation.bucket.core.engine.translateSources
import foundation.bucket.core.model.Lang
import com.polingual.brand.Card
import com.polingual.brand.D8
import foundation.bucket.core.ui.LocalPalette
import com.polingual.brand.Pill
import com.polingual.brand.SectionTitle
import com.polingual.brand.Type
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun WordDetailScreen(graph: Graph, itemId: String, back: () -> Unit) {
    val p = LocalPalette.current
    val app by graph.state.collectAsState()
    var item by remember { mutableStateOf<LangItem?>(null) }
    var corpus by remember { mutableStateOf<LangCorpus?>(null) }
    LaunchedEffect(itemId) { corpus = graph.corpus.load(); item = corpus?.byId?.get(itemId) }
    Page(back = back) {
        val i = item ?: return@Page
        val system = app?.system
        val langs = (system?.targets.orEmpty() + listOfNotNull(system?.root)).ifEmpty { listOf("en") }
        Text(i.form(system?.root ?: "en") ?: i.gloss, style = Type.display, color = D8.tyrian)
        Text(i.gloss, color = p.muted)
        if (i.root != null) Pill(androidx.compose.ui.res.stringResource(R.string.s_shared_root_x, i.root.orEmpty()), D8.malachite)
        langs.forEach { l ->
            val f = i.form(l) ?: return@forEach
            Card {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(Lang.flag(l))
                    Column(Modifier.weight(1f).padding(start = 12.dp)) {
                        Text(Lang.name(l), style = Type.caps, color = p.muted)
                        Text(f, style = Type.word, color = D8.tyrian)
                        i.readings[l]?.let { r -> listOfNotNull(r.roman, r.kana, r.ipa?.let { "/$it/".replace("//", "/") }).joinToString("  ").takeIf { it.isNotEmpty() }?.let { Text(it, color = p.muted) } }
                    }
                    IconButton(onClick = { graph.voice.speak(f, l) }) { Icon(Icons.AutoMirrored.Outlined.VolumeUp, "Speak ${Lang.name(l)}") }
                }
            }
        }
        val others = i.forms.keys.filter { it !in langs && it in Lang.info }
        if (others.isNotEmpty()) {
            SectionTitle(androidx.compose.ui.res.stringResource(R.string.s_in_other_languages))
            others.forEach { l -> Text("${Lang.flag(l)}  ${i.form(l)}", color = p.ink) }
        }
        i.note?.let { Text(it, color = p.muted) }
        Text(corpus?.attribution.orEmpty(), style = Type.caps, color = p.muted)
    }
}

@Composable
fun LearnedWords(graph: Graph, nav: NavHostController) {
    val p = LocalPalette.current
    val app by graph.state.collectAsState()
    var corpus by remember { mutableStateOf<LangCorpus?>(null) }
    LaunchedEffect(Unit) { corpus = graph.corpus.load() }
    val system = app?.system ?: return
    val ids = app?.study?.get(system.id)?.cards?.keys.orEmpty().map { it.substringAfter(':') }.distinct()
    val c = corpus ?: return
    SectionTitle(androidx.compose.ui.res.stringResource(R.string.s_words_you_study))
    if (ids.isEmpty()) Text(androidx.compose.ui.res.stringResource(R.string.s_words_show_up_here_after_your), color = p.muted)
    ids.take(60).mapNotNull { c.byId[it] }.forEach { item ->
        Row(Modifier.fillMaxWidth().clickable { nav.navigate("word/${item.id}") }.padding(vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(item.form(system.root) ?: item.gloss, color = p.ink, modifier = Modifier.weight(1f))
            Text(system.targets.mapNotNull { item.form(it) }.joinToString(" · "), color = p.muted)
        }
    }
}

@Composable
fun TranslateScreen(graph: Graph, initial: String, back: () -> Unit) {
    val p = LocalPalette.current
    val app by graph.state.collectAsState()
    val scope = rememberCoroutineScope()
    var text by remember { mutableStateOf(initial) }
    var answer by remember { mutableStateOf<TranslateAnswer?>(null) }
    var searched by remember { mutableStateOf(false) }
    var picking by remember { mutableStateOf<String?>(null) }
    var corpus by remember { mutableStateOf<LangCorpus?>(null) }
    LaunchedEffect(Unit) { corpus = graph.corpus.load() }
    val system = app?.system
    val mine = (listOfNotNull(system?.root) + system?.targets.orEmpty()).ifEmpty { listOf("en", "es", "fr") }
    val from = app?.translateFrom
    val to = app?.translateTo
    fun run(q: String) = scope.launch {
        if (q.isBlank()) return@launch
        val c = corpus ?: graph.corpus.load()
        val sources = from?.let { listOf(it) } ?: mine
        val targets = to?.let { listOf(it) } ?: mine
        answer = withContext(Dispatchers.Default) { TranslateEngine.answer(q, sources, targets, c, graph.corpus.shelf) }
        searched = true
        graph.store.update { s -> s.copy(recents = (listOf(q.trim()) + s.recents.filter { it != q.trim() }).take(12)) }
    }
    LaunchedEffect(initial, corpus) { if (initial.isNotBlank() && corpus != null) run(initial) }
    Page(androidx.compose.ui.res.stringResource(R.string.q_type), back = back) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = { picking = "from" }, modifier = Modifier.weight(1f)) { Text(from?.let { "${Lang.flag(it)} ${Lang.name(it)}" } ?: androidx.compose.ui.res.stringResource(R.string.s_detect)) }
            IconButton(onClick = { scope.launch { graph.store.update { it.copy(translateFrom = it.translateTo, translateTo = it.translateFrom) } } }, enabled = from != null || to != null) {
                Icon(Icons.Filled.SwapHoriz, androidx.compose.ui.res.stringResource(R.string.s_swap_languages))
            }
            OutlinedButton(onClick = { picking = "to" }, modifier = Modifier.weight(1f)) { Text(to?.let { "${Lang.flag(it)} ${Lang.name(it)}" } ?: "My languages") }
        }
        OutlinedTextField(
            text, { text = it }, modifier = Modifier.fillMaxWidth(), label = { Text(androidx.compose.ui.res.stringResource(R.string.s_type_a_word_or_phrase)) },
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search), keyboardActions = KeyboardActions(onSearch = { run(text) }),
        )
        com.polingual.brand.PrimaryButton(androidx.compose.ui.res.stringResource(R.string.q_type), enabled = text.isNotBlank()) { run(text) }
        val a = answer
        if (a != null) {
            Text("${Lang.flag(a.source)} ${a.headword}", style = Type.word, color = D8.tyrian, )
            a.rows.forEach { (l, f) ->
                Card {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text("${Lang.flag(l)} ${Lang.name(l)}", style = Type.caps, color = p.muted)
                            Text(f, style = Type.word.copy(fontSize = 22.sp()), color = p.ink)
                        }
                        IconButton(onClick = { graph.voice.speak(f, l) }) { Icon(Icons.AutoMirrored.Outlined.VolumeUp, androidx.compose.ui.res.stringResource(R.string.s_speak)) }
                    }
                }
            }
        } else if (searched) Text(androidx.compose.ui.res.stringResource(R.string.s_no_translation_found_try_one_word), color = p.muted)
        val recents = app?.recents.orEmpty()
        if (recents.isNotEmpty()) {
            SectionTitle(androidx.compose.ui.res.stringResource(R.string.s_recent))
            recents.forEach { r -> Text(r, color = p.ink, modifier = Modifier.fillMaxWidth().clickable { text = r; run(r) }.padding(vertical = 6.dp)) }
        }
    }
    picking?.let { side ->
        LanguagePicker(
            options = corpus?.let { translateSources(it, mine) } ?: Lang.codes,
            recents = mine,
            allowAny = true,
            anyLabel = if (side == "from") androidx.compose.ui.res.stringResource(R.string.s_detect) else androidx.compose.ui.res.stringResource(R.string.s_my_languages),
            dismiss = { picking = null },
        ) { choice -> scope.launch { graph.store.update { if (side == "from") it.copy(translateFrom = choice) else it.copy(translateTo = choice) } }; picking = null }
    }
}

@Composable
fun LanguagePicker(options: List<String>, recents: List<String>, allowAny: Boolean, anyLabel: String, dismiss: () -> Unit, pick: (String?) -> Unit) {
    var query by remember { mutableStateOf("") }
    val p = LocalPalette.current
    AlertDialog(
        onDismissRequest = dismiss,
        confirmButton = { TextButton(onClick = dismiss) { Text(androidx.compose.ui.res.stringResource(R.string.s_close)) } },
        title = { Text(androidx.compose.ui.res.stringResource(R.string.s_language)) },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                OutlinedTextField(query, { query = it }, singleLine = true, label = { Text(androidx.compose.ui.res.stringResource(R.string.s_search)) }, modifier = Modifier.fillMaxWidth())
                if (query.isBlank()) {
                    if (allowAny) Text(anyLabel, color = D8.vermilion, modifier = Modifier.fillMaxWidth().clickable { pick(null) }.padding(vertical = 10.dp))
                    SectionTitle(androidx.compose.ui.res.stringResource(R.string.s_yours))
                    recents.forEach { l -> PickerRow(l) { pick(l) } }
                    SectionTitle(androidx.compose.ui.res.stringResource(R.string.s_all))
                }
                options.filter { l -> query.isBlank() || Lang.name(l).contains(query, true) || l.startsWith(query.lowercase()) }.forEach { l -> PickerRow(l) { pick(l) } }
                if (options.none { Lang.name(it).contains(query, true) }) Text(androidx.compose.ui.res.stringResource(R.string.s_no_match), color = p.muted)
            }
        },
    )
}

@Composable
private fun PickerRow(lang: String, onClick: () -> Unit) {
    Text("${Lang.flag(lang)}  ${Lang.name(lang)}", color = LocalPalette.current.ink, modifier = Modifier.fillMaxWidth().clickable(onClick = onClick).padding(vertical = 10.dp))
}
