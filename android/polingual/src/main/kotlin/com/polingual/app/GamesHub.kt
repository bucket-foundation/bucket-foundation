package com.polingual.app

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Flag
import androidx.compose.material.icons.filled.GraphicEq
import androidx.compose.material.icons.filled.GridOn
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.Layers
import androidx.compose.material.icons.filled.TextFields
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import foundation.bucket.core.ui.D8
import foundation.bucket.core.ui.Type

enum class GameKind(val route: String, val title: String, val blurb: String, val icon: ImageVector, val color: Color) {
    Daily("daily", "Daily Set", "Six words. The same six for everyone on your languages today.", Icons.Filled.CalendarMonth, D8.lapis),
    Mini("mini", "Mini", "A small crossword in your language. New every day.", Icons.Filled.GridOn, D8.vermilion),
    WordGroups("groups", "Word Groups", "Sort sixteen of your words into four groups. New every day.", Icons.Filled.GridView, D8.lapis),
    Same("same", "Same Word", "One meaning across your languages.", Icons.Filled.Layers, D8.vermilion),
    Match("match", "Speed Match", "Pair words against a 60 second clock.", Icons.Filled.Bolt, D8.malachite),
    Voice("voice", "Which Voice", "Listen, then pick the flag.", Icons.Filled.GraphicEq, D8.lapis),
    Flags("flags", "Flags", "Read a word, then pick its flag.", Icons.Filled.Flag, D8.malachite),
    Letters("letters", "Letter Sprint", "Hear a sound, then find its letter.", Icons.Filled.TextFields, D8.vermilion),
}

@Composable
fun GameTile(kind: GameKind, played: String?, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(kind.color).clickable(role = Role.Button, onClick = onClick).padding(16.dp),
        horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(44.dp).clip(RoundedCornerShape(12.dp)).background(D8.parchment.copy(alpha = 0.18f)), contentAlignment = Alignment.Center) {
            Icon(kind.icon, contentDescription = null, tint = D8.parchment)
        }
        Column(Modifier.weight(1f)) {
            Text(kind.title, style = Type.title.copy(fontSize = 19.sp()), color = D8.parchment)
            Text(played ?: kind.blurb, color = D8.parchment.copy(alpha = 0.9f))
        }
    }
}
