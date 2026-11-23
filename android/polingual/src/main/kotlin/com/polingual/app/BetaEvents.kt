package com.polingual.app

import foundation.bucket.core.auth.KeyValue
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.UUID

@Serializable
data class BetaEvent(
    val id: String,
    val name: String,
    val ts: String,
    @SerialName("session_id") val sessionId: String?,
    val props: Map<String, JsonPrimitive> = emptyMap(),
) {
    companion object {
        fun make(name: String, sessionId: String?, props: Map<String, Any> = emptyMap(), nowMs: Long = System.currentTimeMillis()) = BetaEvent(
            UUID.randomUUID().toString().lowercase(),
            name,
            Instant.ofEpochMilli(nowMs).truncatedTo(ChronoUnit.SECONDS).toString(),
            sessionId,
            props.mapValues { (_, v) -> scalar(v) },
        )

        fun scalar(v: Any): JsonPrimitive = when (v) {
            is Boolean -> JsonPrimitive(v)
            is Number -> JsonPrimitive(v.toDouble())
            else -> JsonPrimitive(v.toString().take(128))
        }

        fun answeredProps(deck: String, correct: Boolean, ms: Int, kind: String, questionKind: String? = null, applied: Boolean = false): Map<String, Any> = buildMap {
            put("deck", deck); put("correct", correct); put("ms", ms); put("kind", kind)
            if (questionKind != null) { put("question_kind", questionKind); put("applied", applied) }
        }
    }
}

data class BetaFlush(val sent: Int, val kept: Int)

fun interface BetaTransport {
    suspend fun send(method: String, path: String, token: String, body: JsonElement): Int?
}

class BetaEvents(private val app: String, private val transport: BetaTransport, private val kv: KeyValue) {
    private val json = Json { ignoreUnknownKeys = true }
    private val lock = Mutex()
    private val list = ListSerializer(BetaEvent.serializer())
    private var queue: MutableList<BetaEvent> = kv.get(QUEUE_KEY)?.let { runCatching { json.decodeFromString(list, it) }.getOrNull() }?.toMutableList() ?: mutableListOf()

    val optedOut: Boolean get() = kv.get(OPT_OUT_KEY) == "1"
    val pending: Int get() = queue.size
    val owner: String? get() = kv.get(OWNER_KEY)
    private val pendingOptOut: Boolean? get() = kv.get(PENDING_KEY)?.let { it == "1" }

    suspend fun log(event: BetaEvent, owner: String) = lock.withLock {
        if (optedOut) return@withLock
        if (this.owner != owner) { queue.clear(); kv.set(OWNER_KEY, owner) }
        queue.add(event)
        if (queue.size > MAX_QUEUE) repeat(queue.size - MAX_QUEUE) { queue.removeAt(0) }
        save()
    }

    suspend fun flush(token: String?, owner: String?): BetaFlush = lock.withLock {
        val p = pendingOptOut
        if (token != null && p != null) sendOptOut(p, token)
        if (owner != null && this.owner != null && this.owner != owner) clear()
        if (token == null || owner == null || queue.isEmpty() || optedOut) return@withLock BetaFlush(0, queue.size)
        var sent = 0
        while (queue.isNotEmpty()) {
            val batch = queue.take(BATCH)
            val body = buildJsonObject { put("app", app); put("events", json.encodeToJsonElement(list, batch)) }
            val status = transport.send("POST", "api/beta/events", token, body) ?: break
            if (status != 200 && status != 400 && status != 413) break
            repeat(batch.size) { queue.removeAt(0) }
            if (status == 200) sent += batch.size
            save()
        }
        BetaFlush(sent, queue.size)
    }

    suspend fun setOptedOut(out: Boolean, token: String?) = lock.withLock {
        kv.set(OPT_OUT_KEY, if (out) "1" else "0")
        kv.set(PENDING_KEY, if (out) "1" else "0")
        if (out) { queue.clear(); save() }
        if (token != null) sendOptOut(out, token)
    }

    suspend fun clearQueue() = lock.withLock { clear() }

    private fun clear() {
        queue.clear()
        kv.set(OWNER_KEY, null)
        save()
    }

    private suspend fun sendOptOut(out: Boolean, token: String) {
        val status = transport.send("POST", "api/beta/opt-out", token, buildJsonObject { put("opted_out", out) })
        if (status == 200 && pendingOptOut == out) kv.set(PENDING_KEY, null)
    }

    private fun save() = kv.set(QUEUE_KEY, json.encodeToString(list, queue))

    companion object {
        const val BATCH = 100
        const val MAX_QUEUE = 2000
        const val OPT_OUT_KEY = "beta.optedOut"
        const val PENDING_KEY = "beta.optOutPending"
        const val OWNER_KEY = "beta.queueOwner"
        const val QUEUE_KEY = "beta.queue"
    }
}

class Beta(private val graph: Graph) {
    val events = BetaEvents("polingual", { m, p, t, b -> graph.api.send(m, p, t, b) }, graph.kv)
    private var sessionId = UUID.randomUUID().toString().lowercase()
    private var started: Long? = null

    fun log(name: String, props: Map<String, Any> = emptyMap()) {
        val owner = graph.account.userId ?: return
        val event = BetaEvent.make(name, sessionId, props)
        graph.scope.launch { events.log(event, owner) }
    }

    fun foreground() {
        sessionId = UUID.randomUUID().toString().lowercase()
        log("app_open")
        graph.scope.launch { events.flush(graph.account.token(), graph.account.userId) }
    }

    fun background() { graph.scope.launch { events.flush(graph.account.token(), graph.account.userId) } }

    fun signedOut() { graph.scope.launch { events.clearQueue() } }

    fun setOptedOut(out: Boolean) { graph.scope.launch { events.setOptedOut(out, graph.account.token()) } }

    fun studyStarted(deck: String) {
        started = System.currentTimeMillis()
        log("session_start", mapOf("deck" to deck))
    }

    fun answered(deck: String, correct: Boolean, ms: Int, kind: String, questionKind: String? = null) =
        log("card_answered", BetaEvent.answeredProps(deck, correct, ms, kind, questionKind))

    fun studyEnded(deck: String, graded: Int, correct: Int) {
        val seconds = started?.let { (System.currentTimeMillis() - it) / 1000 } ?: 0
        started = null
        log("session_end", mapOf("deck" to deck, "seconds" to seconds, "graded" to graded, "correct" to correct))
    }
}

