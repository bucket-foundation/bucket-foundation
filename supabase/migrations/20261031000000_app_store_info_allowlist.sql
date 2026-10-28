update bucket.app_store_events e
set transaction_info = coalesce((
      select jsonb_object_agg(k, v) from jsonb_each(e.transaction_info) as t(k, v)
      where k in ('transactionId', 'originalTransactionId', 'webOrderLineItemId', 'productId', 'type', 'price', 'purchaseDate', 'originalPurchaseDate', 'expiresDate', 'signedDate', 'revocationDate')
    ), '{}'::jsonb),
    renewal_info = coalesce((
      select jsonb_object_agg(k, v) from jsonb_each(e.renewal_info) as r(k, v)
      where k in ('originalTransactionId', 'productId', 'autoRenewProductId', 'renewalPrice', 'signedDate', 'renewalDate', 'recentSubscriptionStartDate', 'gracePeriodExpiresDate')
    ), '{}'::jsonb);
