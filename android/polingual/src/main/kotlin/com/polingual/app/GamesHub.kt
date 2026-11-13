package com.polingual.app

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import foundation.bucket.core.ui.pl.Art
import foundation.bucket.core.ui.pl.CardTone
import foundation.bucket.core.ui.pl.PL
import foundation.bucket.core.ui.pl.PLCard

enum class GameKind(val route: String, val title: String, val blurb: String, val art: String, val tilt: Float, val color: Color, val tag: String, val band: Color, val bandArt: String) {
    Daily("daily", "Daily Set", "Six words. The same six for everyone on your languages today.", "star", -12f, PL.Lapis, "Six words · same for everyone", PL.Ochre, "kente"),
    Mini("mini", "Mini", "A small crossword in your language. New every day.", "azulejo-grid", 10f, PL.Vermilion, "A small crossword a day", PL.Lapis, "azulejo-grid"),
    WordGroups("groups", "Word Groups", "Sort sixteen of your words into four groups. New every day.", "blocks", -8f, PL.Lapis, "Sixteen words · four groups", PL.Malachite, "sk-kente"),
    Same("same", "Same Word", "One meaning across your languages.", "seal", -7f, PL.Vermilion, "One meaning · many languages", PL.Tyrian, "seal"),
    Match("match", "Speed Match", "Pair words against a 60 second clock.", "pebble", -14f, PL.Malachite, "Fifteen pairs · sixty seconds", PL.Vermilion, "streak-flame"),
    Voice("voice", "Which Voice", "Listen, then pick the flag.", "azulejo", 8f, PL.Lapis, "Listen · pick the flag", PL.Tyrian, "torn-label"),
    Flags("flags", "Flags", "Read a word, then pick its flag.", "bunting", 4f, PL.Malachite, "Read a word · pick its flag", PL.Lapis, "bunting"),
    Letters("letters", "Letter Sprint", "Hear a sound, then find its letter.", "torn-label", 5f, PL.Vermilion, "Hear a sound · find the letter", PL.Paper2, "calligraphy-yong"),
}

@Composable
fun GameBanner(kind: GameKind) {
    val onDark = kind.band != PL.Paper2 && kind.band != PL.Ochre
    androidx.compose.foundation.layout.Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(kind.band)) {
        Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            androidx.compose.foundation.layout.Column(
                Modifier.weight(1f).rotate(-1.5f).clip(RoundedCornerShape(10.dp)).background(PL.Card).padding(horizontal = 12.dp, vertical = 8.dp),
            ) {
                Text(kind.tag.uppercase(), style = Type.caps, color = if (onDark) kind.band else PL.OchreDeep)
                Text(kind.title, style = Type.title, color = PL.TyrianDeep)
            }
            Box(Modifier.size(64.dp), contentAlignment = Alignment.Center) { Art(kind.bandArt, Modifier.size(58.dp).rotate(kind.tilt), shadow = true) }
        }
        foundation.bucket.core.ui.pl.FlagBand()
    }
}

@Composable
fun GameTile(kind: GameKind, played: String?, onClick: () -> Unit) {
    PLCard(tone = CardTone.Tyrian, onClick = onClick) {
        Row(horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(64.dp), contentAlignment = Alignment.Center) { Art(kind.art, Modifier.size(58.dp).rotate(kind.tilt), shadow = true) }
            Column(Modifier.weight(1f)) {
                Text(kind.title, style = Type.title, color = PL.Paper)
                Text(played ?: kind.blurb, style = Type.small, color = PL.Paper.copy(alpha = 0.9f))
            }
        }
    }
}
