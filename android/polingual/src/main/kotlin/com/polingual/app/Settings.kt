package com.polingual.app

import androidx.compose.foundation.layout.Row
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import foundation.bucket.core.ui.Card
import foundation.bucket.core.ui.LocalPalette
import foundation.bucket.core.ui.SectionTitle

@Composable
fun SettingRow(title: String, on: Boolean, change: (Boolean) -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(title, color = LocalPalette.current.ink, modifier = Modifier.weight(1f))
        Switch(on, change)
    }
}

@Composable
fun BetaSharing(graph: Graph) {
    var share by remember { mutableStateOf(!graph.beta.events.optedOut) }
    SectionTitle(stringResource(R.string.beta_testing))
    Card {
        SettingRow(stringResource(R.string.beta_share), share) { on ->
            share = on
            graph.beta.setOptedOut(!on)
        }
        Text(stringResource(R.string.beta_share_footer), color = LocalPalette.current.muted)
    }
}
