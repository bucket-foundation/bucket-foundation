package com.polingual.app

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import foundation.bucket.core.auth.KeyValue
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import java.time.Duration
import java.time.LocalDate
import java.time.LocalDateTime
import java.util.concurrent.TimeUnit

enum class OnboardStage { Done, Lesson, Paywall }

class Onboard(private val kv: KeyValue) {
    private val _stage = MutableStateFlow(runCatching { OnboardStage.valueOf(kv.get(KEY) ?: "") }.getOrDefault(OnboardStage.Done))
    val stage: StateFlow<OnboardStage> = _stage

    fun set(s: OnboardStage) {
        _stage.value = s
        kv.set(KEY, s.name)
    }

    fun lessonFinished() { if (_stage.value == OnboardStage.Lesson) set(OnboardStage.Paywall) }

    companion object { const val KEY = "onboard.stage" }
}

data class StreakState(val count: Int, val freezes: Int, val usedFreeze: Boolean = false)

object StreakRules {
    const val MAX_FREEZES = 2
    const val EARN_EVERY = 7

    fun advance(lastDay: String?, count: Int, freezes: Int, today: String): StreakState {
        if (lastDay == today) return StreakState(count.coerceAtLeast(1), freezes)
        val t = runCatching { LocalDate.parse(today) }.getOrNull() ?: return StreakState(1, freezes)
        val last = lastDay?.let { runCatching { LocalDate.parse(it) }.getOrNull() }
        val gap = last?.let { java.time.temporal.ChronoUnit.DAYS.between(it, t) } ?: Long.MAX_VALUE
        val (next, left, used) = when {
            gap == 1L -> Triple(count + 1, freezes, false)
            gap >= 2L && gap - 1 <= freezes && count > 0 -> Triple(count + 1, freezes - (gap - 1).toInt(), true)
            else -> Triple(1, freezes, false)
        }
        val earned = if (next % EARN_EVERY == 0) 1 else 0
        return StreakState(next, (left + earned).coerceAtMost(MAX_FREEZES), used)
    }

    fun alive(lastDay: String?, count: Int, freezes: Int, today: String): Int {
        val t = runCatching { LocalDate.parse(today) }.getOrNull() ?: return 0
        val last = lastDay?.let { runCatching { LocalDate.parse(it) }.getOrNull() } ?: return 0
        val gap = java.time.temporal.ChronoUnit.DAYS.between(last, t)
        return if (gap <= 1 || gap - 1 <= freezes) count else 0
    }
}

object Habit {
    const val KEY = "habit.hours"
    const val DEFAULT_HOUR = 19

    fun record(kv: KeyValue, hour: Int) {
        val list = (kv.get(KEY)?.split(',')?.mapNotNull { it.toIntOrNull() }.orEmpty() + hour).takeLast(30)
        kv.set(KEY, list.joinToString(","))
    }

    fun usualHour(hours: List<Int>): Int = hours.filter { it in 0..23 }.groupingBy { it }.eachCount().maxWithOrNull(compareBy<Map.Entry<Int, Int>> { it.value }.thenBy { -it.key })?.key ?: DEFAULT_HOUR

    fun usualHour(kv: KeyValue): Int = usualHour(kv.get(KEY)?.split(',')?.mapNotNull { it.toIntOrNull() }.orEmpty())

    fun delayUntil(now: LocalDateTime, hour: Int): Duration {
        var next = now.toLocalDate().atTime(hour, 0)
        if (!next.isAfter(now)) next = next.plusDays(1)
        return Duration.between(now, next)
    }
}

object Reminders {
    const val CHANNEL = "streak"
    const val WORK = "streak-reminder"

    fun schedule(context: Context, kv: KeyValue) {
        val hour = Habit.usualHour(kv)
        val delay = Habit.delayUntil(LocalDateTime.now(), hour)
        val req = PeriodicWorkRequestBuilder<ReminderWorker>(1, TimeUnit.DAYS).setInitialDelay(delay.toMinutes(), TimeUnit.MINUTES).build()
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(WORK, ExistingPeriodicWorkPolicy.UPDATE, req)
    }

    fun channel(context: Context) {
        val nm = context.getSystemService(NotificationManager::class.java) ?: return
        nm.createNotificationChannel(NotificationChannel(CHANNEL, "Streak reminders", NotificationManager.IMPORTANCE_DEFAULT))
    }

    fun canPost(context: Context): Boolean =
        android.os.Build.VERSION.SDK_INT < 33 || ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
}

class ReminderWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val kv = foundation.bucket.core.data.PrefsKeyValue(applicationContext)
        if (kv.get(Rewards.STREAK_DAY) == today() || !Reminders.canPost(applicationContext)) return Result.success()
        Reminders.channel(applicationContext)
        val streak = StreakRules.alive(kv.get(Rewards.STREAK_DAY), kv.get(Rewards.STREAK)?.toIntOrNull() ?: 0, kv.get(Rewards.FREEZES)?.toIntOrNull() ?: 0, today())
        val open = PendingIntent.getActivity(applicationContext, 0, Intent(applicationContext, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE)
        val note = NotificationCompat.Builder(applicationContext, Reminders.CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_streak)
            .setContentTitle(if (streak > 0) "Keep your $streak day streak" else "Play today's words")
            .setContentText("One quick round keeps it going.")
            .setContentIntent(open)
            .setAutoCancel(true)
            .build()
        runCatching { NotificationManagerCompat.from(applicationContext).notify(1, note) }
        return Result.success()
    }
}
