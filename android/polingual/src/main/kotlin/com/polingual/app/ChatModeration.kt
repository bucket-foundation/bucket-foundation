package com.polingual.app

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import foundation.bucket.core.ui.pl.PL
import foundation.bucket.core.ui.pl.PlainLink
import foundation.bucket.core.ui.pl.PrimaryButton
import foundation.bucket.core.model.BucketError
import foundation.bucket.core.model.ChatReportReason
import foundation.bucket.core.model.LobbyMessage
import foundation.bucket.core.ui.LocalPalette
import kotlinx.coroutines.launch

val ChatReportReason.label: Int
    get() = when (this) {
        ChatReportReason.OffensiveName -> R.string.s_report_offensive_name
        ChatReportReason.Harassment -> R.string.s_report_harassment
        ChatReportReason.Spam -> R.string.s_report_spam
        ChatReportReason.Other -> R.string.s_report_other
    }

fun canModerate(message: LobbyMessage, myId: String?, bots: Set<String> = emptySet()): Boolean = myId != null && message.from != myId && message.from !in bots

private sealed interface ChatSheet {
    data class Reasons(val m: LobbyMessage) : ChatSheet
    data class Sent(val m: LobbyMessage) : ChatSheet
    data class Block(val m: LobbyMessage) : ChatSheet
}

@Composable
fun ChatLine(message: LobbyMessage, myId: String?, bots: Set<String>, report: suspend (Int, ChatReportReason) -> Unit, block: suspend (String, String) -> Unit) {
    val p = LocalPalette.current
    val scope = rememberCoroutineScope()
    var sheet by remember { mutableStateOf<ChatSheet?>(null) }
    var failure by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("${message.name}: ${message.body}", color = p.ink, modifier = Modifier.weight(1f))
        if (canModerate(message, myId, bots)) {
            PlainLink(stringResource(R.string.s_report), Modifier.testTag("chatReport")) { failure = null; sheet = ChatSheet.Reasons(message) }
            PlainLink(stringResource(R.string.s_block), Modifier.testTag("chatBlock")) { sheet = ChatSheet.Block(message) }
        }
    }
    when (val s = sheet) {
        is ChatSheet.Reasons -> AlertDialog(
            onDismissRequest = { sheet = null },
            confirmButton = { PlainLink(stringResource(R.string.s_cancel)) { sheet = null } },
            title = { Text(stringResource(R.string.s_report_title, s.m.name)) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    ChatReportReason.entries.forEach { r ->
                        PrimaryButton(stringResource(r.label), Modifier.fillMaxWidth(), enabled = !busy, color = PL.Lapis) {
                            busy = true
                            failure = null
                            scope.launch {
                                try {
                                    report(s.m.id, r)
                                    sheet = ChatSheet.Sent(s.m)
                                } catch (e: BucketError) {
                                    failure = e.message
                                } finally {
                                    busy = false
                                }
                            }
                        }
                    }
                    failure?.let { Text(stringResource(R.string.s_report_failed, it), color = PL.Vermilion, modifier = Modifier.testTag("chatReportError")) }
                }
            },
        )
        is ChatSheet.Sent -> AlertDialog(
            onDismissRequest = { sheet = null },
            confirmButton = { PlainLink(stringResource(R.string.s_block_name, s.m.name)) { sheet = ChatSheet.Block(s.m) } },
            dismissButton = { PlainLink(stringResource(R.string.s_done)) { sheet = null } },
            title = { Text(stringResource(R.string.s_report_sent)) },
            text = { Text(stringResource(R.string.s_report_review)) },
        )
        is ChatSheet.Block -> AlertDialog(
            onDismissRequest = { sheet = null },
            confirmButton = { PrimaryButton(stringResource(R.string.s_block)) { scope.launch { block(s.m.from, s.m.name) }; sheet = null } },
            dismissButton = { PlainLink(stringResource(R.string.s_cancel)) { sheet = null } },
            title = { Text(stringResource(R.string.s_block_title, s.m.name)) },
            text = { Text(stringResource(R.string.s_block_body)) },
        )
        null -> Unit
    }
}
