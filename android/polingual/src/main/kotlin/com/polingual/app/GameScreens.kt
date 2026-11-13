package com.polingual.app

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.VolumeUp
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableDoubleStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import foundation.bucket.core.data.AppState
import foundation.bucket.core.engine.GameDeck
import foundation.bucket.core.engine.GamePrompt
import foundation.bucket.core.engine.GameRounds
import foundation.bucket.core.engine.GameSeed
import foundation.bucket.core.engine.GameWord
import foundation.bucket.core.engine.LangCorpus
import foundation.bucket.core.engine.MiniCell
import foundation.bucket.core.engine.MiniPuzzle
import foundation.bucket.core.engine.PromptMode
import foundation.bucket.core.engine.QuizRound
import foundation.bucket.core.engine.SeededRandom
import foundation.bucket.core.engine.SpeedBoard
import foundation.bucket.core.engine.WordGroupsPuzzle
import foundation.bucket.core.engine.WordGroupsRound
import foundation.bucket.core.engine.mixed
import foundation.bucket.core.model.Lang
import foundation.bucket.core.model.LangSystem
import foundation.bucket.core.ui.ChoiceButton
import foundation.bucket.core.ui.ChoiceState
import foundation.bucket.core.ui.D8
import foundation.bucket.core.ui.FlagTile
import foundation.bucket.core.ui.LocalPalette
import foundation.bucket.core.ui.PlainLink
import foundation.bucket.core.ui.PrimaryButton
import foundation.bucket.core.ui.ResultDots
import foundation.bucket.core.ui.Type
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

data class GameContext(val system: LangSystem, val app: AppState, val corpus: LangCorpus, val words: List<GameWord>) {
    val puzzleWords: List<GameWord> by lazy {
        val seen = words.map { it.id }.toSet()
        words + foundation.bucket.core.engine.GameWords.starter(system.root, system.targets, corpus, perLang = 80).filter { it.id !in seen }
    }
}

@Composable
fun WithGame(graph: Graph, kind: GameKind, back: () -> Unit, content: @Composable (GameContext) -> Unit) {
    var ctx by remember { mutableStateOf<GameContext?>(null) }
    LaunchedEffect(Unit) {
        val app = graph.store.current()
        val system = app.system ?: return@LaunchedEffect
        val corpus = graph.corpus.load()
        ctx = GameContext(system, app, corpus, GameWordPool.words(system, app, corpus))
    }
    Page(kind.title, back = back) {
        val c = ctx
        if (c == null) Text("Start a language set in Learn. The games use the words you study.", color = LocalPalette.current.muted) else content(c)
    }
}

suspend fun Graph.markPlayed(kind: GameKind, system: LangSystem, pattern: String) {
    ads.gameFinished(activity?.get())
    val key = "${kind.route}|${today()}|${system.id}"
    store.update { it.copy(played = (it.played + (key to pattern)).entries.toList().takeLast(200).associate { e -> e.key to e.value }, savePrompt = account.stage.value != foundation.bucket.core.auth.Stage.SignedIn) }
}

fun AppState.played(kind: GameKind, system: LangSystem?): String? = system?.let { played["${kind.route}|${today()}|${it.id}"] }

@Composable
fun GameScreen(graph: Graph, kind: GameKind, back: () -> Unit) {
    WithGame(graph, kind, back) { c ->
        when (kind) {
            GameKind.Daily -> Quiz(graph, kind, c) { GameRounds.daily(GameDeck(c.corpus, c.system.root, c.system.targets), today()) }
            GameKind.Same -> Quiz(graph, kind, c) { GameRounds.sameWord(GameDeck(c.corpus, c.system.root, c.system.targets), c.words, SeededRandom(System.nanoTime().toULong())) }
            GameKind.Flags -> Quiz(graph, kind, c) { GameRounds.flags(c.words, c.system.targets, PromptMode.Flag, sameForm = GameWordPool.sameForm(c.corpus), rng = SeededRandom(System.nanoTime().toULong())) }
            GameKind.Voice -> Quiz(graph, kind, c) {
                GameRounds.flags(c.words.filter { graph.voice.available(it.lang) }.ifEmpty { c.words }, c.system.targets, PromptMode.Voice, sameForm = GameWordPool.sameForm(c.corpus), rng = SeededRandom(System.nanoTime().toULong()))
            }
            GameKind.Match -> SpeedMatch(graph, c)
            GameKind.WordGroups -> Groups(graph, c)
            GameKind.Mini -> Mini(graph, c)
            GameKind.Letters -> Letters(graph, c)
        }
    }
}

