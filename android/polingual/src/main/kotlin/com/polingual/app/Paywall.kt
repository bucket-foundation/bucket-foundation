package com.polingual.app

import foundation.bucket.core.ui.pl.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import android.app.Activity
import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.core.net.toUri
import com.android.billingclient.api.ProductDetails
import foundation.bucket.core.ui.pl.PL
import foundation.bucket.core.ui.LocalPalette
import foundation.bucket.core.ui.pl.Pill
import foundation.bucket.core.ui.pl.PlainLink
import foundation.bucket.core.ui.pl.PrimaryButton
import kotlinx.coroutines.launch

fun ProductDetails.priceText(): String =
    oneTimePurchaseOfferDetails?.formattedPrice
        ?: subscriptionOfferDetails?.firstOrNull { it.offerId == null }?.pricingPhases?.pricingPhaseList?.lastOrNull()?.formattedPrice
        ?: subscriptionOfferDetails?.firstOrNull()?.pricingPhases?.pricingPhaseList?.lastOrNull()?.formattedPrice
        ?: ""

data class PlanOffer(val productId: String, val price: String, val details: ProductDetails?)

object FakePlans {
    val offers = listOf(PlanOffer(Plan.MONTHLY, "$9.99", null), PlanOffer(Plan.YEARLY, "$59.99", null), PlanOffer(Plan.FAMILY, "$89.99", null), PlanOffer(Plan.LIFETIME, "$149.99", null))
    fun offers(real: List<ProductDetails>, fake: Boolean): List<PlanOffer> =
        real.map { PlanOffer(it.productId, it.priceText(), it) }.ifEmpty { if (fake) offers else emptyList() }
}

@Composable
fun PaywallScreen(graph: Graph, back: () -> Unit) {
    val p = LocalPalette.current
    val details by graph.billing.products.collectAsState()
    val products = FakePlans.offers(details, BuildConfig.DEBUG && BuildConfig.FAKE_PLANS)
    val access by graph.billing.access.collectAsState()
    val message by graph.billing.message.collectAsState()
    var chosen by remember { mutableStateOf(Plan.YEARLY) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    LaunchedEffect(Unit) { graph.billing.refresh() }
    val trial = graph.billing.trialEligible
    Page(back = back, ground = Ground.Lattice, stickers = listOf(Sticker("ticket", Alignment.CenterStart, 120.dp, -8f), Sticker("seal", Alignment.TopEnd, 60.dp, 10f), Sticker("kente", Alignment.BottomEnd, 80.dp, -5f, dx = (-8).dp))) {
        Text(if (trial) "${Plan.TRIAL_DAYS} days free" else "Keep learning", style = Type.display, color = PL.Paper)
        Text("Daily sessions, every language set, and your words on every device. Games and live rooms stay free.", style = Type.body, color = PL.Paper.copy(alpha = 0.9f))
        if (access.unlocked) {
            Pill(if (access is Access.Beta) "Free beta access" else "You have access", PL.Malachite)
            if (access is Access.Beta) Text("Test builds open everything for free.", color = PL.Paper)
        }
        if (products.isEmpty()) EmptyState("pebble", "The plans did not load. Check your connection and Google Play, then try again.", onDark = true)
        products.forEach { product ->
            val on = product.productId == chosen
            Column(
                Modifier.fillMaxWidth().plSurface(PL.Card, PLRadius.lg).border(if (on) 4.dp else 2.dp, if (on) PL.Ochre else PL.Hairline2, RoundedCornerShape(PLRadius.lg))
                    .clickable(role = Role.RadioButton) { chosen = product.productId }.padding(16.dp),
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(Plan.title(product.productId), style = Type.title.copy(fontSize = 17.sp()), color = p.ink)
                    if (product.productId == Plan.YEARLY) Pill("Best value", PL.Malachite)
                }
                Text(product.price, style = Type.title, color = p.ink)
                Text("per ${Plan.period(product.productId)}", color = p.muted)
            }
        }
        products.firstOrNull { it.productId == chosen }?.let { product ->
            Text(Entitlement.disclosure(trial && Plan.hasTrial(product.productId), product.price, Plan.period(product.productId), product.productId == Plan.FAMILY), style = Type.small, color = PL.Paper.copy(alpha = 0.85f))
            PrimaryButton(if (trial && Plan.hasTrial(product.productId)) "Start free trial" else "Continue") { val d = product.details; if (d != null) (context as? Activity)?.let { graph.billing.buy(it, d) } }
        }
        message?.let { Text(it, color = PL.Maya) }
        PlainLink("Restore purchases", onDark = true) { scope.launch { graph.billing.restore() } }
        PlainLink("Manage subscription", onDark = true) { context.startActivity(Intent(Intent.ACTION_VIEW, "https://play.google.com/store/account/subscriptions?package=${context.packageName}".toUri())) }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            PlainLink("Terms", onDark = true) { context.startActivity(Intent(Intent.ACTION_VIEW, Plan.TERMS.toUri())) }
            PlainLink("Privacy", onDark = true) { context.startActivity(Intent(Intent.ACTION_VIEW, Plan.PRIVACY.toUri())) }
        }
    }
}
