package com.polingual.app

import android.app.Activity
import android.content.Context
import com.android.billingclient.api.AcknowledgePurchaseParams
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import com.android.billingclient.api.acknowledgePurchase
import com.android.billingclient.api.queryProductDetails
import com.android.billingclient.api.queryPurchasesAsync
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import java.security.MessageDigest

class Billing(context: Context, private val graph: Graph) {
    private val _access = MutableStateFlow<Access>(Access.Checking)
    val access: StateFlow<Access> = _access
    private val _products = MutableStateFlow<List<ProductDetails>>(emptyList())
    val products: StateFlow<List<ProductDetails>> = _products
    private val _message = MutableStateFlow<String?>(null)
    val message: StateFlow<String?> = _message
    var trialEligible = true
        private set

    private val client = BillingClient.newBuilder(context)
        .setListener { result, purchases -> graph.scope.launch { onPurchases(result, purchases.orEmpty()) } }
        .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().enablePrepaidPlans().build())
        .enableAutoServiceReconnection()
        .build()

    private suspend fun connect(): Boolean {
        if (client.isReady) return true
        val done = CompletableDeferred<Boolean>()
        client.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(result: BillingResult) { done.complete(result.responseCode == BillingClient.BillingResponseCode.OK) }
            override fun onBillingServiceDisconnected() { if (!done.isCompleted) done.complete(false) }
        })
        return kotlinx.coroutines.withTimeoutOrNull(8_000) { done.await() } ?: false
    }

    private fun remembered(): Access? {
        val raw = graph.kv.get(CACHE_KEY) ?: return null
        val (id, until) = raw.split("|").let { it[0] to (it.getOrNull(1)?.toLongOrNull() ?: 0L) }
        return if (until > System.currentTimeMillis() && id in Plan.paid) Access.Subscribed(id) else null
    }

    private fun remember(access: Access) {
        when (access) {
            is Access.Subscribed -> graph.kv.set(CACHE_KEY, "${access.productId}|${System.currentTimeMillis() + GRACE_MS}")
            is Access.Trial -> graph.kv.set(CACHE_KEY, "${access.productId}|${System.currentTimeMillis() + GRACE_MS}")
            Access.Locked -> graph.kv.set(CACHE_KEY, null)
            else -> Unit
        }
    }

    suspend fun refresh() {
        if (BuildConfig.FREE_BETA) { _access.value = Access.Beta }
        remembered()?.let { if (_access.value == Access.Checking) _access.value = it }
        if (!connect()) {
            if (_access.value == Access.Checking) _access.value = if (BuildConfig.FREE_BETA) Access.Beta else Access.Locked
            return
        }
        loadProducts()
        restore(silent = true)
    }

    private suspend fun loadProducts() {
        val subs = client.queryProductDetails(QueryProductDetailsParams.newBuilder().setProductList(Plan.subscriptions.map {
            QueryProductDetailsParams.Product.newBuilder().setProductId(it).setProductType(BillingClient.ProductType.SUBS).build()
        }).build())
        val once = client.queryProductDetails(QueryProductDetailsParams.newBuilder().setProductList(listOf(
            QueryProductDetailsParams.Product.newBuilder().setProductId(Plan.LIFETIME).setProductType(BillingClient.ProductType.INAPP).build(),
        )).build())
        _products.value = (subs.productDetailsList.orEmpty() + once.productDetailsList.orEmpty()).sortedBy { Plan.paid.indexOf(it.productId) }
    }

    suspend fun restore(silent: Boolean = false) {
        if (!connect()) { if (!silent) _message.value = "Google Play is not available on this device."; return }
        val subs = client.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.SUBS).build()).purchasesList
        val once = client.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build()).purchasesList
        handle(subs + once)
        if (!silent) _message.value = if (_access.value.unlocked) "Purchases restored." else "No purchases found for this Google account."
    }

    fun buy(activity: Activity, product: ProductDetails) {
        val offer = product.subscriptionOfferDetails?.let { offers -> offers.firstOrNull { it.offerId != null && trialEligible } ?: offers.firstOrNull { it.offerId == null } ?: offers.first() }
        val params = BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(product).apply { offer?.let { setOfferToken(it.offerToken) } }.build()
        val flow = BillingFlowParams.newBuilder().setProductDetailsParamsList(listOf(params)).apply { graph.account.userId?.let { setObfuscatedAccountId(accountHash(it)) } }.build()
        client.launchBillingFlow(activity, flow)
    }

    private suspend fun onPurchases(result: BillingResult, purchases: List<Purchase>) {
        when (result.responseCode) {
            BillingClient.BillingResponseCode.OK -> handle(purchases)
            BillingClient.BillingResponseCode.USER_CANCELED -> Unit
            BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED -> restore(silent = true)
            else -> _message.value = "The purchase did not finish. ${result.debugMessage}".trim()
        }
    }

    private suspend fun handle(purchases: List<Purchase>) {
        val records = mutableListOf<PurchaseRecord>()
        for (p in purchases) {
            val pending = p.purchaseState != Purchase.PurchaseState.PURCHASED
            if (!pending && !p.isAcknowledged) client.acknowledgePurchase(AcknowledgePurchaseParams.newBuilder().setPurchaseToken(p.purchaseToken).build())
            p.products.forEach { id -> records += PurchaseRecord(id, p.purchaseTime, p.isAcknowledged, pending, p.isAutoRenewing) }
        }
        trialEligible = Entitlement.trialEligible(records.map { it.productId })
        _access.value = Entitlement.access(records, BuildConfig.FREE_BETA)
        remember(_access.value)
        if (records.any { it.pending }) _message.value = "Your purchase is pending. Access opens when Google Play confirms it."
    }


    companion object {
        const val CACHE_KEY = "polingual.access"
        const val GRACE_MS = 3L * 24 * 3600 * 1000
        fun accountHash(userId: String): String = MessageDigest.getInstance("SHA-256").digest(userId.toByteArray()).joinToString("") { "%02x".format(it) }
    }
}
