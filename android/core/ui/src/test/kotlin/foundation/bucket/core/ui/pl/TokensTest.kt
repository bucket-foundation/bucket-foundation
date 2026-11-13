package foundation.bucket.core.ui.pl

import androidx.compose.ui.graphics.Color
import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class TokensTest {
    private val repo = generateSequence(File("").absoluteFile) { it.parentFile }.first { File(it, "polingual/src/ui/tokens.json").exists() }
    private val json = File(repo, "polingual/src/ui/tokens.json").readText()

    private fun block(name: String) = Regex("\"$name\"\\s*:\\s*\\{([^{}]*)\\}").find(json)!!.groupValues[1]

    private fun parseColor(v: String): Color {
        Regex("rgba\\((\\d+),(\\d+),(\\d+),([\\d.]+)\\)").matchEntire(v.replace(" ", ""))?.let { m ->
            val (r, g, b, a) = m.destructured
            return Color(r.toInt(), g.toInt(), b.toInt(), Math.round(a.toFloat() * 255))
        }
        return Color(0xFF000000 or v.removePrefix("#").toLong(16))
    }

    @Test
    fun colorsMatchJson() {
        val pairs = Regex("\"([\\w-]+)\"\\s*:\\s*\"([^\"]+)\"").findAll(block("color")).map { it.groupValues[1] to it.groupValues[2] }.toList()
        assertEquals(pairs.size, PL.colors.size)
        pairs.forEach { (k, v) -> assertEquals(k, parseColor(v), PL.colors[k]) }
    }

    @Test
    fun scalesMatchJson() {
        listOf("radius" to PLRadius.values, "space" to PLSpace.values, "lip" to PLLip.values).forEach { (name, map) ->
            val pairs = Regex("\"([\\w-]+)\"\\s*:\\s*(\\d+)").findAll(block(name)).associate { it.groupValues[1] to it.groupValues[2].toInt() }
            assertEquals(name, pairs, map)
        }
        val motion = block("motion")
        listOf("press" to PLMotion.press, "pop" to PLMotion.pop, "settle" to PLMotion.settle).forEach { (k, v) ->
            assertEquals(k, Regex("\"$k\"\\s*:\\s*(\\d+)").find(motion)!!.groupValues[1].toInt(), v)
        }
    }

    @Test
    fun typeMatchesJson() {
        Regex("\"(\\w+)\"\\s*:\\s*\\{\\s*\"font\"\\s*:\\s*\"(\\w+)\"\\s*,\\s*\"size\"\\s*:\\s*(\\d+)\\s*,\\s*\"weight\"\\s*:\\s*(\\d+)\\s*,\\s*\"line\"\\s*:\\s*([\\d.]+)").findAll(json).forEach { m ->
            val (name, font, size, weight, line) = m.destructured
            assertEquals(name, PLTypeSpec(font, size.toInt(), weight.toInt(), line.toFloat()), PLTypeSpecs.all[name])
        }
        assertEquals(7, PLTypeSpecs.all.size)
    }

    @Test
    fun generatedFilesAreCurrent() {
        val p = ProcessBuilder("python3", File(repo, "android/scripts/gen_polingual_ui.py").path, "--check").redirectErrorStream(true).start()
        val out = p.inputStream.bufferedReader().readText()
        assertEquals(out, 0, p.waitFor())
    }

    @Test
    fun everyArtPieceBuilds() {
        val src = File(repo, "polingual/src/ui/art/data.ts").readText()
        val names = Regex("\"name\": \"([^\"]+)\"").findAll(src).map { it.groupValues[1] }.toList()
        assertEquals(names, ArtLibrary.names.filterNot { it.startsWith("glyph-") })
        listOf("speaker", "back", "play", "pause", "swap").forEach { assertTrue(it, "glyph-$it" in ArtLibrary.names) }
        names.forEach { assertTrue(it, ArtLibrary[it].nodes.isNotEmpty()) }
    }
}
