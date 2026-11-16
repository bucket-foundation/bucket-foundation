package com.polingual.app.play

import foundation.bucket.core.engine.ItemKind
import foundation.bucket.core.engine.LangItem

data class SpyObject(val id: String, val art: Int, val x: Double, val y: Double, val tilt: Double)
data class SpyDecor(val art: String, val x: Double, val y: Double, val size: Double, val tilt: Double)
data class SpyScene(val id: String, val name: String, val objects: List<SpyObject>, val decor: List<SpyDecor>)
data class SpyRound(val round: Int, val scene: String, val lang: String, val itemId: String, val gloss: String, val choices: List<String>, val answer: String)
data class SpyBot(val id: String, val name: String, val skill: String, val flag: String, val accuracy: Double, val from: Double, val to: Double)
data class BotTurn(val botId: String, val atMs: Long, val correct: Boolean)
data class Tally(val score: Int = 0, val streak: Int = 0)

object ISpy {
    const val ROUND_SECONDS = 12
    const val ROUNDS = 10
    const val BASE = 100
    const val SPEED = 100
    const val STREAK_STEP = 25
    const val STREAK_CAP = 4
    const val ARTS = 7

    private fun laid(ids: List<String>, seed: Int): List<SpyObject> = ids.mapIndexed { i, id ->
        val r = i / 5
        val c = i % 5
        val jitter = ((i * 37 + seed * 11) % 9) - 4
        SpyObject(id, (i + seed) % ARTS, 11.0 + c * 18 + (if (r % 2 == 1) 4 else 0) + jitter * 0.5, 11.0 + r * 24 + (((i * 13 + seed) % 7) - 3) * 1.2, (((i * 29 + seed * 7) % 21) - 10) * 1.4)
    }

    val DECOR = listOf(
        SpyDecor("calligraphy-ain", 2.0, 4.0, 26.0, -8.0), SpyDecor("calligraphy-yong", 72.0, 56.0, 24.0, 9.0), SpyDecor("script-ru", 84.0, 4.0, 12.0, 18.0),
        SpyDecor("script-he", 46.0, 0.0, 10.0, -12.0), SpyDecor("script-ko", 30.0, 84.0, 10.0, -6.0), SpyDecor("girih", 56.0, 28.0, 22.0, 0.0),
        SpyDecor("kente", -4.0, 90.0, 34.0, -3.0), SpyDecor("azulejo", 90.0, 82.0, 14.0, 8.0), SpyDecor("pebble", -2.0, 42.0, 7.0, 20.0), SpyDecor("bunting", 18.0, -3.0, 22.0, 2.0),
    )

    val SCENES = listOf(
        SpyScene("market", "The market", laid(listOf("bread", "fish", "apple", "egg", "milk", "cheese", "meat", "rice", "orange", "chicken", "coffee", "tea", "salt", "wine", "money", "bag", "knife", "flower", "hundred", "cow"), 0), DECOR),
        SpyScene("street", "The street", laid(listOf("car", "dog", "cat", "house", "tree", "sun", "bird", "horse", "door", "window", "hat", "shoe", "key", "road", "stone", "child", "star", "moon", "city", "flower"), 3), DECOR),
        SpyScene("classroom", "The classroom", laid(listOf("book", "paper", "letter", "clock", "chair", "ball", "school", "one", "two", "three", "shirt", "apple", "child", "window", "door", "bag", "key", "water", "hundred", "hat"), 5), DECOR),
        SpyScene("harbor", "The harbor", laid(listOf("sea", "boat", "fish", "bird", "sun", "mountain", "river", "water", "stone", "fire", "star", "moon", "house", "tree", "dog", "bread", "wine", "money", "hat", "key"), 2), DECOR),
    )

    val BOTS = listOf(
        SpyBot("bot-ama", "Ama", "hard", "GH", 0.85, 0.2, 0.55),
        SpyBot("bot-ines", "Inês", "medium", "PT", 0.65, 0.3, 0.75),
        SpyBot("bot-kenji", "Kenji", "easy", "JP", 0.45, 0.4, 0.95),
    )

    val SETS = listOf(LangSet("mix", "Chinese, Russian, Hindi, Spanish", listOf("zh", "ru", "hi", "es"))) + LangSets.all

    fun scene(id: String) = SCENES.firstOrNull { it.id == id }

    fun hash(s: String): Int {
        var h = 2166136261.toInt()
        s.forEach { c -> h = (h xor c.code) * 16777619 }
        return h
    }

    fun unit(key: String): Double = (hash(key).toLong() and 0xFFFFFFFFL).toDouble() / 4294967296.0

    fun points(correct: Boolean, ms: Long, roundSeconds: Int, streak: Int): Int {
        if (!correct) return 0
        val left = (1 - ms.toDouble() / (roundSeconds * 1000)).coerceIn(0.0, 1.0)
        return BASE + Math.round(SPEED * left).toInt() + streak.coerceIn(0, STREAK_CAP) * STREAK_STEP
    }

    fun award(t: Tally, correct: Boolean, ms: Long, roundSeconds: Int): Pair<Tally, Int> {
        val p = points(correct, ms, roundSeconds, t.streak)
        return Tally(t.score + p, if (correct) t.streak + 1 else 0) to p
    }

    fun botTurns(seed: String, round: Int, roundSeconds: Int, bots: List<SpyBot> = BOTS): List<BotTurn> {
        val len = roundSeconds * 1000
        return bots.map { b ->
            val key = "$seed:$round:${b.id}"
            BotTurn(b.id, Math.round(len * (b.from + (b.to - b.from) * unit("at:$key"))), unit("ok:$key") < b.accuracy)
        }
    }

    private fun itemFor(items: List<LangItem>, id: String) = items.firstOrNull { it.kind == ItemKind.Word && it.id == id } ?: items.firstOrNull { it.kind == ItemKind.Word && it.form("en") == id }

    fun rounds(items: List<LangItem>, seed: String, root: String, targets: List<String>, rounds: Int, sceneId: String? = null): List<SpyRound> {
        val rng = XorRng(hash(seed))
        val sc = sceneId?.let(::scene) ?: SCENES[kotlin.math.floor(rng.next() * SCENES.size).toInt()]
        val choices = sc.objects.map { it.id }
        val langs = targets.filter { it != root }
        if (langs.isEmpty()) return emptyList()
        val ids = choices.distinct().toMutableList()
        for (i in ids.size - 1 downTo 1) { val j = kotlin.math.floor(rng.next() * (i + 1)).toInt(); val t = ids[i]; ids[i] = ids[j]; ids[j] = t }
        val out = mutableListOf<SpyRound>()
        for (id in ids) {
            if (out.size >= rounds) break
            val item = itemFor(items, id) ?: continue
            val order = langs.indices.map { k -> langs[(out.size + k) % langs.size] }
            val lang = order.firstOrNull { l -> item.form(l) != null && item.form(l) != item.form(root) } ?: continue
            out += SpyRound(out.size, sc.id, lang, item.id, item.form(lang)!!, choices, id)
        }
        return out
    }
}
