package com.polingual.app

import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class BrandGuardTest {
    private val banned = listOf(
        Regex("""Color\(0x"""),
        Regex("""LocalPalette"""),
        Regex("""\bD8\."""),
        Regex("""RoundedCornerShape\(\d"""),
        Regex("""fontSize = \d"""),
    )

    private val largeGlyphScreens = setOf("ForeheadScreen.kt")

    private fun sources(): List<File> {
        val root = listOf("src/main/kotlin", "polingual/src/main/kotlin", "android/polingual/src/main/kotlin")
            .map(::File).first { it.isDirectory }
        return root.walkTopDown().filter { it.extension == "kt" }.toList()
    }

    @Test
    fun sourcesAreScanned() {
        assertTrue(sources().size > 20)
    }

    @Test
    fun screensUseBrandTokensOnly() {
        val hits = sources()
            .filterNot { it.name in largeGlyphScreens }
            .flatMap { file ->
                file.readLines().mapIndexedNotNull { i, line ->
                    if (banned.any { it.containsMatchIn(line) }) "${file.name}:${i + 1} ${line.trim()}" else null
                }
            }
        assertEquals(emptyList(), hits)
    }
}
