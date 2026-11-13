package com.polingual.app

import foundation.bucket.core.ui.pl.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.ui.text.input.KeyboardType
import androidx.navigation.NavHostController
import foundation.bucket.core.auth.Stage
import foundation.bucket.core.model.BucketError
import foundation.bucket.core.ui.pl.Card
import foundation.bucket.core.ui.pl.PL
import foundation.bucket.core.ui.LocalPalette
import foundation.bucket.core.ui.pl.PlainLink
import foundation.bucket.core.ui.pl.PrimaryButton
import foundation.bucket.core.ui.pl.SectionTitle
import kotlinx.coroutines.launch

@Composable
fun AccountScreen(graph: Graph, nav: NavHostController) {
    val stage by graph.account.stage.collectAsState()
    val app by graph.state.collectAsState()
    val p = LocalPalette.current
    Page("Account", stickers = listOf(Sticker("azulejo", Alignment.TopStart, 84.dp, -10f), Sticker("script-he", Alignment.TopEnd, 100.dp, 7f, dy = 14.dp), Sticker("ink-dot", Alignment.BottomCenter, 44.dp, 0f))) {
        when (stage) {
            Stage.SignedIn -> SignedInSection(graph, nav)
            else -> SignInCard(graph, stage)
        }
        SectionTitle("Guest play")
        Card {
            Text("Nickname for live rooms", color = p.ink, style = Type.caps)
            var nick by remember(app?.nickname) { mutableStateOf(app?.nickname.orEmpty()) }
            val scope = rememberCoroutineScope()
            OutlinedTextField(nick, { nick = it.take(40) }, singleLine = true, modifier = Modifier.fillMaxWidth(), label = { Text("Nickname") })
            PlainLink("Save nickname") { scope.launch { graph.store.update { it.copy(nickname = nick.trim()) } } }
            Text("Games and live rooms work without an account. An account saves your streak and progress on every device.", color = p.muted)
        }
        AccountExtras(graph, nav)
    }
}

@Composable
fun SignInCard(graph: Graph, stage: Stage) {
    val p = LocalPalette.current
    var email by remember { mutableStateOf("") }
    var code by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    fun run(block: suspend () -> Unit) = scope.launch {
        busy = true
        error = null
        try { block() } catch (e: BucketError) { error = e.message } finally { busy = false }
    }
    Card {
        Text("Sign in", style = Type.title, color = p.ink)
        if (stage == Stage.CodeSent) {
            Text("We sent a code to ${graph.account.email}.", color = p.muted)
            OutlinedTextField(code, { code = it.filter(Char::isDigit).take(8) }, singleLine = true, label = { Text("Code") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword), modifier = Modifier.fillMaxWidth())
            PrimaryButton(if (busy) "Checking" else "Sign in", enabled = code.length >= 6 && !busy) { run { graph.account.verify(code) } }
            PlainLink("Use another email") { graph.account.editEmail() }
        } else {
            Text("Get a code by email. No password.", color = p.muted)
            OutlinedTextField(email, { email = it }, singleLine = true, label = { Text("Email") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email), modifier = Modifier.fillMaxWidth())
            PrimaryButton(if (busy) "Sending" else "Email me a code", enabled = email.contains("@") && !busy) { run { graph.account.requestCode(email) } }
        }
        error?.let { Text(it, color = PL.Vermilion) }
    }
}
