package com.polingual.app.play

import foundation.bucket.core.engine.ItemKind
import foundation.bucket.core.engine.LangItem
import kotlin.math.PI
import kotlin.math.asin
import kotlin.math.cos
import kotlin.math.exp
import kotlin.math.sin
import kotlin.math.sqrt

data class LatLon(val lat: Double, val lon: Double)
data class AtlasRound(val lang: String, val form: String, val meaning: String, val itemId: String)
data class Nearest(val home: LatLon, val km: Double)

object Atlas {
    const val ROUNDS = 5
    const val MAX = 5000
    const val SCALE_KM = 1800.0
    const val MAP_W = 720.0
    const val MAP_H = 360.0
    private fun l(vararg p: Pair<Double, Double>) = p.map { LatLon(it.first, it.second) }
    val HOMES: Map<String, List<LatLon>> = linkedMapOf(
        "es" to l(40.4 to -3.7, 19.4 to -99.1, 4.7 to -74.1, -34.6 to -58.4, -12.0 to -77.0, -33.4 to -70.6),
        "fr" to l(48.9 to 2.4, 45.5 to -73.6, 50.8 to 4.4, 14.7 to -17.4, 5.3 to -4.0),
        "de" to l(52.5 to 13.4, 48.2 to 16.4, 47.4 to 8.5),
        "it" to l(41.9 to 12.5, 45.5 to 9.2),
        "pt" to l(38.7 to -9.1, -23.5 to -46.6, -15.8 to -47.9, -8.8 to 13.2),
        "nl" to l(52.4 to 4.9, 51.2 to 4.4),
        "sv" to l(59.3 to 18.1, 57.7 to 12.0),
        "ja" to l(35.7 to 139.7, 34.7 to 135.5),
        "zh" to l(39.9 to 116.4, 31.2 to 121.5, 25.0 to 121.5, 1.35 to 103.8),
        "ko" to l(37.6 to 127.0, 35.2 to 129.1),
        "ru" to l(55.8 to 37.6, 59.9 to 30.3, 55.0 to 82.9, 43.2 to 76.9),
        "ar" to l(30.0 to 31.2, 24.7 to 46.7, 33.9 to 35.5, 33.6 to -7.6, 33.3 to 44.4),
        "hi" to l(28.6 to 77.2, 19.1 to 72.9, 25.6 to 85.1),
        "el" to l(38.0 to 23.7, 35.2 to 33.4),
        "tr" to l(41.0 to 29.0, 39.9 to 32.9),
    )

    fun rounds(items: List<LangItem>, date: String, count: Int = ROUNDS + 1, root: String = "en"): List<AtlasRound> {
        val rand = WebRandom(WebRandom.seedOf("voice-atlas:$date"))
        val langs = HOMES.keys.toList()
        val words = items.filter { it.kind == ItemKind.Word && it.form(root) != null }
        val out = mutableListOf<AtlasRound>()
        val used = HashSet<String>()
        var tries = 0
        while (out.size < count && tries < 400) {
            tries++
            val free = langs.filter { it !in used }
            if (free.isEmpty()) break
            val lang = free[rand.below(free.size)]
            val pool = words.filter { w -> w.form(lang)?.let { it != w.form(root) && it.length <= 24 } == true }
            used += lang
            if (pool.isEmpty()) continue
            val item = pool[kotlin.math.floor(rand.next() * minOf(pool.size, 800)).toInt()]
            out += AtlasRound(lang, item.form(lang)!!, item.form(root)!!, item.id)
        }
        return out
    }

    fun distanceKm(a: LatLon, b: LatLon): Double {
        val rad = PI / 180
        val dLat = (b.lat - a.lat) * rad
        val dLon = (b.lon - a.lon) * rad
        val h = sin(dLat / 2).let { it * it } + cos(a.lat * rad) * cos(b.lat * rad) * sin(dLon / 2).let { it * it }
        return 2 * 6371 * asin(minOf(1.0, sqrt(h)))
    }

    fun nearestHome(lang: String, pin: LatLon): Nearest? = HOMES[lang]?.map { Nearest(it, distanceKm(pin, it)) }?.minByOrNull { it.km }

    fun points(km: Double): Int = if (km <= 150) MAX else Math.round(MAX * exp(-(km - 150) / SCALE_KM)).toInt()

    fun project(lon: Double, lat: Double) = Pair((lon + 180) / 360 * MAP_W, (90 - lat) / 180 * MAP_H)

    fun unproject(x: Double, y: Double) = LatLon(90 - y / MAP_H * 180, x / MAP_W * 360 - 180)

    fun ghosts(date: String, count: Int = 5): List<Ghost> {
        val span = mapOf("easy" to (4000 to 11000), "medium" to (9000 to 17000), "hard" to (15000 to 23500))
        return Bots.all.sortedBy { WebRandom.unit("atlas:$date:${it.userId}") }.take(count).map { b ->
            val (lo, hi) = span.getValue(b.skill)
            Ghost(b.name, b.flag, b.skill, lo + kotlin.math.floor(WebRandom.unit("atlas-score:$date:${b.userId}") * (hi - lo)).toInt())
        }.sortedByDescending { it.score }
    }
}
