package foundation.bucket.core.engine

import kotlin.test.Test
import kotlin.test.assertEquals

class SpelledTest {
    @Test
    fun exactMatchIgnoresCaseSpacesAndPunctuation() {
        assertEquals(Verdict.Exact, Spelled.judge(" Собака! ", listOf("собака"), "ru"), "LangScript.swift:127 base folds case and punctuation")
        assertEquals(Verdict.Wrong, Spelled.judge("  ", listOf("собака"), "ru"), "LangScript.swift:128 empty is wrong")
    }

    @Test
    fun stripScriptsAcceptMissingMarksAndYo() {
        assertEquals(Verdict.Close, Spelled.judge("елка", listOf("ёлка"), "ru"), "LangScript.swift:137 ё folds to е, which is close")
        assertEquals(Verdict.Exact, Spelled.judge("كتاب", listOf("كِتَاب"), "ar"), "LangScript.swift:136 strip policy with marks only is exact")
        assertEquals(Verdict.Exact, Spelled.judge("שלום", listOf("שָׁלוֹם"), "he"))
    }

    @Test
    fun lenientGreekIsCloseWithoutAccents() {
        assertEquals(Verdict.Close, Spelled.judge("σκυλος", listOf("σκύλος"), "el"), "LangScript.swift:137 lenient folds accents to close")
    }

    @Test
    fun oneSlipCountsFromFourLetters() {
        assertEquals(Verdict.Close, Spelled.judge("собак", listOf("собака"), "ru"), "LangScript.swift:140 distance 1 at four or more is close")
        assertEquals(Verdict.Wrong, Spelled.judge("кoт", listOf("кот"), "ru"), "LangScript.swift:140 under four letters needs exact")
    }

    @Test
    fun widthScriptsNormalizeFullWidth() {
        assertEquals(Verdict.Exact, Spelled.judge("ｲﾇ", listOf("イヌ"), "ja"), "LangScript.swift:70 NFKC for width scripts")
    }
}

class SpelledSpaceTest {
    @Test
    fun noBreakSpaceSeparatesWordsLikeSwiftIsWhitespace() {
        assertEquals("до свидания", Spelled.base("до свидания", "ru"), "LangScript.swift:74 isWhitespace includes U+00A0")
        assertEquals(Verdict.Exact, Spelled.judge("до свидания", listOf("до свидания"), "ru"))
        assertEquals("a b", Spelled.base("a b", "ru"))
    }
}
