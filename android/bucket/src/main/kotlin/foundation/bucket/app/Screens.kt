package foundation.bucket.app

import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.AccountCircle
import androidx.compose.material.icons.outlined.MenuBook
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.WbSunny
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.adaptive.navigationsuite.NavigationSuiteScaffold
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.net.toUri
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import foundation.bucket.core.auth.Stage
import foundation.bucket.core.engine.Streak
import foundation.bucket.core.model.Atom
import foundation.bucket.core.model.BucketError
import foundation.bucket.core.model.CanonHit
import foundation.bucket.core.model.Deck
import foundation.bucket.core.model.DeckEntry
import foundation.bucket.core.ui.Card
import foundation.bucket.core.ui.LocalPalette
import foundation.bucket.core.ui.Pill
import foundation.bucket.core.ui.PlainLink
import foundation.bucket.core.ui.PrimaryButton
import foundation.bucket.core.ui.SectionTitle
import foundation.bucket.core.ui.Type
import kotlinx.coroutines.launch

private fun today() = java.time.LocalDate.now().toString()

@Composable
fun Page(title: String? = null, back: (() -> Unit)? = null, content: @Composable ColumnScope.() -> Unit) {
    Box(Modifier.fillMaxSize().safeDrawingPadding(), contentAlignment = Alignment.TopCenter) {
        Column(Modifier.widthIn(max = 720.dp).fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            if (title != null || back != null) Row(verticalAlignment = Alignment.CenterVertically) {
                if (back != null) IconButton(onClick = back) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = LocalPalette.current.ink) }
                if (title != null) Text(title, style = Type.title, color = LocalPalette.current.ink)
            }
            content()
        }
    }
}

@Composable
fun BucketRoot(graph: Graph) {
    val nav = rememberNavController()
    val route = nav.currentBackStackEntryAsState().value?.destination?.route
    val tabs = listOf(Triple("today", "Today", Icons.Outlined.WbSunny), Triple("learn", "Learn", Icons.Outlined.MenuBook), Triple("canon", "Canon", Icons.Outlined.Search), Triple("account", "Account", Icons.Outlined.AccountCircle))
    NavigationSuiteScaffold(navigationSuiteItems = {
        tabs.forEach { (r, label, icon) ->
            item(selected = route == r, onClick = { nav.navigate(r) { popUpTo("today") { saveState = true }; launchSingleTop = true; restoreState = true } }, icon = { Icon(icon, null) }, label = { Text(label) })
        }
    }) {
        Box(Modifier.fillMaxSize().background(LocalPalette.current.paper)) {
            NavHost(nav, startDestination = "today") {
                composable("today") { TodayScreen(graph, nav) }
                composable("learn") { LearnScreen(graph, nav) }
                composable("canon") { CanonScreen(graph) }
                composable("account") { AccountScreen(graph) }
                composable("study") { StudyScreen(graph) { nav.popBackStack() } }
                composable("deck/{id}") { e -> DeckScreen(graph, nav, e.arguments?.getString("id").orEmpty()) }
                composable("atom/{deck}/{atom}") { e -> AtomScreen(graph, e.arguments?.getString("deck").orEmpty(), e.arguments?.getString("atom").orEmpty()) { nav.popBackStack() } }
            }
        }
    }
}

@Composable
fun TodayScreen(graph: Graph, nav: NavHostController) {
    val p = LocalPalette.current
    val state by graph.science.collectAsState()
    var decks by remember { mutableStateOf<Map<String, Deck>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(Unit) { try { decks = graph.allDecks() } catch (e: BucketError) { error = e.message } }
    Page {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("Today", style = Type.display, color = p.ink)
                Text("build the past. build history.", color = p.muted)
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("${Streak.count(state.days, today())}", style = Type.title.copy(color = p.green))
                Text("STREAK", style = Type.caps, color = p.muted)
            }
        }
        val d = decks
        val queue = d?.let { ScienceStudy.queue(it, state, today(), System.currentTimeMillis()) }
        Card(color = p.ink) {
            Text("Study", style = Type.title, color = p.paper)
            Text(when {
                queue == null -> error ?: "Loading the canon"
                queue.isEmpty() -> "Nothing due. Every card is scheduled ahead and today's new atoms are done."
                else -> "${queue.count { !it.isNew }} reviews and ${queue.count { it.isNew }} new atoms"
            }, color = p.paper.copy(alpha = 0.85f))
            PrimaryButton("Start", enabled = !queue.isNullOrEmpty(), color = p.green) { nav.navigate("study") }
        }
        Card(onClick = { nav.navigate("canon") }) {
            Text("Search the canon", style = Type.title.copy(fontSize = 20.sp), color = p.ink)
            Text("Axioms, laws and primary derivations across seven branches", color = p.muted)
        }
    }
}

