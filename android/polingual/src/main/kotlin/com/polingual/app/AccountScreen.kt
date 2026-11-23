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
    Page(androidx.compose.ui.res.stringResource(R.string.s_account)) {
        when (stage) {
            Stage.SignedIn -> SignedInSection(graph, nav)
            else -> { GoogleSignInButton(graph) { }; SignInCard(graph, stage) }
        }
        SectionTitle(androidx.compose.ui.res.stringResource(R.string.s_guest_play))
        Card {
            Text(androidx.compose.ui.res.stringResource(R.string.s_nickname_for_live_rooms), color = p.ink, style = Type.caps)
            var nick by remember(app?.nickname) { mutableStateOf(app?.nickname.orEmpty()) }
            val scope = rememberCoroutineScope()
            OutlinedTextField(nick, { nick = it.take(40) }, singleLine = true, modifier = Modifier.fillMaxWidth(), label = { Text(androidx.compose.ui.res.stringResource(R.string.s_nickname)) })
            PlainLink(androidx.compose.ui.res.stringResource(R.string.s_save_nickname)) { scope.launch { graph.store.update { it.copy(nickname = nick.trim()) } } }
            Text(androidx.compose.ui.res.stringResource(R.string.s_games_and_live_rooms_work_without), color = p.muted)
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
        Text(androidx.compose.ui.res.stringResource(R.string.s_sign_in), style = Type.title, color = p.ink)
        if (stage == Stage.CodeSent) {
            Text(androidx.compose.ui.res.stringResource(R.string.s_we_sent_a_code_to_x, graph.account.email), color = p.muted)
            OutlinedTextField(code, { code = it.filter(Char::isDigit).take(8) }, singleLine = true, label = { Text(androidx.compose.ui.res.stringResource(R.string.s_code)) },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword), modifier = Modifier.fillMaxWidth())
            PrimaryButton(if (busy) androidx.compose.ui.res.stringResource(R.string.s_checking) else androidx.compose.ui.res.stringResource(R.string.s_sign_in), enabled = code.length >= 6 && !busy) { run { graph.account.verify(code) } }
            PlainLink(androidx.compose.ui.res.stringResource(R.string.s_use_another_email)) { graph.account.editEmail() }
        } else {
            Text(androidx.compose.ui.res.stringResource(R.string.s_get_a_code_by_email_no), color = p.muted)
            OutlinedTextField(email, { email = it }, singleLine = true, label = { Text(androidx.compose.ui.res.stringResource(R.string.s_email)) },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email), modifier = Modifier.fillMaxWidth())
            PrimaryButton(if (busy) androidx.compose.ui.res.stringResource(R.string.s_sending) else androidx.compose.ui.res.stringResource(R.string.s_email_me_a_code), enabled = email.contains("@") && !busy) { run { graph.account.requestCode(email) } }
        }
        error?.let { Text(it, color = D8.vermilion) }
    }
}
