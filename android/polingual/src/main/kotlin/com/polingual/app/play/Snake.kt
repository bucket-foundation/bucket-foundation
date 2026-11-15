package com.polingual.app.play

import kotlin.math.PI
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.sin

data class Pt(val x: Double, val y: Double)
data class SnakeWord(val form: String, val lang: String, val meaning: String)
data class SnakeDeck(val lang: String, val good: List<SnakeWord>, val decoys: List<SnakeWord>)
data class Snake(val id: String, val name: String, val bot: Boolean, val skill: Double, val angle: Double, val body: List<Pt>, val length: Int, val alive: Boolean, val color: Int)
data class FieldWord(val id: Int, val x: Double, val y: Double, val form: String, val lang: String, val meaning: String, val good: Boolean)
data class Arena(val snakes: List<Snake>, val words: List<FieldWord>, val nextWord: Int, val eaten: List<FieldWord>, val bad: List<FieldWord>)
data class Collision(val arena: Arena, val died: List<String>)

object Snakes {
    const val WORLD_W = 1600.0
    const val WORLD_H = 1000.0
    const val SPEED = 140.0
    const val TURN = 3.2
    const val SEG = 9.0
    const val START_LEN = 8
    const val MIN_LEN = 4
    const val GROW = 3
    const val SHRINK = 3
    const val EAT_R = 26.0
    const val HIT_R = 10.0
    const val WORDS_ON_FIELD = 18
    const val GOOD_SHARE = 0.55
    const val BOT_MAX = 30
    const val ROUND_MS = 120_000L
    val SKILL = mapOf("easy" to 0.55, "medium" to 0.8, "hard" to 0.95)
    val LANG_CHOICES = listOf("es", "fr", "it", "pt", "de", "nl", "sv", "ja", "zh", "ko", "ru", "el", "ar", "hi", "tr")

    fun deck(items: List<foundation.bucket.core.engine.LangItem>, lang: String, others: List<String>, seed: String): SnakeDeck {
        val good = ForeheadDeck.deck(items, listOf(lang), seed, "en", 80).map { SnakeWord(it.form, it.lang, it.meaning) }
        val forms = good.map { it.form.lowercase() }.toSet()
        val decoys = ForeheadDeck.deck(items, others.filter { it != lang }, "${seed}1", "en", 80).filter { it.form.lowercase() !in forms }.map { SnakeWord(it.form, it.lang, it.meaning) }
        return SnakeDeck(lang, good, decoys)
    }

    fun make(id: String, name: String, bot: Boolean, skill: Double, at: Pt, angle: Double, color: Int): Snake =
        Snake(id, name, bot, skill, angle, List(START_LEN) { i -> Pt(at.x - cos(angle) * SEG * i, at.y - sin(angle) * SEG * i) }, START_LEN, true, color)

    fun dist(a: Pt, b: Pt) = hypot(a.x - b.x, a.y - b.y)

    fun wrapAngle(a0: Double): Double {
        var a = a0
        while (a > PI) a -= 2 * PI
        while (a < -PI) a += 2 * PI
        return a
    }

    fun steer(current: Double, target: Double, dt: Double): Double {
        val d = wrapAngle(target - current)
        val max = TURN * dt
        return wrapAngle(current + d.coerceIn(-max, max))
    }

    fun advance(s: Snake, target: Double, dt: Double): Snake {
        if (!s.alive) return s
        val angle = steer(s.angle, target, dt)
        val head = s.body[0]
        var x = head.x + cos(angle) * SPEED * dt
        var y = head.y + sin(angle) * SPEED * dt
        var a = angle
        if (x < 0 || x > WORLD_W) { x = x.coerceIn(0.0, WORLD_W); a = wrapAngle(PI - a) }
        if (y < 0 || y > WORLD_H) { y = y.coerceIn(0.0, WORLD_H); a = wrapAngle(-a) }
        val body = listOf(Pt(x, y)) + s.body
        val out = mutableListOf(body[0])
        var i = 1
        while (i < body.size && out.size < s.length) {
            if (dist(out.last(), body[i]) >= SEG || i == body.size - 1) out += body[i]
            i++
        }
        return s.copy(angle = a, body = out)
    }

    fun spawnWord(nextWord: Int, good: Boolean, deck: SnakeDeck, rand: () -> Double): FieldWord {
        val list = if (good) deck.good else deck.decoys
        val w = list[kotlin.math.floor(rand() * list.size).toInt()]
        return FieldWord(nextWord, 60 + rand() * (WORLD_W - 120), 60 + rand() * (WORLD_H - 120), w.form, w.lang, w.meaning, good)
    }

    fun botTarget(s: Snake, words: List<FieldWord>, rand: () -> Double): Double {
        val head = s.body[0]
        val best = words.filter { it.good || rand() > s.skill }.minByOrNull { dist(head, Pt(it.x, it.y)) } ?: return s.angle
        return atan2(best.y - head.y, best.x - head.x)
    }

    fun eat(arena: Arena, deck: SnakeDeck, rand: () -> Double): Arena {
        var words = arena.words
        var nextWord = arena.nextWord
        val eaten = arena.eaten.toMutableList()
        val bad = arena.bad.toMutableList()
        val snakes = arena.snakes.map { s ->
            if (!s.alive) return@map s
            var length = s.length
            words = words.filter { w ->
                if (dist(s.body[0], Pt(w.x, w.y)) > EAT_R) return@filter true
                length = if (w.good) length + GROW else maxOf(MIN_LEN, length - SHRINK)
                if (!s.bot) (if (w.good) eaten else bad) += w
                false
            }
            s.copy(length = if (s.bot) minOf(BOT_MAX, length) else length)
        }
        val list = words.toMutableList()
        while (list.size < WORDS_ON_FIELD) { list += spawnWord(nextWord, rand() < GOOD_SHARE, deck, rand); nextWord++ }
        return Arena(snakes, list, nextWord, eaten, bad)
    }

    fun tick(a0: Arena, aim: Double?, deck: SnakeDeck, rand: () -> Double, dt: Double): Arena {
        var a = a0.copy(snakes = a0.snakes.map { s -> if (!s.alive) s else advance(s, if (s.bot) botTarget(s, a0.words, rand) else aim ?: s.angle, dt) })
        a = eat(a, deck, rand)
        val c = collide(a)
        return c.arena.copy(snakes = c.arena.snakes.map { s -> if (s.bot && !s.alive) make(s.id, s.name, true, s.skill, Pt(100 + rand() * 1400, 100 + rand() * 800), rand() * 6.28, s.color) else s })
    }

    fun collide(arena: Arena): Collision {
        val died = mutableListOf<String>()
        val snakes = arena.snakes.map { s ->
            if (!s.alive) return@map s
            for (o in arena.snakes) {
                if (o.id == s.id || !o.alive) continue
                if (o.body.any { dist(s.body[0], it) < HIT_R } && s.length <= o.length) { died += s.id; return@map s.copy(alive = false) }
            }
            s
        }
        return Collision(arena.copy(snakes = snakes), died)
    }
}
