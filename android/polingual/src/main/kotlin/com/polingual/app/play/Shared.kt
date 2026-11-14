package com.polingual.app.play

import androidx.compose.foundation.layout.Row
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

    fun fromGhosts(ghosts: List<Ghost>, you: Int): List<BoardRow> = withYou(ghosts.map { BoardRow("${Bots.countryFlag(it.flag)} ${it.name}", it.score, false) }, you)
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
