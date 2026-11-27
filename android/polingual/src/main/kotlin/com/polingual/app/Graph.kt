package com.polingual.app

import android.content.Context
import foundation.bucket.core.auth.Account
import foundation.bucket.core.auth.GuestPass
import foundation.bucket.core.auth.LobbyStore
import foundation.bucket.core.auth.Stage
import foundation.bucket.core.data.AppState
import foundation.bucket.core.data.AppStore
import foundation.bucket.core.data.CorpusRepo
import foundation.bucket.core.data.KeystoreVault
import foundation.bucket.core.data.PrefsKeyValue
import foundation.bucket.core.data.StudySync
import foundation.bucket.core.data.SystemsSync
import foundation.bucket.core.model.LangSystem
import foundation.bucket.core.net.BucketApi
import io.ktor.client.HttpClient
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.contentType
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.HttpTimeout
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.json.JsonObject
import java.util.UUID

class Graph(val context: Context) {
    val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val http = HttpClient(OkHttp) {
        install(HttpTimeout) { requestTimeoutMillis = 20_000; connectTimeoutMillis = 10_000 }
    }
    val api = BucketApi(http, BuildConfig.BUCKET_BASE, app = "polingual")
    val store = AppStore(context)
    val corpus = CorpusRepo(context)
    val inputs = InputRepo(java.io.File(context.filesDir, "input"), BuildConfig.INPUT_BASE, BuildConfig.INPUT_BAND_BASE.ifBlank { null }, BuildConfig.DEBUG, http)
    val account = Account(api, KeystoreVault(context))
    val kv = PrefsKeyValue(context)
    val funnel = Funnel(kv, { UUID.randomUUID().toString() }) { body ->
        http.post(Funnel.EVENTS_URL) {
            header("x-polingual-client", Funnel.CLIENT)
            contentType(io.ktor.http.ContentType.Application.Json)
            setBody(body)
        }
    }
    fun track(name: String, detail: String? = null) { scope.launch { funnel.send(name, detail) } }
    val todayPlan = TodayPlanStore(kv)
    val reminders = Reminders(context, kv)
    val rewards = Rewards(kv)
    val state: StateFlow<AppState?> = store.state.stateIn(scope, SharingStarted.Eagerly, null)
    val guest = GuestPass(api, kv, nickname = { state.value?.nickname.orEmpty() })
    val lobbies = LobbyStore(api, userToken = { account.token() }, guest = guest)
    private val silentSetting = SilentSetting(kv)
    val silent: StateFlow<Boolean> = silentSetting.on
    fun setSilent(on: Boolean) = silentSetting.set(on)
    val voice = Voice(context) { silentSetting.on.value }
    val chatBlocks = foundation.bucket.core.auth.ChatBlocks(kv, api) {
        account.token()?.let { t -> account.userId?.let { foundation.bucket.core.auth.ChatIdentity(it, t) } }
            ?: guest.token()?.let { t -> guest.userId?.let { foundation.bucket.core.auth.ChatIdentity(it, t) } }
    }
    val radioApi = foundation.bucket.core.net.RadioApi(http) { host -> if (host != null) kv.set("content.radioServer", host); kv.get("content.radioServer") }
    val radioLog = RadioLog(kv)
    val radio = Radio(context) { h -> logRadio(h) }

    private fun logRadio(h: Heard) {
        val system = state.value?.systems?.firstOrNull { h.lang in it.targets } ?: return
        val salt = kv.get("polingual.reviewLog.salt") ?: java.util.UUID.randomUUID().toString().also { kv.set("polingual.reviewLog.salt", it) }
        val device = foundation.bucket.core.engine.ReviewLog.deviceHash(salt, kv.get("polingual.install") ?: java.util.UUID.randomUUID().toString().also { kv.set("polingual.install", it) })
        radioLog.log(h, system.id, device, java.util.TimeZone.getDefault().id, System.currentTimeMillis()) { java.util.UUID.randomUUID().toString() }
        scope.launch { syncRadio() }
    }

    suspend fun syncRadio() {
        val token = account.token() ?: return
        radioLog.upload { batch -> api.learnEvents(token, batch) }
    }
    val billing = Billing(context, this)
    val ads = Ads(context, this)
    var activity: java.lang.ref.WeakReference<android.app.Activity>? = null

    private val syncLock = kotlinx.coroutines.sync.Mutex()
    private val _daily = kotlinx.coroutines.flow.MutableStateFlow(DailyBook.decode(kv.get(DailyBook.LOCAL_KEY)))
    val daily: StateFlow<Map<String, DailyResult>> = _daily

    private val dailyRemote = object : ProgressRemote {
        override suspend fun pull(): Map<String, DailyResult>? = account.token()?.let { t -> api.progressPull(t)?.let(DailyBook::fromBranches) }
        override suspend fun push(book: Map<String, DailyResult>): Boolean = account.token()?.let { t -> api.progressPush(t, DailyBook.BRANCH, DailyBook.branchData(book)).settled } ?: false
    }

