package com.polingual.app

import com.polingual.app.play.AtlasRound
import com.polingual.app.play.FieldWord
import com.polingual.app.play.FlagTile
import com.polingual.app.play.ForeheadCard
import com.polingual.app.play.Meaning
import com.polingual.app.play.PolyPuzzle
import com.polingual.app.play.ShiftTarget
import com.polingual.app.play.SpyRound
import foundation.bucket.core.engine.Exercise
import foundation.bucket.core.engine.ExerciseKind
import foundation.bucket.core.engine.GamePrompt
import foundation.bucket.core.engine.GameWord
import foundation.bucket.core.engine.GroupLink
import foundation.bucket.core.engine.LetterPrompt
import foundation.bucket.core.engine.MiniEntry
import foundation.bucket.core.engine.PromptMode
import foundation.bucket.core.engine.WordGroup
import foundation.bucket.core.model.RevealEntry
import kotlin.test.Test
import kotlin.test.assertEquals

class CardRootTest {
    private val dog = GameWord("dog", "es", "perro", "dog", "en")
    private val en = RootTranslation("en", "dog")

    @Test fun study() = assertEquals(en, CardRoot.study(Exercise(dog, ExerciseKind.Recognize, "perro", "dog", listOf("dog"), true)))
    @Test fun quizzes() = assertEquals(en, CardRoot.quiz(GamePrompt(0, PromptMode.Flag, dog, listOf("es"), "es")))
    @Test fun speedMatch() = assertEquals(en, CardRoot.speed(dog))
    @Test fun wordGroups() = assertEquals(listOf(en), CardRoot.groups(WordGroup(GroupLink.Language("es"), listOf(dog))))
    @Test fun mini() = assertEquals(en, CardRoot.mini(MiniEntry(dog, listOf("P"), 0, 0, true, 1)))
    @Test fun flagTiles() = assertEquals(en, CardRoot.flagTile(FlagTile("es", "perro", "dog", "dog")))
    @Test fun babel() = assertEquals(en, CardRoot.babel(Meaning("dog", "dog", mapOf("es" to "perro"))))
    @Test fun shift() = assertEquals(en, CardRoot.shift(ShiftTarget("es", "perro", "dog")))
    @Test fun snake() = assertEquals(en, CardRoot.snake(FieldWord(1, 0.0, 0.0, "perro", "es", "dog", true)))
    @Test fun atlas() = assertEquals(en, CardRoot.atlas(AtlasRound("es", "perro", "dog", "dog")))
    @Test fun forehead() = assertEquals(en, CardRoot.forehead(ForeheadCard("es", "perro", "dog", null, "dog")))
    @Test fun iSpy() = assertEquals(en, CardRoot.iSpy(SpyRound(0, "street", "es", "dog", "perro", listOf("dog"), "dog")))
    @Test fun polyword() = assertEquals(en, CardRoot.polyword(PolyPuzzle("es", 1, "dog", "perro", "perro", "dog", null, emptyList())))
    @Test fun liveRooms() = assertEquals(RootTranslation("de", "Hund"), CardRoot.lobby(RevealEntry("es", "perro", meaning = "Hund", correct = true), "de"))
    @Test fun letterSprintShowsTheSound() = assertEquals(RootTranslation("en", "b"), CardRoot.letter(LetterPrompt("ru", "б", "b", listOf("б"))))
    @Test fun blankGlossShowsNothing() = assertEquals(null, RootTranslations.of("en", " "))
}
