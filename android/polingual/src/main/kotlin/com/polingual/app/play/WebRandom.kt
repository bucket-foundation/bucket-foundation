package com.polingual.app.play

class WebRandom(seed: String) {
    private var x: ULong = (if (seed.isNotEmpty() && seed.all { it.isDigit() }) seed.toBigInteger().toLong().toULong() else 1uL).let { if (it == 0uL) 1uL else it }

    fun next(): Double {
        x = x xor (x shl 13)
        x = x xor (x shr 7)
        x = x xor (x shl 17)
        return (x shr 11).toDouble() / 9007199254740992.0
    }

    fun below(n: Int): Int = kotlin.math.floor(next() * n).toInt()

    fun <T> shuffled(xs: List<T>): List<T> {
        val out = xs.toMutableList()
        for (i in out.size - 1 downTo 1) {
            val j = below(i + 1)
            val t = out[i]; out[i] = out[j]; out[j] = t
        }
        return out
    }

    companion object {
        fun unit(key: String): Double {
            var h = 0x811c9dc5.toInt()
            key.forEach { c -> h = h xor c.code; h *= 0x01000193 }
            h = h xor (h ushr 15)
            h *= 0x2c1b3c6d
            h = h xor (h ushr 12)
            return (h.toLong() and 0xFFFFFFFFL).toDouble() / 4294967296.0
        }

        fun seedOf(key: String): String = (kotlin.math.floor(unit(key) * 4503599627370496.0).toLong() + 1).toString()
    }
}

data class Bot(val userId: String, val name: String, val flag: String, val skill: String)

object Bots {
    private val roster = listOf(
        "Lucía" to "ES", "Mateo" to "AR", "Camille" to "FR", "Giulia" to "IT", "João" to "BR", "Inês" to "PT",
        "Lena" to "DE", "Daan" to "NL", "Astrid" to "SE", "Yuki" to "JP", "Min-jun" to "KR", "Wei" to "CN",
        "Priya" to "IN", "Omar" to "EG", "Nikos" to "GR", "Olga" to "UA", "Sofía" to "MX", "Liam" to "IE",
        "Amara" to "NG", "Chloe" to "CA", "Kai" to "NZ", "Elif" to "TR", "Mai" to "VN", "Tomás" to "CL",
    )
    private val skills = listOf("medium", "easy", "hard", "medium", "easy", "hard")
    val all: List<Bot> = roster.mapIndexed { i, (n, f) -> Bot("00000000-b07b-4000-8000-${(i + 1).toString(16).padStart(12, '0')}", n, f, skills[i % skills.size]) }

    fun countryFlag(code: String): String = code.uppercase().map { String(Character.toChars(0x1F1E6 + (it - 'A'))) }.joinToString("")
}
