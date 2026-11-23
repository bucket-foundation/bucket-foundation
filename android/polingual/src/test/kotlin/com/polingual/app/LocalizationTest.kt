package com.polingual.app

import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class LocalizationTest {
    private val res = File("src/main/res")
    private val entry = Regex("""<string name="([^"]+)">(.*?)</string>""")
    private val spec = Regex("""%(\d+)\$[sd]""")

    private fun strings(dir: String) = entry.findAll(File(res, "$dir/strings.xml").readText()).associate { it.groupValues[1] to it.groupValues[2] }

    private val locales = Regex("""<locale android:name="([^"]+)"""").findAll(File(res, "xml/locales_config.xml").readText()).map { it.groupValues[1] }.toList()

    @Test
    fun twentyFiveLocalesDeclared() {
        assertEquals(25, locales.size)
        assertTrue("en" in locales && "pt-BR" in locales && "zh-Hans" in locales)
    }

    @Test
    fun everyLocaleHasAStringsFile() {
        val qual = mapOf("pt-BR" to "pt-rBR", "zh-Hans" to "b+zh+Hans", "he" to "iw", "id" to "in")
        locales.filter { it != "en" }.forEach { l -> assertTrue(File(res, "values-${qual[l] ?: l}/strings.xml").exists(), l) }
    }

    @Test
    fun translationsKeepPlaceholdersAndKeys() {
        val base = strings("values")
        res.listFiles()!!.filter { it.name.startsWith("values-") && File(it, "strings.xml").exists() }.forEach { dir ->
            val tr = strings(dir.name)
            assertTrue(tr.size >= base.size * 9 / 10, "${dir.name} has ${tr.size} of ${base.size}")
            tr.forEach { (k, v) ->
                val en = base[k]
                assertTrue(en != null, "${dir.name} has unknown key $k")
                assertEquals(spec.findAll(en!!).map { it.value }.toSet(), spec.findAll(v).map { it.value }.toSet(), "${dir.name}/$k")
            }
        }
    }
}