@Composable
fun Finished(title: String, line: String, results: List<Boolean>, total: Int, again: (() -> Unit)?) {
    val p = LocalPalette.current
    Text(title, style = Type.display, color = p.ink)
    ResultDots(results, total)
    Text(line, color = p.muted)
    if (again != null) PrimaryButton("Play again", color = D8.malachite, onClick = again)
}

@Composable
fun Quiz(graph: Graph, kind: GameKind, c: GameContext, build: () -> List<GamePrompt>) {
    var seed by remember { mutableIntStateOf(0) }
    val round = remember(seed) { QuizRound(build()) }
    var tick by remember { mutableIntStateOf(0) }
    val scope = rememberCoroutineScope()
    val p = LocalPalette.current
    tick.let { }
    if (round.prompts.isEmpty()) { Text("Learn a few more words first.", color = p.muted); return }
    if (round.finished) {
        LaunchedEffect(round) { graph.markPlayed(kind, c.system, round.results.joinToString("") { if (it) "1" else "0" }) }
        Finished("${round.score} of ${round.prompts.size}", "A finished game keeps your streak. Misses come back in study.", round.results, round.prompts.size, if (kind == GameKind.Daily) null else ({ seed += 1 }))
        return
    }
    val prompt = round.current!!
    ResultDots(round.results, round.prompts.size)
    when (prompt.mode) {
        PromptMode.Form -> {
            Text("Which is ${Lang.name(prompt.word.lang)} for", color = p.muted)
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                FlagTile(prompt.word.lang, 44.dp)
                Text(prompt.word.gloss, style = Type.word, color = p.ink)
            }
        }
        PromptMode.Flag -> {
            Text("Which language is this?", color = p.muted)
            Text(prompt.word.form, style = Type.word, color = p.ink)
        }
        PromptMode.Voice -> {
            Text("Listen. Which language is it?", color = p.muted)
            LaunchedEffect(prompt) { graph.voice.speak(prompt.word.form, prompt.word.lang) }
            PrimaryButton("Play again", color = D8.lapis) { graph.voice.speak(prompt.word.form, prompt.word.lang) }
        }
    }
    val picked = round.picked
    prompt.choices.forEach { choice ->
        val label = if (prompt.mode == PromptMode.Form) choice else "${Lang.flag(choice)}  ${Lang.name(choice)}"
        val state = when {
            picked == null -> ChoiceState.Idle
            choice == prompt.answer -> ChoiceState.Right
            choice == picked -> ChoiceState.Wrong
            else -> ChoiceState.Dim
        }
        ChoiceButton(label, state) {
            round.answer(choice)
            tick += 1
            if (prompt.mode == PromptMode.Form) graph.voice.speak(prompt.word.form, prompt.word.lang)
            scope.launch { delay(if (choice == prompt.answer) 700 else 1500); round.advance(); tick += 1 }
        }
    }
    if (picked != null && prompt.mode != PromptMode.Form) Text("${prompt.word.form} means ${prompt.word.gloss}", color = p.muted)
}

