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
            if (!compact) Text("No sound effects or automatic audio. A speaker tap still plays.", style = Type.small, color = PL.InkDim)
        }
        Switch(
            checked = silent, onCheckedChange = graph::setSilent,
            modifier = Modifier.semantics { contentDescription = "Silent mode" },
            colors = SwitchDefaults.colors(checkedTrackColor = PL.Lapis, checkedThumbColor = PL.Paper),
        )
    }
}
