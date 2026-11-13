package foundation.bucket.core.model

data class Tile(val lang: String, val form: String)
data class TileSlot(val index: Int, val lane: Int, val spawnMs: Int, val fallMs: Int)
data class TileOutcome(val hits: Int, val wrong: Int, val missed: Int, val perfect: Boolean)

object LobbyTiles {
    const val LIVES = 3
    const val POINTS = 50
    const val MIN = 5
    const val MAX = 9
    const val ROUND_SECONDS = 9
    const val LANES = 4
    const val SUBMIT_AT = 0.9
    const val SPAWN_SPAN = 0.55
    const val FALL_FROM = 0.62
    const val FALL_TO = 0.42

    fun key(t: Tile) = "${t.lang}:${t.form}"

    fun parse(key: String): Tile = key.indexOf(':').let { i -> if (i < 0) Tile("", key) else Tile(key.substring(0, i), key.substring(i + 1)) }

    fun ramp(round: Int, rounds: Int): Double = if (rounds <= 1) 0.0 else (round.toDouble() / (rounds - 1)).coerceIn(0.0, 1.0).let { it * it }

    fun count(round: Int, rounds: Int): Int = minOf(MAX, MIN + Math.round((MAX - MIN) * ramp(round, rounds)).toInt())

    fun parseTapped(choice: String, count: Int): List<Int>? {
        if (choice == "-") return emptyList()
        if (!Regex("^\\d+(,\\d+)*$").matches(choice)) return null
        val out = choice.split(',').map { it.toInt() }.distinct().sorted()
        return if (out.all { it < count }) out else null
    }

    fun tappedChoice(indices: Iterable<Int>): String = indices.distinct().sorted().let { if (it.isEmpty()) "-" else it.joinToString(",") }

    fun outcome(answer: String, tapped: List<Int>): TileOutcome {
        val right = answer.split(',').filter { it.isNotEmpty() }.map { it.toInt() }.toSet()
        val hits = tapped.count { it in right }
        val wrong = tapped.size - hits
        val missed = right.size - hits
        return TileOutcome(hits, wrong, missed, wrong == 0 && missed == 0)
    }

    fun comboMultiplier(combo: Int) = 1 + minOf(combo, 4) * 0.5

    fun schedule(count: Int, round: Int, rounds: Int, roundSeconds: Int): List<TileSlot> {
        val len = roundSeconds * 1000.0
        val r = ramp(round, rounds)
        val fall = Math.round(len * (FALL_FROM - (FALL_FROM - FALL_TO) * r)).toInt()
        val span = minOf(len * SPAWN_SPAN, len * SUBMIT_AT - fall - 100)
        return (0 until count).map { i -> TileSlot(i, (i * 3 + round) % LANES, if (count <= 1) 0 else Math.round(span * i / (count - 1)).toInt(), fall) }
    }

    fun laneTarget(choices: List<String>, schedule: List<TileSlot>, lane: Int, elapsedMs: Long, tapped: Set<Int>): Int? =
        schedule.filter { it.lane == lane && it.index !in tapped && it.index < choices.size }
            .map { it to (elapsedMs - it.spawnMs).toDouble() / it.fallMs }
            .filter { (_, p) -> p in 0.0..1.0 }
            .maxByOrNull { it.second }?.first?.index

    data class Falling(val slot: TileSlot, val progress: Float)

    fun visible(schedule: List<TileSlot>, choiceCount: Int, elapsedMs: Long, tapped: Set<Int>, reveal: Boolean): List<Falling> =
        schedule.filter { it.index < choiceCount }.mapNotNull { slot ->
            val p = ((elapsedMs - slot.spawnMs).toDouble() / slot.fallMs).toFloat()
            if (reveal || (p in 0f..1f && slot.index !in tapped)) Falling(slot, p.coerceIn(0f, 1f)) else null
        }

    fun roundStartMs(roundIndex: Int, startedAtMs: Long, roundSeconds: Int, revealSeconds: Int): Long = startedAtMs + roundIndex * (roundSeconds + revealSeconds) * 1000L

    fun submitAtMs(roundSeconds: Int): Long = Math.round(roundSeconds * 1000 * SUBMIT_AT)
}
