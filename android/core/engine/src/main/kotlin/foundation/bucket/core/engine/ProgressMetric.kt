package foundation.bucket.core.engine

import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import kotlin.math.floor
import kotlin.math.roundToInt

data class MetricRow(
    val kind: String? = null,
    val lang: String? = null,
    val reviewedAt: Double,
    val tz: String? = null,
    val seconds: Double? = null,
    val coveragePred: Double? = null,
    val started: Double? = null,
    val ended: Double? = null,
    val lemmasSeen: List<String> = emptyList(),
    val taps: List<String> = emptyList(),
)

data class MetricCard(val stability: Double? = null, val lastReview: Double? = null)

data class LangMetrics(val inputSeconds: Double, val inputHours: Double, val knownWords: Int)

data class InputStreak(val streak: Int, val studiedToday: Boolean)

object ProgressMetric {
    const val INPUT_COVERAGE = 0.9
    const val STREAK_INPUT_SECONDS = 300.0

    fun countsAsInput(r: MetricRow, lang: String): Boolean =
        r.kind == "exposure" && r.lang == lang && (r.seconds ?: 0.0) > 0 && (r.coveragePred ?: -1.0) >= INPUT_COVERAGE

    fun inputSeconds(rows: List<MetricRow>, lang: String): Double = rows.filter { countsAsInput(it, lang) }.sumOf { it.seconds!! }

    fun dayKey(at: Double, tz: String?): String {
        val zone = runCatching { ZoneId.of(tz ?: "UTC") }.getOrDefault(ZoneId.of("UTC"))
        val d = Instant.ofEpochMilli(at.toLong()).atZone(zone).toLocalDate()
        return "${d.year}-${d.monthValue}-${d.dayOfMonth}"
    }

    fun inputDays(rows: List<MetricRow>, lang: String): List<String> {
        val input = rows.filter { countsAsInput(it, lang) }
        val days = sortedSetOf<String>()
        for (s in rows) {
            if (s.kind != "session" || s.lang != lang || s.started == null || s.ended == null) continue
            val sum = input.filter { it.reviewedAt >= s.started && it.reviewedAt <= s.ended }.sumOf { it.seconds!! }
            if (sum >= STREAK_INPUT_SECONDS) days.add(dayKey(s.ended, s.tz))
        }
        return days.toList()
    }

    fun epochDay(day: String): Long {
        val (y, m, d) = day.split("-").map { it.toInt() }
        return LocalDate.of(y, m, d).toEpochDay()
    }

    fun streakFromDays(days: Iterable<String>, today: String): InputStreak {
        val set = days.map { epochDay(it) }.toSet()
        val t = epochDay(today)
        val studiedToday = t in set
        var cur = if (studiedToday) t else t - 1
        var streak = 0
        while (cur in set) {
            streak++
            cur--
        }
        return InputStreak(streak, studiedToday)
    }

    fun lemmaEvidence(lang: String, cards: Map<String, MetricCard>, rows: List<MetricRow>): Map<String, LemmaEvidence> {
        val prefix = "$lang:"
        val out = mutableMapOf<String, LemmaEvidence>()
        for ((id, c) in cards) if (id.startsWith(prefix)) out[id.removePrefix(prefix)] = LemmaEvidence(c.stability, c.lastReview)
        for (r in rows) {
            if (r.kind != "exposure" || r.lang != lang) continue
            for (l in r.lemmasSeen.toSet()) out[l] = (out[l] ?: LemmaEvidence()).let { it.copy(exposures = it.exposures + 1) }
            for (l in r.taps.toSet()) out[l] = (out[l] ?: LemmaEvidence()).let { it.copy(lastTap = maxOf(it.lastTap ?: Double.NEGATIVE_INFINITY, r.reviewedAt)) }
        }
        return out
    }

    fun rows(log: List<LogRow>): List<MetricRow> = log.mapNotNull { r ->
        when (r) {
            is LogRow.Exposure -> MetricRow("exposure", r.lang, r.at.toDouble(), r.tz, r.seconds.toDouble(), r.coveragePred, lemmasSeen = r.lemmasSeen, taps = r.taps)
            is LogRow.Session -> MetricRow("session", r.lang, r.at.toDouble(), r.tz, started = r.started.toDouble(), ended = r.ended.toDouble())
            is LogRow.Review -> MetricRow("review", null, r.at.toDouble(), r.tz)
            is LogRow.VocabTest -> null
        }
    }

    fun cards(study: StudyState?): Map<String, MetricCard> =
        study?.cards.orEmpty().filterValues { it.reps > 0 }.mapValues { (_, c) -> MetricCard(c.intervalDays.takeIf { it > 0 }, c.last.toDouble().takeIf { it > 0 }) }

    fun streak(studyDays: List<String>, log: List<MetricRow>, langs: List<String>, today: String): InputStreak =
        streakFromDays(studyDays + langs.flatMap { inputDays(log, it) }, today)

    fun langMetrics(lang: String, cards: Map<String, MetricCard>, rows: List<MetricRow>, now: Double, tier: Int = 0): LangMetrics {
        val secs = inputSeconds(rows, lang)
        return LangMetrics(secs, floor(secs / 360) / 10, LearnerModel.knownCount(lemmaEvidence(lang, cards, rows), now, tier).roundToInt())
    }
}
