# Polingual gifts rollback

Run against the database that took `20261118110000_academy_entitlements.sql` and `20261118120000_polingual_gifts.sql`. The first block removes gifts and keeps entitlements. The second block removes entitlements too, which also drops Stripe subscription rows from #1005.

```sql
drop trigger if exists polingual_gift_apply_void on bucket.polingual_gifts;
drop function if exists bucket.polingual_gift_apply_void();
drop function if exists bucket.redeem_polingual_gift(text, uuid, timestamptz);
drop function if exists bucket.void_polingual_gift(text, text, timestamptz);
drop function if exists bucket.purge_polingual_gift_pii(timestamptz, timestamptz);
drop table if exists bucket.polingual_gift_voids;
drop table if exists bucket.polingual_gifts;
```

```sql
drop table if exists bucket.academy_entitlements;
```

Rows in `bucket.academy_entitlements` with `plan = 'gift_yearly'` stay active after the first block. End them with `update bucket.academy_entitlements set status = 'canceled' where plan = 'gift_yearly'` if the gifts are being withdrawn.
