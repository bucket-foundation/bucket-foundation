package com.polingual.app

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import foundation.bucket.core.ui.pl.PL

@Composable
fun SilentSwitch(graph: Graph, compact: Boolean = false) {
    val silent by graph.silent.collectAsState()
    Row(verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text("Silent mode", style = if (compact) Type.small else Type.title, color = PL.Ink)
            if (!compact) Text("Skips listening questions until you can hear again, and plays nothing on its own. A speaker tap still plays.", style = Type.small, color = PL.InkDim)
        }
        Switch(
            checked = silent, onCheckedChange = graph::setSilent,
            modifier = Modifier.semantics { contentDescription = "Silent mode" },
            colors = SwitchDefaults.colors(checkedTrackColor = PL.Lapis, checkedThumbColor = PL.Paper),
        )
    }
}

object SoundRules {
    val soundOnlyGames = setOf(GameKind.Voice, GameKind.Letters)
    fun needsSoundCard(silent: Boolean, soundOnly: Boolean) = silent && soundOnly
    fun onlySoundLeft(silent: Boolean, remaining: Int, deferred: Int) = silent && remaining == 0 && deferred > 0
}

@Composable
fun NeedsSound(graph: Graph, what: String) {
    foundation.bucket.core.ui.pl.EmptyState("glyph-speaker", "$what needs sound. Silent mode is on, so it waits until you can listen.")
    SilentSwitch(graph)
}
