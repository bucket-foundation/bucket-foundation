package com.polingual.app

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import androidx.work.workDataOf
import foundation.bucket.core.auth.KeyValue
import foundation.bucket.core.model.Lang
import java.time.LocalTime
import java.util.concurrent.TimeUnit

class Reminders(private val context: Context, private val kv: KeyValue) {
    var wordOfDay: Boolean
        get() = kv.get(WORD_KEY) != "0"
        set(v) { kv.set(WORD_KEY, if (v) "1" else "0"); reschedule() }
    var streakRisk: Boolean
        get() = kv.get(RISK_KEY) != "0"
        set(v) { kv.set(RISK_KEY, if (v) "1" else "0"); reschedule() }

    val asked: Boolean get() = kv.get(ASKED_KEY) == "1"
    fun markAsked() = kv.set(ASKED_KEY, "1")

    fun allowed(): Boolean = (Build.VERSION.SDK_INT < 33 || ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) &&
        NotificationManagerCompat.from(context).areNotificationsEnabled()

    val usualMinute: Int get() = ReminderPlan.usualMinute(kv.get(MINUTES_KEY).orEmpty().split(',').mapNotNull { it.toIntOrNull() })

    fun noteStudy(now: LocalTime = LocalTime.now()) {
        val list = kv.get(MINUTES_KEY).orEmpty().split(',').mapNotNull { it.toIntOrNull() } + (now.hour * 60 + now.minute)
        kv.set(MINUTES_KEY, list.takeLast(14).joinToString(","))
        reschedule()
    }

    fun reschedule(nowMs: Long = System.currentTimeMillis()) {
        val wm = WorkManager.getInstance(context)
        if (wordOfDay) enqueue(wm, WORD_WORK, KIND_WORD, ReminderPlan.nextWordOfDay(nowMs) - nowMs) else wm.cancelUniqueWork(WORD_WORK)
        val streak = (kv.get(STREAK_CACHE)?.toIntOrNull() ?: 0)
        val studied = kv.get(STUDIED_CACHE) == java.time.LocalDate.now().toString()
        val risk = if (streakRisk) ReminderPlan.riskFire(nowMs, usualMinute, streak, studied) else null
        if (risk != null) enqueue(wm, RISK_WORK, KIND_RISK, risk - nowMs) else wm.cancelUniqueWork(RISK_WORK)
    }

    fun noteProgress(streak: Int, studiedToday: Boolean) {
        kv.set(STREAK_CACHE, streak.toString())
        kv.set(STUDIED_CACHE, if (studiedToday) java.time.LocalDate.now().toString() else null)
        reschedule()
    }

    fun scheduleTrial(trialEndMs: Long, nowMs: Long = System.currentTimeMillis()) {
        val wm = WorkManager.getInstance(context)
        val at = ReminderPlan.trialFire(trialEndMs, nowMs)
        if (at == null) wm.cancelUniqueWork(TRIAL_WORK) else enqueue(wm, TRIAL_WORK, KIND_TRIAL, at - nowMs)
    }

    fun cancelTrial() { WorkManager.getInstance(context).cancelUniqueWork(TRIAL_WORK) }

    private fun enqueue(wm: WorkManager, name: String, kind: String, delayMs: Long) {
        wm.enqueueUniqueWork(name, ExistingWorkPolicy.REPLACE, OneTimeWorkRequestBuilder<ReminderWorker>()
            .setInitialDelay(maxOf(0, delayMs), TimeUnit.MILLISECONDS).setInputData(workDataOf("kind" to kind)).build())
    }

    companion object {
        const val CHANNEL = "reminders"
        const val WORD_KEY = "reminders.wordOfDay"
        const val RISK_KEY = "reminders.streakRisk"
        const val ASKED_KEY = "reminders.asked"
        const val MINUTES_KEY = "reminders.studyMinutes"
        const val STREAK_CACHE = "reminders.streak"
        const val STUDIED_CACHE = "reminders.studiedDay"
        const val WORD_WORK = "word-of-day"
        const val RISK_WORK = "streak-risk"
        const val TRIAL_WORK = "polingual.trial.ending"
        const val KIND_WORD = "word"
        const val KIND_RISK = "risk"
        const val KIND_TRIAL = "trial"

        fun channel(context: Context) {
            if (Build.VERSION.SDK_INT < 26) return
            context.getSystemService(NotificationManager::class.java).createNotificationChannel(
                NotificationChannel(CHANNEL, context.getString(R.string.notify_channel), NotificationManager.IMPORTANCE_DEFAULT),
            )
        }

        fun post(context: Context, id: Int, title: String, body: String) {
            if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return
            channel(context)
            val open = PendingIntent.getActivity(context, id, Intent(context, MainActivity::class.java).putExtra("study", true).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
            val n = NotificationCompat.Builder(context, CHANNEL).setSmallIcon(R.mipmap.ic_launcher).setContentTitle(title).setContentText(body)
                .setStyle(NotificationCompat.BigTextStyle().bigText(body)).setContentIntent(open).setAutoCancel(true).build()
            runCatching { NotificationManagerCompat.from(context).notify(id, n) }
        }
    }
}

class ReminderWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val graph = (applicationContext as PolingualApp).graph
        val ctx = applicationContext
        when (inputData.getString("kind")) {
            Reminders.KIND_WORD -> {
                val app = graph.store.current()
                val system = app.system
                if (system != null) {
                    val corpus = graph.corpus.load()
                    val word = ReminderPlan.wordOfDay(system, corpus, app.study[system.id] ?: foundation.bucket.core.engine.StudyState(), today())
                    val gloss = word?.form(system.root)
                    if (word != null && gloss != null) {
                        val body = system.targets.mapNotNull { l -> word.form(l)?.let { "${Lang.name(l)} $it" } }.joinToString(" · ")
                        Reminders.post(ctx, 9001, ctx.getString(R.string.notify_word_title, gloss), body)
                    }
                }
                graph.reminders.reschedule()
            }
            Reminders.KIND_RISK -> {
                val app = graph.store.current()
                val state = app.system?.let { app.study[it.id] }
                val streak = state?.streak ?: 0
                if (streak > 0 && !ReminderPlan.studied(state)) Reminders.post(ctx, 9002, ctx.getString(R.string.notify_risk_title, streak), ctx.getString(R.string.notify_risk_body))
            }
            Reminders.KIND_TRIAL -> Reminders.post(ctx, 9003, ctx.getString(R.string.notify_trial_title), ctx.getString(R.string.notify_trial_body))
        }
        return Result.success()
    }
}
