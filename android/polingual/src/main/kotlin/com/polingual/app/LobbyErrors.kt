package com.polingual.app

import foundation.bucket.core.model.BucketError

object LobbyErrors {
    val copy: Map<String, String> = mapOf(
        "not_found" to "No lobby with that code.",
        "lobby_full" to "That lobby is full.",
        "lobby_started" to "That game already started.",
        "need_ready" to "Two players need to be ready.",
        "not_host" to "Only the host can start.",
        "already_answered" to "You already answered this round.",
        "already_continued" to "You already used your continue this game.",
        "has_lives" to "You still have lives left.",
        "no_coins" to "Not enough coins for that power-up.",
        "power_used" to "You already have a power-up for the next round.",
        "wrong_round" to "That round is over.",
        "not_playing" to "The game is not running.",
        "bad_choice" to "Pick one of the choices.",
        "out_of_lives" to "Out of lives. Watch the rest and go again.",
        "no_words" to "Those languages have no shared words yet. Pick another set.",
        "bad_guest" to "Pick a nickname of 2 to 24 characters.",
        "hosted_limit" to "You already host three lobbies.",
        "rate_limited" to "Slow down a moment and try again.",
        "name_not_allowed" to "Pick a different name.",
        "text_not_allowed" to "That message was blocked.",
        "unauthorized" to "Your session ended. Rejoin with your nickname.",
        "bad_request" to "Check the details and try again.",
        "sync_unavailable" to "Lobbies are offline right now. Try again soon.",
        "offline" to "No connection. Check your network.",
        "update_app" to "This game needs the newest app. Open it on polingual.com.",
    )

    fun text(e: BucketError): String = (e as? BucketError.Server)?.text?.let { copy[it] } ?: e.message
}
