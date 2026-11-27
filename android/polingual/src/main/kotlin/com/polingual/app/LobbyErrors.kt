package com.polingual.app

import foundation.bucket.core.model.BucketError

object LobbyErrors {
    val copy: Map<String, String> = mapOf(
        "not_found" to "No lobby with that code.",
        "lobby_full" to "That lobby is full.",
        "lobby_started" to "That game already started.",
        "need_ready" to "Everyone in the room needs to be ready.",
        "not_host" to "Only the host can do that.",
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
        "end_off" to "Closing rooms is not on yet.",
        "audience_age" to "Watching needs an account for 13 and over.",
        "audience_signin" to "Sign in to watch this room.",
        "seat_open" to "A seat is free. Join as a player.",
        "card_locked" to "The game started. Your card is set.",
        "not_audience" to "Only the audience votes on the bonus.",
        "already_voted" to "You already voted.",
        "not_allowed" to "That step is not open right now.",
        "not_eligible" to "The league opens at 13 and over.",
        "bots_off" to "Bots are off for this room.",
    )

    fun atlasGuess(e: BucketError): String = when ((e as? BucketError.Server)?.text) {
        "already_answered" -> "You already placed a pin for this clip."
        "wrong_round" -> "That clip is over. Pin the next one."
        else -> "That guess did not count."
    }

    fun pollProblem(e: BucketError): String? = when {
        e == BucketError.Offline || e == BucketError.Unavailable || e is BucketError.RateLimited -> null
        e is BucketError.Server && e.status >= 500 -> null
        else -> text(e)
    }

    fun text(e: BucketError): String = (e as? BucketError.Server)?.text?.let { copy[it] } ?: e.message
}