@Composable
fun StudyScreen(graph: Graph, done: () -> Unit) {
    val p = LocalPalette.current
    val scope = rememberCoroutineScope()
    var queue by remember { mutableStateOf<List<StudyCard>?>(null) }
    var shown by remember { mutableStateOf(false) }
    var right by remember { mutableStateOf(0) }
    var count by remember { mutableStateOf(0) }
    LaunchedEffect(Unit) { queue = runCatching { ScienceStudy.queue(graph.allDecks(), graph.current(), today(), System.currentTimeMillis()) }.getOrDefault(emptyList()) }
    Page(back = done) {
        val q = queue ?: run { CircularProgressIndicator(color = p.green); return@Page }
        val card = q.firstOrNull()
        if (card == null) {
            Text("Session done", style = Type.display, color = p.ink)
            Text("$right of $count recalled.", color = p.muted)
            PrimaryButton("Back to Today", color = p.green, onClick = done)
            return@Page
        }
        Text("${q.size} left", color = p.muted)
        if (card.isNew) Pill("New atom", p.green)
        Card {
            Text(card.atom.title, style = Type.caps, color = p.muted)
            Text(card.prompt, style = Type.title.copy(fontSize = 22.sp), color = p.ink)
            if (shown) {
                Text(card.answer, color = p.ink)
                if (card.isNew && card.atom.summary.isNotBlank()) Text(card.atom.summary, color = p.muted)
            }
        }
        fun grade(ok: Boolean) = scope.launch {
            count += 1; if (ok) right += 1
            graph.saveScience(ScienceStudy.grade(graph.current(), card, ok, today(), System.currentTimeMillis()))
            queue = q.drop(1) + if (ok) emptyList() else listOf(card.copy(isNew = false))
            shown = false
        }
        if (!shown) PrimaryButton("Show answer", color = p.green) { shown = true } else Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            PrimaryButton("Again", Modifier.weight(1f), color = foundation.bucket.core.ui.D8.vermilion) { grade(false) }
            PrimaryButton("Got it", Modifier.weight(1f), color = p.green) { grade(true) }
        }
    }
}

