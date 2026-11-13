package com.polingual.app

import android.app.Activity
import android.content.Context
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.AdSize
import com.google.android.gms.ads.AdView
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.MobileAds
import com.google.android.gms.ads.interstitial.InterstitialAd
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback
import com.google.android.ump.ConsentRequestParameters
import com.google.android.ump.UserMessagingPlatform
import foundation.bucket.core.model.InterstitialPacer
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

class Ads(private val context: Context, private val graph: Graph) {
    private val _ready = MutableStateFlow(false)
    val ready: StateFlow<Boolean> = _ready
    private var interstitial: InterstitialAd? = null
    private var loading = false
    private var lastShownMs: Long? = null
    private var gamesFinished = 0
    private var started = false
    private var initializing = false
    private var pending = false

    val configured: Boolean get() = BuildConfig.ADS_ENABLED && BuildConfig.BANNER_UNIT.isNotEmpty()

    fun shouldShow(access: Access): Boolean = AdGate.show(configured, access)

    fun gather(activity: Activity) {
        if (!configured || started) return
        started = true
        val info = UserMessagingPlatform.getConsentInformation(activity)
        info.requestConsentInfoUpdate(activity, ConsentRequestParameters.Builder().build(), {
            UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity) { _ -> if (info.canRequestAds()) begin() }
        }, { _ -> if (info.canRequestAds()) begin() })
        if (info.canRequestAds()) begin()
    }

    fun privacyOptionsRequired(activity: Activity): Boolean =
        UserMessagingPlatform.getConsentInformation(activity).privacyOptionsRequirementStatus == com.google.android.ump.ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED

    fun showPrivacyOptions(activity: Activity) = UserMessagingPlatform.showPrivacyOptionsForm(activity) { }

    private fun begin() {
        if (_ready.value || initializing) return
        initializing = true
        MobileAds.initialize(context) { _ready.value = true; preload() }
    }

    private fun preload() {
        if (interstitial != null || loading || BuildConfig.INTERSTITIAL_UNIT.isEmpty()) return
        loading = true
        InterstitialAd.load(context, BuildConfig.INTERSTITIAL_UNIT, AdRequest.Builder().build(), object : InterstitialAdLoadCallback() {
            override fun onAdLoaded(ad: InterstitialAd) { interstitial = ad; loading = false }
            override fun onAdFailedToLoad(error: LoadAdError) { loading = false }
        })
    }

    fun enteredGame() { pending = false }

    fun gameFinished() {
        gamesFinished += 1
        pending = true
    }

    fun leftFinishedGame(activity: Activity?) {
        if (!pending) return
        pending = false
        val access = graph.billing.access.value
        if (activity == null || !shouldShow(access) || !_ready.value) return
        val now = System.currentTimeMillis()
        if (!InterstitialPacer.due(true, lastShownMs, gamesFinished, now)) return
        val ad = interstitial ?: return preload()
        interstitial = null
        lastShownMs = now
        ad.show(activity)
        preload()
    }
}

@Composable
fun AdBanner(graph: Graph) {
    val access by graph.billing.access.collectAsState()
    val ready by graph.ads.ready.collectAsState()
    if (!ready || !graph.ads.shouldShow(access)) return
    AndroidView(
        modifier = Modifier.fillMaxWidth().height(50.dp).semantics { contentDescription = "Advertisement" },
        factory = { ctx -> AdView(ctx).apply { setAdSize(AdSize.BANNER); adUnitId = BuildConfig.BANNER_UNIT; loadAd(AdRequest.Builder().build()) } },
    )
}

object AdGate {
    fun show(configured: Boolean, access: Access): Boolean = configured && !access.unlocked && access != Access.Checking
}