@Composable
fun SpeedMatch(graph: Graph, c: GameContext) {
    var seed by remember { mutableIntStateOf(0) }
    val board = remember(seed) { SpeedBoard(c.words, SeededRandom(System.nanoTime().toULong())) }
    var left by remember(seed) { mutableDoubleStateOf(SpeedBoard.SECONDS) }
    var tick by remember { mutableIntStateOf(0) }
    val p = LocalPalette.current
    tick.let { }
    LaunchedEffect(board) {
        while (left - board.penalty > 0 && !board.done) { delay(100); left -= 0.1 }
        graph.markPlayed(GameKind.Match, c.system, "1".repeat(board.matched))
    }
    val remaining = maxOf(0.0, left - board.penalty)
    if (remaining <= 0 || board.done) {
        Finished("${board.matched} pairs", "${board.missed} misses. ${if (board.combo >= SpeedBoard.HOT_COMBO) "Hot streak." else ""}", emptyList(), 0) { seed += 1 }
        return
    }
    LinearProgressIndicator(progress = { (remaining / SpeedBoard.SECONDS).toFloat() }, modifier = Modifier.fillMaxWidth(), color = D8.malachite)
    Text("${remaining.toInt()} s   ${board.matched} pairs", color = p.muted)
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            board.meanings.forEach { w -> MatchTile(w.gloss, board.selectedMeaning == w.id) { board.tapMeaning(w.id); tick += 1 } }
        }
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            board.forms.forEach { w -> MatchTile("${Lang.flag(w.lang)} ${w.form}", board.selectedForm == w.id) { graph.voice.speak(w.form, w.lang); board.tapForm(w.id); tick += 1 } }
        }
    }
}

@Composable
fun MatchTile(text: String, selected: Boolean, onClick: () -> Unit) {
    val p = LocalPalette.current
    Box(
        Modifier.fillMaxWidth().heightIn(min = 64.dp).clip(RoundedCornerShape(14.dp)).background(if (selected) D8.lapis else p.card)
            .border(1.dp, p.rule, RoundedCornerShape(14.dp)).clickable(role = Role.Button, onClick = onClick).padding(10.dp),
        contentAlignment = Alignment.Center,
    ) { Text(text, color = if (selected) D8.parchment else p.ink, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center) }
}

@Composable
fun Groups(graph: Graph, c: GameContext) {
    val p = LocalPalette.current
    val puzzle = remember { WordGroupsPuzzle.daily(c.puzzleWords, today(), c.system.root, c.system.targets, theme = { c.corpus.byId[it.itemId]?.category }, sameForm = GameWordPool.sameForm(c.corpus)) }
    if (puzzle == null) { Text("Learn a few more words to unlock today's board.", color = p.muted); return }
    val round = remember { WordGroupsRound(puzzle) }
    var tick by remember { mutableIntStateOf(0) }
    var note by remember { mutableStateOf("") }
    tick.let { }
    val colors = listOf(D8.lapis, D8.malachite, D8.vermilion, D8.ink)
    round.solved.forEachIndexed { i, g ->
        Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(colors[i % 4]).padding(12.dp)) {
            Text(groupTitle(g.link), style = Type.caps, color = D8.parchment)
            Text(g.words.joinToString(", ") { it.form }, color = D8.parchment, fontWeight = FontWeight.Bold)
        }
    }
    if (round.finished) {
        if (!round.won) round.unsolved.forEach { g -> Text("${groupTitle(g.link)}: ${g.words.joinToString(", ") { it.form }}", color = p.muted) }
        LaunchedEffect(Unit) { graph.markPlayed(GameKind.WordGroups, c.system, round.results.joinToString("") { if (it) "1" else "0" }) }
        Finished(if (round.won) "Solved" else "Out of tries", "${round.mistakes} mistakes. New board tomorrow.", round.results, round.results.size, null)
        return
    }
    round.tiles.chunked(4).forEach { row ->
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            row.forEach { w ->
                val on = w.id in round.selected
                Box(
                    Modifier.weight(1f).aspectRatio(1.1f).clip(RoundedCornerShape(12.dp)).background(if (on) D8.ink else p.card)
                        .clickable(role = Role.Checkbox) { round.toggle(w.id); tick += 1 }.padding(4.dp)
                        .semantics { contentDescription = "${w.form}, ${Lang.name(w.lang)}" },
                    contentAlignment = Alignment.Center,
                ) { Text(w.form, color = if (on) D8.parchment else p.ink, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center, fontSize = 14.sp, maxLines = 2) }
            }
        }
    }
    Text("Mistakes left: ${"●".repeat(round.mistakesLeft)}", color = p.muted)
    if (note.isNotEmpty()) Text(note, color = D8.vermilion)
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        PlainLink("Shuffle") { round.shuffle(SeededRandom(System.nanoTime().toULong())); tick += 1 }
        PlainLink("Deselect") { round.selected.forEach(round::toggle); tick += 1 }
    }
    PrimaryButton("Submit", enabled = round.canSubmit) {
        note = when (round.submit()) {
            WordGroupsRound.Outcome.OneAway -> "One away"
            WordGroupsRound.Outcome.Repeated -> "Already tried"
            WordGroupsRound.Outcome.Miss -> "Not a group"
            else -> ""
        }
        tick += 1
    }
}

