package com.polingual.app

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.mutableStateOf
import foundation.bucket.core.ui.PolingualTheme

class MainActivity : ComponentActivity() {
    private val link = mutableStateOf<Link?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        link.value = Link.from(intent)
        val graph = (application as PolingualApp).graph
        graph.activity = java.lang.ref.WeakReference(this)
        graph.ads.gather(this)
        setContent { PolingualTheme { Root(graph, link.value) { link.value = null } } }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        link.value = Link.from(intent)
    }
}

sealed interface Link {
    data class Room(val code: String) : Link
    data class Translate(val text: String) : Link

    companion object {
        fun from(intent: Intent?): Link? {
            intent ?: return null
            if (intent.action == Intent.ACTION_SEND) return intent.getStringExtra(Intent.EXTRA_TEXT)?.take(200)?.let(::Translate)
            val segments = intent.data?.pathSegments ?: return null
            if (segments.size >= 2 && segments[0] in setOf("play", "join")) return Room(segments[1])
            return null
        }
    }
}
