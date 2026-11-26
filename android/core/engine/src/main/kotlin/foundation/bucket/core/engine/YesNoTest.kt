package foundation.bucket.core.engine

import java.text.Normalizer
import kotlin.math.abs
import kotlin.math.floor

object YesNoTest {
    const val REAL_WORDS = 50
    const val PSEUDOWORDS = 20
    val RANK_BANDS = listOf(1 to 1000, 1001 to 2000, 2001 to 4000, 4001 to 6000, 6001 to 8000)
    const val BANK = 8000.0
    const val TEST_DAY = 28
    const val WINDOW_END_DAY = 35
    const val MAX_ATTEMPTS = 40
    const val MIN_LENGTH = 3
    const val MIN_BIGRAM_COUNT = 2
    private const val DAY_MS = 86_400_000L

    private val VOWELS = "aeiouyáéíóúýàèìòùâêîôûäëïöüãõåæøœ".codePoints().toArray().toSet()
    private val PLAIN = "aeiouy".codePoints().toArray().toSet()

    data class Syllable(val o: String, val n: String, val c: String)
    data class Lexicon(val words: Set<String>, val segments: Map<String, List<String>>, val bigrams: Set<String>)
    data class RankedWord(val word: String, val rank: Int)
    data class TestItem(val word: String, val real: Boolean, val band: Int?)
    data class Score(val hits: Int, val words: Int, val falseAlarms: Int, val pseudowords: Int, val known: Double)
    data class Taken(val baseline: Boolean, val day28: Boolean)

    fun mulberry32(seed: Long): () -> Double {
        var a = seed.toInt()
        return {
            a += 0x6d2b79f5
            var t = a
            t = (t xor (t ushr 15)) * (t or 1)
            t = t xor (t + (t xor (t ushr 7)) * (t or 61))
            ((t xor (t ushr 14)).toLong() and 0xffffffffL) / 4294967296.0
        }
    }

    fun normalizeWord(w: String): String = Normalizer.normalize(w, Normalizer.Form.NFC).lowercase().trim()

    private fun cps(s: String): IntArray = s.codePoints().toArray()

    private fun latin(cp: Int) = cp in 'a'.code..'z'.code || cp in 0xe0..0xff || cp == 'œ'.code

    private fun str(cp: Int) = String(Character.toChars(cp))

    fun syllabify(word: String): List<Syllable>? {
        val w = normalizeWord(word)
        val chars = cps(w)
        if (chars.isEmpty() || !chars.all(::latin)) return null
        val runs = mutableListOf<Pair<Boolean, StringBuilder>>()
        for (ch in chars) {
            val v = ch in VOWELS
            if (runs.isNotEmpty() && runs.last().first == v) runs.last().second.append(str(ch)) else runs += v to StringBuilder(str(ch))
        }
        if (runs.none { it.first }) return null
        val out = mutableListOf<Syllable>()
        var onset = ""
        for (i in runs.indices) {
            val (v, sb) = runs[i]
            val s = sb.toString()
            if (!v) {
                if (out.isEmpty() && onset.isEmpty()) onset = s
                continue
            }
            var coda = ""
            val o = onset
            onset = ""
            val next = runs.getOrNull(i + 1)
            if (next != null && !next.first) {
                val cs = cps(next.second.toString())
                if (i + 2 >= runs.size) coda = next.second.toString()
                else if (cs.size >= 2) {
                    coda = str(cs[0])
                    onset = cs.drop(1).joinToString("") { str(it) }
                } else onset = next.second.toString()
            }
            out += Syllable(o, s, coda)
        }
        return out
    }

    fun join(s: List<Syllable>): String = s.joinToString("") { it.o + it.n + it.c }

    private fun position(i: Int, n: Int) = if (n == 1) "m" else if (i == 0) "i" else if (i == n - 1) "f" else "x"

    val cmp = Comparator<String> { a, b ->
        val x = cps(a)
        val y = cps(b)
        for (i in 0 until minOf(x.size, y.size)) if (x[i] != y[i]) return@Comparator x[i] - y[i]
        x.size - y.size
    }

    private fun chain(s: List<Syllable>): List<String> = listOf("^") + s.flatMap { listOf("o:${it.o}", "n:${it.n}", "c:${it.c}") } + "$"

    private fun seg(x: Syllable, k: Char) = when (k) { 'o' -> x.o; 'n' -> x.n; else -> x.c }

    private fun with(x: Syllable, k: Char, v: String) = when (k) { 'o' -> x.copy(o = v); 'n' -> x.copy(n = v); else -> x.copy(c = v) }

