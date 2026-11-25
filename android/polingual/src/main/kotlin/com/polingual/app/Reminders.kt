package com.polingual.app

import android.Manifest
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import foundation.bucket.core.auth.KeyValue
import foundation.bucket.core.model.Lang
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.LocalTime

class Reminders(private val context: Context, private val kv: KeyValue) {
    var wordOfDay: Boolean
        get() = kv.get(WORD_KEY) != "0"
        set(v) { kv.set(WORD_KEY, if (v) "1" else "0"); rescheduleWord() }
    var streakRisk: Boolean
        get() = kv.get(RISK_KEY) != "0"
        set(v) { kv.set(RISK_KEY, if (v) "1" else "0"); rescheduleRisk() }

    val asked: Boolean get() = kv.get(ASKED_KEY) == "1"
    fun markAsked() = kv.set(ASKED_KEY, "1")

    fun allowed(): Boolean = (Build.VERSION.SDK_INT < 33 || ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) &&
        NotificationManagerCompat.from(context).areNotificationsEnabled()

    private val minutes: List<Int> get() = kv.get(MINUTES_KEY).orEmpty().split(',').mapNotNull { it.toIntOrNull() }

    fun noteStudy(streak: Int, now: LocalTime = LocalTime.now()) {
        kv.set(MINUTES_KEY, (minutes + (now.hour * 60 + now.minute)).takeLast(14).joinToString(","))
        noteProgress(streak, studiedToday = true)
    }

    fun noteProgress(streak: Int, studiedToday: Boolean) {
        kv.set(STREAK_CACHE, streak.toString())
        kv.set(STUDIED_CACHE, if (studiedToday) LocalDate.now().toString() else null)
        rescheduleRisk()
    }

    fun reschedule() { rescheduleWord(); rescheduleRisk() }

    fun rescheduleWord(nowMs: Long = System.currentTimeMillis()) = set(KIND_WORD, if (wordOfDay) ReminderPlan.nextWordOfDay(nowMs) else null)

    fun rescheduleRisk(nowMs: Long = System.currentTimeMillis()) {
        val streak = kv.get(STREAK_CACHE)?.toIntOrNull() ?: 0
        val studied = kv.get(STUDIED_CACHE) == LocalDate.now().toString()
        set(KIND_RISK, if (streakRisk) ReminderPlan.riskFire(nowMs, ReminderPlan.usualMinute(minutes), streak, studied) else null)
    }

    private fun set(kind: String, at: Long?) {
        val alarms = context.getSystemService(AlarmManager::class.java) ?: return
        val pi = intent(context, kind)
        if (at == null) alarms.cancel(pi) else alarms.set(AlarmManager.RTC_WAKEUP, at, pi)
    }

    companion object {
        const val CHANNEL = "reminders"
        const val WORD_KEY = "reminders.wordOfDay"
        const val RISK_KEY = "reminders.streakRisk"
        const val ASKED_KEY = "reminders.asked"
        const val MINUTES_KEY = "reminders.studyMinutes"
        const val STREAK_CACHE = "reminders.streak"
        const val STUDIED_CACHE = "reminders.studiedDay"
        const val KIND_WORD = "word"
        const val KIND_RISK = "risk"

        private fun intent(context: Context, kind: String): PendingIntent =
            PendingIntent.getBroadcast(context, kind.hashCode(), Intent(context, ReminderReceiver::class.java).putExtra("kind", kind), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

        fun post(context: Context, id: Int, title: String, body: String) {
            if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return
            val nm = context.getSystemService(NotificationManager::class.java) ?: return
            nm.createNotificationChannel(NotificationChannel(CHANNEL, context.getString(R.string.notify_channel), NotificationManager.IMPORTANCE_DEFAULT))
            val open = PendingIntent.getActivity(context, id, context.packageManager.getLaunchIntentForPackage(context.packageName), PendingIntent.FLAG_IMMUTABLE)
            val n = NotificationCompat.Builder(context, CHANNEL).setSmallIcon(R.drawable.ic_launcher_foreground).setContentTitle(title).setContentText(body)
                .setStyle(NotificationCompat.BigTextStyle().bigText(body)).setContentIntent(open).setAutoCancel(true).build()
            try {
                NotificationManagerCompat.from(context).notify(id, n)
            } catch (_: SecurityException) {
            }
        }
    }
}

class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val graph = (context.applicationContext as PolingualApp).graph
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) return graph.reminders.reschedule()
        val done = goAsync()
        CoroutineScope(Dispatchers.Default).launch {
            try {
                fire(context, graph, intent.getStringExtra("kind"))
            } finally {
                done.finish()
            }
        }
    }

    private suspend fun fire(ctx: Context, graph: Graph, kind: String?) {
        val app = graph.store.current()
        val system = app.system
        val state = system?.let { app.study[it.id] }
        when (kind) {
            Reminders.KIND_WORD -> {
                if (system != null) {
                    val word = ReminderPlan.wordOfDay(system, graph.corpus.load(), state ?: foundation.bucket.core.engine.StudyState(), today())
                    val gloss = word?.form(system.root)
                    if (word != null && gloss != null) {
                        val body = system.targets.mapNotNull { l -> word.form(l)?.let { "${Lang.name(l)} $it" } }.joinToString(" · ")
                        Reminders.post(ctx, 9001, ctx.getString(R.string.notify_word_title, gloss), body)
                    }
                }
                graph.reminders.rescheduleWord()
            }
            Reminders.KIND_RISK -> {
                val streak = state?.streak ?: 0
                val studied = ReminderPlan.studied(state)
                if (streak > 0 && !studied) Reminders.post(ctx, 9002, ctx.getString(R.string.notify_risk_title, streak), ctx.getString(R.string.notify_risk_body))
                graph.reminders.noteProgress(streak, studied)
            }
        }
    }
}