fun groupTitle(link: foundation.bucket.core.engine.GroupLink): String = when (link) {
    is foundation.bucket.core.engine.GroupLink.Language -> Lang.name(link.lang)
    is foundation.bucket.core.engine.GroupLink.Theme -> link.theme.replaceFirstChar(Char::uppercase)
    is foundation.bucket.core.engine.GroupLink.LanguageTheme -> "${Lang.name(link.lang)} ${link.theme}"
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun Mini(graph: Graph, c: GameContext) {
    val p = LocalPalette.current
    val puzzle = remember { MiniPuzzle.daily(c.puzzleWords, today(), c.system.root, c.system.targets) }
    if (puzzle == null) { Text("Learn a few more words to unlock today's crossword.", color = p.muted); return }
    val filled = remember { mutableStateMapOf<MiniCell, String>() }
    var entry by remember { mutableStateOf(puzzle.entries.first()) }
    var cursor by remember { mutableIntStateOf(0) }
    val answers = puzzle.answers
    val solved = answers.all { (k, v) -> filled[k] == v }
    LaunchedEffect(solved) { if (solved) graph.markPlayed(GameKind.Mini, c.system, "1") }
    Text("${Lang.flag(puzzle.lang)} ${Lang.name(puzzle.lang)}", style = Type.caps, color = p.muted)
    Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
        for (r in 0 until puzzle.rows) Row(horizontalArrangement = Arrangement.spacedBy(3.dp)) {
            for (col in 0 until puzzle.cols) {
                val cell = MiniCell(r, col)
                val live = cell in answers
                val active = cell == entry.cells.getOrNull(cursor)
                Box(
                    Modifier.size(46.dp).clip(RoundedCornerShape(6.dp)).background(if (!live) androidx.compose.ui.graphics.Color.Transparent else if (active) D8.keyline else if (cell in entry.cells) p.card else p.card.copy(alpha = 0.7f))
                        .then(if (live) Modifier.border(1.dp, if (active) D8.vermilion else p.rule, RoundedCornerShape(6.dp)).clickable {
                            val e = puzzle.entries.firstOrNull { it.cells.contains(cell) && it.across == entry.across } ?: puzzle.entries.first { it.cells.contains(cell) }
                            entry = e; cursor = e.cells.indexOf(cell)
                        } else Modifier),
                    contentAlignment = Alignment.Center,
                ) {
                    if (live) {
                        puzzle.numbers[cell]?.let { Text("$it", fontSize = 9.sp, color = p.muted, modifier = Modifier.align(Alignment.TopStart).padding(2.dp)) }
                        Text(filled[cell].orEmpty(), fontWeight = FontWeight.Bold, color = if (solved) D8.malachite else p.ink, fontSize = 20.sp)
                    }
                }
            }
        }
    }
    Text("${entry.number}${if (entry.across) " across" else " down"}: ${entry.word.gloss}", color = p.ink, fontWeight = FontWeight.Bold)
    if (solved) { Finished("Solved", "New crossword tomorrow.", listOf(true), 1, null); return }
    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        (puzzle.keys + "⌫").forEach { k ->
            Box(Modifier.size(44.dp).clip(RoundedCornerShape(8.dp)).background(p.card).border(1.dp, p.rule, RoundedCornerShape(8.dp)).clickable(role = Role.Button) {
                if (k == "⌫") {
                    entry.cells.getOrNull(cursor)?.let { filled.remove(it) }
                    if (cursor > 0) cursor -= 1
                } else {
                    entry.cells.getOrNull(cursor)?.let { filled[it] = k }
                    if (cursor < entry.cells.size - 1) cursor += 1 else {
                        val i = puzzle.entries.indexOf(entry)
                        entry = puzzle.entries[(i + 1) % puzzle.entries.size]; cursor = 0
                    }
                }
            }, contentAlignment = Alignment.Center) { Text(k, fontWeight = FontWeight.Bold, color = p.ink) }
        }
    }
    PlainLink("Reveal word") { entry.cells.zip(entry.letters).forEach { (cell, l) -> filled[cell] = l } }
}

