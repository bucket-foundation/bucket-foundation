package com.polingual.app

import android.content.Context
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.messaging.FirebaseMessaging
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import foundation.bucket.core.auth.KeyValue
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

data class PushConfig(val appId: String, val apiKey: String, val projectId: String, val senderId: String) {
    companion object {
        fun of(appId: String, apiKey: String, projectId: String, senderId: String): PushConfig? =
            if (listOf(appId, apiKey, projectId, senderId).all { it.isNotBlank() }) PushConfig(appId, apiKey, projectId, senderId) else null
    }
}

@Serializable
data class PendingUnregister(val device: String, val user: String?)

class PushRegistry(private val transport: BetaTransport, private val kv: KeyValue, private val bundleId: String = "com.polingual.app") {
    var device: String? = kv.get(DEVICE_KEY)
        private set

    fun body(device: String) = buildJsonObject {
        put("token", device)
        put("bundleId", bundleId)
        put("platform", "android")
    }

    val failures: Int get() = kv.get(FAILURES_KEY)?.toIntOrNull() ?: 0

    fun canTry(nowMs: Long): Boolean = nowMs >= (kv.get(NEXT_KEY)?.toLongOrNull() ?: 0L)

    suspend fun received(token: String, bearer: String?, nowMs: Long = System.currentTimeMillis()) {
        val fresh = token != device
        device = token
        kv.set(DEVICE_KEY, token)
        if (bearer == null || (!fresh && !canTry(nowMs))) return
        if (register(token, bearer, nowMs)) kv.set(PENDING_KEY, null)
    }

    suspend fun register(device: String, bearer: String, nowMs: Long = System.currentTimeMillis()): Boolean {
        val ok = transport.send("POST", PATH, bearer, body(device)) in 200..299
        if (ok) {
            kv.set(FAILURES_KEY, null)
            kv.set(NEXT_KEY, null)
        } else {
            val n = failures + 1
            kv.set(FAILURES_KEY, n.toString())
            kv.set(NEXT_KEY, (nowMs + backoff(n)).toString())
        }
        return ok
    }

    suspend fun unregister(user: String?, bearer: String?) {
        val d = device ?: return
        val entry = PendingUnregister(d, user)
        if (bearer == null) return save(entry)
        attempt(entry, bearer)
    }

    suspend fun retryPending(user: String?, bearer: String?) {
        val entry = pending() ?: return
        if (user == null || bearer == null) return
        if (user == entry.user) attempt(entry, bearer) else if (register(entry.device, bearer)) kv.set(PENDING_KEY, null)
    }

    fun pending(): PendingUnregister? = kv.get(PENDING_KEY)?.let { runCatching { Json.decodeFromString(PendingUnregister.serializer(), it) }.getOrNull() }

    private fun save(e: PendingUnregister) = kv.set(PENDING_KEY, Json.encodeToString(PendingUnregister.serializer(), e))

    private suspend fun attempt(e: PendingUnregister, bearer: String) {
        val status = transport.send("DELETE", PATH, bearer, buildJsonObject { put("token", e.device) })
        if (status in 200..299) kv.set(PENDING_KEY, null) else save(e)
    }

    companion object {
        const val PATH = "api/academy/push/register"
        const val DEVICE_KEY = "push.device"
        const val PENDING_KEY = "push.pendingUnregister"
        const val FAILURES_KEY = "push.failures"
        const val NEXT_KEY = "push.nextTry"
        const val BASE_MS = 60_000L
        const val MAX_MS = 86_400_000L

        fun backoff(failures: Int): Long = if (failures <= 0) 0 else minOf(MAX_MS, BASE_MS shl minOf(failures - 1, 20))

        fun start(context: Context, config: PushConfig?): Boolean {
            config ?: return false
            if (FirebaseApp.getApps(context).isEmpty()) {
                FirebaseApp.initializeApp(context, FirebaseOptions.Builder().setApplicationId(config.appId).setApiKey(config.apiKey)
                    .setProjectId(config.projectId).setGcmSenderId(config.senderId).build())
            }
            return true
        }

        suspend fun token(): String? {
            val done = CompletableDeferred<String?>()
            runCatching { FirebaseMessaging.getInstance().token.addOnCompleteListener { t -> done.complete(if (t.isSuccessful) t.result else null) } }
                .onFailure { return null }
            return done.await()
        }
    }
}

class PolingualMessaging : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        val graph = (application as PolingualApp).graph
        graph.scope.launch { graph.push.received(token, graph.account.token()) }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val n = message.notification ?: return
        Reminders.post(this, message.messageId?.hashCode() ?: 9100, n.title.orEmpty(), n.body.orEmpty())
    }
}
