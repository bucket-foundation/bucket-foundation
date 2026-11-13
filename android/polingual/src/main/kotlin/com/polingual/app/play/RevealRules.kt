package com.polingual.app.play

import com.polingual.app.PlayRules

object RevealRules {
    fun polyword(guesses: List<String>, answer: String) = PlayRules.showReveal(answered = Polyword.solved(guesses, answer), roundClosed = Polyword.finished(guesses, answer))

    fun flagTiles(run: RunState) = PlayRules.showReveal(answered = run.picked != null, roundClosed = run.phase == RunPhase.Missed || run.phase == RunPhase.Over)

    fun babel(cleared: Int, goal: Int, movesLeft: Int) = PlayRules.showReveal(answered = cleared >= goal, roundClosed = movesLeft <= 0)

    fun shift(found: List<String>, targets: List<ShiftTarget>) = PlayRules.showReveal(answered = false, roundClosed = targets.all { it.form in found })

    fun snake(alive: Boolean, secondsLeft: Int) = PlayRules.showReveal(answered = !alive, roundClosed = secondsLeft <= 0)

    fun atlas(guessed: Boolean) = PlayRules.showReveal(answered = guessed, roundClosed = false)

    fun forehead(cardsLeft: Int, secondsLeft: Int) = PlayRules.showReveal(answered = false, roundClosed = cardsLeft <= 0 || secondsLeft <= 0)

    fun iSpy(tapped: Boolean, elapsedMs: Long) = PlayRules.showReveal(answered = tapped, roundClosed = elapsedMs >= ISpy.ROUND_SECONDS * 1000L)

    fun sameWord(revealPhase: Boolean) = PlayRules.showReveal(answered = false, roundClosed = revealPhase)
}
