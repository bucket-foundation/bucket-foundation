package com.polingual.app

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
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import androidx.core.net.toUri
import com.android.billingclient.api.ProductDetails
import foundation.bucket.core.ui.D8
import foundation.bucket.core.ui.LocalPalette
import foundation.bucket.core.ui.Pill
import foundation.bucket.core.ui.PlainLink
import foundation.bucket.core.ui.PrimaryButton
import foundation.bucket.core.ui.Type
import kotlinx.coroutines.launch

fun ProductDetails.priceText(): String =
    oneTimePurchaseOfferDetails?.formattedPrice
        ?: subscriptionOfferDetails?.firstOrNull { it.offerId == null }?.pricingPhases?.pricingPhaseList?.lastOrNull()?.formattedPrice
        ?: subscriptionOfferDetails?.firstOrNull()?.pricingPhases?.pricingPhaseList?.lastOrNull()?.formattedPrice
        ?: ""

@Composable
fun PaywallScreen(graph: Graph, back: () -> Unit) {
    val p = LocalPalette.current
    val products by graph.billing.products.collectAsState()
    val access by graph.billing.access.collectAsState()
    val message by graph.billing.message.collectAsState()
    var chosen by remember { mutableStateOf(Plan.YEARLY) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    LaunchedEffect(Unit) { graph.billing.refresh() }
    val trial = graph.billing.trialEligible
    Page(back = back) {
        Text(if (trial) "${Plan.TRIAL_DAYS} days free" else "Keep learning", style = Type.display, color = p.ink)
        Text("Daily sessions, every language set, and your words on every device. Games and live rooms stay free.", color = p.muted)
        if (access.unlocked) {
            Pill(if (access is Access.Beta) "Free beta access" else "You have access", D8.malachite)
            if (access is Access.Beta) Text("Test builds open everything for free.", color = p.muted)
        }
        if (products.isEmpty()) Text("The plans did not load. Check your connection and Google Play, then try again.", color = p.muted)
        products.forEach { product ->
            val on = product.productId == chosen
            Column(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(p.card).border(if (on) 3.dp else 1.dp, if (on) D8.vermilion else p.rule, RoundedCornerShape(16.dp))
                    .clickable(role = Role.RadioButton) { chosen = product.productId }.padding(16.dp),
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(Plan.title(product.productId), style = Type.title.copy(fontSize = 17.sp()), color = p.ink)
                    if (product.productId == Plan.YEARLY) Pill("Best value", D8.malachite)
                }
                Text(product.priceText(), style = Type.title, color = p.ink)
                Text("per ${Plan.period(product.productId)}", color = p.muted)
            }
        }
        products.firstOrNull { it.productId == chosen }?.let { product ->
            Text(Entitlement.disclosure(trial && Plan.hasTrial(product.productId), product.priceText(), Plan.period(product.productId), product.productId == Plan.FAMILY), color = p.muted)
            PrimaryButton(if (trial && Plan.hasTrial(product.productId)) "Start free trial" else "Continue") { (context as? Activity)?.let { graph.billing.buy(it, product) } }
        }
        message?.let { Text(it, color = D8.lapis) }
        PlainLink("Restore purchases") { scope.launch { graph.billing.restore() } }
        PlainLink("Manage subscription") { context.startActivity(Intent(Intent.ACTION_VIEW, "https://play.google.com/store/account/subscriptions?package=${context.packageName}".toUri())) }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            PlainLink("Terms") { context.startActivity(Intent(Intent.ACTION_VIEW, Plan.TERMS.toUri())) }
            PlainLink("Privacy") { context.startActivity(Intent(Intent.ACTION_VIEW, Plan.PRIVACY.toUri())) }
        }
    }
}
