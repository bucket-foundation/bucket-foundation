package com.polingual.app

import foundation.bucket.core.engine.ExerciseKind
import foundation.bucket.core.engine.Verdict
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class StudyCopyTest {
    @Test
    fun nonLatinListenCardsShowTheWordWithTheSpeaker() {
        assertTrue(StudyCopy.showsScriptWithSound(ExerciseKind.Listen, "ja"))
        assertTrue(StudyCopy.showsScriptWithSound(ExerciseKind.Listen, "ru"))
        assertFalse(StudyCopy.showsScriptWithSound(ExerciseKind.Listen, "es"))
        assertFalse(StudyCopy.showsScriptWithSound(ExerciseKind.TypeHeard, "ja"))
    }

    @Test
    fun everyKindHasAnInstructionAndVerdictsNameTheAnswer() {
        ExerciseKind.entries.forEach { assertTrue(StudyCopy.instruction(it, "Spanish").isNotBlank()) }
        assertEquals("It was perro", StudyCopy.verdict(Verdict.Wrong, "perro"))
        assertEquals("Close enough: árbol", StudyCopy.verdict(Verdict.Close, "árbol"))
    }
}

class StudyHeritageTest {
    @Test
    fun heritageComesFromTheAlphabetList() {
        val heritage = com.polingual.app.play.PlayAssets.json.parseToJsonElement(java.io.File(com.polingual.app.play.TestCorpus.repo, "android/polingual/src/main/assets/play/alphabets.json").readText())
            .let { (it as kotlinx.serialization.json.JsonObject).getValue("heritage") as kotlinx.serialization.json.JsonArray }.map { (it as kotlinx.serialization.json.JsonPrimitive).content }
        assertEquals(setOf("ru", "ja"), StudyHeritage.of(listOf("es", "ru", "ja"), heritage))
        assertEquals(emptySet(), StudyHeritage.of(listOf("es", "fr"), heritage))
    }
}
