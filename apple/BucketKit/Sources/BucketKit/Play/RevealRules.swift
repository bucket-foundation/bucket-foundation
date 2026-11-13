import Foundation

public enum RevealRules {
    public static func showReveal(answered: Bool, roundClosed: Bool) -> Bool { answered || roundClosed }

    public static func polyword(_ guesses: [String], _ answer: String) -> Bool { showReveal(answered: Polyword.solved(guesses, answer), roundClosed: Polyword.finished(guesses, answer)) }

    public static func flagTiles(_ run: RunState) -> Bool { showReveal(answered: run.picked != nil, roundClosed: run.phase == .missed || run.phase == .over) }

    public static func babel(cleared: Int, goal: Int, movesLeft: Int) -> Bool { showReveal(answered: cleared >= goal, roundClosed: movesLeft <= 0) }

    public static func shift(found: [String], targets: [ShiftTarget]) -> Bool { showReveal(answered: false, roundClosed: targets.allSatisfy { found.contains($0.form) }) }

    public static func snake(alive: Bool, secondsLeft: Int) -> Bool { showReveal(answered: !alive, roundClosed: secondsLeft <= 0) }

    public static func atlas(guessed: Bool) -> Bool { showReveal(answered: guessed, roundClosed: false) }

    public static func forehead(cardsLeft: Int, secondsLeft: Int) -> Bool { showReveal(answered: false, roundClosed: cardsLeft <= 0 || secondsLeft <= 0) }

    public static func iSpy(tapped: Bool, elapsedMs: Int) -> Bool { showReveal(answered: tapped, roundClosed: elapsedMs >= ISpy.roundSeconds * 1000) }

    public static func sameWord(revealPhase: Bool) -> Bool { showReveal(answered: false, roundClosed: revealPhase) }
}
