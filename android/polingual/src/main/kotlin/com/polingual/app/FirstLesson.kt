package com.polingual.app

object FirstLesson {
    const val KEY = "polingual.firstLessonDone"

    fun done(read: (String) -> String?): Boolean = read(KEY) == "1"

    fun startRoute(access: Access, done: Boolean): String? = when {
        access.unlocked || !done -> "study"
        access == Access.Locked -> "paywall"
        else -> null
    }

    fun startLabel(access: Access, done: Boolean): String = when (startRoute(access, done)) {
        "paywall" -> "Unlock learning"
        null -> "Checking your plan"
        else -> "Start"
    }

    fun counts(answered: Int): Boolean = answered > 0

    fun paywallAfter(access: Access, done: Boolean): Boolean = done && access == Access.Locked
}
