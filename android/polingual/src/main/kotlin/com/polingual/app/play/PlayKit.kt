package com.polingual.app.play

import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.unit.dp
import com.polingual.app.AdBanner
import com.polingual.app.Graph
import com.polingual.app.LocalStartLearning
import com.polingual.app.Page
import com.polingual.app.Type
import com.polingual.app.WordReveal
import foundation.bucket.core.ui.pl.ButtonVariant
import foundation.bucket.core.ui.pl.Ground
import foundation.bucket.core.ui.pl.PL
import foundation.bucket.core.ui.pl.PLButton
import foundation.bucket.core.ui.pl.PrimaryButton
import foundation.bucket.core.ui.pl.Sticker

enum class WebGame(val route: String, val title: String, val blurb: String, val art: String, val tilt: Float) {
    Polyword("polyword", "Polyword", "One word a day. Every miss shows its meaning in another language.", "streak-flame", 6f),
    FlagTiles("flag-tiles", "Flag Tiles", "Solo daily run. A word falls; tap the flag of its language.", "kente", -10f),
    Babel("babel-match", "Babel Match", "Match-3 with words. Three that mean the same thing clear.", "blocks", -8f),
    Shift("shift", "Shift", "Daily letter board. Slide columns to spell words in two languages.", "torn-label", 5f),
    Snake("word-snake", "Word Snake", "Arena with bot snakes. Eat words in your language, dodge the decoys.", "brush", -6f),
    Atlas("voice-atlas", "Voice Atlas", "Five words a day. Hear one, pin where its language is spoken.", "azulejo", 8f),
    Forehead("forehead", "Forehead", "Party mode on one phone. Friends give clues, you tilt to score.", "ticket", 6f),
    ISpy("ispy", "I Spy", "Spot the thing, say it in the language of the round.", "star", -12f),
    SameWord("same-word", "Same Word", "One meaning across languages. A live room with friends.", "seal", -7f),
}

@Composable
fun GameFrame(graph: Graph, game: WebGame, back: () -> Unit, soundOnly: Boolean = false, content: @Composable ColumnScope.() -> Unit) =
    com.polingual.app.GameScaffold(graph, game.title, game.art, game.tilt, "bunting", soundOnly, back, content = content)

@Composable
fun ColumnScope.Results(graph: Graph, title: String, line: String, again: (() -> Unit)?, againLabel: String = "Play again", reveal: @Composable ColumnScope.() -> Unit = {}) {
    LaunchedEffect(title) { graph.ads.gameFinished() }
    com.polingual.app.ResultBlock(title, line, null, again, againLabel, ad = { AdBanner(graph) }) { reveal() }
}

@Composable
fun RevealWord(graph: Graph, word: PlayWord, lang: String, rootLang: String = PlayDecks.ROOT) {
    val f = word.form(lang) ?: return
    WordReveal(lang, f.word, word.gloss, null, null, ipa = f.ipa ?: f.roman ?: f.kana, root = word.root(lang), definition = word.note ?: word.gloss, rootLang = rootLang) { graph.voice.speak(f.word, lang) }
}

object PlayDecks {
    const val ROOT = "en"
    private val LANG = Regex("^[a-z]{2,3}$")

    fun root(learnerRoot: String?, items: List<foundation.bucket.core.engine.LangItem>, min: Int = 200): String {
        if (learnerRoot == null || !LANG.matches(learnerRoot)) return ROOT
        return if (items.count { it.kind == foundation.bucket.core.engine.ItemKind.Word && it.form(learnerRoot) != null } >= min) learnerRoot else ROOT
    }
}