    private fun saveDaily(book: Map<String, DailyResult>) { _daily.value = book; kv.set(DailyBook.LOCAL_KEY, DailyBook.encode(book)) }

    fun dailyResult(game: DailyGame, day: String = dayKey()): DailyResult? = _daily.value[DailyBook.key(game, day)]

    fun recordDaily(result: DailyResult) {
        saveDaily(DailyBook.merge(_daily.value, mapOf(DailyBook.key(DailyGame.entries.first { it.wire == result.game }, result.day) to result)))
        scope.launch { syncDaily() }
    }

    suspend fun syncDaily() {
        if (account.token() == null) return
        DailyBook.sync(dailyRemote, _daily.value)?.let(::saveDaily)
    }

    init {
        scope.launch(Dispatchers.IO) {
            com.polingual.app.play.PlayAssets.words(context)
            com.polingual.app.play.PlayAssets.bank(context)
            com.polingual.app.play.PlayAssets.alphabets(context)
            corpus.load()
        }
        scope.launch { billing.refresh() }
        scope.launch {
            account.restore()
            if (account.stage.value == Stage.SignedIn) { syncSystems(); syncStudy(); syncDaily(); syncRadio() }
            var last = account.stage.value
            account.stage.collect { stage ->
                if (stage == Stage.SignedIn && last != Stage.SignedIn) {
                    store.update { it.copy(savePrompt = false) }
                    lobbies.mergeGuest()
                    syncSystems()
                    syncStudy()
                    syncDaily()
                }
                last = stage
            }
        }
        account.beforeSignOut = { force ->
            if (!force && !syncSystems()) throw foundation.bucket.core.model.BucketError.SyncPending
            store.clearLocal()
        }
    }

    suspend fun createSystem(root: String, targets: List<String>): LangSystem {
        val now = System.currentTimeMillis().toDouble()
        val existing = store.current().systems.firstOrNull { it.root == root && it.targets.toSet() == targets.toSet() }
        val system = existing ?: LangSystem(UUID.randomUUID().toString().lowercase(), foundation.bucket.core.model.Lang.systemName(root, targets), root, targets, now, now)
        store.update { s -> s.copy(systems = if (existing == null) s.systems + system else s.systems, activeSystem = system.id) }
        scope.launch { syncSystems() }
        return system
    }

    suspend fun removeSystem(id: String) {
        store.update { s -> s.copy(systems = s.systems.filterNot { it.id == id }, removedSystems = s.removedSystems + (id to System.currentTimeMillis().toDouble()), activeSystem = if (s.activeSystem == id) null else s.activeSystem) }
        scope.launch { syncSystems() }
    }

    suspend fun syncSystems(): Boolean = syncLock.withLock {
        val t = account.token() ?: return@withLock false
        val branches = api.progressPull(t) ?: return@withLock false
        val remote = (branches[SystemsSync.BRANCH] as? JsonObject)?.get("data")
        val cur = store.current()
        val merged = SystemsSync.merge(remote, cur.systems, cur.removedSystems)
        val systems = SystemsSync.systems(merged)
        store.update { it.copy(systems = systems, activeSystem = it.activeSystem?.takeIf { id -> systems.any { s -> s.id == id } } ?: systems.firstOrNull()?.id) }
        if (merged != remote) api.progressPush(t, SystemsSync.BRANCH, merged).also { if (it == foundation.bucket.core.net.PushResult.Refused) android.util.Log.w("polingual", "server refused a blank systems overwrite") }.settled else true
    }

    private var studyPush: kotlinx.coroutines.Job? = null

    fun syncStudySoon() {
        studyPush?.cancel()
        studyPush = scope.launch { kotlinx.coroutines.delay(5_000); syncStudy() }
    }

    suspend fun syncStudy(): Boolean = syncLock.withLock {
        val t = account.token() ?: return@withLock false
        var ok = true
        for (sys in store.current().systems) {
            val branch = StudySync.branch(sys.id)
            val local = store.current().study[sys.id] ?: foundation.bucket.core.engine.StudyState()
            val pull: suspend () -> StudySync.Remote? = {
                api.progressPull(t)?.let { b -> (b[branch] as? JsonObject).let { row -> StudySync.Remote(row?.get("data"), (row?.get("updated_at") as? kotlinx.serialization.json.JsonPrimitive)?.content) } }
            }
            val merged = StudySync.settle(local, pull, { data, version ->
                when (api.progressPush(t, branch, data, version, guarded = true)) {
                    foundation.bucket.core.net.PushResult.Written, foundation.bucket.core.net.PushResult.Refused -> StudySync.Outcome.Saved
                    foundation.bucket.core.net.PushResult.Stale -> StudySync.Outcome.Stale
                    foundation.bucket.core.net.PushResult.Failed -> StudySync.Outcome.Failed
                }
            })
            if (merged == null) { ok = false; continue }
            store.update { it.copy(study = it.study + (sys.id to (it.study[sys.id] ?: local).let { now -> StudySync.state(StudySync.merge(merged, now), now) })) }
        }
        ok
    }
}