@Composable
fun Letters(graph: Graph, c: GameContext) {
    val p = LocalPalette.current
    var seed by remember { mutableIntStateOf(0) }
    val prompts = remember(seed) { LetterSprint.prompts(c.words, SeededRandom(GameSeed.hash("letters|${today()}|$seed"))) }
    if (prompts.isEmpty()) { Text("Letter Sprint needs a language with its own letters, like Greek, Russian or Japanese.", color = p.muted); return }
    var index by remember(seed) { mutableIntStateOf(0) }
    val results = remember(seed) { mutableStateOf(listOf<Boolean>()) }
    var picked by remember(seed) { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    if (index >= prompts.size) {
        LaunchedEffect(seed) { graph.markPlayed(GameKind.Letters, c.system, results.value.joinToString("") { if (it) "1" else "0" }) }
        Finished("${results.value.count { it }} of ${prompts.size}", "Letters come from words you study.", results.value, prompts.size) { seed += 1 }
        return
    }
    val q = prompts[index]
    LaunchedEffect(q) { graph.voice.speak(q.word.form, q.word.lang) }
    ResultDots(results.value, prompts.size)
    Text("Listen to the word. Which letter does it start with?", color = p.muted)
    PrimaryButton("Play again", color = D8.lapis) { graph.voice.speak(q.word.form, q.word.lang) }
    q.choices.forEach { ch ->
        val state = when { picked == null -> ChoiceState.Idle; ch == q.answer -> ChoiceState.Right; ch == picked -> ChoiceState.Wrong; else -> ChoiceState.Dim }
        ChoiceButton(ch, state) {
            picked = ch
            results.value = results.value + (ch == q.answer)
            scope.launch { delay(900); picked = null; index += 1 }
        }
    }
    if (picked != null) Text("${q.word.form} means ${q.word.gloss}", color = p.muted)
}

object LetterSprint {
    data class Prompt(val word: GameWord, val answer: String, val choices: List<String>)

    fun prompts(words: List<GameWord>, rng: SeededRandom, count: Int = 8): List<Prompt> {
        val scripts = words.filter { Lang.info[it.lang]?.latin == false }
        val firsts = scripts.groupBy { it.lang }.mapValues { (_, ws) -> ws.mapNotNull { it.form.firstOrNull()?.toString() }.distinct() }
        return mixed(scripts.distinctBy { it.form }, rng).mapNotNull { w ->
            val first = w.form.firstOrNull()?.toString() ?: return@mapNotNull null
            val pool = firsts[w.lang].orEmpty().filter { it != first }
            if (pool.size < 3) null else Prompt(w, first, mixed(listOf(first) + mixed(pool, rng).take(3), rng))
        }.take(count)
    }
}
