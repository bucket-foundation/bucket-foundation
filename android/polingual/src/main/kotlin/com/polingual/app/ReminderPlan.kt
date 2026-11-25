package com.polingual.app

import foundation.bucket.core.engine.ItemKind
import foundation.bucket.core.engine.LangCorpus
import foundation.bucket.core.engine.LangItem
import foundation.bucket.core.engine.StudyState
import foundation.bucket.core.model.LangSystem
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZonedDateTime

object ReminderPlan {
    const val WORD_HOUR = 9
    const val RISK_MINUTE = 20 * 60
    const val RISK_LATEST = 22 * 60
    const val FALLBACK_MINUTE = 19 * 60
    const val DAY_MS = 86_400_000L

    fun riskTime(dailyMinute: Int) = maxOf(RISK_MINUTE, minOf(dailyMinute + 60, RISK_LATEST))

    fun riskFire(nowMs: Long, dailyMinute: Int, streak: Int, studiedToday: Boolean, zone: ZoneId = ZoneId.systemDefault()): Long? {
        if (streak <= 0) return null
        val m = riskTime(dailyMinute)
        val now = ZonedDateTime.ofInstant(java.time.Instant.ofEpochMilli(nowMs), zone)
        fun fireOn(day: LocalDate) = day.atTime(m / 60, m % 60).atZone(zone).toInstant().toEpochMilli()
        val tonight = fireOn(now.toLocalDate())
        return if (!studiedToday && tonight > nowMs) tonight else fireOn(now.toLocalDate().plusDays(1))
    }

    fun nextWordOfDay(nowMs: Long, zone: ZoneId = ZoneId.systemDefault()): Long {
        val now = ZonedDateTime.ofInstant(java.time.Instant.ofEpochMilli(nowMs), zone)
        val today = now.toLocalDate().atTime(WORD_HOUR, 0).atZone(zone)
        return (if (today.isAfter(now)) today else today.plusDays(1)).toInstant().toEpochMilli()
    }

    fun usualMinute(minutes: List<Int>): Int = if (minutes.isEmpty()) FALLBACK_MINUTE else minutes.sorted()[minutes.size / 2]

    fun trialFire(trialEndMs: Long, nowMs: Long): Long? = (trialEndMs - DAY_MS).takeIf { it > nowMs }

    fun studied(state: StudyState?, day: LocalDate = LocalDate.now()) = state?.days?.contains(day.toString()) == true

    fun wordOfDay(system: LangSystem, corpus: LangCorpus, state: StudyState, day: String): LangItem? {
        fun covered(i: LangItem) = i.kind == ItemKind.Word && i.form(system.root) != null && system.targets.all { i.form(it) != null }
        val known = corpus.items.filter { i -> covered(i) && system.targets.any { state.started("$it:${i.id}") } }
        val pool = if (known.size >= 7) known else corpus.items.filter { covered(it) && it.tier <= 2 }
        if (pool.isEmpty()) return null
        var h = 1469598103934665603uL
        for (b in (system.id + day).toByteArray()) h = (h xor b.toUByte().toULong()) * 1099511628211uL
        return pool.sortedBy { it.id }[(h % pool.size.toULong()).toInt()]
    }
}
