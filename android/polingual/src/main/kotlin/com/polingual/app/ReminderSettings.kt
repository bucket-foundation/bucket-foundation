package com.polingual.app

import androidx.compose.foundation.layout.Row
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import foundation.bucket.core.ui.pl.Card
import foundation.bucket.core.ui.pl.PL
import foundation.bucket.core.ui.pl.PLPill
import foundation.bucket.core.ui.pl.PlainLink
import foundation.bucket.core.ui.pl.SectionTitle

@Composable
private fun SettingRow(title: String, on: Boolean, change: (Boolean) -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(title, style = Type.body, color = PL.Ink, modifier = Modifier.weight(1f))
        PLPill(if (on) "On" else "Off", active = on) { change(!on) }
    }
}

@Composable
fun AskNotificationsOnce(graph: Graph) {
    val launcher = androidx.activity.compose.rememberLauncherForActivityResult(androidx.activity.result.contract.ActivityResultContracts.RequestPermission()) { ok ->
        if (ok) graph.reminders.reschedule()
    }
    androidx.compose.runtime.LaunchedEffect(Unit) {
        if (graph.reminders.asked) return@LaunchedEffect
        graph.reminders.markAsked()
        if (android.os.Build.VERSION.SDK_INT >= 33 && !graph.reminders.allowed()) launcher.launch(android.Manifest.permission.POST_NOTIFICATIONS)
    }
}

@Composable
fun NotificationSettings(graph: Graph) {
    var word by remember { mutableStateOf(graph.reminders.wordOfDay) }
    var risk by remember { mutableStateOf(graph.reminders.streakRisk) }
    SectionTitle(stringResource(R.string.notify_section))
    Card {
        SettingRow(stringResource(R.string.notify_word_toggle), word) { word = it; graph.reminders.wordOfDay = it }
        SettingRow(stringResource(R.string.notify_risk_toggle), risk) { risk = it; graph.reminders.streakRisk = it }
        if (!graph.reminders.allowed()) {
            val context = androidx.compose.ui.platform.LocalContext.current
            Text(stringResource(R.string.notify_denied), color = PL.InkDim)
            PlainLink(stringResource(R.string.notify_open_settings)) {
                runCatching {
                    context.startActivity(android.content.Intent(android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                        .putExtra(android.provider.Settings.EXTRA_APP_PACKAGE, context.packageName).addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK))
                }
            }
        }
    }
}
