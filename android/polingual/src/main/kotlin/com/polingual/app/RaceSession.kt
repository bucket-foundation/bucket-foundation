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
    val deal: String? get() = lobby?.seed?.let(LobbyRace::deal)
    val root: String? get() = lobby?.root
    val targets: List<String>? get() = lobby?.targets

    val active: Boolean get() = lobby != null

    fun system(base: foundation.bucket.core.model.LangSystem?): foundation.bucket.core.model.LangSystem? {
        val l = lobby ?: return base
        return (base ?: foundation.bucket.core.model.LangSystem("race-${l.id}", l.name, l.root, l.targets, 0.0)).copy(root = l.root, targets = l.targets)
    }

    fun finishedKind(kind: GameKind, pattern: String): Boolean {
        val l = lobby ?: return false
        if (RaceRules.kindFor(l.game) != kind) return false
        finished(l.game, hits = RaceRules.hits(pattern))
        return true
    }

    fun finished(game: LobbyGame, points: Int? = null, hits: Int = 0) {
        val l = lobby ?: return
        if (l.game != game) return
        report?.invoke(LobbyRace.score(points, hits))
    }
}

object RaceRules {
    fun kindFor(game: LobbyGame): GameKind? = when (game) {
        LobbyGame.Mini -> GameKind.Mini
        LobbyGame.WordGroups -> GameKind.WordGroups
        LobbyGame.Match -> GameKind.Match
        LobbyGame.Voice -> GameKind.Voice
        LobbyGame.Letters -> GameKind.Letters
        else -> null
    }

    fun hits(pattern: String): Int = pattern.count { it == '1' }
}

object RaceDeal {
    fun langs(own: List<String>, race: List<String>? = RaceSession.targets): List<String> = race?.takeIf { it.isNotEmpty() } ?: own

    fun lang(own: String, race: List<String>? = RaceSession.targets): String = race?.firstOrNull() ?: own
}
