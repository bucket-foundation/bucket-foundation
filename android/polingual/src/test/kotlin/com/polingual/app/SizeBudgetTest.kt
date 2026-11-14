package com.polingual.app

import java.io.File
import kotlin.test.Test
import kotlin.test.assertTrue

class SizeBudgetTest {
    private val root = generateSequence(File("").absoluteFile) { it.parentFile }.map { File(it, "polingual/src/main/kotlin") }.first { it.isDirectory }
    private val files = root.walkTopDown().filter { it.extension == "kt" }.toList()
    private val fn = Regex("""^\s*(?:(?:private|internal|override|suspend|inline|@Composable|@OptIn\([^)]*\))\s+)*fun\s+(?:[\w<>, ?]+\.)?(\w+)""")

    private fun longFunctions(lines: List<String>): List<Pair<String, Int>> {
        val out = mutableListOf<Pair<String, Int>>()
        var i = 0
        while (i < lines.size) {
            val m = fn.find(lines[i])
            if (m == null) { i++; continue }
            var depth = 0
            var opened = false
            var j = i
            while (j < lines.size) {
                val l = lines[j]
                depth += l.count { it == '{' } - l.count { it == '}' }
                if ('{' in l) opened = true
                if (opened && depth <= 0) break
                if (!opened && '=' in l && '{' !in l) break
                j++
            }
            val n = j - i + 1
            if (n > MAX_FUNCTION) out += m.groupValues[1] to n
            i = j + 1
        }
        return out
    }

    @Test
    fun noFileIsOverFourHundredLines() {
        val big = files.map { it.relativeTo(root).path to it.readLines().size }.filter { it.second > MAX_FILE }
        assertTrue(big.isEmpty(), "files over $MAX_FILE lines: $big")
    }

    @Test
    fun noFunctionIsOverSixtyLines() {
        val long = files.flatMap { f -> longFunctions(f.readLines()).map { "${f.name}:${it.first}=${it.second}" } }
        assertTrue(long.isEmpty(), "functions over $MAX_FUNCTION lines: $long")
    }

    @Test
    fun theCounterCatchesALongFunction() {
        val lines = listOf("fun big() {") + List(70) { "    x()" } + "}"
        assertTrue(longFunctions(lines).single().second == 72)
    }

    companion object {
        const val MAX_FILE = 400
        const val MAX_FUNCTION = 60
    }
}
