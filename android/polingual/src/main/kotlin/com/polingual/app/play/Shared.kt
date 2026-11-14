package com.polingual.app.play

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.ui.unit.dp
import foundation.bucket.core.model.Lang
import foundation.bucket.core.ui.pl.PLPill
import foundation.bucket.core.ui.pl.PrimaryButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import com.polingual.app.Graph
import com.polingual.app.Type
import com.polingual.app.WordReveal
import foundation.bucket.core.ui.pl.PL

data class BoardRow(val name: String, val score: Int, val me: Boolean)

object Boards {
    fun withYou(others: List<BoardRow>, you: Int): List<BoardRow> = (others + BoardRow("You", you, true)).sortedByDescending { it.score }

    fun named(flag: String, name: String, score: Int) = BoardRow("${Bots.countryFlag(flag)} $name", score, false)

    fun fromGhosts(ghosts: List<Ghost>, you: Int): List<BoardRow> = withYou(ghosts.map { named(it.flag, it.name, it.score) }, you)
}

object PlayLookup {
    fun word(words: List<PlayWord>, lang: String, form: String, slug: String? = null): PlayWord? =
        words.firstOrNull { (slug != null && it.slug == slug) || it.form(lang)?.word?.equals(form, ignoreCase = true) == true }
}

@Composable
fun Leaderboard(rows: List<BoardRow>, numbered: Boolean = true) {
    rows.forEachIndexed { i, r ->
        Row {
            Text(if (numbered) "${i + 1}  ${r.name}" else r.name, style = Type.body, color = if (r.me) PL.Vermilion else PL.Ink, modifier = Modifier.weight(1f))
            Text("${r.score}", style = Type.body, color = PL.Ink)
        }
    }
}

@Composable
fun PlayReveal(graph: Graph, lang: String, form: String, meaning: String, rootLang: String, itemId: String? = null, slug: String? = null) {
    val word = remember(lang, form, slug) { PlayLookup.word(PlayAssets.words(graph.context), lang, form, slug) }
    if (word != null) RevealWord(graph, word, lang, rootLang)
    else WordReveal(lang, form, meaning, itemId, null, rootLang = rootLang) { graph.voice.speak(form, lang) }
}

object DealSeeds {
    fun fresh(random: () -> Double = Math::random): String = (1 + (random() * 1e12).toLong()).toString()
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun GameSetup(eyebrow: String, blurb: String, langs: List<String>, isOn: (String) -> Boolean, onTap: (String) -> Unit, start: String, enabled: Boolean = true, onStart: () -> Unit) {
    Text(eyebrow, style = Type.caps, color = PL.InkDim)
    Text(blurb, style = Type.body, color = PL.Ink)
    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        langs.forEach { l -> PLPill("${Lang.flag(l)} ${Lang.name(l)}", active = isOn(l), small = true) { onTap(l) } }
    }
    PrimaryButton(start, enabled = enabled, onClick = onStart)
}
