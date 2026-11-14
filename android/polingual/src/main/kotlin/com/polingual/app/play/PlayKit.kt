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
fun GameFrame(graph: Graph, game: WebGame, back: () -> Unit, soundOnly: Boolean = false, content: @Composable ColumnScope.() -> Unit) {
    val silentNow by graph.silent.collectAsState()
    LaunchedEffect(game) { graph.ads.enteredGame() }
    Page(
        game.title, back = { graph.ads.leftFinishedGame(graph.activity?.get()); back() }, ground = Ground.Lattice, panel = true,
        stickers = listOf(Sticker(game.art, Alignment.CenterStart, 70.dp, game.tilt), Sticker("seal", Alignment.TopEnd, 50.dp, 9f), Sticker("bunting", Alignment.BottomEnd, 84.dp, -4f, dx = (-8).dp)),
    ) {
        if (!com.polingual.app.SoundRules.needsSoundCard(silentNow, soundOnly)) com.polingual.app.SilentSwitch(graph, compact = true)
        content()
    }
}

@Composable
fun ColumnScope.Results(graph: Graph, title: String, line: String, again: (() -> Unit)?, againLabel: String = "Play again", reveal: @Composable ColumnScope.() -> Unit = {}) {
    LaunchedEffect(title) { graph.ads.gameFinished() }
    Text(title, style = Type.display, color = PL.Ink)
    Text(line, style = Type.body, color = PL.InkDim)
    reveal()
    if (again != null) PrimaryButton(againLabel, color = PL.Malachite, onClick = again)
    PLButton("Start learning", variant = ButtonVariant.Secondary, onClick = LocalStartLearning.current)
    AdBanner(graph)
}

@Composable
fun RevealWord(graph: Graph, word: PlayWord, lang: String) {
    val f = word.form(lang) ?: return
    WordReveal(lang, f.word, word.gloss, null, null, ipa = f.ipa ?: f.roman ?: f.kana, root = word.root(lang), definition = word.note ?: word.gloss, rootLang = PlayDecks.ROOT) { graph.voice.speak(f.word, lang) }
}

object PlayDecks {
    const val ROOT = "en"
    const val WEB_ACCEPTS_ROOT = false

    fun root(learnerRoot: String?, webAcceptsRoot: Boolean = WEB_ACCEPTS_ROOT): String = if (webAcceptsRoot && !learnerRoot.isNullOrBlank()) learnerRoot else ROOT
}
