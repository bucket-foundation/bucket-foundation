package com.polingual.app

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.ui.draw.clip
import foundation.bucket.core.ui.LocalPalette
import com.polingual.brand.Type
import com.polingual.brand.Heading
import com.polingual.brand.dotGrid

@Composable
fun BackButton(onClick: () -> Unit) {
    Box(
        Modifier.size(40.dp).clip(androidx.compose.foundation.shape.CircleShape).background(com.polingual.brand.D8.white)
            .border(2.dp, com.polingual.brand.D8.hair, androidx.compose.foundation.shape.CircleShape).clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = androidx.compose.ui.res.stringResource(R.string.s_back), tint = com.polingual.brand.D8.tyrian) }
}

@Composable
fun Page(title: String? = null, back: (() -> Unit)? = null, scroll: Boolean = true, content: @Composable ColumnScope.() -> Unit) {
    Box(Modifier.fillMaxSize().dotGrid().safeDrawingPadding(), contentAlignment = Alignment.TopCenter) {
        Column(
            Modifier.widthIn(max = 720.dp).fillMaxSize().then(if (scroll) Modifier.verticalScroll(rememberScrollState()) else Modifier).padding(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            if (title != null || back != null) Row(verticalAlignment = Alignment.CenterVertically) {
                if (back != null) BackButton(back)
                if (title != null) Heading(title, Modifier.fillMaxWidth().padding(start = if (back != null) 8.dp else 0.dp))
            }
            content()
        }
    }
}

fun today(): String = java.time.LocalDate.now().toString()

class PlayFx {
    var bursts by androidx.compose.runtime.mutableIntStateOf(0)
        private set
    fun burst() { bursts += 1 }
}

val LocalPlayFx = androidx.compose.runtime.staticCompositionLocalOf { PlayFx() }

val LocalGraph = androidx.compose.runtime.staticCompositionLocalOf<Graph?> { null }

@Composable
fun PlayPage(title: String, back: () -> Unit, scroll: Boolean = true, trailing: @Composable () -> Unit = {}, content: @Composable ColumnScope.() -> Unit) {
    val fx = androidx.compose.runtime.remember { PlayFx() }
    val host = androidx.compose.ui.platform.LocalView.current
    androidx.compose.runtime.DisposableEffect(host) {
        val window = (host.context as? android.app.Activity)?.window
        val ctl = window?.let { androidx.core.view.WindowCompat.getInsetsController(it, host) }
        ctl?.systemBarsBehavior = androidx.core.view.WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        ctl?.hide(androidx.core.view.WindowInsetsCompat.Type.systemBars())
        onDispose { ctl?.show(androidx.core.view.WindowInsetsCompat.Type.systemBars()) }
    }
    androidx.activity.compose.BackHandler(onBack = back)
    androidx.compose.runtime.CompositionLocalProvider(LocalPlayFx provides fx) {
        Box(Modifier.fillMaxSize().dotGrid().safeDrawingPadding()) {
            Column(
                Modifier.fillMaxSize().then(if (scroll) Modifier.verticalScroll(rememberScrollState()) else Modifier).padding(horizontal = 10.dp, vertical = 4.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth().heightIn(min = 44.dp)) {
                    BackButton(back)
                    Text(title, style = Type.title.copy(fontSize = 18.sp()), color = com.polingual.brand.D8.tyrian, maxLines = 1, modifier = Modifier.weight(1f))
                    Box(Modifier.weight(1.5f)) { trailing() }
                }
                content()
            }
            if (fx.bursts > 0) Confetti(fx.bursts)
        }
    }
}
