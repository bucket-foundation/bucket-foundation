package com.polingual.app

import foundation.bucket.core.ui.pl.PLCard
import foundation.bucket.core.ui.pl.Glyph
import androidx.compose.ui.semantics.Role
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.clickable
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
    panel: Boolean = false,
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
                    if (title != null || back != null || stickers.isNotEmpty()) Box(Modifier.fillMaxWidth().heightIn(min = if (stickers.isEmpty()) 0.dp else 104.dp)) {
                        if (stickers.isNotEmpty()) Stage(stickers, Modifier.fillMaxWidth(0.42f).align(Alignment.TopEnd), height = 104.dp, outline = !onDark)
                        Row(Modifier.align(Alignment.BottomStart).fillMaxWidth(if (stickers.isEmpty()) 1f else 0.6f), verticalAlignment = Alignment.CenterVertically) {
                            if (back != null) Box(Modifier.size(44.dp).clickable(role = Role.Button, onClickLabel = "Back", onClick = back), contentAlignment = Alignment.Center) {
                                Glyph("back", "Back", if (onDark) PL.Paper else PL.Ink, Modifier.size(24.dp))
                            }
                            if (title != null) Text(title, style = Type.display, color = if (onDark) PL.Paper else PL.Ink)
                        }
                    }
                    if (panel) PLCard(content = content) else content()
                    Spacer(Modifier.height(PLSpace.s7))
                }
            }
            FlagBand()
        }
    }
}

fun today(): String = java.time.LocalDate.now().toString()