@Composable
fun LearnScreen(graph: Graph, nav: NavHostController) {
    val p = LocalPalette.current
    var index by remember { mutableStateOf<List<DeckEntry>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(Unit) { try { index = graph.index() } catch (e: BucketError) { error = e.message } }
    Page("Learn") {
        error?.let { Text(it, color = foundation.bucket.core.ui.D8.vermilion) }
        if (index == null && error == null) CircularProgressIndicator(color = p.green)
        index?.forEach { e ->
            Card(onClick = { nav.navigate("deck/${e.id}") }) {
                if (e.mark.isNotEmpty()) Text(e.mark, style = Type.caps, color = p.gold)
                Text(e.title, style = Type.title.copy(fontSize = 20.sp), color = p.ink)
                e.sub?.let { Text(it, color = p.muted) }
            }
        }
    }
}

@Composable
fun DeckScreen(graph: Graph, nav: NavHostController, id: String) {
    val p = LocalPalette.current
    val state by graph.science.collectAsState()
    var deck by remember { mutableStateOf<Deck?>(null) }
    var title by remember { mutableStateOf("") }
    LaunchedEffect(id) { graph.index().firstOrNull { it.id == id }?.let { title = it.title; deck = runCatching { graph.deck(it) }.getOrNull() } }
    Page(title, back = { nav.popBackStack() }) {
        val d = deck ?: run { CircularProgressIndicator(color = p.green); return@Page }
        d.meta.note?.let { Text(it, color = p.muted) }
        Text("${d.atoms.count { state.cards["$id:${it.id}"]?.reps?.let { r -> r > 0 } == true }} of ${d.atoms.size} studied", color = p.muted)
        d.atoms.forEach { a ->
            Row(Modifier.fillMaxWidth().clickable { nav.navigate("atom/$id/${a.id}") }.padding(vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(a.title, color = p.ink, fontWeight = FontWeight.Bold)
                    if (a.requires.isNotEmpty()) Text("Prerequisites: ${a.requires.size}", color = p.muted, fontSize = 13.sp)
                }
                if (state.cards["$id:${a.id}"] != null) Pill("Studied", p.green)
            }
        }
    }
}

@Composable
fun AtomScreen(graph: Graph, deckId: String, atomId: String, back: () -> Unit) {
    val p = LocalPalette.current
    var atom by remember { mutableStateOf<Atom?>(null) }
    var revealed by remember { mutableStateOf(setOf<Int>()) }
    LaunchedEffect(atomId) { graph.index().firstOrNull { it.id == deckId }?.let { atom = runCatching { graph.deck(it) }.getOrNull()?.atoms?.firstOrNull { a -> a.id == atomId } } }
    Page(back = back) {
        val a = atom ?: run { CircularProgressIndicator(color = p.green); return@Page }
        Text(a.title, style = Type.display.copy(fontSize = 28.sp), color = p.ink)
        a.equation?.let { Card { Text(TexLite.render(it), fontFamily = androidx.compose.ui.text.font.FontFamily.Serif, fontSize = 22.sp, color = p.ink) } }
        Text(a.summary, color = p.ink)
        a.orderedDepths.forEach { (k, text) ->
            SectionTitle(when (k) { "eli5" -> "Simply put"; "core" -> "Core"; else -> "Deeper" })
            Text(text, color = p.ink)
        }
        a.lesson?.let { SectionTitle("Lesson"); Text(it.replace(Regex("[#*_`]"), ""), color = p.ink) }
        if (a.quiz.isNotEmpty()) SectionTitle("Test yourself")
        a.quiz.forEachIndexed { i, q ->
            Card(onClick = { revealed = revealed + i }) {
                Text(q.prompt, color = p.ink, fontWeight = FontWeight.Bold)
                Text(if (i in revealed) q.answer else "Tap to show the answer", color = if (i in revealed) p.ink else p.muted)
            }
        }
    }
}

@Composable
fun CanonScreen(graph: Graph) {
    val p = LocalPalette.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var query by remember { mutableStateOf("") }
    var hits by remember { mutableStateOf<List<CanonHit>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    fun search() = scope.launch {
        if (query.isBlank()) return@launch
        error = null
        try { hits = graph.api.canonSearch(query.trim()).results } catch (e: BucketError) { error = e.message }
    }
    Page("Canon") {
        OutlinedTextField(query, { query = it }, singleLine = true, label = { Text("Search axioms, laws, derivations") }, modifier = Modifier.fillMaxWidth(),
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search), keyboardActions = KeyboardActions(onSearch = { search() }))
        PrimaryButton("Search", enabled = query.isNotBlank(), color = p.green) { search() }
        error?.let { Text(it, color = foundation.bucket.core.ui.D8.vermilion) }
        hits?.let { if (it.isEmpty()) Text("No canon entries match.", color = p.muted) }
        hits?.forEach { h ->
            Card(onClick = h.url?.let { u -> { context.startActivity(Intent(Intent.ACTION_VIEW, (if (u.startsWith("http")) u else "https://www.bucket.foundation$u").toUri())) } }) {
                Text("${h.branch} · ${h.concept}", style = Type.caps, color = p.gold)
                Text(h.title, color = p.ink, fontWeight = FontWeight.Bold)
                Text(h.excerpt, color = p.muted)
                h.evidenceCount?.let { Text("$it sources", color = p.muted, fontSize = 12.sp) }
            }
        }
    }
}

@Composable
fun AccountScreen(graph: Graph) {
    val p = LocalPalette.current
    val stage by graph.account.stage.collectAsState()
    val scope = rememberCoroutineScope()
    var email by remember { mutableStateOf("") }
    var code by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var confirming by remember { mutableStateOf(false) }
    fun run(block: suspend () -> Unit) = scope.launch { error = null; try { block() } catch (e: BucketError) { error = e.message } }
    Page("Account") {
        when (stage) {
            Stage.SignedIn -> {
                Card {
                    Text(graph.account.email.ifEmpty { "Signed in" }, color = p.ink)
                    PlainLink("Sign out") { run { graph.account.signOut(force = true) } }
                }
                Card {
                    Text("Delete account", style = Type.title, color = p.ink)
                    Text("Deletes your account and your progress on every device.", color = p.muted)
                    if (!confirming) PlainLink("Delete my account") { confirming = true } else {
                        Text("This cannot be undone.", color = foundation.bucket.core.ui.D8.vermilion)
                        PrimaryButton("Delete forever") { run { try { graph.account.deleteAccount(); graph.saveScience(ScienceState()) } finally { confirming = false } } }
                        PlainLink("Keep my account") { confirming = false }
                    }
                }
            }
            Stage.CodeSent -> Card {
                Text("We sent a code to ${graph.account.email}.", color = p.muted)
                OutlinedTextField(code, { code = it.filter(Char::isDigit).take(8) }, singleLine = true, label = { Text("Code") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword), modifier = Modifier.fillMaxWidth())
                PrimaryButton("Sign in", enabled = code.length >= 6, color = p.green) { run { graph.account.verify(code) } }
                PlainLink("Use another email") { graph.account.editEmail() }
            }
            else -> Card {
                Text("Sign in", style = Type.title, color = p.ink)
                Text("Get a code by email. Your progress follows you to the web and every device.", color = p.muted)
                OutlinedTextField(email, { email = it }, singleLine = true, label = { Text("Email") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email), modifier = Modifier.fillMaxWidth())
                PrimaryButton("Email me a code", enabled = email.contains("@"), color = p.green) { run { graph.account.requestCode(email) } }
            }
        }
        error?.let { Text(it, color = foundation.bucket.core.ui.D8.vermilion) }
        SectionTitle("About")
        Text("Bucket Foundation. Free to read, paid to cite. Lessons carry their own licences and sources.", color = p.muted)
    }
}
