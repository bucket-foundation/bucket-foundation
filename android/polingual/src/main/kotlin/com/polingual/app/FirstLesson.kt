package com.polingual.app

object FirstLesson {
    const val KEY = "polingual.firstLessonDone"

    fun done(read: (String) -> String?): Boolean = read(KEY) == "1"

    fun startRoute(access: Access, done: Boolean): String = if (access.unlocked || !done) "study" else "paywall"

    fun startLabel(access: Access, done: Boolean): String = if (access.unlocked || access == Access.Checking || !done) "Start" else "Unlock learning"

    fun counts(answered: Int): Boolean = answered > 0

    fun paywallAfter(access: Access, done: Boolean): Boolean = done && !access.unlocked
}
