package com.polingual.app

import android.app.Activity
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import foundation.bucket.core.auth.Stage
import foundation.bucket.core.model.BucketError
import foundation.bucket.core.ui.Card
import foundation.bucket.core.ui.D8
import foundation.bucket.core.ui.LocalPalette
import foundation.bucket.core.ui.PlainLink
import foundation.bucket.core.ui.PrimaryButton
import foundation.bucket.core.ui.Type
import kotlinx.coroutines.launch
import java.security.MessageDigest
import java.security.SecureRandom

object SaveProgress {
    fun offer(signedIn: Boolean) = !signedIn
    fun shown(pending: Boolean, signedIn: Boolean) = pending && !signedIn
}

object SignInErrors {
    fun message(e: Throwable): Int = when (e) {
        BucketError.Offline -> R.string.signin_offline
        is BucketError.RateLimited -> R.string.signin_rate_limited
        BucketError.Unavailable, is BucketError.Server -> R.string.signin_unavailable
        BucketError.Revoked -> R.string.signin_revoked
        is androidx.credentials.exceptions.NoCredentialException -> R.string.signin_no_google
        else -> R.string.signin_failed
    }
}

object GoogleSignIn {
    fun available(clientId: String = BuildConfig.GOOGLE_CLIENT_ID) = clientId.isNotBlank()

    fun nonce(random: SecureRandom = SecureRandom()): String = ByteArray(16).also(random::nextBytes).joinToString("") { "%02x".format(it) }

    fun hashed(raw: String): String = MessageDigest.getInstance("SHA-256").digest(raw.toByteArray()).joinToString("") { "%02x".format(it) }

    suspend fun signIn(activity: Activity, graph: Graph): Boolean {
        if (!available()) return false
        val raw = nonce()
        val option = GetSignInWithGoogleOption.Builder(BuildConfig.GOOGLE_CLIENT_ID).setNonce(hashed(raw)).build()
        val result = try {
            CredentialManager.create(activity).getCredential(activity, GetCredentialRequest.Builder().addCredentialOption(option).build())
        } catch (e: GetCredentialCancellationException) {
            return false
        }
        val cred = result.credential as? CustomCredential ?: return false
        if (cred.type != GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) return false
        graph.account.signInWithGoogle(GoogleIdTokenCredential.createFrom(cred.data).idToken, raw)
        return true
    }
}

@Composable
fun GoogleSignInButton(graph: Graph, onError: (String?) -> Unit) {
    if (!GoogleSignIn.available()) return
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var busy by remember { mutableStateOf(false) }
    PrimaryButton(stringResource(R.string.save_google), enabled = !busy) {
        val activity = context as? Activity ?: return@PrimaryButton
        scope.launch {
            busy = true
            onError(null)
            try { GoogleSignIn.signIn(activity, graph) } catch (e: Exception) {
                if (e is kotlinx.coroutines.CancellationException) throw e
                onError(context.getString(SignInErrors.message(e)))
            } finally { busy = false }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SaveProgressGate(graph: Graph) {
    val app by graph.state.collectAsState()
    val stage by graph.account.stage.collectAsState()
    val scope = rememberCoroutineScope()
    if (!SaveProgress.shown(app?.savePrompt == true, stage == Stage.SignedIn)) return
    val p = LocalPalette.current
    var error by remember { mutableStateOf<String?>(null) }
    var emailing by remember { mutableStateOf(false) }
    val close: () -> Unit = { scope.launch { graph.store.update { it.copy(savePrompt = false) } } }
    LaunchedEffect(stage) { if (stage == Stage.SignedIn) close() }
    ModalBottomSheet(onDismissRequest = close, containerColor = p.paper) {
        Column(Modifier.verticalScroll(rememberScrollState()).padding(24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Text(stringResource(R.string.save_title), style = Type.display, color = p.ink)
            Text(stringResource(R.string.save_detail), color = p.muted)
            Card {
                Text(stringResource(R.string.save_sync), color = p.ink)
                Text(stringResource(R.string.save_new_phone), color = p.ink)
            }
            GoogleSignInButton(graph) { error = it }
            if (emailing || !GoogleSignIn.available()) SignInCard(graph, stage) else PlainLink(stringResource(R.string.save_email)) { emailing = true }
            error?.let { Text(it, color = D8.vermilion) }
            PlainLink(stringResource(R.string.save_not_now)) { close() }
        }
    }
}
