package com.polingual.app

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
import androidx.compose.ui.Modifier
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.ui.text.input.KeyboardType
import androidx.navigation.NavHostController
import foundation.bucket.core.auth.Stage
import foundation.bucket.core.model.BucketError
import foundation.bucket.core.ui.Card
import foundation.bucket.core.ui.D8
import foundation.bucket.core.ui.LocalPalette
import foundation.bucket.core.ui.PlainLink
import foundation.bucket.core.ui.PrimaryButton
import foundation.bucket.core.ui.SectionTitle
import foundation.bucket.core.ui.Type
import kotlinx.coroutines.launch

@Composable
fun AccountScreen(graph: Graph, nav: NavHostController) {
    val stage by graph.account.stage.collectAsState()
    val app by graph.state.collectAsState()
    val p = LocalPalette.current
    Page("Account") {
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
        error?.let { Text(it, color = D8.vermilion) }
    }
}
