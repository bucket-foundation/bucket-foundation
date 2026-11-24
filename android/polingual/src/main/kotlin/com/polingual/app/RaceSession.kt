package com.polingual.app

import foundation.bucket.core.model.Lobby
import foundation.bucket.core.model.LobbyGame
import foundation.bucket.core.model.LobbyRace

object RaceSession {
    @Volatile private var lobby: Lobby? = null
    @Volatile private var report: ((Int) -> Unit)? = null

    fun open(lobby: Lobby, onScore: (Int) -> Unit) {
        this.lobby = lobby
        report = onScore
    }

    fun close(id: String) {
        if (lobby?.id == id) { lobby = null; report = null }
    }

    val dayKey: String? get() = lobby?.raceKey
    val root: String? get() = lobby?.root
    val targets: List<String>? get() = lobby?.targets

    fun finished(game: LobbyGame, points: Int? = null, hits: Int = 0) {
        val l = lobby ?: return
        if (l.game != game) return
        report?.invoke(LobbyRace.score(points, hits))
    }
}