    fun buildLexicon(core: List<String>, reject: List<String> = emptyList()): Lexicon {
        val set = reject.map(::normalizeWord).toMutableSet()
        val segs = linkedMapOf<String, MutableSet<String>>()
        val counts = HashMap<String, Int>()
        val seen = HashSet<String>()
        for (raw in core) {
            val w = normalizeWord(raw)
            if (!seen.add(w)) continue
            set += w
            val s = syllabify(w) ?: continue
            s.forEachIndexed { i, x -> for (k in "onc") segs.getOrPut("${position(i, s.size)}$k") { mutableSetOf() } += seg(x, k) }
            val c = chain(s)
            for (i in 1 until c.size) counts.merge("${c[i - 1]}|${c[i]}", 1, Int::plus)
        }
        return Lexicon(set, segs.mapValues { it.value.sortedWith(cmp) }, counts.filterValues { it >= MIN_BIGRAM_COUNT }.keys)
    }

    private fun legal(s: List<Syllable>, lex: Lexicon): Boolean {
        val c = chain(s)
        return (1 until c.size).all { "${c[it - 1]}|${c[it]}" in lex.bigrams }
    }

    fun marks(w: String): Int = cps(normalizeWord(w)).count { it in VOWELS && it !in PLAIN }

    private fun pick(rand: () -> Double, n: Int) = floor(rand() * n).toInt()

    fun pseudoword(reference: String, lex: Lexicon, rand: () -> Double, taken: Set<String> = emptySet()): String? {
        val ref = syllabify(reference) ?: return null
        val norm = normalizeWord(reference)
        repeat(MAX_ATTEMPTS) {
            val next = ref.mapIndexed { i, x ->
                val k = "onc"[pick(rand, 3)]
                val pool = lex.segments["${position(i, ref.size)}$k"].orEmpty().filter { it != seg(x, k) }
                if (pool.isNotEmpty()) with(x, k, pool[pick(rand, pool.size)]) else x
            }
            val w = join(next)
            val len = cps(w).size
            if (len < MIN_LENGTH || abs(len - cps(norm).size) > 1 || marks(w) != marks(reference)) return@repeat
            if (w == norm || w in lex.words || w in taken || syllabify(w) == null || !legal(next, lex)) return@repeat
            return w
        }
        return null
    }

    fun assemble(candidates: List<RankedWord>, exclude: Set<String>, seed: Long, lex: Lexicon, avoid: Set<String> = emptySet()): List<TestItem>? {
        val rand = mulberry32(seed)
        val pool = linkedMapOf<String, Int>()
        for (c in candidates) {
            val w = normalizeWord(c.word)
            if (syllabify(w) == null || w in exclude || w in avoid) continue
            if (w !in pool || c.rank < pool.getValue(w)) pool[w] = c.rank
        }
        val per = REAL_WORDS / RANK_BANDS.size
        val real = mutableListOf<TestItem>()
        RANK_BANDS.forEachIndexed { b, (lo, hi) ->
            val inBand = pool.filter { it.value in lo..hi }.keys.sortedWith(cmp)
            if (inBand.size < per) return null
            val picked = linkedSetOf<String>()
            while (picked.size < per) picked += inBand[pick(rand, inBand.size)]
            for (w in picked.sortedWith(cmp)) real += TestItem(w, true, b)
        }
        val taken = (real.map { it.word } + avoid).toMutableSet()
        val pseudo = mutableListOf<TestItem>()
        var i = 0
        while (pseudo.size < PSEUDOWORDS && i < PSEUDOWORDS * 10) {
            i++
            val ref = real[pick(rand, real.size)].word
            val p = pseudoword(ref, lex, rand, taken) ?: continue
            taken += p
            pseudo += TestItem(p, false, null)
        }
        if (pseudo.size < PSEUDOWORDS) return null
        val all = (real + pseudo).toMutableList()
        for (j in all.size - 1 downTo 1) {
            val k = pick(rand, j + 1)
            val t = all[j]; all[j] = all[k]; all[k] = t
        }
        return all
    }

    fun known(hits: Int, words: Int, falseAlarms: Int, pseudowords: Int, bank: Double = BANK): Double {
        val h = if (words > 0) hits.toDouble() / words else 0.0
        val f = if (pseudowords > 0) falseAlarms.toDouble() / pseudowords else 0.0
        if (f >= 1) return 0.0
        return ((h - f) / (1 - f)).coerceIn(0.0, 1.0) * bank
    }

    fun score(items: List<TestItem>, yes: Set<String>): Score {
        val real = items.filter { it.real }
        val pseudo = items.filter { !it.real }
        val hits = real.count { it.word in yes }
        val fa = pseudo.count { it.word in yes }
        return Score(hits, real.size, fa, pseudo.size, known(hits, real.size, fa, pseudo.size))
    }

    fun due(enrolledAt: Long?, now: Long, taken: Taken): String? {
        if (enrolledAt == null || now < enrolledAt) return null
        if (!taken.baseline) return "baseline"
        val day = Math.floorDiv(now - enrolledAt, DAY_MS)
        return if (!taken.day28 && day >= TEST_DAY && day <= WINDOW_END_DAY) "day28" else null
    }
}
