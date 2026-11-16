package foundation.bucket.core.engine

class SeededRandom(seed: ULong) {
    private var state: ULong = if (seed == 0uL) 0x9E3779B97F4A7C15uL else seed

    fun next(): ULong {
        state = state xor (state shl 13)
        state = state xor (state shr 7)
        state = state xor (state shl 17)
        return state
    }

    fun nextBelow(upperBound: Int): Int {
        val bound = upperBound.toULong()
        var random = next()
        var (high, low) = multiplyFull(random, bound)
        if (low < bound) {
            val threshold = (0uL - bound) % bound
            while (low < threshold) {
                random = next()
                val m = multiplyFull(random, bound)
                high = m.first
                low = m.second
            }
        }
        return high.toInt()
    }

    fun <T> element(list: List<T>): T? = if (list.isEmpty()) null else list[nextBelow(list.size)]

    fun <T> shuffled(list: List<T>): List<T> {
        val a = list.toMutableList()
        var amount = a.size
        var current = 0
        while (amount > 1) {
            val r = nextBelow(amount)
            amount -= 1
            val j = current + r
            val t = a[current]; a[current] = a[j]; a[j] = t
            current += 1
        }
        return a
    }

    companion object {
        fun multiplyFull(a: ULong, b: ULong): Pair<ULong, ULong> {
            val mask = 0xFFFFFFFFuL
            val aLo = a and mask
            val aHi = a shr 32
            val bLo = b and mask
            val bHi = b shr 32
            val ll = aLo * bLo
            val lh = aLo * bHi
            val hl = aHi * bLo
            val hh = aHi * bHi
            val mid = (ll shr 32) + (lh and mask) + (hl and mask)
            val high = hh + (lh shr 32) + (hl shr 32) + (mid shr 32)
            val low = (mid shl 32) or (ll and mask)
            return high to low
        }
    }
}

fun <T> mixed(xs: List<T>, rng: SeededRandom): List<T> {
    val a = xs.toMutableList()
    var i = a.size - 1
    while (i > 0) {
        val j = (rng.next() % (i + 1).toULong()).toInt()
        val t = a[i]; a[i] = a[j]; a[j] = t
        i -= 1
    }
    return a
}

object GameSeed {
    fun hash(text: String): ULong {
        var h = 0xcbf29ce484222325uL
        for (b in text.toByteArray(Charsets.UTF_8)) {
            h = h xor (b.toUByte().toULong())
            h *= 0x100000001b3uL
        }
        return h
    }

    fun daily(day: String, root: String, targets: List<String>): ULong =
        hash("$day|$root|${targets.sorted().joinToString(",")}")
}
