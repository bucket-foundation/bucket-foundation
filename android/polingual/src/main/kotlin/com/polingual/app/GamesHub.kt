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
import com.polingual.brand.D8
import com.polingual.brand.Type

enum class GameKind(val route: String, val title: Int, val blurb: Int, val icon: ImageVector, val color: Color) {
    Daily("daily", R.string.game_daily, R.string.game_daily_blurb, Icons.Filled.CalendarMonth, D8.ochre),
    Mini("mini", R.string.game_mini, R.string.game_mini_blurb, Icons.Filled.GridOn, D8.vermilion),
    WordGroups("groups", R.string.game_groups, R.string.game_groups_blurb, Icons.Filled.GridView, D8.lapis),
    Same("same", R.string.game_same, R.string.game_same_blurb, Icons.Filled.Layers, D8.tyrian),
    Match("match", R.string.game_match, R.string.game_match_blurb, Icons.Filled.Bolt, D8.malachite),
    Voice("voice", R.string.game_voice, R.string.game_voice_blurb, Icons.Filled.GraphicEq, D8.maya),
    Flags("flags", R.string.game_flags, R.string.game_flags_blurb, Icons.Filled.Flag, D8.vermilion),
    Letters("letters", R.string.game_letters, R.string.game_letters_blurb, Icons.Filled.TextFields, D8.malachite),
}

@Composable
fun GameTile(kind: GameKind, played: String?, modifier: Modifier = Modifier, onClick: () -> Unit) {
    com.polingual.brand.GameCard(androidx.compose.ui.res.stringResource(kind.title), played ?: androidx.compose.ui.res.stringResource(kind.blurb), kind.color, modifier, icon = {
        Icon(kind.icon, contentDescription = null, tint = com.polingual.brand.D8.on(kind.color).copy(alpha = 0.85f))
    }, onClick = onClick)
}
