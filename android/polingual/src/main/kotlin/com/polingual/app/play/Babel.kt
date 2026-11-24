package com.polingual.app.play

import foundation.bucket.core.engine.ItemKind
import foundation.bucket.core.engine.LangItem

data class Meaning(val id: String, val meaning: String, val forms: Map<String, String>)
data class Cell(val key: Int, val meaning: String, val lang: String)
data class BabelLevel(val number: Int, val goal: Int, val moves: Int)
data class Resolved(val board: List<Cell>, val cleared: List<Cell>, val cascades: Int)

data class LangSet(val id: String, val label: String, val targets: List<String>)

object LangSets {
    val all = listOf(
        LangSet("romance", "Spanish, French, Italian, Portuguese", listOf("es", "fr", "it", "pt")),
        LangSet("germanic", "German, Dutch, Swedish", listOf("de", "nl", "sv")),
        LangSet("asia", "Japanese, Chinese, Korean", listOf("ja", "zh", "ko")),
        LangSet("east", "Russian, Greek, Arabic, Hindi", listOf("ru", "el", "ar", "hi")),
        LangSet("world", "Spanish, German, Japanese, Arabic", listOf("es", "de", "ja", "ar")),
    )
}

class XorRng(seed: Int) {
    private var x: Int = if (seed == 0) 1 else seed
    fun next(): Double {
        x = x xor (x shl 13)
        x = x xor (x ushr 17)
        x = x xor (x shl 5)
        return (x.toLong() and 0xFFFFFFFFL).toDouble() / 4294967296.0
    }
}

class Dealer(private val meanings: List<Meaning>, private val langs: List<String>, private val rand: () -> Double, start: Int = 0) {
    private var key = start
    fun next(): Cell {
        val m = meanings[kotlin.math.floor(rand() * meanings.size).toInt()]
        val options = langs.filter { m.forms[it] != null }
        return Cell(key++, m.id, options[kotlin.math.floor(rand() * options.size).toInt()])
    }
}

object Babel {
    const val SIZE = 6
    const val MATCH = 3
    const val MEANINGS = 5

    fun at(board: List<Cell>, r: Int, c: Int): Cell? = if (r in 0 until SIZE && c in 0 until SIZE) board[r * SIZE + c] else null

    fun matches(board: List<Cell>): Set<Int> {
        val out = HashSet<Int>()
        for (r in 0 until SIZE) for (c in 0 until SIZE) for ((dr, dc) in listOf(0 to 1, 1 to 0)) {
            val run = mutableListOf(r * SIZE + c)
            while (true) {
                val last = run.last()
                val next = at(board, last / SIZE + dr, last % SIZE + dc) ?: break
                if (next.meaning != board[last].meaning) break
                run += (last / SIZE + dr) * SIZE + last % SIZE + dc
            }
            if (run.size >= MATCH) out += run
        }
        return out
    }

    fun fresh(deal: Dealer): List<Cell> {
        val board = mutableListOf<Cell>()
        for (i in 0 until SIZE * SIZE) {
            var cell = deal.next()
            for (t in 0 until 20) {
                val r = i / SIZE
                val c = i % SIZE
                val left = c >= 2 && board[i - 1].meaning == cell.meaning && board[i - 2].meaning == cell.meaning
                val up = r >= 2 && board[i - SIZE].meaning == cell.meaning && board[i - 2 * SIZE].meaning == cell.meaning
                if (!left && !up) break
                cell = deal.next()
            }
            board += cell
        }
        return board
    }

    fun adjacent(a: Int, b: Int): Boolean = (a / SIZE == b / SIZE && kotlin.math.abs(a - b) == 1) || kotlin.math.abs(a - b) == SIZE

    fun swapped(board: List<Cell>, a: Int, b: Int): List<Cell> = board.toMutableList().also { val t = it[a]; it[a] = it[b]; it[b] = t }

    fun collapse(board: List<Cell>, gone: Set<Int>, deal: Dealer): List<Cell> {
        val out = board.toMutableList()
        for (c in 0 until SIZE) {
            val keep = (SIZE - 1 downTo 0).filter { r -> r * SIZE + c !in gone }.map { r -> board[r * SIZE + c] }
            var k = 0
            for (r in SIZE - 1 downTo 0) { out[r * SIZE + c] = keep.getOrNull(k) ?: deal.next(); k++ }
        }
        return out
    }

    fun resolve(board: List<Cell>, deal: Dealer): Resolved {
        var current = board
        val cleared = mutableListOf<Cell>()
        var cascades = 0
        var found = matches(current)
        while (found.isNotEmpty()) {
            cascades++
            found.sorted().forEach { cleared += current[it] }
            current = collapse(current, found, deal)
            if (cascades > 30) break
            found = matches(current)
        }
        return Resolved(current, cleared, cascades)
    }

    fun hasMove(board: List<Cell>): Boolean {
        for (i in 0 until SIZE * SIZE) for (j in listOf(i + 1, i + SIZE)) {
            if (j >= SIZE * SIZE || !adjacent(i, j)) continue
            if (matches(swapped(board, i, j)).isNotEmpty()) return true
        }
        return false
    }

    fun playable(deal: Dealer, start: List<Cell>? = null): List<Cell> {
        var board = start ?: fresh(deal)
        repeat(50) {
            if (matches(board).isNotEmpty()) board = resolve(board, deal).board
            if (hasMove(board) && matches(board).isEmpty()) return board
            board = fresh(deal)
        }
        return board
    }

    fun level(n: Int) = BabelLevel(n, 12 + n * 3, maxOf(12, 22 - n / 2))

    fun points(cleared: Int, cascades: Int) = cleared * 10 * maxOf(1, cascades)

    fun meanings(items: List<LangItem>, langs: List<String>, level: Int, root: String = "en", count: Int = MEANINGS): List<Meaning> {
        val rand = WebRandom(WebRandom.seedOf("babel:${langs.joinToString(",")}:$level"))
        val pool = items.filter { i -> i.kind == ItemKind.Word && i.form(root) != null && langs.all { l -> i.form(l)?.let { it.length <= 14 } == true } && langs.map { i.form(it)!!.lowercase() }.toSet().size == langs.size }
        val out = mutableListOf<Meaning>()
        val used = HashSet<String>()
        var tries = 0
        while (out.size < count && tries < 2000 && pool.isNotEmpty()) {
            tries++
            val item = pool[kotlin.math.floor(rand.next() * minOf(pool.size, 600)).toInt()]
            val key = item.form(root)!!.lowercase()
            if (!used.add(key)) continue
            out += Meaning(item.id, item.form(root)!!, langs.associateWith { item.form(it)!! })
        }
        return out
    }
}
