package com.polingual.app

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import foundation.bucket.core.ui.pl.FlagBand
import foundation.bucket.core.ui.pl.Ground
import foundation.bucket.core.ui.pl.GroundBox
import foundation.bucket.core.ui.pl.PL
import foundation.bucket.core.ui.pl.PLSpace
import foundation.bucket.core.ui.pl.Stage
import foundation.bucket.core.ui.pl.Sticker

@Composable
fun Page(
    title: String? = null,
    back: (() -> Unit)? = null,
    scroll: Boolean = true,
    ground: Ground = Ground.Paper,
    stickers: List<Sticker> = emptyList(),
    content: @Composable ColumnScope.() -> Unit,
) {
    val onDark = ground == Ground.Lattice
    GroundBox(ground, Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize()) {
            Box(Modifier.weight(1f).fillMaxWidth().safeDrawingPadding(), contentAlignment = Alignment.TopCenter) {
                Column(
                    Modifier.widthIn(max = 720.dp).fillMaxSize().then(if (scroll) Modifier.verticalScroll(rememberScrollState()) else Modifier).padding(horizontal = PLSpace.s4, vertical = PLSpace.s3),
                    verticalArrangement = Arrangement.spacedBy(PLSpace.s3),
                ) {
                    if (title != null || back != null) Row(verticalAlignment = Alignment.CenterVertically) {
                        if (back != null) IconButton(onClick = back) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = if (onDark) PL.Paper else PL.Ink) }
                        if (title != null) Text(title, style = Type.display, color = if (onDark) PL.Paper else PL.Ink, modifier = Modifier.fillMaxWidth())
                    }
                    if (stickers.isNotEmpty()) Stage(stickers, height = 150.dp)
                    content()
                }
            }
            FlagBand()
        }
    }
}

fun today(): String = java.time.LocalDate.now().toString()
