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

object TrialReminder {
    const val START_KEY = "polingual.trial.start"
    const val CHANNEL = "polingual.trial"
    const val NOTIFICATION_ID = 7207
    const val DAY_MS = 86_400_000L
    const val TITLE = "Your Polingual trial ends in 2 days"
    const val BODY = "Your yearly plan starts in 2 days. Cancel in Google Play any time before then and you pay nothing."

    fun fireAt(trialStartMs: Long): Long = trialStartMs + (Plan.TRIAL_DAYS - Plan.REMINDER_DAYS_BEFORE) * DAY_MS

    fun startedTrial(record: PurchaseRecord, wasEligible: Boolean, fromPurchase: Boolean): Boolean =
        fromPurchase && wasEligible && Plan.hasTrial(record.productId) && !record.pending

    fun plan(records: List<PurchaseRecord>, trialStartMs: Long?, nowMs: Long): Long? {
        val start = trialStartMs ?: return null
        val rec = records.firstOrNull { it.productId == Plan.YEARLY && it.purchasedMs == start } ?: return null
        if (!rec.autoRenewing || rec.pending) return null
        return fireAt(start).takeIf { it > nowMs }
    }

    fun allowed(context: Context): Boolean =
        NotificationManagerCompat.from(context).areNotificationsEnabled() &&
            (Build.VERSION.SDK_INT < 33 || ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED)

    private fun intent(context: Context): PendingIntent =
        PendingIntent.getBroadcast(context, NOTIFICATION_ID, Intent(context, TrialReminderReceiver::class.java), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

    fun sync(context: Context, at: Long?) {
        val alarms = context.getSystemService(AlarmManager::class.java) ?: return
        if (at == null) alarms.cancel(intent(context)) else alarms.set(AlarmManager.RTC_WAKEUP, at, intent(context))
    }

    fun post(context: Context) {
        if (!allowed(context)) return
        val nm = context.getSystemService(NotificationManager::class.java) ?: return
        nm.createNotificationChannel(NotificationChannel(CHANNEL, "Trial reminders", NotificationManager.IMPORTANCE_DEFAULT))
        val open = PendingIntent.getActivity(context, 0, context.packageManager.getLaunchIntentForPackage(context.packageName), PendingIntent.FLAG_IMMUTABLE)
        val n = NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentTitle(TITLE)
            .setContentText(BODY)
            .setStyle(NotificationCompat.BigTextStyle().bigText(BODY))
            .setContentIntent(open)
            .setAutoCancel(true)
            .build()
        try {
            NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, n)
        } catch (_: SecurityException) {
        }
    }
}

class TrialReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) = TrialReminder.post(context)
}
