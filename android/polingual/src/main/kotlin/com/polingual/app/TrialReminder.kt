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
    const val FIRE_KEY = "polingual.trial.fire"
    const val MARKED_KEY = "polingual.trial.marked"
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

    fun shouldPost(records: List<PurchaseRecord>?, trialStartMs: Long?, nowMs: Long): Boolean {
        val start = trialStartMs ?: return false
        val rec = records?.firstOrNull { it.productId == Plan.YEARLY && it.purchasedMs == start } ?: return false
        return rec.autoRenewing && !rec.pending && nowMs < start + Plan.TRIAL_DAYS * DAY_MS
    }

    fun rescheduleAt(fireMs: Long?, nowMs: Long): Long? = fireMs?.takeIf { it > nowMs }

    fun allowed(context: Context): Boolean =
        NotificationManagerCompat.from(context).areNotificationsEnabled() &&
            (Build.VERSION.SDK_INT < 33 || ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED)

    private fun intent(context: Context): PendingIntent =
        PendingIntent.getBroadcast(context, NOTIFICATION_ID, Intent(context, TrialReminderReceiver::class.java), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

    fun sync(context: Context, at: Long?) {
        foundation.bucket.core.data.PrefsKeyValue(context).set(FIRE_KEY, at?.toString())
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
    override fun onReceive(context: Context, intent: Intent) {
        val kv = foundation.bucket.core.data.PrefsKeyValue(context)
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            TrialReminder.sync(context, TrialReminder.rescheduleAt(kv.get(TrialReminder.FIRE_KEY)?.toLongOrNull(), System.currentTimeMillis()))
            return
        }
        val start = kv.get(TrialReminder.START_KEY)?.toLongOrNull()
        val done = goAsync()
        val client = com.android.billingclient.api.BillingClient.newBuilder(context)
            .setListener { _, _ -> }
            .enablePendingPurchases(com.android.billingclient.api.PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .build()
        fun finish(records: List<PurchaseRecord>?) {
            if (TrialReminder.shouldPost(records, start, System.currentTimeMillis())) TrialReminder.post(context)
            runCatching { client.endConnection() }
            done.finish()
        }
        client.startConnection(object : com.android.billingclient.api.BillingClientStateListener {
            override fun onBillingSetupFinished(result: com.android.billingclient.api.BillingResult) {
                if (result.responseCode != com.android.billingclient.api.BillingClient.BillingResponseCode.OK) return finish(null)
                val params = com.android.billingclient.api.QueryPurchasesParams.newBuilder().setProductType(com.android.billingclient.api.BillingClient.ProductType.SUBS).build()
                client.queryPurchasesAsync(params) { r, purchases ->
                    finish(if (r.responseCode != com.android.billingclient.api.BillingClient.BillingResponseCode.OK) null else purchases.flatMap { p ->
                        p.products.map { PurchaseRecord(it, p.purchaseTime, p.isAcknowledged, p.purchaseState != com.android.billingclient.api.Purchase.PurchaseState.PURCHASED, p.isAutoRenewing) }
                    })
                }
            }
            override fun onBillingServiceDisconnected() = finish(null)
        })
    }
}
