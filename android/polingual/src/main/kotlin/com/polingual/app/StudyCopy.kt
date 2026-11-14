package com.polingual.app

import foundation.bucket.core.engine.ExerciseKind
import foundation.bucket.core.engine.Verdict
import foundation.bucket.core.model.Lang

object StudyCopy {
    fun instruction(kind: ExerciseKind, language: String): String = when (kind) {
        ExerciseKind.Recognize -> "What does this mean?"
        ExerciseKind.Produce -> "Pick the $language word"
        ExerciseKind.Listen -> "Listen, then pick the meaning"
        ExerciseKind.TypeHeard -> "Type what you hear in $language"
        ExerciseKind.SpellHeard -> "Spell what you hear in its own script"
    }

    fun showsScriptWithSound(kind: ExerciseKind, lang: String): Boolean = kind == ExerciseKind.Listen && Lang.info[lang]?.latin == false

    fun verdict(v: Verdict, answer: String): String = when (v) {
        Verdict.Exact -> "Right: $answer"
        Verdict.Close -> "Close enough: $answer"
        Verdict.Wrong -> "It was $answer"
    }
}
